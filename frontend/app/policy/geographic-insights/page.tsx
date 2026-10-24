import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin } from "lucide-react"

export default function GeographicInsightsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Geographic Insights
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Spatial analysis of workforce requirements, commuter mobility, and localized talent clusters.
        </p>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Geographic Insights</CardTitle>
            <CardDescription>County and metropolitan statistical area breakdown</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p className="text-base font-medium text-foreground">Geographic heatmaps & regional distribution module coming soon</p>
          <p className="mt-1 text-sm">Mapping county-level talent supply against local industry hub density.</p>
        </CardContent>
      </Card>
    </div>
  )
}
