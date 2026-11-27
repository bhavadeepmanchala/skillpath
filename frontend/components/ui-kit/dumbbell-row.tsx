"use client"

import React from "react"
import { motion } from "motion/react"
import { computeDumbbellPositions } from "@/lib/dumbbell"
import { usePrefersReducedMotion } from "./motion-hooks"
import { cn } from "@/lib/utils"

export interface DumbbellRowProps {
  /** Primary label (skill name, course name, etc.) */
  label: string
  /** Secondary muted label (category, district, state, etc.) */
  sublabel?: string
  /** Optional rank index (1-based) */
  rank?: number
  /** Previous / baseline value on the 0..maxScale axis */
  previousValue: number
  /** Latest / target value on the 0..maxScale axis */
  latestValue: number
  /** Common axis maximum across all rows in the list */
  maxScale: number
  /** Formatted previous readout (e.g. "12.4%" or "110") */
  previousText: string
  /** Formatted latest readout (e.g. "18.9%" or "28") */
  latestText: string
  /** Optional delta badge or inline text beside/above the readout */
  badge?: React.ReactNode
  /** Semantic tone: "positive" (blue), "negative" (ochre), "neutral" (primary/slate), or "auto" */
  tone?: "positive" | "negative" | "neutral" | "auto"
  /** Labelled arrow between previous and latest when they differ (default true) */
  showDirectionArrow?: boolean
  /** Click handler (opens drawer, selects row, etc.) */
  onClick?: () => void
  /** Highlighted / active state */
  active?: boolean
  /** Stagger index for initial entrance */
  staggerIndex?: number
  /** Accessible description for screen readers */
  ariaLabel?: string
  className?: string
}

