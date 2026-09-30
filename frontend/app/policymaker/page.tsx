import { ArrowDownRight, ArrowUpRight, Minus, Users, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
import { policymakerFields as dummyFields, policymakerGapSkills as dummyGapSkills, type Demand, type Trend } from "@/lib/skill-data"

const demandStyles: Record<Demand, string> = {
  High: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  Low: "border-red-200 bg-red-50 text-red-700",
}

const trendStyles: Record<Trend, { label: string; icon: typeof ArrowUpRight; className: string }> = {
  rising: { label: "Rising", icon: ArrowUpRight, className: "text-emerald-600" },
  stable: { label: "Stable", icon: Minus, className: "text-slate-500" },
  declining: { label: "Declining", icon: ArrowDownRight, className: "text-red-500" },
}

type FieldRow = {
  field: string
  demand: Demand
  trend: Trend
  avgOpenings: number
}

async function fetchPolicymakerData(): Promise<{
  fields: FieldRow[]
  distribution: { label: string; count: number; color: string }[]
  gapSkills: string[]
} | null> {
  try {
    const res = await fetch("http://127.0.0.1:8080/api/policymaker", { cache: "no-store" })
    if (!res.ok) throw new Error(`Backend returned ${res.status}`)
    const data = await res.json()

    const fields: FieldRow[] = data.fields.map((f: any) => ({
      field: f.name,
      demand: f.demandLevel as Demand,
      trend: (f.trend as string).toLowerCase() as Trend,
      avgOpenings: f.avgOpenings,
    }))

    const distribution = [
      { label: "High demand", count: data.demandDistribution.High ?? 0, color: "bg-emerald-500" },
      { label: "Medium demand", count: data.demandDistribution.Medium ?? 0, color: "bg-amber-400" },
      { label: "Low demand", count: data.demandDistribution.Low ?? 0, color: "bg-red-400" },
    ]

    return { fields, distribution, gapSkills: data.biggestSkillGaps }
  } catch (err) {
    console.error("Policymaker backend call failed, using placeholder data:", err instanceof Error ? err.message : err)
    return null
  }
}

export default async function PolicymakerPage() {
  const live = await fetchPolicymakerData()

  const fields: FieldRow[] =
    live?.fields ??
    dummyFields.map((f) => ({ field: f.field, demand: f.demand, trend: f.trend, avgOpenings: f.studentsMatched }))

  const distribution = live?.distribution ?? [
    { label: "High demand", count: dummyFields.filter((f) => f.demand === "High").length, color: "bg-emerald-500" },
    { label: "Medium demand", count: dummyFields.filter((f) => f.demand === "Medium").length, color: "bg-amber-400" },
    { label: "Low demand", count: dummyFields.filter((f) => f.demand === "Low").length, color: "bg-red-400" },
  ]

  const gapSkills = live?.gapSkills ?? dummyGapSkills

  const maxCount = Math.max(...distribution.map((item) => item.count))

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Market intelligence</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Skill Demand Overview — All Fields
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                A read-only snapshot of hiring demand across fields, based on seeded market data.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
              Updated this month
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.45fr_0.55fr]">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border/60 bg-sky-50/60">
                <CardTitle>Career fields</CardTitle>
                <CardDescription>Demand and trend by field.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-border/60 bg-muted/35 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 font-medium">Field name</th>
                      <th className="px-4 py-4 font-medium">Demand</th>
                      <th className="px-4 py-4 font-medium">Trend</th>
                      <th className="px-6 py-4 font-medium">Avg. openings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {fields.map((item) => {
                      const trend = trendStyles[item.trend]
                      const TrendIcon = trend.icon
                      return (
                        <tr key={item.field} className="transition-colors hover:bg-sky-50/40">
                          <td className="whitespace-nowrap px-6 py-4 font-semibold text-foreground">{item.field}</td>
                          <td className="px-4 py-4">
                            <Badge variant="outline" className={demandStyles[item.demand]}>{item.demand}</Badge>
                          </td>
                          <td className={`px-4 py-4 ${trend.className}`}>
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              <TrendIcon className="h-4 w-4" aria-hidden="true" /> {trend.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-foreground">{item.avgOpenings.toLocaleString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Demand distribution</CardTitle>
                <CardDescription>Fields by current hiring signal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {distribution.map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="text-muted-foreground">{item.count} fields</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${(item.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3 rounded-xl bg-sky-50 p-4 text-sm text-sky-800">
                  <Users className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>High-demand fields currently lead the dataset.</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 border-primary/15 bg-gradient-to-br from-sky-50 to-teal-50/70">
            <CardHeader>
              <CardTitle>Biggest Skill Gaps This Month</CardTitle>
              <CardDescription>Core skills most in demand across high-growth fields.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {gapSkills.map((skill, index) => (
                <div key={skill} className="flex items-center gap-3 rounded-xl border border-white/80 bg-white/75 p-4 shadow-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{index + 1}</span>
                  <span className="font-semibold text-foreground">{skill}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}