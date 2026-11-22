# backend/scripts/compare-endpoints.ps1
# Compares all SkillPath GET endpoints between two sources:
# 1. Two live base URLs: -BaseUrl1 http://localhost:8080 -BaseUrl2 http://localhost:8081
# 2. Live base URL vs snapshot directory: -BaseUrl1 http://localhost:8080 -SnapshotDir ./h2-snapshot
# 3. Record snapshot from live base URL: -BaseUrl1 http://localhost:8080 -SnapshotDir ./h2-snapshot -RecordSnapshot

param(
    [string]$BaseUrl1 = "http://localhost:8080",
    [string]$BaseUrl2 = $null,
    [string]$SnapshotDir = $null,
    [switch]$RecordSnapshot
)

$endpoints = @(
    "/api/roles",
    "/api/skills",
    "/api/courses",
    "/api/courses/2/alignment?role=2",
    "/api/courses/2/alignment?role=2&district=1",
    "/api/courses/4/alignment?role=1",
    "/api/courses/4/alignment?role=1&district=1",
    "/api/courses/21/alignment?role=10",
    "/api/courses/21/alignment?role=10&district=33",
    "/api/courses/2/recommendations",
    "/api/courses/4/recommendations",
    "/api/courses/21/recommendations",
    "/api/flags",
    "/api/flags?district=1",
    "/api/districts/1/plan",
    "/api/districts/15/plan",
    "/api/districts/40/plan",
    "/api/demand/summary",
    "/api/demand/skills",
    "/api/demand/trends",
    "/api/demand/districts",
    "/api/alignment/gaps",
    "/api/ready"
)

function Get-EndpointSlug([string]$ep) {
    $slug = $ep -replace "^/api/", "" -replace "[?&=/]", "_"
    return $slug
}

function Normalize-Json([string]$jsonString) {
    if ([string]::IsNullOrWhiteSpace($jsonString)) {
        return ""
    }
    try {
        $parsed = ConvertFrom-Json $jsonString
        if ($parsed -is [PSCustomObject] -and $null -ne $parsed.PSObject.Properties['value']) {
            $parsed = $parsed.value
        }
        $json = if ($parsed -is [System.Collections.IEnumerable] -and $parsed -isnot [string]) {
            ConvertTo-Json -Compress -Depth 20 -InputObject @($parsed)
        } else {
            ConvertTo-Json -Compress -Depth 20 -InputObject $parsed
        }
        $json = $json -replace '\\u0026', '&'
        return $json
    } catch {
        Write-Warning "JSON normalization failed: $_"
        return $jsonString.Trim()
    }
}

if ($RecordSnapshot) {
    if (-not $SnapshotDir) {
        Write-Error "Please specify -SnapshotDir when using -RecordSnapshot"
        exit 1
    }
    if (-not (Test-Path $SnapshotDir)) {
        New-Item -ItemType Directory -Path $SnapshotDir -Force | Out-Null
    }
    Write-Host "Recording snapshot of $($endpoints.Count) endpoints from $BaseUrl1 into $SnapshotDir ..." -ForegroundColor Cyan
    foreach ($ep in $endpoints) {
        $url = "$BaseUrl1$ep"
        $slug = Get-EndpointSlug $ep
        $outPath = Join-Path $SnapshotDir "$slug.json"
        try {
            $resp = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 30
            $json = ConvertTo-Json $resp -Depth 20
            Set-Content -Path $outPath -Value $json -Encoding UTF8
            Write-Host "  [OK] $ep -> $slug.json" -ForegroundColor Green
        } catch {
            Write-Host "  [FAIL] $ep : $_" -ForegroundColor Red
            Set-Content -Path $outPath -Value "ERROR: $_" -Encoding UTF8
        }
    }
    Write-Host "Snapshot recording complete." -ForegroundColor Cyan
    exit 0
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "SkillPath Endpoint Comparison" -ForegroundColor Cyan
Write-Host "Source 1 : $BaseUrl1" -ForegroundColor Cyan
if ($BaseUrl2) {
    Write-Host "Source 2 : $BaseUrl2 (Live)" -ForegroundColor Cyan
} elseif ($SnapshotDir) {
    Write-Host "Source 2 : Snapshot in $SnapshotDir" -ForegroundColor Cyan
} else {
    Write-Host "Warning: No Source 2 (-BaseUrl2 or -SnapshotDir) provided. Only testing Source 1." -ForegroundColor Yellow
}
Write-Host "================================================================================" -ForegroundColor Cyan

$total = 0
$matches = 0
$diffs = 0
$errors = 0

foreach ($ep in $endpoints) {
    $total++
    $slug = Get-EndpointSlug $ep
    $url1 = "$BaseUrl1$ep"
    $raw1 = $null
    $raw2 = $null
    $err1 = $null
    $err2 = $null

    try {
        $r1 = Invoke-WebRequest -Uri $url1 -Method Get -TimeoutSec 30 -UseBasicParsing
        $raw1 = Normalize-Json $r1.Content
    } catch {
        $err1 = $_.Exception.Message
    }

    if ($BaseUrl2) {
        $url2 = "$BaseUrl2$ep"
        try {
            $r2 = Invoke-WebRequest -Uri $url2 -Method Get -TimeoutSec 30 -UseBasicParsing
            $raw2 = Normalize-Json $r2.Content
        } catch {
            $err2 = $_.Exception.Message
        }
    } elseif ($SnapshotDir) {
        $snapshotFile = Join-Path $SnapshotDir "$slug.json"
        if (Test-Path $snapshotFile) {
            $raw2 = Normalize-Json (Get-Content $snapshotFile -Raw -Encoding UTF8)
        } else {
            $err2 = "Snapshot file $snapshotFile not found"
        }
    }

    if ($err1 -or $err2) {
        $errors++
        Write-Host "[$total/$($endpoints.Count)] ERR : $ep" -ForegroundColor Red
        if ($err1) { Write-Host "   Source 1 error: $err1" -ForegroundColor DarkRed }
        if ($err2) { Write-Host "   Source 2 error: $err2" -ForegroundColor DarkRed }
    } elseif ($raw1 -eq $raw2) {
        $matches++
        Write-Host "[$total/$($endpoints.Count)] OK  : $ep (Identical)" -ForegroundColor Green
    } else {
        $diffs++
        Write-Host "[$total/$($endpoints.Count)] DIFF: $ep" -ForegroundColor Yellow
        # Show first few lines of diff
        $lines1 = $raw1 -split "`n"
        $lines2 = $raw2 -split "`n"
        $maxLines = [Math]::Max($lines1.Count, $lines2.Count)
        $diffCount = 0
        for ($i = 0; $i -lt $maxLines -and $diffCount -lt 5; $i++) {
            $l1 = if ($i -lt $lines1.Count) { $lines1[$i] } else { "<missing>" }
            $l2 = if ($i -lt $lines2.Count) { $lines2[$i] } else { "<missing>" }
            if ($l1 -ne $l2) {
                Write-Host "   Line $($i+1):" -ForegroundColor DarkYellow
                Write-Host "     Source 1: $l1" -ForegroundColor Cyan
                Write-Host "     Source 2: $l2" -ForegroundColor Magenta
                $diffCount++
            }
        }
    }
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "Summary: Total: $total | Identical: $matches | Differences: $diffs | Errors: $errors" -ForegroundColor $(if ($diffs -eq 0 -and $errors -eq 0) { "Green" } else { "Yellow" })
Write-Host "================================================================================" -ForegroundColor Cyan

if ($diffs -gt 0 -or $errors -gt 0) {
    exit 1
} else {
    exit 0
}
