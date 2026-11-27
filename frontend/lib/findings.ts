/**
 * Pure helper module that builds editorial finding sentences from API numbers.
 *
 * Rules:
 * - Deterministic output from API values.
 * - Strict distinction between percentage points (pp) for deltas vs percent (%) for shares.
 * - Careful rounding, singular/plural grammar, and low-sample fallback to neutral titles.
 */

import { LOW_SAMPLE_THRESHOLD, type DemandSummary } from "./demand-api"

/**
 * Formats a fraction (0.0 to 1.0) or percentage (0 to 100) into a clean percentage string.
 * If alreadyOnHundredScale is true, does not multiply by 100.
 */
export function formatPercent(
  value: number,
  decimals: number = 1,
  alreadyOnHundredScale: boolean = false
): string {
  if (isNaN(value)) return "—"
  const pct = alreadyOnHundredScale ? value : value * 100
  // If whole number, omit decimal point
  const formatted = Number.isInteger(pct)
    ? pct.toString()
    : pct.toFixed(decimals)
  return `${formatted}%`
}

/**
 * Formats a delta value into percentage points (e.g. "+5.2 pp" or "-1.8 pp").
 * If alreadyOnHundredScale is false, value is multiplied by 100.
 */
export function formatPercentagePoints(
  value: number,
  decimals: number = 1,
  alreadyOnHundredScale: boolean = false
): string {
  if (isNaN(value)) return "0.0 pp"
  const pp = alreadyOnHundredScale ? value : value * 100
  if (Math.abs(pp) < 0.001) return "0.0 pp"
  const sign = pp > 0 ? "+" : ""
  return `${sign}${pp.toFixed(decimals)} pp`
}

/**
 * Formats an integer with standard locale thousands separators (e.g. 40000 -> "40,000").
 */
export function formatInteger(value: number): string {
  if (isNaN(value)) return "—"
  return Math.round(value).toLocaleString("en-IN")
}

/**
 * Formats singular or plural phrases with formatted count.
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  const p = plural || `${singular}s`
  const formattedCount = formatInteger(count)
  return count === 1 ? `${formattedCount} ${singular}` : `${formattedCount} ${p}`
}

/**
 * Converts "YYYY-MM" to "Mon YYYY" (e.g. "2026-07" -> "Jul 2026").
 */
export function formatMonthYear(monthStr?: string): string {
  if (!monthStr || !monthStr.includes("-")) return monthStr || "recent window"
  const [yearStr, monthNum] = monthStr.split("-")
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthNum, 10)
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ]
  if (month >= 1 && month <= 12) {
    return `${monthNames[month - 1]} ${year}`
  }
  return monthStr
}

/**
 * Formats a window range (e.g. from "2026-07" to "2026-09" -> "Jul 2026 – Sep 2026").
 */
export function formatMonthRange(from?: string, to?: string): string {
  if (!from && !to) return "Latest 3-month evaluation window"
  if (from && to) {
    return `${formatMonthYear(from)} – ${formatMonthYear(to)}`
  }
  return formatMonthYear(to || from)
}

/**
 * Builds a finding sentence for national or district summary metrics.
 */
export function buildSummaryFinding(
  summary?: DemandSummary | null
): string {
  if (!summary || !summary.totalPostings) {
    return "Tracking job postings and employer skill requirements across India."
  }
  return `Tracking ${formatInteger(summary.totalPostings)} job postings across ${pluralize(
    summary.totalRoles,
    "target role"
  )} and ${pluralize(summary.totalDistricts, "reporting district")}.`
}

export interface TrendFindingItem {
  name: string
  shareLatest: number
  change: number
  postingsInScope?: number
  isLowSample?: boolean
}

/**
 * Builds a finding sentence for rising skills.
 * Falls back to a neutral sentence when sample size is below threshold or item is missing.
 */
export function buildRisingTrendFinding(
  item?: TrendFindingItem | null,
  context?: { roleName?: string; districtName?: string }
): string {
  if (!item) {
    return "Tracking emerging skills and demand momentum across employer postings."
  }

  const isLow =
    item.isLowSample ||
    (item.postingsInScope !== undefined && item.postingsInScope < LOW_SAMPLE_THRESHOLD)

  if (isLow) {
    return item.postingsInScope !== undefined
      ? `Observing early demand signals for ${item.name} (low sample: ${pluralize(
          item.postingsInScope,
          "posting"
        )}).`
      : `Observing early demand signals for ${item.name} with small sample sizes.`
  }

  const shareText = formatPercent(item.shareLatest)
  const deltaText = formatPercentagePoints(item.change)
  const scopeText = context?.districtName
    ? `in ${context.districtName}`
    : context?.roleName
    ? `for ${context.roleName}`
    : "nationally"

  return `${item.name} leads demand growth ${scopeText}, appearing in ${shareText} of postings (${deltaText} over the trailing 3-month window).`
}

/**
 * Builds a finding sentence for declining skills.
 */
