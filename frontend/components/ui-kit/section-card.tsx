"use client"

import React from "react"
import { Table, BarChart2 } from "lucide-react"

export interface SectionCardProps {
  title: string
  subtitle?: string
  actionSlot?: React.ReactNode
  showViewToggle?: boolean
  viewMode?: "chart" | "table"
  onViewModeChange?: (mode: "chart" | "table") => void
  children: React.ReactNode
  className?: string
}

export function SectionCard({
  title,
  subtitle,
  actionSlot,
  showViewToggle = false,
  viewMode = "chart",
  onViewModeChange,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}
    >
      <div className="flex flex-col gap-2 p-5 pb-4 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {showViewToggle && onViewModeChange && (
            <div
              className="inline-flex rounded-md border border-border bg-muted/40 p-0.5"
              role="group"
              aria-label="Display mode"
            >
              <button
                type="button"
                onClick={() => onViewModeChange("chart")}
                aria-pressed={viewMode === "chart"}
                className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  viewMode === "chart"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Chart</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("table")}
                aria-pressed={viewMode === "table"}
                className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Table className="h-3.5 w-3.5" aria-hidden="true" />
                <span>View as table</span>
              </button>
            </div>
          )}

          {actionSlot}
        </div>
      </div>

      <div className="p-5">{children}</div>
    </div>
  )
}

