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
        className={`inline-flex items-center gap-1 font-mono font-medium rounded border border-positive/30 bg-positive-subtle text-positive-foreground tabular-nums ${
          size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs"
        }`}
        title={`Rising by ${formatted}`}
      >
        <TrendingUp className="h-3 w-3 shrink-0 text-positive" aria-hidden="true" />
        <span>{formatted}</span>
        {showLabel && (
          <span className="text-[10px] font-sans uppercase tracking-wider ml-0.5">
            rising
          </span>
        )}
        <span className="sr-only">Rising</span>
      </span>
    )
  }

  if (isDeclining) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-medium rounded border border-negative/30 bg-negative-subtle text-negative-foreground tabular-nums ${
          size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs"
        }`}
        title={`Declining by ${formatted}`}
      >
        <TrendingDown className="h-3 w-3 shrink-0 text-negative" aria-hidden="true" />
        <span>{formatted}</span>
        {showLabel && (
          <span className="text-[10px] font-sans uppercase tracking-wider ml-0.5">
            declining
          </span>
        )}
        <span className="sr-only">Declining</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded border border-border bg-muted/60 text-muted-foreground tabular-nums ${
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs"
      }`}
      title="Steady / no significant change"
    >
      <Minus className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span>0.0 pp</span>
      {showLabel && (
        <span className="text-[10px] font-sans uppercase tracking-wider ml-0.5">
          steady
        </span>
      )}
      <span className="sr-only">Steady</span>
    </span>
  )
}
