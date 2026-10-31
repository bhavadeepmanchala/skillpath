"use client"

import React from "react"
import { LucideIcon } from "lucide-react"
import { useCountUp } from "./motion-hooks"

export interface KpiCardProps {
  label: string
  /** Numeric value for count-up animation */
  rawValue?: number
  /** Formatted string fallback or override */
  value?: string
  footnote?: string
  icon?: LucideIcon
  className?: string
}

export function KpiCard({
  label,
  rawValue,
  value,
  footnote,
  icon: Icon,
  className = "",
}: KpiCardProps) {
  const animatedValue = useCountUp(rawValue !== undefined ? rawValue : 0)

  const displayValue =
    rawValue !== undefined
      ? animatedValue.toLocaleString()
      : value !== undefined
      ? value
      : "-"

  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 text-card-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {Icon && (
          <span className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/80 bg-muted/60">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground font-mono tabular-nums">
        {displayValue}
      </div>

      {footnote && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-1" title={footnote}>
          {footnote}
        </p>
      )}
    </div>
  )
}

