import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Demand, Trend } from "@/lib/skill-data"

const demandStyles: Record<Demand, string> = {
  High: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  Medium: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  Low: "bg-red-100 text-red-700 ring-1 ring-red-200",
}

const trendConfig: Record<Trend, { icon: typeof TrendingUp; label: string; className: string }> = {
  rising: { icon: TrendingUp, label: "Rising", className: "text-emerald-600" },
  stable: { icon: Minus, label: "Stable", className: "text-amber-600" },
  declining: { icon: TrendingDown, label: "Declining", className: "text-red-600" },
}

export function BestMatchCard({
  field,
  matchScore,
  demand,
  trend,
}: {
  field: string
  matchScore: number
  demand: Demand
  trend: Trend
}) {
  const TrendIcon = trendConfig[trend].icon

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">Best Matching Field</p>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
              demandStyles[demand],
            )}
          >
            {demand} demand
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">{field}</h2>
          <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", trendConfig[trend].className)}>
            <TrendIcon className="h-4 w-4" aria-hidden="true" />
            {trendConfig[trend].label}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Skill match</span>
            <span className="font-semibold text-foreground">{matchScore}%</span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={matchScore}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Skill match percentage"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${matchScore}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
