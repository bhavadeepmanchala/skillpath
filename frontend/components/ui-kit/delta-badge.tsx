import React from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export interface DeltaBadgeProps {
  /** Delta as fraction or percentage points. If asPercentagePoints is false (default), value is multiplied by 100 */
  value: number
  asPercentagePoints?: boolean
  showLabel?: boolean
  size?: "sm" | "md"
}

export function DeltaBadge({
  value,
  asPercentagePoints = false,
  showLabel = false,
  size = "md",
}: DeltaBadgeProps) {
  const pp = asPercentagePoints ? value : value * 100
  const isRising = pp > 0.001
  const isDeclining = pp < -0.001

  const sign = isRising ? "+" : ""
  const formatted = `${sign}${pp.toFixed(1)} pp`

  if (isRising) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-medium rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ${
          size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs"
        }`}
        title={`Rising by ${formatted}`}
      >
        <TrendingUp className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <span>{formatted}</span>
        {showLabel && <span className="text-[10px] font-sans uppercase tracking-wider ml-0.5">rising</span>}
        <span className="sr-only">Rising</span>
      </span>
    )
  }

  if (isDeclining) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-medium rounded border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400 ${
          size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs"
        }`}
        title={`Declining by ${formatted}`}
      >
        <TrendingDown className="h-3 w-3 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
        <span>{formatted}</span>
        {showLabel && <span className="text-[10px] font-sans uppercase tracking-wider ml-0.5">declining</span>}
        <span className="sr-only">Declining</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded border border-border bg-muted/60 text-muted-foreground ${
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs"
      }`}
      title={`No change (${formatted})`}
    >
      <Minus className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{formatted}</span>
      {showLabel && <span className="text-[10px] font-sans uppercase tracking-wider ml-0.5">stable</span>}
      <span className="sr-only">Stable</span>
    </span>
  )
}

