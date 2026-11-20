"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react"
import {
  Lightbulb,
  PlusCircle,
  MinusCircle,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  Info,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import {
  fetchCourses,
  fetchDistricts,
  fetchCourseRecommendations,
  CourseRecommendationNotFoundError,
  isLowSample,
  LOW_SAMPLE_THRESHOLD,
  type CourseItem,
  type DistrictDemandItem,
  type CourseRecommendationsResponse,
  type CourseRecommendationItem,
} from "@/lib/demand-api"
import {
  PageHeader,
  SectionCard,
  FilterBar,
  SelectField,
  KpiCard,
  KpiCardSkeleton,
  TableSkeleton,
  Drawer,
  ErrorState,
  EmptyState,
  LowSampleBadge,
  DeltaBadge,
  DataBadge,
} from "@/components/ui-kit"

export default function CourseRecommendationsPage() {
  // ---------------------------------------------------------------------------
  // Filters State: Courses & Districts
  // ---------------------------------------------------------------------------
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [coursesError, setCoursesError] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")

  const [districts, setDistricts] = useState<DistrictDemandItem[]>([])
  const [districtsLoading, setDistrictsLoading] = useState(true)
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("")

  // ---------------------------------------------------------------------------
  // Recommendations Data State & In-State Cache per (course, district)
  // ---------------------------------------------------------------------------
  const [cache, setCache] = useState<Record<string, CourseRecommendationsResponse>>({})
  const [data, setData] = useState<CourseRecommendationsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeRequestKey = useRef<string>("")

  // ---------------------------------------------------------------------------
  // Drawer State
  // ---------------------------------------------------------------------------
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<CourseRecommendationItem | null>(null)
  const [drawerType, setDrawerType] = useState<"ADD" | "RETIRE" | null>(null)

  // ---------------------------------------------------------------------------
  // 1. Initial Load: Course Catalog & District Catalog
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true

    async function loadCatalogs() {
      setCoursesLoading(true)
      setDistrictsLoading(true)
      setCoursesError(null)

      try {
        const [courseList, districtResp] = await Promise.all([
          fetchCourses(),
          fetchDistricts(),
        ])
        if (!isMounted) return

        // Sort courses alphabetically by name
        const sortedCourses = [...courseList].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
        setCourses(sortedCourses)

        // Sort districts alphabetically by name
        const sortedDistricts = [...districtResp.districts].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
        setDistricts(sortedDistricts)
      } catch {
        if (!isMounted) return
        setCoursesError("Failed to load course or district catalog. Is the backend running?")
      } finally {
        if (isMounted) {
          setCoursesLoading(false)
          setDistrictsLoading(false)
        }
      }
    }

    loadCatalogs()

    return () => {
      isMounted = false
    }
  }, [])

  // ---------------------------------------------------------------------------
  // 2. Load Recommendations with Cache & Stale Request Cancellation
  // ---------------------------------------------------------------------------
  const loadRecommendations = useCallback(
    async (courseId: string, districtId: string) => {
      if (!courseId) {
        setData(null)
        setLoading(false)
        setError(null)
        return
      }

      const key = `${courseId}:${districtId || "national"}`
      activeRequestKey.current = key

      // Check cache first
      if (cache[key]) {
        setData(cache[key])
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const res = await fetchCourseRecommendations(
          Number(courseId),
          districtId ? Number(districtId) : null
        )

        // Ensure this is still the active request
        if (activeRequestKey.current === key) {
          setCache((prev) => ({ ...prev, [key]: res }))
          setData(res)
        }
      } catch (err) {
        if (activeRequestKey.current === key) {
          if (err instanceof CourseRecommendationNotFoundError) {
            setError(err.message)
          } else if (err instanceof Error) {
            setError(err.message)
          } else {
            setError("Failed to load course recommendations.")
          }
        }
      } finally {
        if (activeRequestKey.current === key) {
          setLoading(false)
        }
      }
    },
    [cache]
  )

  useEffect(() => {
    loadRecommendations(selectedCourseId, selectedDistrictId)
  }, [selectedCourseId, selectedDistrictId, loadRecommendations])

  // ---------------------------------------------------------------------------
  // Select Options
  // ---------------------------------------------------------------------------
  const courseOptions = useMemo(() => {
    return [
      { label: "Select a course...", value: "" },
      ...courses.map((c) => ({
        label: c.name,
        value: String(c.id),
      })),
    ]
  }, [courses])

  const districtOptions = useMemo(() => {
    return [
      { label: "All districts (national)", value: "" },
      ...districts.map((d) => ({
        label: `${d.name} (${d.state})`,
        value: String(d.districtId),
      })),
    ]
  }, [districts])

  const selectedDistrictName = useMemo(() => {
    if (!selectedDistrictId) return "All districts (national)"
    const match = districts.find((d) => String(d.districtId) === selectedDistrictId)
    return match ? `${match.name} (${match.state})` : `District ${selectedDistrictId}`
  }, [selectedDistrictId, districts])

  const handleResetFilters = () => {
    setSelectedCourseId("")
    setSelectedDistrictId("")
  }

  // ---------------------------------------------------------------------------
  // Drawer Handler
  // ---------------------------------------------------------------------------
  const handleOpenDrawer = (item: CourseRecommendationItem, type: "ADD" | "RETIRE") => {
    setSelectedSkill(item)
    setDrawerType(type)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setSelectedSkill(null)
    setDrawerType(null)
  }

  return (
    <div className="animate-page-enter space-y-6 p-6">
      {/* Page Header */}
      <PageHeader
        title="Course Recommendations"
        description="Data-driven curriculum update recommendations for courses, identifying emerging skills to add and declining skills to retire based on regional and national employer demand."
        badge={<DataBadge label="Synthetic data" />}
      />

      {/* Filter Bar */}
      <FilterBar
        onReset={handleResetFilters}
        isFiltered={Boolean(selectedCourseId || selectedDistrictId)}
      >
        <SelectField
          id="course-select"
          label="Course"
          value={selectedCourseId}
          onChange={(val) => setSelectedCourseId(val)}
          options={courseOptions}
          disabled={coursesLoading}
          className="min-w-[280px]"
        />

        <SelectField
          id="district-select"
          label="District"
          value={selectedDistrictId}
          onChange={(val) => setSelectedDistrictId(val)}
          options={districtOptions}
          disabled={districtsLoading}
          className="min-w-[220px]"
        />
      </FilterBar>

      {/* Course Catalog Error */}
      {coursesError && (
        <ErrorState
          message="Could not load course catalog"
          description={coursesError}
          onRetry={() => {
            setCoursesLoading(true)
            fetchCourses()
              .then((list) => {
                const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name))
                setCourses(sorted)
                setCoursesError(null)
              })
              .catch(() => setCoursesError("Failed to load courses."))
              .finally(() => setCoursesLoading(false))
          }}
        />
      )}

      {/* State: No Course Selected Hint */}
      {!coursesError && !selectedCourseId && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/60 p-12 text-center text-card-foreground shadow-resting">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lightbulb className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Select a course to view recommendations
          </h3>
          <p className="mt-1.5 max-w-[60ch] text-xs leading-5 text-muted-foreground">
            Choose a course from the dropdown above to view recommended curriculum updates,
            including missing in-demand skills to add and declining skills to retire based on
            employer job postings.
          </p>
        </div>
      )}

      {/* State: Course Selected - Loading Skeletons */}
      {selectedCourseId && loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </div>
          <SectionCard title="Skills to add" subtitle="Loading curriculum recommendations...">
            <TableSkeleton rows={5} cols={6} />
          </SectionCard>
          <SectionCard title="Skills to retire" subtitle="Loading retirement candidates...">
            <TableSkeleton rows={3} cols={5} />
          </SectionCard>
        </div>
      )}

      {/* State: Course Selected - Error with Retry */}
      {selectedCourseId && !loading && error && (
        <ErrorState
          message="Could not load recommendations for this course"
          description={error}
          onRetry={() => loadRecommendations(selectedCourseId, selectedDistrictId)}
        />
      )}

      {/* State: Course Selected - Content */}
      {selectedCourseId && !loading && !error && data && (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Skills to Add"
              rawValue={data.add.length}
              footnote={
                data.add.length === data.maxItems
                  ? `Capped at top ${data.maxItems} items`
                  : "Untaught high-demand skills"
              }
              icon={PlusCircle}
              staggerIndex={0}
            />

            <KpiCard
              label="Skills to Retire"
              rawValue={data.retire.length}
              footnote="Taught declining skills meeting 3-part rule"
              icon={MinusCircle}
              staggerIndex={1}
            />

            <KpiCard
              label="Market Scope"
              value={data.districtId ? selectedDistrictName : "All districts (National)"}
              footnote={
                data.districtId
                  ? "Filtered to selected district demand"
                  : "Aggregated across all 40 districts"
              }
              icon={MapPin}
              staggerIndex={2}
            />

            <KpiCard
              label="Observation Windows"
              value={`${data.windowMonths} months`}
              footnote={
                data.latestWindow && data.previousWindow
                  ? `${data.latestWindow.from} to ${data.latestWindow.to} vs ${data.previousWindow.from} to ${data.previousWindow.to}`
                  : "Comparison periods"
              }
              icon={Calendar}
              staggerIndex={3}
            />
          </div>

          {/* Section 1: Skills to Add */}
          <SectionCard
            title="Skills to add"
            subtitle={`Untaught skills from linked roles with demand share ≥ ${(
              data.minShareForAdd * 100
            ).toFixed(0)}% and at least ${data.minPostings} postings in scope. Ranked by score = demand share × (1 + max(0, relative growth)). Click any row for details.`}
            actionSlot={
              <span className="text-xs font-mono text-muted-foreground">
                Showing {data.add.length} of max {data.maxItems}
              </span>
            }
          >
            {data.add.length === 0 ? (
              <EmptyState
                title="No skills meet the add criteria"
                description="No untaught skills for the linked roles meet the minimum demand share threshold in this observation window."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                      <th className="py-2.5 px-3 font-semibold w-12 text-center">Rank</th>
                      <th className="py-2.5 px-3 font-semibold">Skill</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Demand Share</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Trend</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Score</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Postings</th>
                      <th className="py-2.5 px-3 font-semibold text-center w-10">
                        <span className="sr-only">Details</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.add.map((item, index) => {
                      const lowSample = isLowSample(
                        item.postingsLatest,
                        LOW_SAMPLE_THRESHOLD
                      )
                      return (
                        <tr
                          key={item.skillId}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleOpenDrawer(item, "ADD")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              handleOpenDrawer(item, "ADD")
                            }
                          }}
                          className="cursor-pointer border-b border-border/50 transition-colors duration-120 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                          title={`Click to inspect numbers for ${item.skillName}`}
                        >
                          <td className="py-2.5 px-3 font-mono font-medium text-center text-muted-foreground">
                            #{index + 1}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <span>{item.skillName}</span>
                              {lowSample && <LowSampleBadge />}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-right text-foreground">
                            {(item.latestShare * 100).toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <DeltaBadge value={item.trend} size="sm" />
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-right font-semibold text-foreground">
                            {item.score != null ? item.score.toFixed(2) : "-"}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-right text-muted-foreground">
                            {item.postingsLatest.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center text-muted-foreground">
                            <ChevronRight className="h-3.5 w-3.5 inline-block" aria-hidden="true" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Section 2: Skills to Retire */}
          <SectionCard
            title="Skills to retire"
            subtitle={`Taught skills recommended for retirement based on the 3-part rule: (1) falling momentum (trend < 0), (2) contraction ≥ ${(
              data.retireMinDecline * 100
            ).toFixed(0)}% relative decline, and (3) latest share ≤ ${(
              data.retireMaxShare * 100
            ).toFixed(0)}% (dominant core skills are preserved). Ranked by steepest relative contraction first.`}
            actionSlot={
              <span className="text-xs font-mono text-muted-foreground">
                Showing {data.retire.length} of max {data.maxItems}
              </span>
            }
          >
            {data.retire.length === 0 ? (
              <EmptyState
                title="No taught skill meets the retire rule"
                description="All taught skills in this course either maintain stable demand, have mild contraction (< 10%), or remain dominant core skills (> 40% share)."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                      <th className="py-2.5 px-3 font-semibold">Skill</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Demand Share</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Relative Growth</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Trend</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Postings</th>
                      <th className="py-2.5 px-3 font-semibold text-center w-10">
                        <span className="sr-only">Details</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.retire.map((item) => {
                      const lowSample = isLowSample(
                        item.postingsLatest,
                        LOW_SAMPLE_THRESHOLD
                      )
                      const relGrowthPct = (item.relativeGrowth * 100).toFixed(1)
                      return (
                        <tr
                          key={item.skillId}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleOpenDrawer(item, "RETIRE")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              handleOpenDrawer(item, "RETIRE")
                            }
                          }}
                          className="cursor-pointer border-b border-border/50 transition-colors duration-120 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                          title={`Click to inspect numbers for ${item.skillName}`}
                        >
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <span>{item.skillName}</span>
                              {lowSample && <LowSampleBadge />}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-right text-foreground">
                            {(item.latestShare * 100).toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-right font-medium text-rose-600 dark:text-rose-400">
                            {item.relativeGrowth > 0 ? `+${relGrowthPct}%` : `${relGrowthPct}%`}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <DeltaBadge value={item.trend} size="sm" />
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-right text-muted-foreground">
                            {item.postingsLatest.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center text-muted-foreground">
                            <ChevronRight className="h-3.5 w-3.5 inline-block" aria-hidden="true" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Visible Notice */}
          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground">
            Synthetic data. Thresholds are tuned defaults, not validated.
          </div>
        </div>
      )}

      {/* Skill Detail Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        title={selectedSkill?.skillName || "Skill Details"}
        subtitle={
          selectedSkill && data
            ? `${drawerType === "ADD" ? "Add to curriculum" : "Retire from curriculum"} · ${data.courseName}`
            : undefined
        }
      >
        {selectedSkill && data && (
          <div className="space-y-6 text-xs">
            {/* Header Status Card */}
            <div
              className={`rounded-lg border p-4 ${
                drawerType === "ADD"
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100"
                  : "border-rose-500/30 bg-rose-500/5 text-rose-950 dark:text-rose-100"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {drawerType === "ADD" ? (
                  <>
                    <PlusCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Recommended for Addition</span>
                  </>
                ) : (
                  <>
                    <MinusCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <span>Recommended for Retirement</span>
                  </>
                )}
              </div>
              <p className="mt-1 text-muted-foreground leading-relaxed">
                {drawerType === "ADD"
                  ? `This skill is demanded across job postings for roles linked to ${data.courseName}, but is not currently taught in the syllabus.`
                  : `This skill is taught in ${data.courseName}, but shows significant demand decline and remains below dominant market share.`}
              </p>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Metrics Breakdown
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-card p-3 shadow-resting">
                  <div className="text-muted-foreground">Latest Demand Share</div>
                  <div className="mt-1 text-lg font-bold font-mono text-foreground">
                    {(selectedSkill.latestShare * 100).toFixed(2)}%
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Window: {data.latestWindow ? `${data.latestWindow.from} to ${data.latestWindow.to}` : "Latest"}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-3 shadow-resting">
                  <div className="text-muted-foreground">Previous Demand Share</div>
                  <div className="mt-1 text-lg font-bold font-mono text-foreground">
                    {(selectedSkill.previousShare * 100).toFixed(2)}%
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Window: {data.previousWindow ? `${data.previousWindow.from} to ${data.previousWindow.to}` : "Previous"}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-3 shadow-resting">
                  <div className="text-muted-foreground">Demand Momentum (Trend)</div>
                  <div className="mt-1">
                    <DeltaBadge value={selectedSkill.trend} size="md" />
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Percentage point change
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-3 shadow-resting">
                  <div className="text-muted-foreground">Relative Growth</div>
                  <div className="mt-1 text-lg font-bold font-mono text-foreground">
                    {selectedSkill.relativeGrowth > 0 ? "+" : ""}
                    {(selectedSkill.relativeGrowth * 100).toFixed(1)}%
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Percentage change over base
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-3 shadow-resting">
                  <div className="text-muted-foreground">Postings in Latest Window</div>
                  <div className="mt-1 text-lg font-bold font-mono text-foreground">
                    {selectedSkill.postingsLatest.toLocaleString()}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Active job postings in scope
                  </div>
                </div>

                {drawerType === "ADD" && (
                  <div className="rounded-lg border border-border bg-card p-3 shadow-resting">
                    <div className="text-muted-foreground">Candidate Score</div>
                    <div className="mt-1 text-lg font-bold font-mono text-foreground">
                      {selectedSkill.score != null ? selectedSkill.score.toFixed(3) : "-"}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      share × (1 + max(0, relativeGrowth))
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Low Sample Warning */}
            {isLowSample(selectedSkill.postingsLatest, LOW_SAMPLE_THRESHOLD) && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold">Low sample caution:</span> Fewer than{" "}
                  {LOW_SAMPLE_THRESHOLD} job postings were observed for this skill in the latest
                  window. Regional samples may have higher statistical variance.
                </div>
              </div>
            )}

            {/* Rule Verification Card */}
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
              <div className="font-semibold text-foreground">
                {drawerType === "ADD" ? "Why add this skill?" : "Why retire this skill?"}
              </div>
              {drawerType === "ADD" ? (
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      Not taught in course (eligible untaught candidate)
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      Demand share {(selectedSkill.latestShare * 100).toFixed(1)}% ≥ {(data.minShareForAdd * 100).toFixed(0)}% min threshold
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      Postings volume ({selectedSkill.postingsLatest}) ≥ {data.minPostings} min postings guard
                    </span>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>
                      Momentum falling: trend &lt; 0 ({(selectedSkill.trend * 100).toFixed(2)} pp)
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>
                      Significant contraction: decline ≥ {(data.retireMinDecline * 100).toFixed(0)}% ({(selectedSkill.relativeGrowth * 100).toFixed(1)}%)
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>
                      Not a dominant core skill: share {(selectedSkill.latestShare * 100).toFixed(1)}% ≤ {(data.retireMaxShare * 100).toFixed(0)}%
                    </span>
                  </li>
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
