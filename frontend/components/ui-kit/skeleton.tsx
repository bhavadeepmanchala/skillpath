import React from "react"

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-muted/70 ${className}`}
      aria-hidden="true"
    />
  )
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-3 w-36" />
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 py-2">
      <div className="flex gap-4 border-b border-border/60 pb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-1.5 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div
      style={{ height }}
      className="flex flex-col justify-end gap-2 p-4 rounded bg-muted/20 border border-dashed border-border"
      aria-hidden="true"
    >
      <div className="flex items-end justify-between gap-3 h-full pt-8">
        <Skeleton className="h-2/5 flex-1" />
        <Skeleton className="h-4/5 flex-1" />
        <Skeleton className="h-3/5 flex-1" />
        <Skeleton className="h-5/6 flex-1" />
        <Skeleton className="h-1/2 flex-1" />
        <Skeleton className="h-3/4 flex-1" />
      </div>
      <div className="flex justify-between pt-2 border-t border-border/40">
        <Skeleton className="h-2 w-12" />
        <Skeleton className="h-2 w-12" />
        <Skeleton className="h-2 w-12" />
        <Skeleton className="h-2 w-12" />
      </div>
    </div>
  )
}

