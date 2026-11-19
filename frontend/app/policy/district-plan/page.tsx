"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react"
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
  Minus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import {
  fetchDistricts,
  fetchDistrictPlan,
  DistrictPlanNotReadyError,
  DistrictNotFoundError,
  type DistrictDemandItem,
  type DistrictPlanResponse,
  type DistrictPlanCourseItem,
} from "@/lib/demand-api"
import {
  PageHeader,
  SectionCard,
  FilterBar,
  SelectField,
  KpiCard,
  TableSkeleton,
  Drawer,
  ErrorState,
  EmptyState,
  Skeleton,
} from "@/components/ui-kit"

function formatReason(reason: string): string {
  switch (reason) {
    case "OVERSUPPLIED":
      return "Oversupplied"
    case "OBSOLETE":
      return "Obsolete"
    case "LOW_COVERAGE":
      return "Low coverage"
    case "UNDER_SUPPLIED":
      return "Under-supplied"
    case "INSUFFICIENT_DATA":
      return "Not enough data"
    case "WITHIN_RANGE":
      return "Within range"
    default:
      return reason.replace(/_/g, " ").toLowerCase()
  }
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
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300">
        Not enough data
      </span>
    )
  }

  switch (action) {
    case "REDUCE":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300">
          REDUCE
        </span>
      )
    case "REVISE":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300">
          REVISE
        </span>
      )
    case "EXPAND":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300">
          EXPAND
        </span>
      )
    case "KEEP":
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300">
          KEEP
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
    const opts = [{ label: "Select a district...", value: "" }]
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

  // Clean up timer on unmount
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

      // Check cache first (unless forced)
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

  // Trigger load when selectedDistrictId changes
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

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Page Header */}
      <PageHeader
        title="District Training Plan"
        description="Review deterministic seat capacity recommendations, staffing allocations, and curriculum update guidance for local course offerings."
        showSyntheticBadge={true}
        breadcrumbs={[
          { label: "Policymaker", href: "/policy" },
          { label: "District Plan" },
        ]}
      />

      {/* Synthetic Data Notice Banner */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-sky-300/60 bg-sky-50/70 p-3 text-xs text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200 shadow-resting">
        <div className="flex items-center gap-1.5 font-medium">
          <Info className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400" />
          <span>Training and staffing recommendations for offered courses</span>
        </div>
        <span className="text-sky-400 dark:text-sky-700 hidden sm:inline">•</span>
        <div className="text-muted-foreground dark:text-sky-300/80">
          All data is synthetic and deterministic.
        </div>
      </div>

      {/* District Selector Filter Bar */}
      <FilterBar onReset={() => handleDistrictChange("")} isFiltered={selectedDistrictId !== ""}>
        <SelectField
          id="district-plan-selector"
          label="District"
          value={selectedDistrictId}
          disabled={districtsLoading}
          onChange={handleDistrictChange}
          options={districtOptions}
        />
      </FilterBar>

      {/* 503 Retrying Notification Banner */}
      {isRetrying && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 text-xs shadow-resting animate-pulse">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="font-medium">
              Data is still loading, retrying... (attempt {retryAttempt} of 6)
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">Retrying every 5 seconds</span>
        </div>
      )}

      {/* Main Content Area */}
      {!selectedDistrictId ? (
        <EmptyState
          icon={MapPin}
          title="Select a district"
          description="Choose a district from the dropdown above to view its course capacity recommendations, staffing allocations, and curriculum revision guidance."
        />
      ) : loading && !isRetrying ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
          <TableSkeleton rows={5} cols={8} />
        </div>
      ) : isNotFound ? (
        <ErrorState
          message="District not found"
          description="The requested district was not found in the reference catalog."
          onRetry={handleManualRetry}
        />
      ) : error ? (
        <ErrorState
          message={error}
          description="Could not load the district plan."
          onRetry={handleManualRetry}
        />
      ) : plan ? (
        <div className="space-y-6">
          {/* Summary Row (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Number of courses */}
            <KpiCard
              label="Offered Courses"
              rawValue={plan.items.length}
              footnote={`In ${plan.districtName}`}
              icon={BookOpen}
              staggerIndex={0}
            />

            {/* Card 2: Seats now vs recommended */}
            <div className="animate-card-enter rounded-lg border border-border bg-card p-4 text-card-foreground shadow-resting transition-colors">
              <div className="flex items-center justify-between text-xs font-normal leading-4 text-muted-foreground">
                <span>Seat Capacity</span>
                <span className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground bg-muted/60">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 text-xl font-bold tracking-tight text-foreground font-mono tabular-nums leading-7 flex items-baseline gap-2">
                <span>{plan.totals.totalSeats.toLocaleString()}</span>
                <span className="text-muted-foreground font-normal text-sm">→</span>
                <span>{plan.totals.totalRecommendedSeats.toLocaleString()}</span>
              </div>
              <p
                className={`mt-1 text-xs font-semibold leading-4 font-mono tabular-nums ${
                  plan.totals.totalRecommendedSeats - plan.totals.totalSeats < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : plan.totals.totalRecommendedSeats - plan.totals.totalSeats > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground font-normal"
                }`}
              >
                {plan.totals.totalRecommendedSeats - plan.totals.totalSeats > 0 ? "+" : ""}
                {plan.totals.totalRecommendedSeats - plan.totals.totalSeats} seats (
                {plan.totals.totalRecommendedSeats - plan.totals.totalSeats < 0
                  ? "Reduction"
                  : plan.totals.totalRecommendedSeats - plan.totals.totalSeats > 0
                  ? "Expansion"
                  : "Unchanged"}
                )
              </p>
            </div>

            {/* Card 3: Trainers now vs needed */}
            <div className="animate-card-enter rounded-lg border border-border bg-card p-4 text-card-foreground shadow-resting transition-colors">
              <div className="flex items-center justify-between text-xs font-normal leading-4 text-muted-foreground">
                <span>Trainers Needed</span>
                <span className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground bg-muted/60">
                  <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 text-xl font-bold tracking-tight text-foreground font-mono tabular-nums leading-7 flex items-baseline gap-2">
                <span>{plan.totals.totalTrainers.toLocaleString()}</span>
                <span className="text-muted-foreground font-normal text-sm">→</span>
                <span>{plan.totals.totalTrainersNeeded.toLocaleString()}</span>
              </div>
              <p
                className={`mt-1 text-xs font-semibold leading-4 font-mono tabular-nums ${
                  plan.totals.trainerChange < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : plan.totals.trainerChange > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground font-normal"
                }`}
              >
                {plan.totals.trainerChange > 0 ? "+" : ""}
                {plan.totals.trainerChange} trainers (
                {plan.totals.trainerChange < 0
                  ? "Surplus"
                  : plan.totals.trainerChange > 0
                  ? "Additional"
                  : "Balanced"}
                )
              </p>
            </div>

            {/* Card 4: Counts per action */}
            <div className="animate-card-enter rounded-lg border border-border bg-card p-4 text-card-foreground shadow-resting transition-colors">
              <div className="flex items-center justify-between text-xs font-normal leading-4 text-muted-foreground">
                <span>Action Counts</span>
                <span className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground bg-muted/60">
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs font-mono tabular-nums">
                <div className="flex items-center justify-between p-1 rounded bg-muted/40 px-2">
                  <span className="text-muted-foreground">Reduce:</span>
                  <span className="font-bold text-rose-700 dark:text-rose-400">
                    {plan.counts.reduce}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1 rounded bg-muted/40 px-2">
                  <span className="text-muted-foreground">Revise:</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    {plan.counts.revise}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1 rounded bg-muted/40 px-2">
                  <span className="text-muted-foreground">Expand:</span>
                  <span className="font-bold text-sky-700 dark:text-sky-400">
                    {plan.counts.expand}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1 rounded bg-muted/40 px-2">
                  <span className="text-muted-foreground">Keep:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {plan.counts.keep}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* How this plan is calculated config line */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground border-b border-border/50 pb-3">
            <span className="font-semibold text-foreground">How this plan is calculated:</span>
            <span>
              Target ratio:{" "}
              <strong className="text-foreground font-mono">{plan.config.targetRatio}x</strong>
            </span>
            <span>•</span>
            <span>
              Expand below:{" "}
              <strong className="text-foreground font-mono">{plan.config.expandBelowRatio}x</strong>
            </span>
            <span>•</span>
            <span>
              Coverage threshold:{" "}
              <strong className="text-foreground font-mono">
                {plan.config.reviseCoverageThreshold}%
              </strong>
            </span>
            <span>•</span>
            <span>
              Seats per trainer:{" "}
              <strong className="text-foreground font-mono">{plan.config.seatsPerTrainer}</strong>
            </span>
            <span>•</span>
            <span>
              Minimum openings:{" "}
              <strong className="text-foreground font-mono">{plan.config.minOpenings}</strong>
            </span>
          </div>

          {/* Courses Table Section */}
          <SectionCard
            title={`Training Plan Courses (${plan.items.length})`}
            subtitle={`Course capacity and staffing recommendations for ${plan.districtName}`}
          >
            {plan.items.length === 0 ? (
              <EmptyState
                title="No courses offered"
                description="No courses are offered in this district in the data."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="border-b border-border/60 bg-muted/30 text-muted-foreground uppercase text-[11px] tracking-wide">
                    <tr>
                      <th scope="col" className="py-2.5 px-3 font-semibold">
                        Course Name
                      </th>
                      <th scope="col" className="py-2.5 px-3 font-semibold">
                        Actions
                      </th>
                      <th scope="col" className="py-2.5 px-3 font-semibold text-right">
                        Seats (Now → Rec)
                      </th>
                      <th scope="col" className="py-2.5 px-3 font-semibold text-right">
                        Trainers (Now → Need)
                      </th>
                      <th scope="col" className="py-2.5 px-3 font-semibold text-right">
                        Est. Openings
                      </th>
                      <th scope="col" className="py-2.5 px-3 font-semibold text-right">
                        Ratio
                      </th>
                      <th scope="col" className="py-2.5 px-3 font-semibold text-right">
                        Coverage
                      </th>
                      <th scope="col" className="py-2.5 px-3 font-semibold">
                        Reasons
                      </th>
                      <th scope="col" className="py-2.5 px-2 text-right">
                        <span className="sr-only">Details</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {plan.items.map((item) => {
                      const isOnlyInsufficientData =
                        item.reasons.length === 1 && item.reasons[0] === "INSUFFICIENT_DATA"

                      return (
                        <tr
                          key={item.courseId}
                          className="hover:bg-muted/30 transition-colors group cursor-pointer"
                          onClick={() => openDrawer(item)}
                        >
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                openDrawer(item)
                              }}
                              className="font-medium text-foreground hover:text-primary hover:underline text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                            >
                              {item.courseName}
                            </button>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1 items-center">
                              {isOnlyInsufficientData ? (
                                <ActionBadge action="KEEP" isOnlyInsufficientData={true} />
                              ) : (
                                item.actions.map((act) => <ActionBadge key={act} action={act} />)
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            <span>
                              {item.seats} → {item.recommendedSeats}
                            </span>
                            <span
                              className={`ml-1.5 text-[11px] font-semibold ${
                                item.seatChange < 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : item.seatChange > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-muted-foreground font-normal"
                              }`}
                            >
                              ({item.seatChange > 0 ? "+" : ""}
                              {item.seatChange})
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            <span>
                              {item.trainers} → {item.trainersNeeded}
                            </span>
                            <span
                              className={`ml-1.5 text-[11px] font-semibold ${
                                item.trainerChange < 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : item.trainerChange > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-muted-foreground font-normal"
                              }`}
                            >
                              ({item.trainerChange > 0 ? "+" : ""}
                              {item.trainerChange})
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            {item.estimatedOpenings != null
                              ? item.estimatedOpenings.toFixed(1)
                              : "—"}
                          </td>

                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            {item.ratio != null ? `${item.ratio.toFixed(2)}x` : "—"}
                          </td>

                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            {item.coverage.toFixed(1)}%
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1">
                              {item.reasons.map((r) => (
                                <span
                                  key={r}
                                  className="inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-medium"
                                >
                                  {formatReason(r)}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="py-3 px-2 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                openDrawer(item)
                              }}
                              className="text-muted-foreground group-hover:text-foreground p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label={`View details for ${item.courseName}`}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}

      {/* Detail Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={selectedCourse?.courseName || "Course Plan Details"}
        subtitle={`District: ${plan?.districtName || "District"} • Course ID: ${
          selectedCourse?.courseId ?? ""
        }`}
        width="w-[min(520px,100vw)]"
      >
        {selectedCourse && (
          <div className="space-y-5">
            {/* Action Badges & Verdict Banner */}
            <div className="p-3 rounded-lg border border-border/80 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Action Advice:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCourse.reasons.length === 1 &&
                  selectedCourse.reasons[0] === "INSUFFICIENT_DATA" ? (
                    <ActionBadge action="KEEP" isOnlyInsufficientData={true} />
                  ) : (
                    selectedCourse.actions.map((act) => <ActionBadge key={act} action={act} />)
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/40">
                <span className="font-medium text-foreground">Trigger reasons:</span>
                <span>{selectedCourse.reasons.map(formatReason).join(", ")}</span>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Seats */}
              <div className="rounded-md border border-border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                  <Users className="h-3.5 w-3.5" />
                  <span>Seats Capacity</span>
                </div>
                <div className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {selectedCourse.seats} → {selectedCourse.recommendedSeats}
                </div>
                <div
                  className={`text-[11px] font-mono tabular-nums ${
                    selectedCourse.seatChange < 0
                      ? "text-rose-600 dark:text-rose-400 font-semibold"
                      : selectedCourse.seatChange > 0
                      ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  Change: {selectedCourse.seatChange > 0 ? "+" : ""}
                  {selectedCourse.seatChange} seats
                </div>
              </div>

              {/* Trainers */}
              <div className="rounded-md border border-border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Trainers Staffing</span>
                </div>
                <div className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {selectedCourse.trainers} → {selectedCourse.trainersNeeded}
                </div>
                <div
                  className={`text-[11px] font-mono tabular-nums ${
                    selectedCourse.trainerChange < 0
                      ? "text-rose-600 dark:text-rose-400 font-semibold"
                      : selectedCourse.trainerChange > 0
                      ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  Change: {selectedCourse.trainerChange > 0 ? "+" : ""}
                  {selectedCourse.trainerChange} trainers
                </div>
              </div>

              {/* Estimated Openings */}
              <div className="rounded-md border border-border p-3 space-y-1">
                <div className="text-[11px] text-muted-foreground font-medium">
                  Estimated Openings
                </div>
                <div className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {selectedCourse.estimatedOpenings != null
                    ? selectedCourse.estimatedOpenings.toFixed(1)
                    : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Target ratio: {plan?.config.targetRatio ?? 1.0}x
                </div>
              </div>

              {/* Ratio */}
              <div className="rounded-md border border-border p-3 space-y-1">
                <div className="text-[11px] text-muted-foreground font-medium">
                  Oversupply Ratio
                </div>
                <div className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {selectedCourse.ratio != null ? `${selectedCourse.ratio.toFixed(2)}x` : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Seats / estimated openings
                </div>
              </div>

              {/* Coverage */}
              <div className="rounded-md border border-border p-3 space-y-1">
                <div className="text-[11px] text-muted-foreground font-medium">
                  Curriculum Coverage
                </div>
                <div className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {selectedCourse.coverage.toFixed(1)}%
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Threshold: {plan?.config.reviseCoverageThreshold ?? 40.0}%
                </div>
              </div>

              {/* Key Skill Trend */}
              <div className="rounded-md border border-border p-3 space-y-1">
                <div className="text-[11px] text-muted-foreground font-medium">
                  Key Skill Trend
                </div>
                <div className="text-lg font-bold font-mono tabular-nums text-foreground flex items-center gap-1">
                  {selectedCourse.keySkillTrend > 0.001 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : selectedCourse.keySkillTrend < -0.001 ? (
                    <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span>
                    {selectedCourse.keySkillTrend > 0 ? "+" : ""}
                    {(selectedCourse.keySkillTrend * 100).toFixed(1)} pp
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Demand-weighted momentum
                </div>
              </div>
            </div>

            {/* Curriculum Revision Advice (only for REVISE courses) */}
            {selectedCourse.actions.includes("REVISE") && (
              <div className="space-y-4 pt-2 border-t border-border/40">
                <h4 className="text-xs font-semibold text-foreground">
                  Curriculum Revision Advice
                </h4>

                {/* Skills to Add */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Skills to add ({selectedCourse.add.length})</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">Share • Trend • Openings</span>
                  </div>

                  {selectedCourse.add.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded">
                      None
                    </p>
                  ) : (
                    <div className="space-y-1.5 border border-border/60 rounded-md p-2 bg-card max-h-48 overflow-y-auto">
                      {selectedCourse.add.map((skill) => (
                        <div
                          key={skill.skillId}
                          className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-muted/40"
                        >
                          <span className="font-medium text-foreground truncate pr-2">
                            {skill.skillName}
                          </span>
                          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] tabular-nums">
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              {(skill.latestShare * 100).toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground">
                              {skill.trend >= 0 ? "+" : ""}
                              {(skill.trend * 100).toFixed(1)} pp
                            </span>
                            <span className="text-muted-foreground">
                              {skill.postingsLatest} postings
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Skills to Retire */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Skills to retire ({selectedCourse.retire.length})</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">Share • Trend • Openings</span>
                  </div>

                  {selectedCourse.retire.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded">
                      None
                    </p>
                  ) : (
                    <div className="space-y-1.5 border border-border/60 rounded-md p-2 bg-card max-h-48 overflow-y-auto">
                      {selectedCourse.retire.map((skill) => (
                        <div
                          key={skill.skillId}
                          className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-muted/40"
                        >
                          <span className="font-medium text-foreground truncate pr-2">
                            {skill.skillName}
                          </span>
                          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] tabular-nums">
                            <span className="text-rose-700 dark:text-rose-400 font-semibold">
                              {(skill.latestShare * 100).toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground">
                              {skill.trend >= 0 ? "+" : ""}
                              {(skill.trend * 100).toFixed(1)} pp
                            </span>
                            <span className="text-muted-foreground">
                              {skill.postingsLatest} postings
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Synthetic Data Note */}
            <div className="text-[11px] text-muted-foreground italic pt-2 border-t border-border/40">
              Based on synthetic data.
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
