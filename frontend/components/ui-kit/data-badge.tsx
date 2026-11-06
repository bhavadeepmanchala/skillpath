import React from "react"
import { Database } from "lucide-react"
import { LOW_SAMPLE_THRESHOLD } from "@/lib/demand-api"

export function DataBadge({ label = "Synthetic data" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/50 bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
      title="This dataset was generated deterministically for demonstration purposes."
    >
      <Database className="h-3 w-3 shrink-0" aria-hidden="true" />
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
      className={`inline-flex items-center rounded border border-amber-400/50 bg-amber-50 px-1 py-0.5 text-[9px] font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 ${className}`}
      title={`Low sample size: fewer than ${threshold} postings for this skill in the latest window; district views have smaller samples (display caution only)`}
    >
      low sample
    </span>
  )
}
