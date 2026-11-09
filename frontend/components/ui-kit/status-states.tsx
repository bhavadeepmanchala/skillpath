import React from "react"
import { AlertCircle, RefreshCw, Inbox } from "lucide-react"

export interface ErrorStateProps {
  message?: string
  description?: string
  onRetry?: () => void
  compact?: boolean
}

export function ErrorState({
  message = "Could not load records from the synthetic workforce database.",
  description,
  onRetry,
  compact = false,
}: ErrorStateProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-xs leading-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-border bg-muted/10">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-foreground leading-5">{message}</h3>
      {description && <p className="mt-1 text-xs text-muted-foreground leading-4 max-w-[70ch]">{description}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-resting transition-colors duration-120 active:translate-y-[1px]"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  )
}

export interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
}

export function EmptyState({
  title = "No records found in synthetic catalogue",
  description = "No items matched the selected filters or parameters in the demonstration dataset.",
  icon: Icon = Inbox,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-border bg-muted/5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-foreground leading-5">{title}</h3>
      {description && <p className="mt-1 text-xs text-muted-foreground leading-4 max-w-[70ch]">{description}</p>}
    </div>
  )
}
