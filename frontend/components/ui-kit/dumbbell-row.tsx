"use client"

import React, { useRef, useEffect } from "react"
import { motion } from "motion/react"
import { computeDumbbellPositions, getDumbbellConnectorMeta } from "@/lib/dumbbell"
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
  const hasDrawnRef = useRef(false)
  useEffect(() => {
    hasDrawnRef.current = true
  }, [])

  const pos = computeDumbbellPositions(previousValue, latestValue, maxScale)
  const meta = getDumbbellConnectorMeta(pos)

  const resolvedTone =
    tone === "auto" ? meta.tone : tone

  const fillClass =
    resolvedTone === "positive"
      ? "bg-positive"
      : resolvedTone === "negative"
      ? "bg-negative"
      : "bg-muted-foreground"

  const arrowColorClass =
    resolvedTone === "positive"
      ? "text-positive"
      : resolvedTone === "negative"
      ? "text-negative"
      : "text-muted-foreground"

  const textClass =
    resolvedTone === "positive"
      ? "text-positive-foreground"
      : resolvedTone === "negative"
      ? "text-negative-foreground"
      : "text-foreground"

  const isFlat = pos.direction === "flat"
  const tweenConfig = reducedMotion
    ? { duration: 0 }
    : { duration: 0.35, ease: "easeOut" as const }
  const connectorOrigin = pos.direction === "up" ? "left center" : "right center"
  const staggerDelay = reducedMotion || staggerIndex >= 12 ? 0 : staggerIndex * 0.03

  const inner = (
    <div className="flex flex-col @[620px]:grid @[620px]:grid-cols-[minmax(0,1.25fr)_minmax(220px,1.35fr)_minmax(0,auto)] @[620px]:items-center gap-1.5 @[620px]:gap-4 w-full text-xs">
      {/* Narrow Line 1 / Wide Col 1: Rank, Name, and (when narrow) Badges on the right */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-baseline gap-2.5 min-w-0 flex-1">
          {rank !== undefined && (
            <span className="w-5 shrink-0 font-mono text-[11px] font-medium text-muted-foreground tabular-nums">
              {rank}
            </span>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors break-words leading-snug">
              {label}
            </div>
            {sublabel && (
              <div className="mt-0.5 text-xs text-muted-foreground break-words leading-tight">
                {sublabel}
              </div>
            )}
          </div>
        </div>
        {badge && (
          <div className="@[620px]:hidden flex items-center gap-1.5 flex-wrap justify-end shrink-0">
            {badge}
          </div>
        )}
      </div>

      {/* Narrow Line 3 (full width) / Wide Col 2: Dumbbell Track on 0..maxScale */}
      <div className="relative h-6 flex items-center w-full @[620px]:min-w-[220px]" aria-hidden="true">
        {/* Zero baseline & subtle 50% / 100% ticks */}
        <div className="absolute inset-y-1 left-0 w-px bg-border" />
        <div className="absolute inset-y-1.5 left-1/2 w-px border-l border-dashed border-border/70" />
        <div className="absolute inset-y-1.5 right-0 w-px bg-border/60" />
        <div className="w-full h-px bg-border/80" />

        {/* Connecting bar between previous and latest (draws once on first view, never replays on filter changes) */}
        {!isFlat && (
          <motion.div
            className={cn("absolute h-1 rounded-full", fillClass)}
            style={{ transformOrigin: connectorOrigin }}
            initial={
              reducedMotion || hasDrawnRef.current
                ? false
                : {
                    left: `${pos.lineStartPct}%`,
                    width: `${meta.minLengthPct}%`,
                    scaleX: 0,
                  }
            }
            animate={{
              left: `${pos.lineStartPct}%`,
              width: `${meta.minLengthPct}%`,
              scaleX: 1,
            }}
            transition={{
              scaleX: reducedMotion ? { duration: 0 } : { duration: 0.45, ease: "easeOut" },
              left: tweenConfig,
              width: tweenConfig,
            }}
          />
        )}

        {/* Previous dot (10px hollow ring at TRUE position) — omitted if flat */}
        {!isFlat && (
          <motion.div
            className="absolute h-2.5 w-2.5 -ml-[5px] rounded-full border-2 border-muted-foreground bg-background"
            initial={reducedMotion || hasDrawnRef.current ? false : { opacity: 0 }}
            animate={{ opacity: 1, left: `${pos.prevPct}%` }}
            transition={{
              opacity: reducedMotion ? { duration: 0 } : { duration: 0.25, ease: "easeOut" },
              left: tweenConfig,
            }}
          />
        )}

        {/* Latest dot (10px solid dot at TRUE position) */}
        <motion.div
          className={cn(
            "absolute h-2.5 w-2.5 -ml-[5px] rounded-full border border-background shadow-xs",
            fillClass
          )}
          initial={reducedMotion || hasDrawnRef.current ? false : { opacity: 0 }}
          animate={{ opacity: 1, left: `${pos.latestPct}%` }}
          transition={{
            opacity: reducedMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut" },
            left: tweenConfig,
          }}
        />

        {/* Small directional arrowhead beyond the latest dot so direction stays readable even when dots overlap */}
        {!isFlat && (
          <motion.svg
            width="6"
            height="8"
            viewBox="0 0 6 8"
            className={cn("absolute z-10 pointer-events-none", arrowColorClass)}
            style={{
              marginLeft: meta.arrowDirection === "right" ? "6px" : "-12px",
            }}
            initial={reducedMotion || hasDrawnRef.current ? false : { opacity: 0 }}
            animate={{ opacity: 1, left: `${pos.latestPct}%` }}
            transition={{
              opacity: reducedMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" },
              left: tweenConfig,
            }}
            aria-hidden="true"
          >
            {meta.arrowDirection === "right" ? (
              <path d="M0 0L6 4L0 8Z" fill="currentColor" />
            ) : (
              <path d="M6 0L0 4L6 8Z" fill="currentColor" />
            )}
          </motion.svg>
        )}
      </div>

      {/* Narrow Line 3 values (right-aligned beneath track) / Wide Col 3: Direct Values + Badge */}
      <div className="flex flex-wrap items-center justify-end gap-2 font-mono tabular-nums min-w-0">
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
        {badge && <div className="hidden @[620px]:flex items-center gap-1.5 flex-wrap">{badge}</div>}
      </div>
    </div>
  )

  const containerClass = cn(
    "group w-full text-left py-2 px-2 -mx-2 rounded-md transition-colors duration-120",
    active
      ? "bg-primary/[0.07] border-l-2 border-l-primary pl-2.5"
      : "hover:bg-primary/[0.04]",
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
          delay: staggerDelay,
        }}
        onClick={onClick}
        aria-label={computedAria}
        className={containerClass}
      >
        <div className="@container w-full">{inner}</div>
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
      aria-label={computedAria}
      className={containerClass}
    >
      <div className="@container w-full">{inner}</div>
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
    <div className="@container w-full pb-2 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
      <div className="flex flex-col gap-1 @[620px]:grid @[620px]:grid-cols-[minmax(0,1.25fr)_minmax(220px,1.35fr)_minmax(0,auto)] @[620px]:items-center @[620px]:gap-4">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span className="truncate">{leftLabel}</span>
          <span className="@[620px]:hidden shrink-0">{rightLabel}</span>
        </div>
        <div className="flex items-center justify-between w-full @[620px]:min-w-[220px]">
          <span>0{unit}</span>
          <span>{Math.round(maxScale / 2)}{unit}</span>
          <span>{maxScale}{unit}</span>
        </div>
        <div className="hidden @[620px]:block text-right">{rightLabel}</div>
      </div>
    </div>
  )
}
