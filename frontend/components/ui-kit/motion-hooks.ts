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

export function useCountUp(target: number, durationMs = 500, enabled = true): number {
  const reducedMotion = usePrefersReducedMotion()
  const [current, setCurrent] = useState(() => (reducedMotion || !enabled ? target : 0))

  useEffect(() => {
    if (!enabled) {
      setCurrent(0)
      return
    }

    if (reducedMotion || durationMs <= 0 || isNaN(target)) {
      setCurrent(target)
      return
    }

    let startTime: number | null = null
    let animId: number

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))

      if (progress < 1) {
        animId = requestAnimationFrame(step)
      } else {
        setCurrent(target)
      }
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [target, durationMs, reducedMotion, enabled])

  return current
}

/**
 * Recharts entry animation control:
 * Plays ~550ms ease-out on initial mount, disabled on subsequent filter updates, disabled under reduced motion.
 */
export function useChartAnimation(): boolean {
  const reducedMotion = usePrefersReducedMotion()
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    if (isInitialLoad) {
      const timer = setTimeout(() => {
        setIsInitialLoad(false)
      }, 650)
      return () => clearTimeout(timer)
    }
  }, [isInitialLoad])

  if (reducedMotion) return false
  return isInitialLoad
}
