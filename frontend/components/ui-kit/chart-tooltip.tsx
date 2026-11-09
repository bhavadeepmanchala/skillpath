"use client"

import React from "react"

export interface ChartTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  valueFormatter?: (val: number, name?: string) => string
  labelFormatter?: (label: string) => string
}

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (v) => v.toLocaleString(),
  labelFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const title = labelFormatter ? labelFormatter(label || "") : label

  return (
    <div className="rounded-md border border-border bg-popover/95 p-2.5 text-xs text-popover-foreground shadow-raised backdrop-blur-xs min-w-[140px]">
      {title && (
        <div className="font-semibold text-foreground mb-1.5 pb-1 border-b border-border">
          {title}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((item, idx) => {
          const color = item.color || item.fill || item.stroke || "var(--primary)"
          const val = typeof item.value === "number" ? valueFormatter(item.value, item.name) : item.value

          return (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="h-2 w-2 rounded-xs shrink-0"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="text-muted-foreground truncate">{item.name}</span>
              </div>
              <span className="font-mono font-medium text-foreground tabular-nums shrink-0">
                {val}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
