import { describe, it, expect } from "vitest"
import {
  formatPercent,
  formatPercentagePoints,
  formatInteger,
  pluralize,
  formatMonthYear,
  formatMonthRange,
  buildSummaryFinding,
  buildRisingTrendFinding,
  buildDecliningTrendFinding,
  buildCoverageFinding,
  buildOversupplyFinding,
  buildRecommendationFinding,
  buildReadinessFinding,
  splitFindingIntoSegments,
} from "../findings"
import { LOW_SAMPLE_THRESHOLD } from "../demand-api"

describe("findings formatters", () => {
  it("formats percent shares distinctly from percentage-point deltas", () => {
    expect(formatPercent(0.3124)).toBe("31.2%")
    expect(formatPercent(0.25)).toBe("25%")
    expect(formatPercent(87.5, 1, true)).toBe("87.5%")
    expect(formatPercent(NaN)).toBe("—")

    expect(formatPercentagePoints(0.062)).toBe("+6.2 pp")
    expect(formatPercentagePoints(-0.0184)).toBe("-1.8 pp")
    expect(formatPercentagePoints(6.2, 1, true)).toBe("+6.2 pp")
    expect(formatPercentagePoints(NaN)).toBe("0.0 pp")
  })

  it("handles rounding and near-zero ties cleanly", () => {
    expect(formatPercent(0.1999, 1)).toBe("20.0%")
    expect(formatPercent(0.1999, 0)).toBe("20%")
    expect(formatPercentagePoints(0.000005)).toBe("0.0 pp")
    expect(formatPercentagePoints(-0.000005)).toBe("0.0 pp")
    expect(formatPercentagePoints(0)).toBe("0.0 pp")
  })

  it("handles singular and plural wording", () => {
    expect(pluralize(1, "posting")).toBe("1 posting")
    expect(pluralize(0, "posting")).toBe("0 postings")
    expect(pluralize(2500, "posting")).toBe("2,500 postings")
    expect(pluralize(1, "category", "categories")).toBe("1 category")
    expect(pluralize(3, "category", "categories")).toBe("3 categories")
  })

  it("formats integers and month ranges deterministically", () => {
    expect(formatInteger(40000)).toBe("40,000")
    expect(formatInteger(NaN)).toBe("—")
    expect(formatMonthYear("2026-07")).toBe("Jul 2026")
    expect(formatMonthRange("2026-07", "2026-09")).toBe("Jul 2026 – Sep 2026")
    expect(formatMonthRange()).toBe("Latest 3-month evaluation window")
  })
})

