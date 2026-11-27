"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react"
import Link from "next/link"
import {
  Info,
  BookOpen,
  Users,
  GraduationCap,
  Layers,
  ChevronRight,
  MapPin,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowRight,
  Settings,
} from "lucide-react"
import {
  fetchDistricts,
  fetchDistrictPlan,
  DistrictPlanNotReadyError,
  DistrictNotFoundError,
  type DistrictDemandItem,
  type DistrictPlanResponse,
  type DistrictPlanCourseItem,
  type DistrictPlanAction,
} from "@/lib/demand-api"
import {
  PageHeader,
  FindingHeadline,
  BigNumber,
  FigureRow,
  SectionHeader,
  SourceCaption,
  FilterBar,
  SelectField,
  DumbbellRow,
  DumbbellScaleHeader,
  DeltaBadge,
  Drawer,
  ErrorState,
  EmptyState,
  Skeleton,
} from "@/components/ui-kit"
import { computeDumbbellScale } from "@/lib/dumbbell"
import {
  formatPercent,
  formatInteger,
  pluralize,
} from "@/lib/findings"

function formatReason(reason: string): string {
  switch (reason) {
    case "OVERSUPPLIED":
      return "Oversupplied capacity"
    case "OBSOLETE":
      return "Obsolete curriculum"
    case "LOW_COVERAGE":
      return "Low demand coverage"
    case "UNDER_SUPPLIED":
      return "Under-supplied capacity"
    case "INSUFFICIENT_DATA":
      return "Not enough local data"
    case "WITHIN_RANGE":
      return "Balanced within target range"
    default:
      return reason.replace(/_/g, " ").toLowerCase()
  }
}

function getCoursePlainReason(item: DistrictPlanCourseItem): string {
  if (item.reasons.length === 1 && item.reasons[0] === "INSUFFICIENT_DATA") {
    return "Fewer than 20 estimated local openings; sample too small to recommend quota changes."
  }
  if (item.actions.includes("REDUCE")) {
    const ratioStr = item.ratio != null ? `${item.ratio.toFixed(1)}x` : "high"
    return `Oversupplied: seats exceed local employer hiring openings by ${ratioStr}.`
  }
  if (item.actions.includes("REVISE")) {
    if (item.obsolete) {
      return `Obsolete curriculum: ${item.coverage.toFixed(0)}% coverage and falling demand in taught skills.`
    }
    return `Low alignment: ${item.coverage.toFixed(0)}% coverage of core local skill requirements.`
  }
  if (item.actions.includes("EXPAND")) {
    const ratioStr = item.ratio != null ? `${item.ratio.toFixed(1)}x` : "low"
    return `High demand: local employer openings exceed seat capacity (${ratioStr} ratio).`
  }
  return "Well-balanced: training seats align with local employer hiring."
}

function ActionBadge({
  action,
  isOnlyInsufficientData,
}: {
  action: string
  isOnlyInsufficientData?: boolean
}) {
  if (isOnlyInsufficientData) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border border-attention/30 bg-attention-subtle text-attention-foreground">
        <AlertTriangle className="h-3 w-3 text-attention" aria-hidden="true" />
        <span>Not enough data</span>
      </span>
    )
  }

  switch (action) {
    case "REDUCE":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border border-negative/30 bg-negative-subtle text-negative-foreground uppercase tracking-wide">
          <TrendingDown className="h-3 w-3 text-negative" aria-hidden="true" />
          <span>REDUCE</span>
        </span>
      )
    case "REVISE":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border border-attention/30 bg-attention-subtle text-attention-foreground uppercase tracking-wide">
          <AlertTriangle className="h-3 w-3 text-attention" aria-hidden="true" />
          <span>REVISE</span>
        </span>
      )
    case "EXPAND":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border border-positive/30 bg-positive-subtle text-positive-foreground uppercase tracking-wide">
          <TrendingUp className="h-3 w-3 text-positive" aria-hidden="true" />
          <span>EXPAND</span>
        </span>
      )
    case "KEEP":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-border bg-muted/60 text-muted-foreground uppercase tracking-wide">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          <span>KEEP</span>
        </span>
      )
  }
}

