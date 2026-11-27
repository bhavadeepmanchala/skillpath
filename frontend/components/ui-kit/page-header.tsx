import React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { DataBadge } from "./data-badge"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageHeaderProps {
  title: string
  description?: string
  /** Plain-language explanation answering what the page answers */
  standfirst?: string
  /** Uppercase kicker label above the title */
  kicker?: string
  /** Optional metadata line under the standfirst */
  meta?: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
  showSyntheticBadge?: boolean
  badge?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  standfirst,
  kicker,
  meta,
  breadcrumbs,
  showSyntheticBadge = true,
  badge,
  actions,
  className = "",
}: PageHeaderProps) {
  const subtitle = standfirst || description

  return (
    <div className={cn("space-y-2 border-b border-border pb-3.5", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs font-normal leading-4 text-muted-foreground"
        >
          {breadcrumbs.map((bc, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <ChevronRight
                    className="h-3 w-3 text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
                )}
                {bc.href && !isLast ? (
                  <Link
                    href={bc.href}
                    className="hover:text-foreground transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                  >
                    {bc.label}
                  </Link>
                ) : (
                  <span className={isLast ? "font-medium text-foreground" : ""}>
                    {bc.label}
                  </span>
                )}
              </React.Fragment>
            )
          })}
        </nav>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          {kicker && (
            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              {kicker}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
              {title}
            </h1>
            {showSyntheticBadge && <DataBadge />}
            {badge}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-sm font-normal text-muted-foreground leading-snug max-w-[70ch] text-balance">
              {subtitle}
            </p>
          )}
          {meta && <div className="pt-0.5 text-xs text-muted-foreground">{meta}</div>}
        </div>

        {actions && <div className="flex items-center gap-2 shrink-0 self-start">{actions}</div>}
      </div>
    </div>
  )
}
