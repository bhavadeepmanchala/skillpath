import { describe, it, expect } from "vitest"
import {
  computeDumbbellScale,
  computeDumbbellPositions,
  getDumbbellConnectorMeta,
} from "../dumbbell"

describe("computeDumbbellScale", () => {
  it("returns minMax when items array is empty", () => {
    expect(computeDumbbellScale([], { minMax: 20, step: 10 })).toBe(20)
  })

  it("rounds up to the nearest step across prev and latest values", () => {
    const scale = computeDumbbellScale(
      [
        { prev: 12.4, latest: 23.1 },
        { prev: 18.0, latest: 15.2 },
      ],
      { minMax: 20, step: 10, capAt: 100 }
    )
    expect(scale).toBe(30)
  })

  it("respects capAt ceiling for percentage scales", () => {
    const scale = computeDumbbellScale(
      [{ prev: 94, latest: 99.5 }],
      { minMax: 20, step: 10, capAt: 100 }
    )
    expect(scale).toBe(100)
  })

  it("handles seat counts without a 100 cap", () => {
    const scale = computeDumbbellScale(
      [
        { prev: 110, latest: 28 },
        { prev: 60, latest: 132 },
      ],
      { minMax: 50, step: 25 }
    )
    expect(scale).toBe(150)
  })
})

describe("computeDumbbellPositions", () => {
  it("computes rising positions accurately", () => {
    const pos = computeDumbbellPositions(10, 30, 50)
    expect(pos.prevPct).toBe(20)
    expect(pos.latestPct).toBe(60)
    expect(pos.lineStartPct).toBe(20)
    expect(pos.lineWidthPct).toBe(40)
    expect(pos.direction).toBe("up")
  })

  it("computes falling positions accurately", () => {
    const pos = computeDumbbellPositions(40, 15, 50)
    expect(pos.prevPct).toBe(80)
    expect(pos.latestPct).toBe(30)
    expect(pos.lineStartPct).toBe(30)
    expect(pos.lineWidthPct).toBe(50)
    expect(pos.direction).toBe("down")
  })

  it("identifies equal values as flat for single-dot rendering", () => {
    const pos = computeDumbbellPositions(25, 25, 100)
    expect(pos.prevPct).toBe(25)
    expect(pos.latestPct).toBe(25)
    expect(pos.lineWidthPct).toBe(0)
    expect(pos.direction).toBe("flat")
  })
})

describe("getDumbbellConnectorMeta", () => {
  it("returns positive right arrow and minimum connector length for rising values", () => {
    const pos = computeDumbbellPositions(10, 30, 50)
    const meta = getDumbbellConnectorMeta(pos)
    expect(meta.direction).toBe("up")
    expect(meta.tone).toBe("positive")
    expect(meta.arrowDirection).toBe("right")
    expect(meta.minLengthPct).toBe(40)
  })

  it("preserves minimum visible connector length and left arrow when falling dots nearly overlap", () => {
    const pos = computeDumbbellPositions(89.8, 89.2, 100)
    const meta = getDumbbellConnectorMeta(pos)
    expect(meta.direction).toBe("down")
    expect(meta.tone).toBe("negative")
    expect(meta.arrowDirection).toBe("left")
    expect(meta.minLengthPct).toBe(1.5)
  })

  it("returns neutral tone and zero length for flat values", () => {
    const pos = computeDumbbellPositions(40, 40, 100)
    const meta = getDumbbellConnectorMeta(pos)
    expect(meta.direction).toBe("flat")
    expect(meta.tone).toBe("neutral")
    expect(meta.arrowDirection).toBe("none")
    expect(meta.minLengthPct).toBe(0)
  })
})
