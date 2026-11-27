"use client"

import React, { useRef } from "react"
import { Database, Calendar, MapPin } from "lucide-react"
import { motion, useInView } from "motion/react"
import { DeltaBadge } from "./delta-badge"
import { useCountUp, usePrefersReducedMotion } from "./motion-hooks"
import { splitFindingIntoSegments } from "@/lib/findings"
import { cn } from "@/lib/utils"

/* ==========================================================================
   FindingHeadline: An editorial finding sentence with a caption / meta slot.
   ========================================================================== */

export interface FindingHeadlineProps {
  /** The finding sentence stating what the data shows */
  sentence: string
  /** Optional kicker or category label above the headline */
  kicker?: string
  /** Slot for caption or metadata (e.g. SourceCaption) */
  children?: React.ReactNode
  className?: string
}

export function FindingHeadline({
  sentence,
  kicker,
  children,
  className = "",
}: FindingHeadlineProps) {
  const reducedMotion = usePrefersReducedMotion()
  const segments = splitFindingIntoSegments(sentence)

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.24, ease: "easeOut" }}
      className={cn("space-y-1 border-l-[3px] border-primary pl-3.5", className)}
    >
      {kicker && (
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-primary">
          {kicker}
        </span>
      )}
      <h3 className="font-serif text-base sm:text-lg font-semibold tracking-tight text-foreground leading-snug text-balance">
        {segments.length > 0
          ? segments.map((seg, i) =>
              seg.highlight ? (
                <span
                  key={i}
                  className="font-bold underline decoration-primary/40 decoration-2 underline-offset-4"
                >
                  {seg.text}
                </span>
              ) : (
                <React.Fragment key={i}>{seg.text}</React.Fragment>
              )
            )
          : sentence}
      </h3>
      {children && <div className="mt-0.5 text-xs text-muted-foreground">{children}</div>}
    </motion.div>
  )
}

/* ==========================================================================
   BigNumber: Large serif figure, small uppercase label, optional delta.
   Replaces boxed card-in-card KPIs with quiet editorial elegance.
   ========================================================================== */

export interface BigNumberProps {
  /** Label describing the metric */
  label: string
  /** Numeric value for animated count-up */
  rawValue?: number
  /** String value or formatted figure */
  value?: string | number
  /** Optional delta badge */
  delta?: {
    value: number
    asPercentagePoints?: boolean
  }
  /** Footnote or explanatory text */
  footnote?: string
  /** Whether to animate with count-up */
  animate?: boolean
  /** Visual size variant: numeric (large serif) or text (compact serif for names/titles) */
  size?: "numeric" | "text"
  className?: string
}

export function BigNumber({
  label,
  rawValue,
  value,
  delta,
  footnote,
  animate = true,
  size,
  sparkline,
  className = "",
}: BigNumberProps & { sparkline?: number[] }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const isInView = useInView(ref, { once: true, margin: "-20px" })
  const animated = useCountUp(
    rawValue !== undefined ? rawValue : 0,
    500,
    animate && isInView
  )

  let display: string
  let finalDisplay: string
  if (rawValue !== undefined) {
    finalDisplay = rawValue.toLocaleString("en-IN")
    display = animate ? animated.toLocaleString("en-IN") : finalDisplay
  } else if (value !== undefined) {
    finalDisplay = typeof value === "number" ? value.toLocaleString("en-IN") : String(value)
    display = finalDisplay
  } else {
    finalDisplay = "—"
    display = "—"
  }

  // Auto-detect text-valued BigNumbers (e.g. skill names or course titles) so they fit on 1–2 lines cleanly
  const isTextVal =
    size === "text" ||
    (size !== "numeric" &&
      rawValue === undefined &&
      typeof value === "string" &&
      /[a-zA-Z]{2,}/.test(value) &&
      value.length > 6)

  return (
    <div ref={ref} className={cn("flex flex-col justify-between", className)}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-4">
        {label}
      </div>

      <div className="mt-1 flex items-baseline gap-2.5 flex-wrap">
        {rawValue !== undefined && animate && (
          <span className="sr-only">{finalDisplay}</span>
        )}
        <span
          aria-hidden={rawValue !== undefined && animate ? true : undefined}
          className={cn(
            "font-serif font-bold tracking-tight text-foreground tabular-nums",
            isTextVal
              ? "text-lg sm:text-xl leading-snug"
              : "text-2xl sm:text-3xl leading-none"
          )}
        >
          {display}
        </span>
        {delta && (
          <DeltaBadge
            value={delta.value}
            asPercentagePoints={delta.asPercentagePoints}
            size="sm"
          />
        )}
        {sparkline && sparkline.length >= 2 && <MiniSparkline points={sparkline} />}
      </div>

      {footnote && (
        <p className="mt-1 text-xs text-muted-foreground leading-4">
          {footnote}
        </p>
      )}
    </div>
  )
}

