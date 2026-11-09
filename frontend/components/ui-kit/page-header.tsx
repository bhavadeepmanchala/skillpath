import React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { DataBadge } from "./data-badge"

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageHeaderProps {
  title: string
  description: string
  breadcrumbs?: BreadcrumbItem[]
  showSyntheticBadge?: boolean
  badge?: React.ReactNode
  actions?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  showSyntheticBadge = true,
  badge,
  actions,
}: PageHeaderProps) {
  return (
    <div className="space-y-2 border-b border-border pb-5">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-normal leading-4 text-muted-foreground">
          {breadcrumbs.map((bc, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />}
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-7">
              {title}
            </h1>
            {showSyntheticBadge && <DataBadge />}
            {badge}
          </div>
          <p className="mt-1 text-sm font-normal text-muted-foreground leading-5 max-w-[70ch]">{description}</p>
        </div>

        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
