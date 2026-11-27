import React from "react"
import { Database, AlertTriangle } from "lucide-react"
import { LOW_SAMPLE_THRESHOLD } from "@/lib/demand-api"

export function DataBadge({ label = "Synthetic data" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
      title="This dataset was generated deterministically for demonstration purposes."
    >
      <Database className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}

export function LowSampleBadge({
  threshold = LOW_SAMPLE_THRESHOLD,
  className = "",
}: {
  threshold?: number
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-attention/30 bg-attention-subtle px-1.5 py-0.5 text-[10px] font-semibold text-attention-foreground uppercase tracking-wider ${className}`}
      title={`Low sample size: fewer than ${threshold} postings for this skill in the latest window; district views have smaller samples (display caution only)`}
    >
      <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-attention" aria-hidden="true" />
      <span>low sample</span>
    </span>
  )
}
