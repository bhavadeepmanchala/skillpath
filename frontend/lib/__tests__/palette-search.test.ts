import { describe, it, expect } from "vitest"
import {
  fuzzyScore,
  searchPaletteEntries,
  POLICY_PAGE_ENTRIES,
  type PaletteEntry,
} from "../palette-search"

const SAMPLE_ENTRIES: PaletteEntry[] = [
  ...POLICY_PAGE_ENTRIES,
  {
    id: "district-15",
    group: "Districts",
    title: "Ahmedabad",
    subtitle: "Gujarat · District Plan & Regional Demand",
    keywords: ["Gujarat", "district"],
    href: "/policy/district-plan?district=15",
  },
  {
    id: "course-21",
    group: "Courses",
    title: "Legacy Retail & Point of Sale Operations",
    subtitle: "Retail · Course Recommendations",
    keywords: ["Retail", "course"],
    href: "/policy/course-recommendations?course=21",
  },
  {
    id: "skill-1",
    group: "Skills",
    title: "Kubernetes",
    subtitle: "Cloud & DevOps · k8s",
    keywords: ["k8s", "Cloud"],
    href: "/policy/skill-demand?skill=Kubernetes",
  },
]

describe("fuzzyScore", () => {
  it("ranks exact match > prefix > word boundary > substring > keyword/subsequence", () => {
    const k8s = SAMPLE_ENTRIES.find((e) => e.id === "skill-1")!
    expect(fuzzyScore("kubernetes", k8s)).toBe(100)
    expect(fuzzyScore("kuber", k8s)).toBe(80)
    expect(fuzzyScore("ernet", k8s)).toBe(45)
    expect(fuzzyScore("k8s", k8s)).toBe(30)
    expect(fuzzyScore("kbts", k8s)).toBe(15)
    expect(fuzzyScore("zzzz", k8s)).toBe(0)
  })
})

describe("searchPaletteEntries", () => {
  it("returns grouped results for matching query", () => {
    const res = searchPaletteEntries("ahmed", SAMPLE_ENTRIES)
    expect(res.total).toBe(1)
    expect(res.groups[0].group).toBe("Districts")
    expect(res.groups[0].items[0].href).toBe("/policy/district-plan?district=15")
  })

  it("caps items per group and returns empty for non-matching query", () => {
    const empty = searchPaletteEntries("xyznonexistent", SAMPLE_ENTRIES)
    expect(empty.total).toBe(0)
    expect(empty.groups).toHaveLength(0)

    const capped = searchPaletteEntries("", SAMPLE_ENTRIES, 3)
    const pagesGroup = capped.groups.find((g) => g.group === "Pages")
    expect(pagesGroup?.items.length).toBe(3)
    expect(pagesGroup?.items.map((p) => p.title)).toEqual([
      "Overview",
      "Skill Demand",
      "Workforce Skill Gaps",
    ])
  })

  it("uses plain language for Employer Validation in Pages entries", () => {
    const ev = POLICY_PAGE_ENTRIES.find((p) => p.id === "page-employer-validation")
    expect(ev?.subtitle).toContain("confidence from employer votes")
    expect(ev?.subtitle).not.toContain("Bayesian")
  })
})
