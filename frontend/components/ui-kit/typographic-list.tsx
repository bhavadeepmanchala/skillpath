"use client"

import React, { useId } from "react"
import { motion } from "motion/react"
import { ArrowRight, Search } from "lucide-react"
import { usePrefersReducedMotion } from "./motion-hooks"
import { cn } from "@/lib/utils"

export interface TypographicRowProps {
  /** Primary title (semibold sans, wraps cleanly) */
  title: string
  /** Secondary muted label (category, state, sector, etc.) */
  subtitle?: string
  /** Optional rank index (1-based) */
  rank?: number
  /** Optional inline badges (LowSampleBadge, DeltaBadge, etc.) */
  badges?: React.ReactNode
  /** Right-aligned serif tabular numeral primary figure */
  primaryFigure?: React.ReactNode
  /** Optional secondary figure or unit beside primary figure */
  secondaryFigure?: React.ReactNode
  /** Click handler (opens drawer in 1 click) */
  onClick?: () => void
  /** Highlighted / active row */
  active?: boolean
  /** Optional stagger index */
  staggerIndex?: number
  /** Optional visual bar / dumbbell underneath or inline */
  visual?: React.ReactNode
  ariaLabel?: string
  className?: string
}

export function TypographicRow({
  title,
  subtitle,
  rank,
  badges,
  primaryFigure,
  secondaryFigure,
  onClick,
  active = false,
  staggerIndex = 0,
  visual,
  ariaLabel,
  className = "",
}: TypographicRowProps) {
  const reducedMotion = usePrefersReducedMotion()

  const content = (
    <div className="w-full space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Left: Rank + Semibold Sans Name + Muted Category */}
        <div className="flex items-baseline gap-2.5 min-w-0 flex-1">
          {rank !== undefined && (
            <span className="w-5 shrink-0 font-mono text-[11px] font-medium text-muted-foreground tabular-nums">
              {rank}
            </span>
          )}
          <div className="min-w-0">
            <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors break-words">
              {title}
            </span>
            {subtitle && (
              <span className="ml-2 text-xs text-muted-foreground break-words">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Right: Badges + Serif Tabular Figures + Hover Arrow */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 shrink-0 self-start sm:self-center">
          {badges}
          {(primaryFigure !== undefined || secondaryFigure !== undefined) && (
            <div className="flex items-baseline gap-2 text-right">
              {secondaryFigure && (
                <span className="text-xs font-mono tabular-nums text-muted-foreground">
                  {secondaryFigure}
                </span>
              )}
              {primaryFigure !== undefined && (
                <span className="font-serif text-base font-bold tabular-nums text-foreground">
                  {primaryFigure}
                </span>
              )}
            </div>
          )}
          {onClick && (
            <ArrowRight
              className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-all duration-120 shrink-0 hidden sm:block"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {visual}
    </div>
  )

  const rowClass = cn(
    "group w-full text-left py-2.5 px-2 -mx-2 rounded-md transition-colors duration-120",
    active
      ? "bg-primary/[0.07] border-l-2 border-l-primary pl-2.5"
      : "hover:bg-primary/[0.04]",
    onClick ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : "",
    className
  )

  const staggerDelay = reducedMotion || staggerIndex >= 12 ? 0 : staggerIndex * 0.03

  if (onClick) {
    return (
      <motion.button
        type="button"
        layout={!reducedMotion}
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reducedMotion ? 0 : 0.2,
          delay: staggerDelay,
        }}
        onClick={onClick}
        aria-label={ariaLabel}
        className={rowClass}
      >
        {content}
      </motion.button>
    )
  }

  return (
    <motion.div
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reducedMotion ? 0 : 0.2,
        delay: staggerDelay,
      }}
      aria-label={ariaLabel}
      className={rowClass}
    >
      {content}
    </motion.div>
  )
}

export interface TypographicListProps {
  children: React.ReactNode
  totalCount: number
  visibleCount: number
  showAll: boolean
  onToggleShowAll?: () => void
  searchQuery?: string
  onSearchChange?: (q: string) => void
  searchPlaceholder?: string
  showSearchThreshold?: number
  itemLabel?: string
  className?: string
}

export function TypographicList({
  children,
  totalCount,
  visibleCount,
  showAll,
  onToggleShowAll,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search items...",
  showSearchThreshold = 15,
  itemLabel = "items",
  className = "",
}: TypographicListProps) {
  const searchId = useId()
  const showSearch = onSearchChange !== undefined && totalCount > showSearchThreshold

  return (
    <div className={cn("space-y-3", className)}>
      {showSearch && (
        <div className="relative max-w-sm">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={searchId}
            name={searchId}
            type="text"
            value={searchQuery ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      <div className="divide-y divide-border/70 border-t border-b border-border/70">
        {children}
      </div>

      {totalCount > 10 && onToggleShowAll && (
        <div className="flex items-center justify-between pt-2 text-xs">
          <span className="text-muted-foreground">
            Showing {visibleCount} of {totalCount} {itemLabel}
          </span>
          <button
            type="button"
            onClick={onToggleShowAll}
            className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1"
          >
            {showAll ? "Show top 10" : `Show all ${totalCount}`}
          </button>
        </div>
      )}
    </div>
  )
}