export default function DistrictPlanPage() {
  // Districts catalog state
  const [districts, setDistricts] = useState<DistrictDemandItem[]>([])
  const [districtsLoading, setDistrictsLoading] = useState(true)
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("")

  // Plan data state & in-component cache
  const [planCache, setPlanCache] = useState<Record<string, DistrictPlanResponse>>({})
  const [plan, setPlan] = useState<DistrictPlanResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNotFound, setIsNotFound] = useState(false)

  // 503 Retry state
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Drawer state
  const [selectedCourse, setSelectedCourse] = useState<DistrictPlanCourseItem | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Load districts catalog on mount
  useEffect(() => {
    let mounted = true
    async function loadDistrictsList() {
      setDistrictsLoading(true)
      try {
        const data = await fetchDistricts()
        if (mounted) {
          setDistricts(data.districts)
        }
      } catch (err) {
        console.error("Failed to load districts list:", err)
      } finally {
        if (mounted) {
          setDistrictsLoading(false)
        }
      }
    }
    loadDistrictsList()
    return () => {
      mounted = false
    }
  }, [])

  // District options sorted alphabetically (no national option)
  const districtOptions = useMemo(() => {
    const opts = [{ label: "Select a district to view plan...", value: "" }]
    const sorted = [...districts].sort((a, b) => a.name.localeCompare(b.name))
    for (const d of sorted) {
      opts.push({
        label: `${d.name} (${d.state})`,
        value: String(d.districtId),
      })
    }
    return opts
  }, [districts])

  // Clear pending retry timer helper
  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      clearRetryTimer()
    }
  }, [clearRetryTimer])

  // Fetch plan function with 503 retry logic
  const loadPlan = useCallback(
    async (districtIdStr: string, forceRefetch = false, attempt = 0) => {
      clearRetryTimer()

      if (!districtIdStr) {
        setPlan(null)
        setError(null)
        setIsNotFound(false)
        setLoading(false)
        setIsRetrying(false)
        setRetryAttempt(0)
        return
      }

      if (!forceRefetch && planCache[districtIdStr]) {
        setPlan(planCache[districtIdStr])
        setError(null)
        setIsNotFound(false)
        setLoading(false)
        setIsRetrying(false)
        setRetryAttempt(0)
        return
      }

      setLoading(true)
      setError(null)
      setIsNotFound(false)
      if (attempt === 0) {
        setIsRetrying(false)
        setRetryAttempt(0)
      }

      const idNum = parseInt(districtIdStr, 10)
      if (isNaN(idNum)) {
        setLoading(false)
        setIsNotFound(true)
        return
      }

      try {
        const data = await fetchDistrictPlan(idNum)
        setPlan(data)
        setPlanCache((prev) => ({ ...prev, [districtIdStr]: data }))
        setError(null)
        setIsNotFound(false)
        setLoading(false)
        setIsRetrying(false)
        setRetryAttempt(0)
      } catch (err: unknown) {
        if (err instanceof DistrictPlanNotReadyError) {
          if (attempt < 6) {
            const nextAttempt = attempt + 1
            setIsRetrying(true)
            setRetryAttempt(nextAttempt)
            setLoading(true)
            retryTimerRef.current = setTimeout(() => {
              loadPlan(districtIdStr, true, nextAttempt)
            }, 5000)
            return
          } else {
            setIsRetrying(false)
            setLoading(false)
            setError("Data is still loading. Please try again shortly.")
            return
          }
        }

        if (err instanceof DistrictNotFoundError) {
          setLoading(false)
          setIsRetrying(false)
          setIsNotFound(true)
          return
        }

        setLoading(false)
        setIsRetrying(false)
        const message = err instanceof Error ? err.message : "Failed to load district training plan."
        setError(message)
      }
    },
    [clearRetryTimer, planCache]
  )

  useEffect(() => {
    loadPlan(selectedDistrictId)
  }, [selectedDistrictId, loadPlan])

  const handleDistrictChange = (val: string) => {
    clearRetryTimer()
    setSelectedDistrictId(val)
  }

  const handleManualRetry = () => {
    if (selectedDistrictId) {
      loadPlan(selectedDistrictId, true, 0)
    }
  }

  // Drawer handlers
  const openDrawer = (item: DistrictPlanCourseItem) => {
    setSelectedCourse(item)
    setIsDrawerOpen(true)
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
  }

  // Sorted course cards: "actions that need attention come first"
  const sortedCourseCards = useMemo(() => {
    if (!plan?.items) return []
    return [...plan.items].sort((a, b) => {
      // Priority weighting: REDUCE = 5, REVISE = 4, EXPAND = 3, KEEP = 2, INSUFFICIENT_DATA = 1
      const getPriority = (item: DistrictPlanCourseItem) => {
        if (item.reasons.length === 1 && item.reasons[0] === "INSUFFICIENT_DATA") return 1
        if (item.actions.includes("REDUCE")) return 5
        if (item.actions.includes("REVISE")) return 4
        if (item.actions.includes("EXPAND")) return 3
        return 2
      }

      const pA = getPriority(a)
      const pB = getPriority(b)
      if (pB !== pA) return pB - pA

      // Secondary: absolute seat change descending
      return Math.abs(b.seatChange) - Math.abs(a.seatChange)
    })
  }, [plan])

  // Finding sentence calculation
  const findingHeadline = useMemo(() => {
    if (!plan) {
      return "Select a district to generate localized course quota and staffing allocations."
    }
    const attentionCount = plan.counts.reduce + plan.counts.revise
    if (attentionCount > 0) {
      return `${plan.districtName} plan recommends action on ${pluralize(
        attentionCount,
        "course"
      )} (${plan.counts.reduce} reduce, ${plan.counts.revise} revise) to align with local hiring.`
    }
    if (plan.counts.expand > 0) {
      return `${plan.districtName} plan identifies capacity deficits in ${pluralize(
        plan.counts.expand,
        "course"
      )} with local hiring expansion opportunities.`
    }
    return `${plan.districtName} training capacity is well-aligned with local employer demand across all ${plan.items.length} offered courses.`
  }, [plan])

  return (
    <div className="space-y-8 animate-page-enter">
      {/* 1. Page Header with standfirst */}
      <PageHeader
        title="District Training Plan"
        standfirst="Deterministic seat quotas, staffing allocations, and curriculum revisions tailored to local employer hiring."
        showSyntheticBadge
        breadcrumbs={[
          { label: "Policymaker", href: "/policy" },
          { label: "District Plan" },
        ]}
      />

      {/* 2. Filter Bar: District Selector */}
      <FilterBar onReset={() => handleDistrictChange("")} isFiltered={selectedDistrictId !== ""}>
        <SelectField
          id="district-plan-selector"
          label="District"
          value={selectedDistrictId}
          disabled={districtsLoading}
          onChange={handleDistrictChange}
          options={districtOptions}
          className="w-full sm:w-auto sm:min-w-[260px]"
        />
      </FilterBar>

      {/* 503 Retrying Notification Banner */}
      {isRetrying && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-attention/30 bg-attention-subtle text-attention-foreground text-xs shadow-resting animate-pulse">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin shrink-0 text-attention" aria-hidden="true" />
            <span className="font-semibold">
              Data is still loading, retrying... (attempt {retryAttempt} of 6)
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">Retrying every 5 seconds</span>
        </div>
      )}

      {/* 3. Empty State before district selection */}
      {!selectedDistrictId && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-12 text-center text-card-foreground shadow-resting">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPin className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="font-serif text-lg font-semibold text-foreground">
            Select a district to view localized training plan
          </h3>
          <p className="mt-1.5 max-w-[65ch] text-xs leading-relaxed text-muted-foreground">
            Choose a reporting district from the dropdown above to review course seat capacity
            recommendations, trainer staffing adjustments, and curriculum revisions calculated
            directly from local employer hiring postings.
          </p>
        </div>
      )}

      {/* Loading Skeletons */}
      {selectedDistrictId && loading && !isRetrying && (
        <div className="space-y-6">
          <div className="p-6 rounded-lg border border-border bg-card space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-4 border-t border-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      )}

      {/* 404 State */}
      {isNotFound && (
        <ErrorState
          message="District not found"
          description="The requested district was not found in the reference catalog."
          onRetry={handleManualRetry}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorState
          message={error}
          description="Could not load the district plan."
          onRetry={handleManualRetry}
        />
      )}

      {/* Content State when district plan is loaded */}
      {plan && !loading && !error && (
        <div className="space-y-8">
          {/* Finding Headline & Open FigureRow */}
          <section className="space-y-6">
            <FindingHeadline
              kicker="District Training Plan Finding"
              sentence={findingHeadline}
            >
              <SourceCaption
                scope={plan.districtName}
                window="12-month trailing hiring window"
                note="Deterministic plan calculated against local synthetic job postings"
              />
            </FindingHeadline>

            <FigureRow columns={3}>
              <BigNumber
                label="Offered Courses"
                rawValue={plan.items.length}
                footnote={`In ${plan.districtName}`}
              />

              <BigNumber
                label="Seat Capacity"
                value={`${formatInteger(plan.totals.totalSeats)} → ${formatInteger(plan.totals.totalRecommendedSeats)}`}
                footnote={`${plan.totals.totalRecommendedSeats - plan.totals.totalSeats >= 0 ? "+" : ""}${plan.totals.totalRecommendedSeats - plan.totals.totalSeats} seats (${
                  plan.totals.totalRecommendedSeats - plan.totals.totalSeats < 0
                    ? "Reduction"
                    : plan.totals.totalRecommendedSeats - plan.totals.totalSeats > 0
                    ? "Expansion"
                    : "Balanced"
                })`}
              />

              <BigNumber
                label="Trainer Staffing"
                value={`${plan.totals.totalTrainers} → ${plan.totals.totalTrainersNeeded}`}
                footnote={`${plan.totals.trainerChange >= 0 ? "+" : ""}${plan.totals.trainerChange} trainers (${
                  plan.totals.trainerChange < 0
                    ? "Surplus"
                    : plan.totals.trainerChange > 0
                    ? "Additional"
                    : "Balanced"
                })`}
              />
            </FigureRow>

            {/* Recommended Actions: four small labelled counts in one row on desktop, stacking cleanly at 375px */}
            {(() => {
              const insufficientDataCount = plan.items.filter(
                (item) => item.reasons.length === 1 && item.reasons[0] === "INSUFFICIENT_DATA"
              ).length
              return (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
                    Recommended Actions
                  </span>
                  <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-attention/30 bg-attention-subtle text-attention-foreground whitespace-nowrap">
                      <AlertTriangle className="h-3.5 w-3.5 text-attention shrink-0" aria-hidden="true" />
                      <span>Revise</span>
                      <span className="font-mono tabular-nums font-bold">{plan.counts.revise}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-negative/30 bg-negative-subtle text-negative-foreground whitespace-nowrap">
                      <TrendingDown className="h-3.5 w-3.5 text-negative shrink-0" aria-hidden="true" />
                      <span>Reduce</span>
                      <span className="font-mono tabular-nums font-bold">{plan.counts.reduce}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-positive/30 bg-positive-subtle text-positive-foreground whitespace-nowrap">
                      <TrendingUp className="h-3.5 w-3.5 text-positive shrink-0" aria-hidden="true" />
                      <span>Expand</span>
                      <span className="font-mono tabular-nums font-bold">{plan.counts.expand}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-muted/60 text-muted-foreground whitespace-nowrap">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>Keep</span>
                      <span className="font-mono tabular-nums font-bold text-foreground">{plan.counts.keep}</span>
                    </span>
                    {insufficientDataCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-attention/30 bg-attention-subtle text-attention-foreground whitespace-nowrap">
                        <AlertTriangle className="h-3.5 w-3.5 text-attention shrink-0" aria-hidden="true" />
                        <span>Insufficient data</span>
                        <span className="font-mono tabular-nums font-bold">{insufficientDataCount}</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })()}
          </section>

          {/* ================================================================= */}
          {/* Course Capacity & Staffing Dumbbell List (Needs Attention First)  */}
          {/* ================================================================= */}
          <section className="space-y-4">
            <SectionHeader
              title={`Course Capacity & Staffing Allocations (${sortedCourseCards.length})`}
              subtitle="Ordered by priority: REDUCE and REVISE appear first. Dumbbells show current seats → recommended seats on one scale (a single dot means seats stay unchanged). Click any row for full details."
              actions={
                <button
                  type="button"
                  onClick={() => {
                    if (sortedCourseCards.length > 0) openDrawer(sortedCourseCards[0])
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>View calculation rules</span>
                </button>
              }
            />

            {sortedCourseCards.length === 0 ? (
              <EmptyState
                title="No courses offered in this district"
                description="This district currently has no active course offerings in the synthetic database."
              />
            ) : (
              (() => {
                const maxSeatScale = computeDumbbellScale(
                  sortedCourseCards.map((c) => ({
                    prev: c.seats,
                    latest: c.recommendedSeats,
                  })),
                  { minMax: 50, step: 25 }
                )

                return (
                  <div>
                    <DumbbellScaleHeader
                      leftLabel="Offered Course & Rationale"
                      maxScale={maxSeatScale}
                      unit=" seats"
                      rightLabel="Current → Recommended"
                    />
                    <div className="divide-y divide-border/70 border-b border-border/70">
                      {sortedCourseCards.map((item, idx) => {
                        const isOnlyInsufficientData =
                          item.reasons.length === 1 && item.reasons[0] === "INSUFFICIENT_DATA"
                        const plainReason = getCoursePlainReason(item)
                        const tone =
                          item.seatChange < 0
                            ? "negative"
                            : item.seatChange > 0
                            ? "positive"
                            : "neutral"

                        return (
                          <DumbbellRow
                            key={item.courseId}
                            rank={idx + 1}
                            label={item.courseName}
                            sublabel={`${plainReason} · Trainers ${item.trainers}→${item.trainersNeeded}`}
                            previousValue={item.seats}
                            latestValue={item.recommendedSeats}
                            maxScale={maxSeatScale}
                            previousText={`${item.seats}`}
                            latestText={`${item.recommendedSeats} seats`}
                            tone={tone}
                            staggerIndex={idx}
                            onClick={() => openDrawer(item)}
                            badge={
                              <div className="flex flex-wrap gap-1">
                                {isOnlyInsufficientData ? (
                                  <ActionBadge action="KEEP" isOnlyInsufficientData={true} />
                                ) : (
                                  item.actions.map((act) => <ActionBadge key={act} action={act} />)
                                )}
                              </div>
                            }
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })()
            )}
          </section>
        </div>
      )}

      {/* 4. Detail Drawer (1-click drilldown) */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={selectedCourse?.courseName || "Course Training Plan Detail"}
        subtitle={`District: ${plan?.districtName || "District"}`}
        width="w-[min(520px,100vw)]"
      >
        {selectedCourse && plan && (
          <div className="space-y-6 text-xs">
            {/* Action Advice Banner */}
            <div className="p-4 rounded-lg border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-sm">Action Advice:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCourse.reasons.length === 1 &&
                  selectedCourse.reasons[0] === "INSUFFICIENT_DATA" ? (
                    <ActionBadge action="KEEP" isOnlyInsufficientData={true} />
                  ) : (
                    selectedCourse.actions.map((act) => <ActionBadge key={act} action={act} />)
                  )}
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {getCoursePlainReason(selectedCourse)}
              </p>
              <div className="pt-1 text-[11px] text-muted-foreground border-t border-border/40">
                Trigger factors: <strong className="text-foreground">{selectedCourse.reasons.map(formatReason).join(", ")}</strong>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="space-y-2.5">
              <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Deterministic Capacity Metrics
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Seat Capacity
                  </span>
                  <div className="font-serif text-xl font-bold font-mono tabular-nums text-foreground">
                    {selectedCourse.seats} → {selectedCourse.recommendedSeats}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Change: {selectedCourse.seatChange > 0 ? "+" : ""}{selectedCourse.seatChange} seats
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Staffing Needed
                  </span>
                  <div className="font-serif text-xl font-bold font-mono tabular-nums text-foreground">
                    {selectedCourse.trainers} → {selectedCourse.trainersNeeded}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Change: {selectedCourse.trainerChange > 0 ? "+" : ""}{selectedCourse.trainerChange} trainers
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Estimated Openings
                  </span>
                  <div className="font-serif text-xl font-bold font-mono tabular-nums text-foreground">
                    {selectedCourse.estimatedOpenings != null
                      ? selectedCourse.estimatedOpenings.toFixed(1)
                      : "—"}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Target ratio: {plan.config.targetRatio}x
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Oversupply Ratio
                  </span>
                  <div className="font-serif text-xl font-bold font-mono tabular-nums text-foreground">
                    {selectedCourse.ratio != null ? `${selectedCourse.ratio.toFixed(2)}x` : "—"}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Seats / estimated openings
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Curriculum Coverage
                  </span>
                  <div className="font-serif text-xl font-bold font-mono tabular-nums text-foreground">
                    {selectedCourse.coverage.toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Threshold: &lt; {plan.config.reviseCoverageThreshold}%
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Staffing Ratio
                  </span>
                  <div className="font-serif text-xl font-bold font-mono tabular-nums text-foreground">
                    {plan.config.seatsPerTrainer}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Seats per assigned trainer
                  </span>
                </div>
              </div>
            </div>

            {/* Curriculum Add / Retire Guidance if REVISE */}
            {selectedCourse.actions.includes("REVISE") && (
              <div className="space-y-4 pt-2 border-t border-border">
                <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Recommended Curriculum Revisions
                </h4>

                {/* Skills to Add */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 font-medium text-positive-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-positive" aria-hidden="true" />
                    <span>Skills to Add ({selectedCourse.add.length})</span>
                  </div>
                  {selectedCourse.add.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded">
                      No specific addition candidates passed threshold.
                    </p>
                  ) : (
                    <div className="divide-y divide-border rounded-md border border-border bg-card">
                      {selectedCourse.add.map((s) => (
                        <div key={s.skillId} className="flex items-center justify-between p-2">
                          <span className="font-medium text-foreground">{s.skillName}</span>
                          <span className="font-mono text-[11px] text-positive-foreground font-semibold">
                            {formatPercent(s.latestShare)} share
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Skills to Retire */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 font-medium text-negative-foreground">
                    <XCircle className="h-3.5 w-3.5 text-negative" aria-hidden="true" />
                    <span>Skills to Retire ({selectedCourse.retire.length})</span>
                  </div>
                  {selectedCourse.retire.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded">
                      No taught skills meet the retirement rule.
                    </p>
                  ) : (
                    <div className="divide-y divide-border rounded-md border border-border bg-card">
                      {selectedCourse.retire.map((s) => (
                        <div key={s.skillId} className="flex items-center justify-between p-2">
                          <span className="font-medium text-foreground">{s.skillName}</span>
                          <span className="font-mono text-[11px] text-negative-foreground font-semibold">
                            {(s.relativeGrowth * 100).toFixed(1)}% decline
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Calculation Configuration Transparency */}
            <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-1.5">
              <span className="font-semibold text-foreground">District Plan Calculation Configuration:</span>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>• Target ratio: {plan.config.targetRatio}x (recommends seats = round(openings × targetRatio))</li>
                <li>• Expand below: {plan.config.expandBelowRatio}x</li>
                <li>• Revise coverage threshold: {plan.config.reviseCoverageThreshold}%</li>
                <li>• Seats per trainer: {plan.config.seatsPerTrainer} (determines staffing adjustments)</li>
                <li>• Minimum openings guard: {plan.config.minOpenings}</li>
              </ul>
            </div>

            {/* Link to recommendations */}
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Inspect full course syllabus:
              </span>
              <Link
                href={`/policy/course-recommendations?course=${selectedCourse.courseId}&district=${selectedDistrictId}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <span>View course recommendations</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
