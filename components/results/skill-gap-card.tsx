import { Check, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SkillGapCard({
  yourSkills,
  missingSkills,
}: {
  yourSkills: string[]
  missingSkills: string[]
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Skill Gap</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">Skills you have</p>
          <div className="flex flex-wrap gap-2">
            {yourSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">Missing skills to close the gap</p>
          <div className="flex flex-wrap gap-2">
            {missingSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary ring-1 ring-primary/20"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {skill}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
