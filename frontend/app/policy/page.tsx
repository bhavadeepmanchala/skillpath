import { ArrowUpRight, TrendingUp, Users, Briefcase, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const kpis = [
  {
    title: "Total Tracked Openings",
    value: "148,290",
    change: "+12.4% vs last mo",
    changeType: "positive",
    description: "Across all monitored regional job postings",
    icon: Briefcase,
  },
  {
    title: "Critical Skill Shortages",
    value: "24",
    change: "3 emerging",
    changeType: "alert",
    description: "High employer demand with low training coverage",
    icon: AlertCircle,
  },
  {
    title: "Workforce Gap Index",
    value: "68.2",
    change: "-4.1% improvement",
    changeType: "positive",
    description: "Aggregate regional alignment score (0-100)",
    icon: TrendingUp,
  },
  {
    title: "Active Job Seekers",
    value: "42,850",
    change: "+8.2% this quarter",
    changeType: "neutral",
    description: "Students & candidates enrolled in pathways",
    icon: Users,
  },
]

export default function PolicyOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Policy Intelligence Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Key metrics and workforce indicators derived from real-time regional labor market intelligence.
        </p>
      </div>

      {/* 4 KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.title} className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  <span
                    className={`font-medium ${
                      kpi.changeType === "positive"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : kpi.changeType === "alert"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {kpi.change}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Regional Alignment Summary</CardTitle>
            <CardDescription>Quarterly progress on bridging curriculum to hiring demand</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Technology & Software Systems</span>
                <span className="text-emerald-600">74% Aligned</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: "74%" }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Healthcare & Clinical Informatics</span>
                <span className="text-emerald-600">68% Aligned</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: "68%" }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Advanced Manufacturing</span>
                <span className="text-amber-600">52% Aligned</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-amber-500" style={{ width: "52%" }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Green Energy & Sustainability</span>
                <span className="text-red-600">41% Aligned</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-red-500" style={{ width: "41%" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Priority Action Items</CardTitle>
            <CardDescription>System recommended policy interventions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border border-border/80 bg-card p-3">
              <p className="font-semibold text-foreground">Fund Cloud & Security Vocational Bootcamps</p>
              <p className="mt-1 text-xs text-muted-foreground">Employer vacancies outpace curriculum output by 3.2x in sub-metro areas.</p>
            </div>
            <div className="rounded-lg border border-border/80 bg-card p-3">
              <p className="font-semibold text-foreground">Incorporate Business Communication in STEM Degrees</p>
              <p className="mt-1 text-xs text-muted-foreground">Soft-skill gap index is highest across technical graduates.</p>
            </div>
            <div className="rounded-lg border border-border/80 bg-card p-3">
              <p className="font-semibold text-foreground">Subsidize Healthcare Informatics Certifications</p>
              <p className="mt-1 text-xs text-muted-foreground">Growing +18% year-over-year in local hospital network solicitations.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
