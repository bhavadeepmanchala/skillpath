import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type SkillGapItem = {
  name: string
  demand_share: number
  course_coverage: number
  growth_factor: number
  gap_score: number
}

const fallbackSkillGaps: SkillGapItem[] = [
  { name: "Business Communication", demand_share: 0.31, course_coverage: 0.0, growth_factor: 1.06, gap_score: 0.33 },
  { name: "Time Management", demand_share: 0.32, course_coverage: 0.05, growth_factor: 1.06, gap_score: 0.32 },
  { name: "Critical Thinking & Problem Solving", demand_share: 0.25, course_coverage: 0.0, growth_factor: 1.03, gap_score: 0.26 },
  { name: "Workplace Ethics & Compliance", demand_share: 0.25, course_coverage: 0.1, growth_factor: 1.05, gap_score: 0.24 },
  { name: "Industrial Safety & OSHA", demand_share: 0.25, course_coverage: 0.15, growth_factor: 1.04, gap_score: 0.22 },
]

async function fetchSkillGaps(): Promise<{ gaps: SkillGapItem[]; isFallback: boolean }> {
  try {
    const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8080"
    const res = await fetch(`${BACKEND_URL}/api/alignment/gaps`, { cache: "no-store" })
    if (!res.ok) throw new Error(`Backend returned ${res.status}`)
    const data: SkillGapItem[] = await res.json()
    return { gaps: data.slice(0, 10), isFallback: false }
  } catch (err) {
    console.error("Skill gaps backend call failed, using fallback data:", err instanceof Error ? err.message : err)
    return { gaps: fallbackSkillGaps, isFallback: true }
  }
}

export default async function WorkforceSkillGapsPage() {
  const { gaps, isFallback } = await fetchSkillGaps()
  const maxGapScore = Math.max(...gaps.map((g) => g.gap_score), 0.001)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Workforce Skill Gaps
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Identifies specific skills experiencing severe disparity between market hiring demand and educational curricula.
        </p>
      </div>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-sky-50/60 flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Skill Gap</CardTitle>
            <CardDescription>
              Ranked disparity between employer hiring demand and course curriculum coverage.
            </CardDescription>
          </div>
          {isFallback && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
              Sample data - backend unavailable
            </Badge>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/35 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Rank & Skill</th>
                <th className="px-4 py-4 font-medium">Demand Share</th>
                <th className="px-4 py-4 font-medium">Course Coverage</th>
                <th className="px-4 py-4 font-medium">Growth</th>
                <th className="px-6 py-4 font-medium min-w-[180px]">Gap Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {gaps.map((item, index) => {
                const demandPct = Math.round(item.demand_share * 100)
                const coveragePct = Math.round(item.course_coverage * 100)
                const growthPct = Math.round((item.growth_factor - 1) * 100)
                const growthFormatted = `${growthPct >= 0 ? "+" : ""}${growthPct}%`
                const barWidthPct = Math.min(100, Math.max(4, Math.round((item.gap_score / maxGapScore) * 100)))

                return (
                  <tr key={item.name} className="transition-colors hover:bg-sky-50/40">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="font-semibold text-foreground">{item.name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                      appears in <span className="font-medium text-foreground">{demandPct}%</span> of postings
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                      <span className="font-medium text-foreground">{coveragePct}%</span> of courses teach it
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 font-medium">
                        {growthFormatted}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${barWidthPct}%` }}
                          />
                        </div>
                        <span className="min-w-[2.5rem] text-right font-mono text-xs font-semibold text-muted-foreground">
                          {item.gap_score.toFixed(2)}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
