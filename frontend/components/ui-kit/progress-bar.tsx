"use client"

import React, { useEffect, useState } from "react"
import { usePrefersReducedMotion } from "./motion-hooks"

export interface ProgressBarProps {
  value: number // 0 to 100
  className?: string
  barClassName?: string
  label?: string
}

export function ProgressBar({
  value,
  className = "h-2 w-full rounded-full bg-muted overflow-hidden",
  barClassName = "h-full bg-primary rounded-full",
  label,
}: ProgressBarProps) {
  const reducedMotion = usePrefersReducedMotion()
  const clamped = Math.min(100, Math.max(0, isNaN(value) ? 0 : value))
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const currentWidth = reducedMotion || mounted ? clamped : 0

  return (
    <div
      className={className}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`${barClassName} ${
          reducedMotion ? "" : "transition-[width] duration-400 ease-out"
        }`}
        style={{ width: `${currentWidth}%` }}
      />
    </div>
  )
}

