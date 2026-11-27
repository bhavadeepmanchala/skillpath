/**
 * Pure fuzzy search and ranking for the Policymaker Command Palette (Ctrl K).
 */

export type PaletteGroup = "Pages" | "Skills" | "Districts" | "Courses" | "Roles"

export interface PaletteEntry {
  id: string
  group: PaletteGroup
  title: string
  subtitle?: string
  keywords?: string[]
  href: string
}

export const POLICY_PAGE_ENTRIES: PaletteEntry[] = [
  {
    id: "page-overview",
    group: "Pages",
    title: "Overview",
    subtitle: "National workforce summary, attention flags & rising/contracting skills",
    keywords: ["home", "summary", "dashboard", "macro"],
    href: "/policy",
  },
  {
    id: "page-skill-demand",
    group: "Pages",
    title: "Skill Demand",
    subtitle: "Top demanded skills by role and district",
    keywords: ["skills", "ranking", "demand", "share"],
    href: "/policy/skill-demand",
  },
  {
    id: "page-skill-gaps",
    group: "Pages",
    title: "Workforce Skill Gaps",
    subtitle: "Course alignment coverage, oversupply flags & national gaps",
    keywords: ["gaps", "explorer", "obsolete", "oversupplied", "coverage"],
    href: "/policy/workforce-skill-gaps",
  },
  {
    id: "page-course-recommendations",
    group: "Pages",
    title: "Course Recommendations",
    subtitle: "Split view of taught skills vs market additions per course",
    keywords: ["curriculum", "add", "retire", "syllabus", "course"],
    href: "/policy/course-recommendations",
  },
  {
    id: "page-district-plan",
    group: "Pages",
    title: "District Plan",
    subtitle: "Seat capacity, trainer staffing & curriculum actions per district",
    keywords: ["seats", "trainers", "reduce", "revise", "expand", "keep"],
    href: "/policy/district-plan",
  },
  {
    id: "page-employer-validation",
    group: "Pages",
    title: "Employer Validation",
    subtitle: "Confirm or dispute skill requirements with confidence from employer votes",
    keywords: ["validate", "confirm", "dispute", "feedback", "votes"],
    href: "/policy/employer-validation",
  },
  {
    id: "page-job-market-trends",
    group: "Pages",
    title: "Job Market Trends",
    subtitle: "Previous vs latest window dumbbell trajectories",
    keywords: ["trends", "rising", "declining", "momentum", "dumbbell"],
    href: "/policy/job-market-trends",
  },
  {
    id: "page-geographic-insights",
    group: "Pages",
    title: "Geographic Insights",
    subtitle: "40-district hiring volume comparison and regional skill profiles",
    keywords: ["districts", "states", "geography", "india", "regional"],
    href: "/policy/geographic-insights",
  },
]

/**
 * Deterministic fuzzy match score (higher is better; 0 means no match).
 * Priority:
 *  100 = exact title match
 *   80 = title starts with query
 *   60 = word in title starts with query
 *   45 = title contains query substring
 *   30 = subtitle or keyword contains query substring
 *   15 = ordered subsequence match in title
 */
export function fuzzyScore(query: string, entry: PaletteEntry): number {
  const q = query.trim().toLowerCase()
  if (!q) return 1

  const title = entry.title.toLowerCase()
  const subtitle = (entry.subtitle ?? "").toLowerCase()
  const keywords = (entry.keywords ?? []).join(" ").toLowerCase()

  if (title === q) return 100
  if (title.startsWith(q)) return 80

  const words = title.split(/[\s\-_/&]+/)
  if (words.some((w) => w.startsWith(q))) return 60

  if (title.includes(q)) return 45
  if (keywords.includes(q) || subtitle.includes(q)) return 30

  // Ordered subsequence match
  let qi = 0
  for (let i = 0; i < title.length && qi < q.length; i++) {
    if (title[i] === q[qi]) qi++
  }
  if (qi === q.length) return 15

  return 0
}

const GROUP_ORDER: PaletteGroup[] = [
  "Pages",
  "Districts",
  "Courses",
  "Roles",
  "Skills",
]

export function searchPaletteEntries(
  query: string,
  entries: PaletteEntry[],
  limitPerGroup: number = 6
): { groups: Array<{ group: PaletteGroup; items: PaletteEntry[] }>; total: number } {
  const trimmed = query.trim()
  const scored: Array<{ entry: PaletteEntry; score: number; index: number }> = []

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const score = fuzzyScore(trimmed, entry)
    if (score > 0) {
      scored.push({ entry, score, index: i })
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.entry.group === "Pages" && b.entry.group === "Pages") {
      return a.index - b.index
    }
    return a.entry.title.localeCompare(b.entry.title)
  })

  const grouped = new Map<PaletteGroup, PaletteEntry[]>()
  for (const g of GROUP_ORDER) {
    grouped.set(g, [])
  }

  for (const { entry } of scored) {
    const list = grouped.get(entry.group)
    if (list && list.length < limitPerGroup) {
      list.push(entry)
    }
  }

  const groups: Array<{ group: PaletteGroup; items: PaletteEntry[] }> = []
  let total = 0
  for (const g of GROUP_ORDER) {
    const items = grouped.get(g) ?? []
    if (items.length > 0) {
      groups.push({ group: g, items })
      total += items.length
    }
  }

  return { groups, total }
}