export function DumbbellRow({
  label,
  sublabel,
  rank,
  previousValue,
  latestValue,
  maxScale,
  previousText,
  latestText,
  badge,
  tone = "auto",
  showDirectionArrow = true,
  onClick,
  active = false,
  staggerIndex = 0,
  ariaLabel,
  className = "",
}: DumbbellRowProps) {
  const reducedMotion = usePrefersReducedMotion()
  const pos = computeDumbbellPositions(previousValue, latestValue, maxScale)

  const resolvedTone =
    tone === "auto"
      ? pos.direction === "up"
        ? "positive"
        : pos.direction === "down"
        ? "negative"
        : "neutral"
      : tone

  const fillClass =
    resolvedTone === "positive"
      ? "bg-positive"
      : resolvedTone === "negative"
      ? "bg-negative"
      : "bg-primary"

  const textClass =
    resolvedTone === "positive"
      ? "text-positive-foreground"
      : resolvedTone === "negative"
      ? "text-negative-foreground"
      : "text-foreground"

  const isFlat = pos.direction === "flat"
  const transitionConfig = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 260, damping: 28, mass: 0.8 }

  const inner = (
    <div className="flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-2 sm:gap-4 w-full text-xs">
      {/* Col 1: Rank, Name & Category/Meta (wraps cleanly, never truncated) */}
      <div className="sm:col-span-5 flex items-baseline gap-2.5 min-w-0">
        {rank !== undefined && (
          <span className="w-5 shrink-0 font-mono text-[11px] font-medium text-muted-foreground tabular-nums">
            {rank}
          </span>
        )}
        <div className="min-w-0">
          <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors break-words">
            {label}
          </span>
          {sublabel && (
            <span className="ml-2 text-xs text-muted-foreground break-words">
              {sublabel}
            </span>
          )}
        </div>
      </div>

      {/* Col 2: Dumbbell Track on 0..maxScale */}
      <div className="sm:col-span-4 relative h-6 flex items-center" aria-hidden="true">
        {/* Zero baseline & subtle 50% / 100% ticks */}
        <div className="absolute inset-y-1 left-0 w-px bg-border" />
        <div className="absolute inset-y-1.5 left-1/2 w-px border-l border-dashed border-border/70" />
        <div className="absolute inset-y-1.5 right-0 w-px bg-border/60" />
        <div className="w-full h-px bg-border/80" />

        {/* Connecting bar between previous and latest (only when they differ) */}
        {!isFlat && (
          <motion.div
            className={cn("absolute h-1 rounded-full", fillClass)}
            initial={
              reducedMotion
                ? { left: `${pos.lineStartPct}%`, width: `${Math.max(1, pos.lineWidthPct)}%` }
                : { left: `${pos.prevPct}%`, width: "0%" }
            }
            animate={{
              left: `${pos.lineStartPct}%`,
              width: `${Math.max(1, pos.lineWidthPct)}%`,
            }}
            transition={transitionConfig}
          />
        )}

        {/* Previous dot (hollow circle) — omitted if flat so a single solid dot is drawn */}
        {!isFlat && (
          <div
            className="absolute h-2.5 w-2.5 -ml-1.25 rounded-full border-2 border-muted-foreground bg-background"
            style={{ left: `${pos.prevPct}%` }}
          />
        )}

        {/* Latest dot (solid circle, slides from previous to latest) */}
        <motion.div
          className={cn(
            "absolute h-3.5 w-3.5 -ml-1.75 rounded-full border-2 border-background shadow-xs",
            fillClass
          )}
          initial={reducedMotion ? { left: `${pos.latestPct}%` } : { left: `${pos.prevPct}%` }}
          animate={{ left: `${pos.latestPct}%` }}
          transition={transitionConfig}
        />
      </div>

      {/* Col 3: Direct Values + Optional Badge */}
      <div className="sm:col-span-3 flex flex-wrap items-center justify-between sm:justify-end gap-2 font-mono tabular-nums">
        {isFlat ? (
          <span className="font-serif text-sm font-bold text-foreground">
            {latestText}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px]">
            <span className="text-muted-foreground">{previousText}</span>
            {showDirectionArrow && (
              <span className="text-muted-foreground" aria-hidden="true">
                &rarr;
              </span>
            )}
            <span className={cn("font-serif text-sm font-bold", textClass)}>
              {latestText}
            </span>
          </span>
        )}
        {badge}
      </div>
    </div>
  )

  const containerClass = cn(
    "group w-full text-left py-3 px-2 -mx-2 rounded-md transition-colors duration-120",
    active ? "bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/40",
    onClick ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : "",
    className
  )

  const computedAria =
    ariaLabel ||
    (isFlat
      ? `${label}: ${latestText}`
      : `${label}: from ${previousText} to ${latestText}`)

  if (onClick) {
    return (
      <motion.button
        type="button"
        layout={!reducedMotion}
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reducedMotion ? 0 : 0.2,
          delay: reducedMotion ? 0 : Math.min(staggerIndex * 0.025, 0.25),
        }}
        onClick={onClick}
        aria-label={computedAria}
        className={containerClass}
      >
        {inner}
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
        delay: reducedMotion ? 0 : Math.min(staggerIndex * 0.025, 0.25),
      }}
      aria-label={computedAria}
      className={containerClass}
    >
      {inner}
    </motion.div>
  )
}

export function DumbbellScaleHeader({
  leftLabel = "Item",
  maxScale,
  unit = "%",
  rightLabel = "Prev → Latest",
}: {
  leftLabel?: string
  maxScale: number
  unit?: string
  rightLabel?: string
}) {
  return (
    <div className="hidden sm:grid sm:grid-cols-12 items-center gap-4 pb-2 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
      <div className="col-span-5">{leftLabel}</div>
      <div className="col-span-4 flex items-center justify-between">
        <span>0{unit}</span>
        <span>{Math.round(maxScale / 2)}{unit}</span>
        <span>{maxScale}{unit}</span>
      </div>
      <div className="col-span-3 text-right">{rightLabel}</div>
    </div>
  )
}
