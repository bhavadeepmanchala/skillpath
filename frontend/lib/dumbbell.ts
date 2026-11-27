/**
 * Pure scale & geometry helpers for the shared Dumbbell visual language.
 * Keeps every dumbbell in a list on a single common zero-based axis.
 */

export interface DumbbellRangeItem {
  prev: number
  latest: number
}

/**
 * Computes a clean, rounded upper bound for a dumbbell axis starting at 0.
 * For percentage scales (step = 10 or 5), caps at 100 when isPercent is true.
 */
export function computeDumbbellScale(
  items: DumbbellRangeItem[],
  options?: { minMax?: number; step?: number; capAt?: number }
): number {
  const minMax = options?.minMax ?? 10
  const step = options?.step ?? 10
  const capAt = options?.capAt

  if (items.length === 0) return minMax

  let highest = 0
  for (const item of items) {
    if (Number.isFinite(item.prev) && item.prev > highest) highest = item.prev
    if (Number.isFinite(item.latest) && item.latest > highest) highest = item.latest
  }

  const target = Math.max(highest, minMax)
  const rounded = Math.ceil(target / step) * step
  if (capAt !== undefined) {
    return Math.min(capAt, Math.max(minMax, rounded))
  }
  return Math.max(minMax, rounded)
}

export interface DumbbellPositions {
  prevPct: number
  latestPct: number
  lineStartPct: number
  lineWidthPct: number
  direction: "up" | "down" | "flat"
}

/**
 * Computes percentage positions (0 to 100) along a common 0..maxScale axis.
 */
export function computeDumbbellPositions(
  prev: number,
  latest: number,
  maxScale: number
): DumbbellPositions {
  const safeScale = maxScale > 0 ? maxScale : 1
  const clamp = (val: number) => Math.min(100, Math.max(0, (val / safeScale) * 100))

  const prevPct = Number(clamp(prev).toFixed(2))
  const latestPct = Number(clamp(latest).toFixed(2))
  const lineStartPct = Math.min(prevPct, latestPct)
  const lineWidthPct = Math.abs(latestPct - prevPct)

  const diff = latest - prev
  const direction: "up" | "down" | "flat" =
    Math.abs(diff) < 0.0001 ? "flat" : diff > 0 ? "up" : "down"

  return {
    prevPct,
    latestPct,
    lineStartPct,
    lineWidthPct,
    direction,
  }
}

export interface DumbbellConnectorMeta {
  direction: "up" | "down" | "flat"
  tone: "positive" | "negative" | "neutral"
  minLengthPct: number
  arrowDirection: "right" | "left" | "none"
}

/**
 * Pure visual encoding helper for the dumbbell connector and arrowhead.
 * Ensures a visible minimum connector length and directional arrow even when dots nearly overlap.
 */
export function getDumbbellConnectorMeta(
  pos: DumbbellPositions
): DumbbellConnectorMeta {
  if (pos.direction === "flat") {
    return {
      direction: "flat",
      tone: "neutral",
      minLengthPct: 0,
      arrowDirection: "none",
    }
  }
  return {
    direction: pos.direction,
    tone: pos.direction === "up" ? "positive" : "negative",
    minLengthPct: Math.max(1.5, pos.lineWidthPct),
    arrowDirection: pos.direction === "up" ? "right" : "left",
  }
}
