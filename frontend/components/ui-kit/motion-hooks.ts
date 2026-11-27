"use client"

import { useState, useEffect, useRef } from "react"

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  return prefersReducedMotion
}

/**
 * Counts up from 0 on first view and smoothly tweens from the previous
 * displayed value whenever `target` changes (e.g. on filter updates).
 * Honours `prefers-reduced-motion` with instant updates.
 */
export function useCountUp(
  target: number,
  durationMs = 500,
  enabled = true
): number {
  const reducedMotion = usePrefersReducedMotion()
  const [current, setCurrent] = useState(() =>
    reducedMotion || !enabled ? target : 0
  )
  const previousRef = useRef<number>(reducedMotion || !enabled ? target : 0)

  useEffect(() => {
    if (!enabled) {
      previousRef.current = 0
      setCurrent(0)
      return
    }

    if (reducedMotion || durationMs <= 0 || isNaN(target)) {
      previousRef.current = target
      setCurrent(target)
      return
    }

    const from = previousRef.current
    if (from === target) {
      setCurrent(target)
      return
    }

    let startTime: number | null = null
    let animId: number

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const nextVal = Math.round(from + (target - from) * eased)
      previousRef.current = nextVal
      setCurrent(nextVal)

      if (progress < 1) {
        animId = requestAnimationFrame(step)
      } else {
        previousRef.current = target
        setCurrent(target)
      }
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [target, durationMs, reducedMotion, enabled])

  return reducedMotion ? target : current
}

/**
 * Recharts entry animation control:
 * Plays ~550ms ease-out once each time a container/drawer opens and data becomes ready,
 * does not replay when data refetches or internal filters change while open, and disables under reduced motion.
 */
export function useChartAnimation(
  isOpen: boolean = true,
  hasData: boolean = true
): boolean {
  const reducedMotion = usePrefersReducedMotion()
  const [animating, setAnimating] = useState(false)
  const hasAnimatedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) {
      hasAnimatedRef.current = false
      setAnimating(false)
      return
    }

    if (reducedMotion) {
      setAnimating(false)
      return
    }

    if (hasData && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true
      setAnimating(true)
      const timer = setTimeout(() => {
        setAnimating(false)
      }, 650)
      return () => clearTimeout(timer)
    }
  }, [isOpen, hasData, reducedMotion])

  if (reducedMotion) return false
  return animating
}
