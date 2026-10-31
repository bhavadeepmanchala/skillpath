"use client"

import { useState, useEffect } from "react"

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

export function useCountUp(target: number, durationMs = 500): number {
  const reducedMotion = usePrefersReducedMotion()
  const [current, setCurrent] = useState(() => (reducedMotion ? target : 0))

  useEffect(() => {
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
  }, [target, durationMs, reducedMotion])

  return current
}