export function buildDecliningTrendFinding(
  item?: TrendFindingItem | null,
  context?: { roleName?: string; districtName?: string }
): string {
  if (!item) {
    return "Monitoring skills with contracting demand share across employers."
  }

  const isLow =
    item.isLowSample ||
    (item.postingsInScope !== undefined && item.postingsInScope < LOW_SAMPLE_THRESHOLD)

  if (isLow) {
    return item.postingsInScope !== undefined
      ? `Observing contracting signals for ${item.name} (low sample: ${pluralize(
          item.postingsInScope,
          "posting"
        )}).`
      : `Observing contracting signals for ${item.name} with limited sample volume.`
  }

  const shareText = formatPercent(item.shareLatest)
  const deltaText = formatPercentagePoints(item.change)
  const scopeText = context?.districtName
    ? `in ${context.districtName}`
    : context?.roleName
    ? `for ${context.roleName}`
    : "nationally"

  return `${item.name} shows the sharpest contraction ${scopeText}, appearing in ${shareText} of postings (${deltaText} over the trailing 3-month window).`
}

/**
 * Builds a finding sentence for course curriculum coverage.
 */
export function buildCoverageFinding(params: {
  courseName: string
  coverage: number
  roleName?: string
  missingCount?: number
  postingsInScope?: number
  lowSample?: boolean
}): string {
  const roundedCov = Math.round(params.coverage)
  const roleText = params.roleName ? `for ${params.roleName}` : "for linked roles"
  const isLow =
    params.lowSample ||
    (params.postingsInScope !== undefined &&
      params.postingsInScope < LOW_SAMPLE_THRESHOLD)
  const caution = isLow
    ? params.postingsInScope !== undefined
      ? ` (low sample: ${pluralize(params.postingsInScope, "posting")})`
      : " (low sample)"
    : ""

  if (roundedCov >= 70) {
    return `${params.courseName} teaches ${roundedCov}% of core demand skills ${roleText}${caution}.`
  }
  if (params.missingCount && params.missingCount > 0) {
    return `${params.courseName} leaves ${pluralize(
      params.missingCount,
      "key skill requirement"
    )} untaught ${roleText} (${roundedCov}% coverage)${caution}.`
  }
  return `${params.courseName} provides ${roundedCov}% coverage of employer demand ${roleText}${caution}.`
}

/**
 * Builds a finding sentence for course curriculum recommendations,
 * appending a low-sample caution when postings in scope are below threshold.
 */
export function buildRecommendationFinding(params: {
  courseName: string
  districtName?: string
  addCount: number
  retireCount: number
  topAddSkillName?: string
  topAddLatestShare?: number
  postingsInScope?: number
  lowSample?: boolean
}): string {
  const scopeText = params.districtName ? `in ${params.districtName}` : "nationally"
  const isLow =
    params.lowSample ||
    (params.postingsInScope !== undefined &&
      params.postingsInScope < LOW_SAMPLE_THRESHOLD)
  const caution = isLow
    ? params.postingsInScope !== undefined
      ? ` (low sample: ${pluralize(params.postingsInScope, "posting")})`
      : " (low sample)"
    : ""

  if (params.addCount === 0 && params.retireCount === 0) {
    return `${params.courseName} requires no immediate curriculum additions or retirements ${scopeText}${caution}.`
  }

  if (params.topAddSkillName && params.topAddLatestShare !== undefined) {
    const shareText = formatPercent(params.topAddLatestShare)
    if (isLow) {
      return `${params.courseName} has ${pluralize(
        params.addCount,
        "recommended addition"
      )} ${scopeText}, led by ${params.topAddSkillName} at ${shareText} share${caution}.`
    }
    return `${params.topAddSkillName} leads recommended additions for ${params.courseName} ${scopeText} with ${shareText} posting share (${pluralize(
      params.addCount,
      "addition"
    )}, ${pluralize(params.retireCount, "retirement")}).`
  }

  return `${params.courseName} shows ${pluralize(
    params.addCount,
    "skill to add"
  )} and ${pluralize(params.retireCount, "skill to retire")} ${scopeText}${caution}.`
}

/**
 * Builds a finding sentence for course oversupply flags.
 */
export function buildOversupplyFinding(params: {
  courseName: string
  districtName: string
  ratio: number | null
  openings: number
  lowSample?: boolean
  oversupplied?: boolean
  obsolete?: boolean
}): string {
  if (params.lowSample) {
    return `${params.courseName} in ${params.districtName} has ${Math.round(
      params.openings
    )} estimated openings, too few to reliably evaluate oversupply.`
  }
  if (params.obsolete) {
    return `${params.courseName} in ${params.districtName} exhibits curriculum obsolescence with falling demand across key skills.`
  }
  if (params.oversupplied && params.ratio !== null) {
    return `${params.courseName} in ${params.districtName} provides ${params.ratio.toFixed(
      1
    )}x as many seats as estimated local job openings.`
  }
  return `${params.courseName} capacity in ${params.districtName} aligns with estimated local employer hiring.`
}

/**
 * Builds a finding sentence for student readiness.
 */
export function buildReadinessFinding(params: {
  readinessScore: number
  roleName: string
  possessedCount: number
  targetCount: number
}): string {
  return `${params.readinessScore}% readiness for ${params.roleName}, covering ${params.possessedCount} of ${params.targetCount} high-demand skills.`
}
