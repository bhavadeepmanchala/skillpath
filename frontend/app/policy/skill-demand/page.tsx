"use client"

import React, { useEffect, useState, useMemo, useCallback, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Split,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
} from "recharts"
import {
  fetchDistricts,
  fetchRoles,
  fetchTopSkills,
  fetchDemandTrends,
  fetchSkillTrend,
  isLowSample,
  type DistrictDemandItem,
  type RoleItem,
  type DemandSkillsResponse,
  type SkillDemandItem,
  type SkillTrendResponse,
  type DemandTrendsResponse,
} from "@/lib/demand-api"
import {
  PageHeader,
  FindingHeadline,
  BigNumber,
  FigureRow,
  SectionHeader,
  SourceCaption,
  FilterBar,
  SelectField,
  DumbbellRow,
  DumbbellScaleHeader,
  DeltaBadge,
  LowSampleBadge,
  Drawer,
  ErrorState,
  EmptyState,
  ChartTooltip,
  ChartSkeleton,
  TableSkeleton,
  Skeleton,
  useChartAnimation,
} from "@/components/ui-kit"
import {
  formatInteger,
  formatPercent,
} from "@/lib/findings"
import { computeDumbbellScale } from "@/lib/dumbbell"

function SkillDemandContent() {
  const searchParams = useSearchParams()
  const initialRole = searchParams.get("role") ?? ""
  const initialDistrict = searchParams.get("district") ?? ""
  const initialSkill = searchParams.get("skill") ?? ""

  // 1. Catalogs state: Roles & Districts
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [selectedRoleId, setSelectedRoleId] = useState<string>(initialRole)

  const [districts, setDistricts] = useState<DistrictDemandItem[]>([])
  const [districtsLoading, setDistrictsLoading] = useState(true)
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(initialDistrict)

  // 2. Skills demand state
  const [skillsData, setSkillsData] = useState<DemandSkillsResponse | null>(null)
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillsError, setSkillsError] = useState<string | null>(null)

  // 3. Trends state (for matching previous -> latest dumbbells & delta badges)
  const [trendsData, setTrendsData] = useState<DemandTrendsResponse | null>(null)

  // 4. Client-side Search, Sort & Progressive Disclosure
  const [searchQuery, setSearchQuery] = useState(initialSkill)
  const [sortBy, setSortBy] = useState<"demand" | "alpha" | "confidence">("demand")
  const [showAll, setShowAll] = useState(false)

  // 5. Drawer state for 1-click drilldown
  const [drawerSkill, setDrawerSkill] = useState<SkillDemandItem | null>(null)
  const [drawerTrend, setDrawerTrend] = useState<SkillTrendResponse | null>(null)
  const [drawerNationalTrend, setDrawerNationalTrend] = useState<SkillTrendResponse | null>(null)
  const [compareNational, setCompareNational] = useState(false)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerTrendView, setDrawerTrendView] = useState<"chart" | "list">("chart")

  // Load catalogs
  useEffect(() => {
    let mounted = true
    async function loadCatalogs() {
      setRolesLoading(true)
      setDistrictsLoading(true)
      try {
        const [rolesRes, districtsRes] = await Promise.all([
          fetchRoles(),
          fetchDistricts(),
        ])
        if (mounted) {
          const sortedRoles = [...rolesRes].sort((a, b) => a.name.localeCompare(b.name))
          const sortedDistricts = [...districtsRes.districts].sort((a, b) => a.name.localeCompare(b.name))
          setRoles(sortedRoles)
          setDistricts(sortedDistricts)
        }
      } catch (err) {
        console.error("Failed to load filter catalogs:", err)
      } finally {
        if (mounted) {
          setRolesLoading(false)
          setDistrictsLoading(false)
        }
      }
    }
    loadCatalogs()
    return () => {
      mounted = false
    }
  }, [])

  // Load skills & trends
  const loadSkills = useCallback(async () => {
    setSkillsLoading(true)
    setSkillsError(null)
    try {
      const roleNum = selectedRoleId ? Number(selectedRoleId) : null
      const districtNum = selectedDistrictId ? Number(selectedDistrictId) : null

      const [skillsRes, trendsRes] = await Promise.all([
        fetchTopSkills({
          roleId: roleNum,
          districtId: districtNum,
          limit: 100,
        }),
        fetchDemandTrends({
          roleId: roleNum,
          districtId: districtNum,
          limit: 81,
        }).catch(() => null),
      ])

      setSkillsData(skillsRes)
      setTrendsData(trendsRes)
    } catch {
      setSkillsError("Could not load skill demand data. Is the backend running?")
    } finally {
      setSkillsLoading(false)
    }
  }, [selectedRoleId, selectedDistrictId])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  // Trend lookup map for matching previous -> latest window shares
  const trendsMap = useMemo(() => {
    const map = new Map<
      number,
      { change: number; relativeGrowth: number | null; sharePrevious: number; shareLatest: number }
    >()
    if (trendsData) {
      for (const item of trendsData.rising) {
        map.set(item.skillId, {
          change: item.change,
          relativeGrowth: item.relativeGrowth,
          sharePrevious: item.sharePrevious,
          shareLatest: item.shareLatest,
        })
      }
      for (const item of trendsData.declining) {
        map.set(item.skillId, {
          change: item.change,
          relativeGrowth: item.relativeGrowth,
          sharePrevious: item.sharePrevious,
          shareLatest: item.shareLatest,
        })
      }
    }
    return map
  }, [trendsData])

  // Scope labels
  const selectedDistrictName = useMemo(() => {
    if (!selectedDistrictId) return "All Districts (Pan-India)"
    const d = districts.find((item) => String(item.districtId) === selectedDistrictId)
    return d ? `${d.name}, ${d.state}` : "Selected District"
  }, [districts, selectedDistrictId])

  const selectedRoleName = useMemo(() => {
    if (!selectedRoleId) return "All Roles"
    const r = roles.find((item) => String(item.id) === selectedRoleId)
    return r ? r.name : "Selected Role"
  }, [roles, selectedRoleId])

  // Filtered and sorted skills
  const processedSkills = useMemo(() => {
    if (!skillsData || !skillsData.skills) return []
    let list = [...skillsData.skills]

    const query = searchQuery.trim().toLowerCase()
    if (query) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.category.toLowerCase().includes(query)
      )
    }

    if (sortBy === "demand") {
      list.sort((a, b) => b.share - a.share)
    } else if (sortBy === "alpha") {
      list.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === "confidence") {
      list.sort((a, b) => (b.confidence ?? 0.5) - (a.confidence ?? 0.5))
    }

    return list
  }, [skillsData, searchQuery, sortBy])

  // Visible skills according to progressive disclosure
  const visibleSkills = useMemo(() => {
    if (showAll || processedSkills.length <= 10) {
      return processedSkills
    }
    return processedSkills.slice(0, 10)
  }, [processedSkills, showAll])

  // Shared dumbbell scale across the visible list
  const dumbbellScale = useMemo(() => {
    const pairs = processedSkills.map((s) => {
      const tr = trendsMap.get(s.skillId)
      return {
        prev: tr ? tr.sharePrevious * 100 : s.share * 100,
        latest: s.share * 100,
      }
    })
    return computeDumbbellScale(pairs, { minMax: 20, step: 10, capAt: 100 })
  }, [processedSkills, trendsMap])

  // Finding sentence calculation
  const findingSentence = useMemo(() => {
    if (!skillsData || skillsData.skills.length === 0) {
      return "Analyzing employer skill demand and workforce requirements across sectors."
    }
    const top = skillsData.skills[0]
    const scopeStr = selectedDistrictId
      ? `in ${selectedDistrictName}`
      : selectedRoleId
      ? `for ${selectedRoleName}`
      : "nationally"

    if (isLowSample(top.postingsWithSkill)) {
      return `Observing early demand signals for ${top.name} (low sample: ${formatInteger(
        top.postingsWithSkill
      )} postings) ${scopeStr}.`
    }
    return `${top.name} leads employer demand ${scopeStr}, appearing in ${formatPercent(
      top.share
    )} of postings (${formatInteger(top.postingsWithSkill)} openings).`
  }, [skillsData, selectedDistrictId, selectedDistrictName, selectedRoleId, selectedRoleName])

  // Open skill drawer
  const openSkillDrawer = useCallback(
    async (skill: SkillDemandItem) => {
      setDrawerSkill(skill)
      setIsDrawerOpen(true)
      setDrawerLoading(true)
      setDrawerError(null)
      setDrawerTrend(null)
      setDrawerNationalTrend(null)
      setCompareNational(false)

      try {
        const districtNum = selectedDistrictId ? Number(selectedDistrictId) : null
        const trend = await fetchSkillTrend(skill.skillId, {
          districtId: districtNum,
        })
        setDrawerTrend(trend)
      } catch {
        setDrawerError("Could not load longitudinal trend for this skill.")
      } finally {
        setDrawerLoading(false)
      }
    },
    [selectedDistrictId]
  )

  const handleToggleNationalCompare = useCallback(async () => {
    if (!drawerSkill) return
    if (!compareNational) {
      setCompareNational(true)
      if (!drawerNationalTrend) {
        try {
          const natTrend = await fetchSkillTrend(drawerSkill.skillId, {
            districtId: null,
          })
          setDrawerNationalTrend(natTrend)
        } catch {
          console.error("Failed to load national comparison trend")
        }
      }
    } else {
      setCompareNational(false)
    }
  }, [drawerSkill, compareNational, drawerNationalTrend])

  const mergedDrawerPoints = useMemo(() => {
    if (!drawerTrend || !drawerTrend.points) return []
    const natMap = new Map<string, number>()
    if (drawerNationalTrend && drawerNationalTrend.points) {
      for (const p of drawerNationalTrend.points) {
        natMap.set(p.month, Number((p.share * 100).toFixed(2)))
      }
    }
    return drawerTrend.points.map((p) => ({
      month: p.month,
      localShare: Number((p.share * 100).toFixed(2)),
      nationalShare: natMap.get(p.month),
      postings: p.postingsWithSkill,
      totalPostings: p.postingsTotal,
    }))
  }, [drawerTrend, drawerNationalTrend])

  const isChartAnimationActive = useChartAnimation()

  const validatedSkillsCount = useMemo(() => {
    if (!skillsData) return 0
    return skillsData.skills.filter(
      (s) => (s.confirmedCount ?? 0) > 0 || (s.disputedCount ?? 0) > 0
    ).length
  }, [skillsData])

  return (
    <div className="space-y-8 animate-page-enter">
      {/* 1. Header */}
      <PageHeader
        title="Skill Demand Analysis"
        standfirst="Granular demand distribution across skills, employer validation signals, and previous-to-latest shifts."
        showSyntheticBadge
      />

      {/* 2. Filter Bar (Interactive controls kept in a clean bar) */}
      <FilterBar
        isFiltered={Boolean(selectedRoleId || selectedDistrictId || searchQuery || sortBy !== "demand")}
        onReset={() => {
          setSelectedRoleId("")
          setSelectedDistrictId("")
          setSearchQuery("")
          setSortBy("demand")
        }}
      >
        <SelectField
          id="role-filter"
          label="Target role"
          value={selectedRoleId}
          onChange={(val) => setSelectedRoleId(val)}
          options={[
            { label: "All roles (cross-sector)", value: "" },
            ...roles.map((r) => ({ label: `${r.name} (${r.sector})`, value: String(r.id) })),
          ]}
          disabled={rolesLoading}
        />

        <SelectField
          id="district-filter"
          label="Geographic scope"
          value={selectedDistrictId}
          onChange={(val) => setSelectedDistrictId(val)}
          options={[
            { label: "All Districts (Pan-India)", value: "" },
            ...districts.map((d) => ({
              label: `${d.name} (${d.state})`,
              value: String(d.districtId),
            })),
          ]}
          disabled={districtsLoading}
        />

        <SelectField
          id="sort-filter"
          label="Sort by"
          value={sortBy}
          onChange={(val) => setSortBy(val as "demand" | "alpha" | "confidence")}
          options={[
            { label: "Highest demand share", value: "demand" },
            { label: "Skill name (A–Z)", value: "alpha" },
            { label: "Validation confidence", value: "confidence" },
          ]}
        />
      </FilterBar>

      {/* 3. Editorial Finding Headline & Open FigureRow */}
      <section className="space-y-6">
        {skillsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : (
          <FindingHeadline kicker="Demand Distribution Finding" sentence={findingSentence}>
            <SourceCaption
              scope={`${selectedRoleName} · ${selectedDistrictName}`}
              window={
                skillsData?.from && skillsData?.to
                  ? `${skillsData.from} – ${skillsData.to}`
                  : "Latest 3-month window"
              }
              note="Calculated from synthetic job postings"
            />
          </FindingHeadline>
        )}

        {skillsLoading ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 border-y border-border py-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : skillsError ? (
          <ErrorState message={skillsError} onRetry={loadSkills} compact />
        ) : skillsData ? (
          <FigureRow columns={4}>
            <BigNumber
              label="Postings in Scope"
              rawValue={skillsData.totalPostingsInScope}
              footnote="Hiring volume in selection"
            />
            <BigNumber
              label="Leading Skill Share"
              value={skillsData.skills[0] ? formatPercent(skillsData.skills[0].share) : "—"}
              footnote={skillsData.skills[0] ? skillsData.skills[0].name : "Top requirement"}
            />
            <BigNumber
              label="Skills with Employer Votes"
              rawValue={validatedSkillsCount}
              footnote="Confirmed or disputed at least once"
            />
            <BigNumber
              label="Skills Evaluated"
              rawValue={skillsData.skills.length}
              footnote="In current taxonomy filter"
            />
          </FigureRow>
        ) : null}
      </section>

      {/* 4. Main Ranked Dumbbell List (No card box, no table) */}
      <section>
        <SectionHeader
          title="Ranked Skills by Employer Demand"
          subtitle={`Showing ${visibleSkills.length} of ${processedSkills.length} skills in ${selectedRoleName} (${selectedDistrictName}). Dumbbells compare previous window share to latest window share where available; confidence badges appear when a skill has employer votes.`}
          actions={
            <div className="relative w-full sm:w-64">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Search skills or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search skills or category"
                className="w-full pl-8 pr-3 py-1.5 rounded-md border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          }
        />

        {skillsLoading ? (
          <TableSkeleton rows={10} cols={5} />
        ) : skillsError ? (
          <ErrorState message={skillsError} onRetry={loadSkills} />
        ) : processedSkills.length === 0 ? (
          <EmptyState
            title="No skills found"
            description={
              searchQuery
                ? `No skills matched "${searchQuery}". Try a different keyword.`
                : "No skills recorded for this role and district combination."
            }
          />
        ) : (
          <div>
            <DumbbellScaleHeader
              leftLabel="Skill & Category"
              maxScale={dumbbellScale}
              unit="%"
              rightLabel="Prev → Latest Share"
            />

            <div className="divide-y divide-border/70 border-b border-border/70">
              {visibleSkills.map((skill, index) => {
                const trend = trendsMap.get(skill.skillId)
                const hasLowSample = isLowSample(skill.postingsWithSkill)
                const totalVotes = (skill.confirmedCount ?? 0) + (skill.disputedCount ?? 0)
                const confPct =
                  skill.confidence !== undefined ? Math.round(skill.confidence * 100) : 50

                const prevVal = trend ? trend.sharePrevious * 100 : skill.share * 100
                const latestVal = skill.share * 100

                return (
                  <DumbbellRow
                    key={skill.skillId}
                    rank={index + 1}
                    label={skill.name}
                    sublabel={`${skill.category} · ${formatInteger(skill.postingsWithSkill)} postings`}
                    previousValue={prevVal}
                    latestValue={latestVal}
                    maxScale={dumbbellScale}
                    previousText={formatPercent(trend ? trend.sharePrevious : skill.share)}
                    latestText={formatPercent(skill.share)}
                    staggerIndex={index}
                    onClick={() => openSkillDrawer(skill)}
                    badge={
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {trend && <DeltaBadge value={trend.change} size="sm" />}
                        {totalVotes > 0 && (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground border border-border/80 rounded px-1.5 py-0.5 font-mono tabular-nums bg-muted/30"
                            title={`Bayesian confidence: ${confPct}% (${skill.confirmedCount ?? 0} confirmed, ${skill.disputedCount ?? 0} disputed)`}
                          >
                            <ShieldCheck className="h-3 w-3 text-primary" aria-hidden="true" />
                            <span>{confPct}%</span>
                          </span>
                        )}
                        {hasLowSample && <LowSampleBadge />}
                      </div>
                    }
                  />
                )
              })}
            </div>

            {processedSkills.length > 10 && (
              <div className="pt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Showing {visibleSkills.length} of {processedSkills.length} skills
                </span>
                <button
                  type="button"
                  onClick={() => setShowAll((prev) => !prev)}
                  className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1"
                >
                  {showAll ? "Show top 10 only" : `Show all ${processedSkills.length} skills`}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 5. Detail Drawer for Selected Skill (1-click drilldown) */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={drawerSkill?.name || "Skill Demand Details"}
        subtitle={drawerSkill ? `${drawerSkill.category} · ${selectedDistrictName}` : undefined}
      >
        {drawerSkill && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg border border-border bg-card">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Demand Share
                </span>
                <div className="font-serif text-2xl font-bold text-foreground tabular-nums mt-0.5">
                  {formatPercent(drawerSkill.share)}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatInteger(drawerSkill.postingsWithSkill)} of{" "}
                  {formatInteger(skillsData?.totalPostingsInScope ?? 0)} postings
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Employer Confidence
                </span>
                <div className="font-serif text-2xl font-bold text-foreground tabular-nums mt-0.5">
                  {drawerSkill.confidence !== undefined
                    ? `${(drawerSkill.confidence * 100).toFixed(1)}%`
                    : "50.0%"}
                </div>
                <span className="text-xs text-muted-foreground">
                  {drawerSkill.confirmedCount ?? 0} confirmed ·{" "}
                  {drawerSkill.disputedCount ?? 0} disputed
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 text-xs space-y-1">
              <span className="font-semibold text-foreground">
                Bayesian Confidence Formula:
              </span>
              <p className="font-mono text-[11px] text-muted-foreground">
                confidence = (confirmed + 1) / (confirmed + disputed + 2)
              </p>
              <p className="text-[11px] text-muted-foreground">
                Starts at 50% prior and updates with each employer confirmation or dispute.
              </p>
            </div>

            {/* 18-Month Longitudinal Trend Chart (or typographic list) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Longitudinal Trend (18 Months)
                </h4>
                <div className="flex items-center gap-2">
                  {selectedDistrictId && (
                    <button
                      type="button"
                      onClick={handleToggleNationalCompare}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        compareNational
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Split className="h-3 w-3" aria-hidden="true" />
                      <span>{compareNational ? "Comparing National" : "Compare National"}</span>
                    </button>
                  )}
                  <div className="inline-flex rounded border border-border text-[11px] bg-muted/40">
                    <button
                      type="button"
                      onClick={() => setDrawerTrendView("chart")}
                      className={`px-2 py-0.5 rounded ${
                        drawerTrendView === "chart"
                          ? "bg-background text-foreground font-semibold shadow-xs"
                          : "text-muted-foreground"
                      }`}
                    >
                      Chart
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawerTrendView("list")}
                      className={`px-2 py-0.5 rounded ${
                        drawerTrendView === "list"
                          ? "bg-background text-foreground font-semibold shadow-xs"
                          : "text-muted-foreground"
                      }`}
                    >
                      Monthly List
                    </button>
                  </div>
                </div>
              </div>

              {drawerLoading ? (
                <ChartSkeleton height={200} />
              ) : drawerError ? (
                <ErrorState message={drawerError} compact />
              ) : !drawerTrend || drawerTrend.points.length === 0 ? (
                <EmptyState
                  title="No trend points"
                  description="No monthly points available."
                />
              ) : drawerTrendView === "chart" ? (
                <div
                  className="h-52 w-full border border-border rounded-lg p-2 bg-card"
                  aria-label={`18-month demand trend chart for ${drawerSkill.name}`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={mergedDrawerPoints}
                      margin={{ top: 8, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--border)" }}
                      />
                      <YAxis
                        domain={[0, "auto"]}
                        unit="%"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--border)" }}
                      />
                      <Tooltip
                        content={
                          <ChartTooltip
                            valueFormatter={(v) => `${v}%`}
                            labelFormatter={(l) => `Cohort: ${l}`}
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="localShare"
                        name={selectedDistrictId ? "Local Share" : "National Share"}
                        stroke="var(--primary)"
                        fill="var(--primary)"
                        fillOpacity={0.15}
                        strokeWidth={2}
                        isAnimationActive={isChartAnimationActive}
                      />
                      {compareNational && selectedDistrictId && (
                        <Line
                          type="monotone"
                          dataKey="nationalShare"
                          name="National Baseline"
                          stroke="var(--muted-foreground)"
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto divide-y divide-border border-y border-border">
                  {drawerTrend.points.map((pt) => (
                    <div
                      key={pt.month}
                      className="flex items-center justify-between py-2 px-1 text-xs"
                    >
                      <span className="font-mono font-medium text-foreground">{pt.month}</span>
                      <div className="flex items-center gap-4 font-mono tabular-nums">
                        <span className="text-muted-foreground">
                          {formatInteger(pt.postingsWithSkill)} / {formatInteger(pt.postingsTotal)}
                        </span>
                        <span className="font-serif font-bold text-primary w-14 text-right">
                          {formatPercent(pt.share)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Have industry insight on this skill?
              </span>
              <Link
                href={`/policy/employer-validation?role=${selectedRoleId || ""}&skill=${drawerSkill.skillId}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <span>Validate requirement</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default function SkillDemandPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 py-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-24 w-full" />
          <TableSkeleton rows={8} cols={4} />
        </div>
      }
    >
      <SkillDemandContent />
    </Suspense>
  )
}