describe("sentence builders and fallbacks", () => {
  it("returns neutral fallback for empty or missing summary data", () => {
    expect(buildSummaryFinding(null)).toBe(
      "Tracking job postings and employer skill requirements across India."
    )
    expect(
      buildSummaryFinding({
        totalPostings: 0,
        totalSkills: 0,
        totalRoles: 0,
        totalDistricts: 0,
        totalCourses: 0,
        latestMonth: "2026-09",
        latestMonthPostings: 0,
        synthetic: true,
      })
    ).toBe("Tracking job postings and employer skill requirements across India.")
  })

  it("builds summary sentence with singular/plural grammar", () => {
    expect(
      buildSummaryFinding({
        totalPostings: 40000,
        totalSkills: 81,
        totalRoles: 1,
        totalDistricts: 40,
        totalCourses: 24,
        latestMonth: "2026-09",
        latestMonthPostings: 2514,
        synthetic: true,
      })
    ).toBe(
      "Tracking 40,000 job postings across 1 target role and 40 reporting districts."
    )
  })

  it("handles rising and declining trend fallbacks and low-sample caution", () => {
    expect(buildRisingTrendFinding(null)).toBe(
      "Tracking emerging skills and demand momentum across employer postings."
    )
    expect(buildDecliningTrendFinding(undefined)).toBe(
      "Monitoring skills with contracting demand share across employers."
    )

    // Below threshold (29 < 30) -> must include low-sample caution
    const lowRising = buildRisingTrendFinding({
      name: "Kubernetes",
      shareLatest: 0.31,
      change: 0.06,
      postingsInScope: LOW_SAMPLE_THRESHOLD - 1,
    })
    expect(lowRising).toContain("low sample: 29 postings")

    const lowDeclining = buildDecliningTrendFinding({
      name: "Angular",
      shareLatest: 0.12,
      change: -0.04,
      postingsInScope: 14,
    })
    expect(lowDeclining).toContain("low sample: 14 postings")

    // Exactly at threshold (30 >= 30) -> full finding with pp delta
    const validRising = buildRisingTrendFinding(
      {
        name: "Kubernetes",
        shareLatest: 0.31,
        change: 0.06,
        postingsInScope: LOW_SAMPLE_THRESHOLD,
      },
      { roleName: "Software Engineer" }
    )
    expect(validRising).toBe(
      "Kubernetes leads demand growth for Software Engineer, appearing in 31% of postings (+6.0 pp over the trailing 3-month window)."
    )
  })

  it("includes low-sample caution in coverage and recommendation headlines", () => {
    const lowCoverage = buildCoverageFinding({
      courseName: "HVAC Systems",
      coverage: 62.4,
      roleName: "HVAC Technician",
      missingCount: 2,
      postingsInScope: 14,
    })
    expect(lowCoverage).toContain("(low sample: 14 postings)")
    expect(lowCoverage).toContain("2 key skill requirements")

    const lowRec = buildRecommendationFinding({
      courseName: "HVAC Systems",
      addCount: 3,
      retireCount: 0,
      topAddSkillName: "Heat Pump Diagnostics",
      topAddLatestShare: 0.875,
      postingsInScope: 14,
    })
    expect(lowRec).toContain("87.5% share")
    expect(lowRec).toContain("(low sample: 14 postings)")

    const balancedRec = buildRecommendationFinding({
      courseName: "Cloud Security",
      addCount: 0,
      retireCount: 0,
      postingsInScope: 120,
    })
    expect(balancedRec).toBe(
      "Cloud Security requires no immediate curriculum additions or retirements nationally."
    )
  })

  it("builds oversupply and readiness findings accurately", () => {
    expect(
      buildOversupplyFinding({
        courseName: "Data Science",
        districtName: "Jodhpur",
        ratio: 15.0,
        openings: 8,
        lowSample: true,
      })
    ).toBe(
      "Data Science in Jodhpur has 8 estimated openings, too few to reliably evaluate oversupply."
    )

    expect(
      buildOversupplyFinding({
        courseName: "Data Science",
        districtName: "Ahmedabad",
        ratio: 3.93,
        openings: 28,
        oversupplied: true,
      })
    ).toBe(
      "Data Science in Ahmedabad provides 3.9x as many seats as estimated local job openings."
    )

    expect(
      buildReadinessFinding({
        readinessScore: 72,
        roleName: "Backend Developer",
        possessedCount: 8,
        targetCount: 15,
      })
    ).toBe(
      "72% readiness for Backend Developer, covering 8 of 15 high-demand skills."
    )
  })

  it("splits finding sentences into segments highlighting leading subject and key figures", () => {
    const segs = splitFindingIntoSegments(
      "Kubernetes leads demand growth for Software Engineer, appearing in 31% of postings (+6.0 pp over the trailing 3-month window)."
    )
    const highlighted = segs.filter((s) => s.highlight).map((s) => s.text)
    expect(highlighted).toContain("Kubernetes")
    expect(highlighted).toContain("31%")
    expect(highlighted).toContain("+6.0 pp")
    expect(segs.map((s) => s.text).join("")).toBe(
      "Kubernetes leads demand growth for Software Engineer, appearing in 31% of postings (+6.0 pp over the trailing 3-month window)."
    )
  })
})