/* ==========================================================================
   MiniSparkline: Quiet inline SVG sparkline for figures backed by a series.
   ========================================================================== */

export function MiniSparkline({
  points,
  className = "",
}: {
  points: number[]
  className?: string
}) {
  if (points.length < 2) return null
  const width = 56
  const height = 20
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const coords = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1)) * width
      const y = height - 2 - ((val - min) / span) * (height - 4)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0 text-primary overflow-visible", className)}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  )
}

/* ==========================================================================
   FigureRow: Editorial row of large serif figures separated by hairline rules.
   Replaces boxed KPI cards with open, scannable typography.
   ========================================================================== */

export function FigureRow({
  children,
  columns = 4,
  className = "",
}: {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 6
  className?: string
}) {
  const gridCols =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
      ? "sm:grid-cols-3"
      : columns === 6
      ? "sm:grid-cols-3 lg:grid-cols-6"
      : "sm:grid-cols-2 lg:grid-cols-4"

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-y-4 sm:gap-y-5 divide-y sm:divide-y-0 sm:divide-x divide-border border-y border-border py-3",
        gridCols,
        className
      )}
    >
      {React.Children.map(children, (child) =>
        child ? (
          <div className="pt-4 first:pt-0 sm:pt-0 sm:px-5 sm:first:pl-0 sm:last:pr-0">
            {child}
          </div>
        ) : null
      )}
    </div>
  )
}

/* ==========================================================================
   SectionHeader: Hairline rule + serif title + plain-language subtitle.
   Replaces card wrappers around ordinary page sections.
   ========================================================================== */

export interface SectionHeaderProps {
  title: string
  subtitle?: string
  kicker?: string
  actions?: React.ReactNode
  className?: string
}

export function SectionHeader({
  title,
  subtitle,
  kicker,
  actions,
  className = "",
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between pt-4 border-t border-border pb-3",
        className
      )}
    >
      <div className="space-y-0.5 max-w-[65ch]">
        {kicker && (
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-primary">
            {kicker}
          </span>
        )}
        <h2 className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-foreground leading-snug">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  )
}

/* ==========================================================================
   SourceCaption: Window, Scope and "Synthetic data" transparency caption.
   ========================================================================== */

export interface SourceCaptionProps {
  /** Time window (e.g. "Jul 2026 – Sep 2026") */
  window?: string
  /** Geographic or role scope (e.g. "National", "District: Pune") */
  scope?: string
  /** Additional custom note */
  note?: string
  /** Whether to show the synthetic data tag (default true) */
  showSynthetic?: boolean
  className?: string
}

export function SourceCaption({
  window,
  scope = "National",
  note,
  showSynthetic = true,
  className = "",
}: SourceCaptionProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground leading-4",
        className
      )}
    >
      {showSynthetic && (
        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
          <Database className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>Synthetic data</span>
        </span>
      )}

      {scope && (
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>Scope: {scope}</span>
        </span>
      )}

      {window && (
        <span className="inline-flex items-center gap-1 font-mono">
          <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>{window}</span>
        </span>
      )}

      {note && <span>&middot; {note}</span>}
    </div>
  )
}

/* ==========================================================================
   SectionRule: Editorial dividing rule between major narrative sections.
   ========================================================================== */

export interface SectionRuleProps {
  label?: string
  className?: string
}

export function SectionRule({ label, className = "" }: SectionRuleProps) {
  if (!label) {
    return <hr className={cn("border-0 border-t border-border my-8 sm:my-12", className)} />
  }

  return (
    <div className={cn("relative my-8 sm:my-12 flex items-center justify-center", className)}>
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative bg-background px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  )
}
