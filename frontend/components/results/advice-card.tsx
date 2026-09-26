import { Sparkles } from "lucide-react"

export function AdviceCard({ advice }: { advice: string }) {
  return (
    <section aria-label="AI-generated advice" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-foreground">SkillPath AI advice</p>
      </div>
      <div className="relative rounded-2xl rounded-tl-sm border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/40 p-5 shadow-sm">
        <p className="text-pretty leading-relaxed text-foreground/90">{advice}</p>
      </div>
    </section>
  )
}
