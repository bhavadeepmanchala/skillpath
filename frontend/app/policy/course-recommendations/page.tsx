"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  Lightbulb,
  PlusCircle,
  MinusCircle,
  MapPin,
  Calendar,
  ChevronRight,
  Info,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Search,
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
  LowSampleBadge,
  Drawer,
  ErrorState,
  EmptyState,
  Skeleton,
  TableSkeleton,
} from "@/components/ui-kit"
import { computeDumbbellScale } from "@/lib/dumbbell"
import {
  formatPercent,
  formatInteger,
  pluralize,
  buildRecommendationFinding,
} from "@/lib/findings"

function CourseRecommendationsContent() {
  const searchParams = useSearchParams()
  const courseParam = searchParams.get("course")
  const districtParam = searchParams.get("district")
  const initializedFromParams = useRef(false)

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

  // Search & Progressive disclosure state
  const [addSearch, setAddSearch] = useState("")
  const [retireSearch, setRetireSearch] = useState("")
  const [showAllAdd, setShowAllAdd] = useState(false)
  const [showAllRetire, setShowAllRetire] = useState(false)

  // ---------------------------------------------------------------------------
  // Drawer State
  // ---------------------------------------------------------------------------
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<CourseRecommendationItem | null>(null)
  const [drawerType, setDrawerType] = useState<"ADD" | "RETIRE" | null>(null)

  // 1. Initial Load: Course Catalog & District Catalog
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

        const sortedCourses = [...courseList].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
        setCourses(sortedCourses)

        const sortedDistricts = [...districtResp.districts].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
        setDistricts(sortedDistricts)

        // Preselect filters on first load if query params are present and valid
        if (!initializedFromParams.current) {
          initializedFromParams.current = true
          if (courseParam) {
            const courseFound = sortedCourses.find((c) => String(c.id) === courseParam)
            if (courseFound) {
              setSelectedCourseId(String(courseFound.id))
            }
          }
          if (districtParam) {
            const districtFound = sortedDistricts.find((d) => String(d.districtId) === districtParam)
            if (districtFound) {
              setSelectedDistrictId(String(districtFound.districtId))
            }
          }
        }
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
  }, [courseParam, districtParam])

  // 2. Load Recommendations with Cache & Stale Request Cancellation
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

  // Select Options
  const courseOptions = useMemo(() => {
    return [
      { label: "Select a course to analyze...", value: "" },
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
    setAddSearch("")
    setRetireSearch("")
  }

  // Drawer Handler
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

  // Filtered Add items
  const processedAdd = useMemo(() => {
    if (!data?.add) return []
    const q = addSearch.trim().toLowerCase()
    if (!q) return data.add
    return data.add.filter((s) => s.skillName.toLowerCase().includes(q))
  }, [data?.add, addSearch])

  const visibleAdd = useMemo(() => {
    if (showAllAdd || processedAdd.length <= 10) return processedAdd
    return processedAdd.slice(0, 10)
  }, [processedAdd, showAllAdd])

  // Filtered Retire items
  const processedRetire = useMemo(() => {
    if (!data?.retire) return []
    const q = retireSearch.trim().toLowerCase()
    if (!q) return data.retire
    return data.retire.filter((s) => s.skillName.toLowerCase().includes(q))
  }, [data?.retire, retireSearch])

  const visibleRetire = useMemo(() => {
    if (showAllRetire || processedRetire.length <= 10) return processedRetire
    return processedRetire.slice(0, 10)
  }, [processedRetire, showAllRetire])

  // Maximum share for bar normalization
  const maxAddShare = useMemo(() => {
    if (!data?.add || data.add.length === 0) return 0.5
    return Math.max(...data.add.map((a) => a.latestShare), 0.05)
  }, [data?.add])

  const maxRetireShare = useMemo(() => {
    if (!data?.retire || data.retire.length === 0) return 0.5
    return Math.max(...data.retire.map((r) => r.latestShare), 0.05)
  }, [data?.retire])

  // Finding sentence calculation via shared lib/findings.ts (includes low-sample caution)
  const findingHeadline = useMemo(() => {
    if (!data) {
      return "Select a course to evaluate curriculum alignment against synthetic job postings."
    }
    return buildRecommendationFinding({
      courseName: data.courseName,
      districtName: data.districtId ? selectedDistrictName : undefined,
      addCount: data.add.length,
      retireCount: data.retire.length,
      topAddSkillName: data.add[0]?.skillName,
      topAddLatestShare: data.add[0]?.latestShare,
      postingsInScope: data.add[0]?.postingsLatest ?? data.retire[0]?.postingsLatest,
    })
  }, [data, selectedDistrictName])

  return (
    <div className="space-y-4 animate-page-enter">
      {/* 1. Page Header with standfirst */}
      <PageHeader
        title="Course Recommendations"
        standfirst="Data-driven curriculum update guidance: emerging skills to add and declining competencies to retire based on employer hiring demand."
        showSyntheticBadge={false}
      />

      {/* 2. Filter Bar: Course & District */}
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
          label="Geographic scope"
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

      {/* 3. Empty State before course selection */}
      {!coursesError && !selectedCourseId && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-12 text-center text-card-foreground shadow-resting">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lightbulb className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="font-serif text-lg font-semibold text-foreground">
            Select a course to view curriculum recommendations
          </h3>
          <p className="mt-1.5 max-w-[65ch] text-xs leading-relaxed text-muted-foreground">
            Choose a course from the dropdown above to view recommended curriculum updates,
            including missing in-demand skills to add and declining competencies to retire based on
            employer job postings.
          </p>
        </div>
      )}

      {/* Loading Skeletons */}
      {selectedCourseId && loading && (
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
          <TableSkeleton rows={5} cols={4} />
        </div>
      )}

      {/* Error State */}
      {selectedCourseId && !loading && error && (
        <ErrorState
          message="Could not load recommendations for this course"
          description={error}
          onRetry={() => loadRecommendations(selectedCourseId, selectedDistrictId)}
        />
      )}

      {/* Content State when course is loaded */}
      {selectedCourseId && !loading && !error && data && (
        <div className="space-y-5">
          {/* Finding Headline & Open FigureRow (no KPI boxes) */}
          <section className="space-y-3.5">
            <FindingHeadline
              kicker="Curriculum Evaluation Finding"
              sentence={findingHeadline}
            >
              <SourceCaption
                scope={`${data.courseName} · ${data.districtId ? selectedDistrictName : "National"}`}
                window={
                  data.latestWindow && data.previousWindow
                    ? `${data.latestWindow.from} to ${data.latestWindow.to}`
                    : `${data.windowMonths} months window`
                }
                note="Derived from synthetic job posting demand share trajectories"
              />
            </FindingHeadline>

            <FigureRow columns={4}>
              <BigNumber
                label="Skills to Add"
                rawValue={data.add.length}
                footnote={
                  data.add.length === data.maxItems
                    ? `Capped at top ${data.maxItems} skills`
                    : "Untaught high-demand skills"
                }
              />
              <BigNumber
                label="Skills to Retire"
                rawValue={data.retire.length}
                footnote="Meets 3-part decline rule"
              />
              <BigNumber
                label="Leading Addition Share"
                value={data.add[0] ? formatPercent(data.add[0].latestShare) : "—"}
                footnote={data.add[0] ? data.add[0].skillName : "None recommended"}
              />
              <BigNumber
                label="Deepest Contraction"
                value={
                  data.retire[0]
                    ? `${(data.retire[0].relativeGrowth * 100).toFixed(1)}%`
                    : "—"
                }
                footnote={data.retire[0] ? data.retire[0].skillName : "No falling taught skills"}
              />
            </FigureRow>
          </section>

          {/* ================================================================= */}
          {/* SIGNATURE SPLIT VIEW: Left = What this course teaches (Retire)    */}
          {/*                       Right = What the market asks (Add)          */}
          {/* ================================================================= */}
          {(() => {
            const splitScale = computeDumbbellScale(
              [...data.retire, ...data.add].map((s) => ({
                prev: s.previousShare * 100,
                latest: s.latestShare * 100,
              })),
              { minMax: 20, step: 10, capAt: 100 }
            )

            const useWideRight = data.retire.length === 0

            return (
              <div
                className={
                  useWideRight
                    ? "grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 items-start"
                    : "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 items-start"
                }
              >
                {/* LEFT COLUMN: Taught skills to retire */}
                <section className="min-w-0 space-y-3">
                  <SectionHeader
                    title="Taught skills to retire"
                    subtitle={`Taught skills flagged under the 3-part retire rule (falling trend, decline ≥ ${Math.round(
                      data.retireMinDecline * 100
                    )}%, share ≤ ${Math.round(data.retireMaxShare * 100)}%).`}
                  />

                  {data.retire.length > 0 && (
                    <div className="relative w-full sm:w-56">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <input
                        id="retire-skill-filter"
                        name="retireSkillFilter"
                        type="text"
                        placeholder="Filter taught..."
                        value={retireSearch}
                        onChange={(e) => setRetireSearch(e.target.value)}
                        aria-label="Filter taught skills"
                        className="w-full pl-8 pr-2.5 py-1 rounded-md border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  )}

                  {data.retire.length === 0 ? (
                    <div className="flex items-start gap-2.5 rounded-md border border-border/70 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-positive shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="leading-snug">
                        <strong className="font-semibold text-foreground">
                          No taught skill meets the retire rule.
                        </strong>{" "}
                        All taught skills in this course either maintain stable demand, have mild contraction (&lt; 10%), or remain dominant core skills (&gt; 40% share).
                      </p>
                    </div>
                  ) : processedRetire.length === 0 ? (
                    <EmptyState
                      title="No matching skills"
                      description={`No taught skills matched "${retireSearch}".`}
                    />
                  ) : (
                    <div>
                      <DumbbellScaleHeader
                        leftLabel="Taught Skill"
                        maxScale={splitScale}
                        unit="%"
                        rightLabel="Prev → Latest"
                      />
                      <div className="divide-y divide-border/70 border-b border-border/70">
                        {visibleRetire.map((item, index) => {
                          const hasLowSample = isLowSample(item.postingsLatest, LOW_SAMPLE_THRESHOLD)
                          const relDecline = `${(item.relativeGrowth * 100).toFixed(1)}%`
                          const isSelected =
                            drawerOpen &&
                            drawerType === "RETIRE" &&
                            selectedSkill?.skillId === item.skillId

                          return (
                            <DumbbellRow
                              key={item.skillId}
                              rank={index + 1}
                              label={item.skillName}
                              sublabel={`Rel. decline ${relDecline}`}
                              previousValue={item.previousShare * 100}
                              latestValue={item.latestShare * 100}
                              maxScale={splitScale}
                              previousText={formatPercent(item.previousShare)}
                              latestText={formatPercent(item.latestShare)}
                              tone="negative"
                              active={isSelected}
                              staggerIndex={index}
                              onClick={() => handleOpenDrawer(item, "RETIRE")}
                              badge={
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-negative-foreground bg-negative-subtle px-1.5 py-0.5 rounded border border-negative/30">
                                    Retire
                                  </span>
                                  <DeltaBadge value={item.trend} size="sm" />
                                  {hasLowSample && <LowSampleBadge />}
                                </div>
                              }
                            />
                          )
                        })}
                      </div>

                      {processedRetire.length > 10 && (
                        <div className="pt-3 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Showing {visibleRetire.length} of {processedRetire.length} skills
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAllRetire((prev) => !prev)}
                            className="font-semibold text-primary hover:underline rounded px-2 py-1"
                          >
                            {showAllRetire ? "Show top 10 only" : `Show all ${processedRetire.length} skills`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* RIGHT COLUMN: Market asks, course does not teach (Add list) */}
                <section className="min-w-0 space-y-3">
                  <SectionHeader
                    title="Market asks, course does not teach"
                    subtitle={`Untaught skills with demand share ≥ ${Math.round(
                      data.minShareForAdd * 100
                    )}% and ≥ ${data.minPostings} postings in scope.`}
                    actions={
                      useWideRight && data.add.length > 0 ? (
                        <div className="relative w-full sm:w-44">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                          <input
                            id="add-skill-filter"
                            name="addSkillFilter"
                            type="text"
                            placeholder="Filter market adds..."
                            value={addSearch}
                            onChange={(e) => setAddSearch(e.target.value)}
                            aria-label="Filter market additions"
                            className="w-full pl-8 pr-2.5 py-1 rounded-md border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                        </div>
                      ) : undefined
                    }
                  />

                  {!useWideRight && data.add.length > 0 && (
                    <div className="relative w-full sm:w-56">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <input
                        id="add-skill-filter"
                        name="addSkillFilter"
                        type="text"
                        placeholder="Filter market adds..."
                        value={addSearch}
                        onChange={(e) => setAddSearch(e.target.value)}
                        aria-label="Filter market additions"
                        className="w-full pl-8 pr-2.5 py-1 rounded-md border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  )}

                  {data.add.length === 0 ? (
                    <EmptyState
                      title="No skills meet the add criteria"
                      description="No untaught skills for linked roles meet the minimum demand share threshold in this observation window."
                    />
                  ) : processedAdd.length === 0 ? (
                    <EmptyState
                      title="No matching skills"
                      description={`No add candidates matched "${addSearch}".`}
                    />
                  ) : (
                    <div>
                      <DumbbellScaleHeader
                        leftLabel="Untaught Skill"
                        maxScale={splitScale}
                        unit="%"
                        rightLabel="Prev → Latest"
                      />
                      <div className="divide-y divide-border/70 border-b border-border/70">
                        {visibleAdd.map((item, index) => {
                          const hasLowSample = isLowSample(item.postingsLatest, LOW_SAMPLE_THRESHOLD)
                          const isSelected =
                            drawerOpen &&
                            drawerType === "ADD" &&
                            selectedSkill?.skillId === item.skillId

                          return (
                            <DumbbellRow
                              key={item.skillId}
                              rank={index + 1}
                              label={item.skillName}
                              sublabel={`${formatInteger(item.postingsLatest)} openings · ${
                                item.score != null ? `score ${item.score.toFixed(2)}` : "score —"
                              }`}
                              previousValue={item.previousShare * 100}
                              latestValue={item.latestShare * 100}
                              maxScale={splitScale}
                              previousText={formatPercent(item.previousShare)}
                              latestText={formatPercent(item.latestShare)}
                              tone="positive"
                              active={isSelected}
                              staggerIndex={index}
                              onClick={() => handleOpenDrawer(item, "ADD")}
                              badge={
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <DeltaBadge value={item.trend} size="sm" />
                                  {hasLowSample && <LowSampleBadge />}
                                </div>
                              }
                            />
                          )
                        })}
                      </div>

                      {processedAdd.length > 10 && (
                        <div className="pt-3 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Showing {visibleAdd.length} of {processedAdd.length} skills
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAllAdd((prev) => !prev)}
                            className="font-semibold text-primary hover:underline rounded px-2 py-1"
                          >
                            {showAllAdd ? "Show top 10 only" : `Show all ${processedAdd.length} skills`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            )
          })()}

          {/* Transparency Footer Caption */}
          <p className="pt-4 border-t border-border text-xs text-muted-foreground">
            Synthetic data. Evaluation parameters: min share for addition = {(data.minShareForAdd * 100).toFixed(0)}%, retire min decline = {(data.retireMinDecline * 100).toFixed(0)}%, retire max share ceiling = {(data.retireMaxShare * 100).toFixed(0)}%.
          </p>
        </div>
      )}

      {/* 4. Detail Drawer (1-click from any row) */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        title={selectedSkill?.skillName || "Curriculum Recommendation Detail"}
        subtitle={
          selectedSkill && data
            ? `${drawerType === "ADD" ? "Add to syllabus" : "Retire from syllabus"} · ${data.courseName}`
            : undefined
        }
      >
        {selectedSkill && data && (
          <div className="space-y-6 text-xs">
            {/* Status card */}
            <div
              className={`rounded-lg border p-4 ${
                drawerType === "ADD"
                  ? "border-positive/30 bg-positive-subtle/50 text-positive-foreground"
                  : "border-negative/30 bg-negative-subtle/50 text-negative-foreground"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {drawerType === "ADD" ? (
                  <>
                    <PlusCircle className="h-4 w-4 text-positive" />
                    <span>Recommended for Curriculum Addition</span>
                  </>
                ) : (
                  <>
                    <MinusCircle className="h-4 w-4 text-negative" />
                    <span>Recommended for Curriculum Retirement</span>
                  </>
                )}
              </div>
              <p className="mt-1 text-muted-foreground leading-relaxed">
                {drawerType === "ADD"
                  ? `Demanded in job postings for roles linked to ${data.courseName}, but untaught in the current syllabus.`
                  : `Taught in ${data.courseName}, but exhibits substantial hiring contraction and remains below the dominant core threshold.`}
              </p>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-2.5">
              <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Deterministic Metrics
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Latest Share
                  </span>
                  <div className="font-serif text-xl font-bold font-mono text-foreground">
                    {formatPercent(selectedSkill.latestShare)}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {data.latestWindow ? `${data.latestWindow.from} to ${data.latestWindow.to}` : "Latest window"}
                  </span>
                </div>

                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Previous Share
                  </span>
                  <div className="font-serif text-xl font-bold font-mono text-foreground">
                    {formatPercent(selectedSkill.previousShare)}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {data.previousWindow ? `${data.previousWindow.from} to ${data.previousWindow.to}` : "Previous window"}
                  </span>
                </div>

                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Demand Momentum
                  </span>
                  <div className="pt-0.5">
                    <DeltaBadge value={selectedSkill.trend} size="sm" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Trailing percentage points
                  </span>
                </div>

                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Relative Growth
                  </span>
                  <div className="font-serif text-xl font-bold font-mono text-foreground">
                    {selectedSkill.relativeGrowth > 0 ? "+" : ""}
                    {(selectedSkill.relativeGrowth * 100).toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Relative shift over baseline
                  </span>
                </div>

                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Postings in Window
                  </span>
                  <div className="font-serif text-xl font-bold font-mono text-foreground">
                    {formatInteger(selectedSkill.postingsLatest)}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Sample openings in scope
                  </span>
                </div>

                {drawerType === "ADD" && (
                  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Rank Score
                    </span>
                    <div className="font-serif text-xl font-bold font-mono text-foreground">
                      {selectedSkill.score != null ? selectedSkill.score.toFixed(3) : "—"}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      share × (1 + max(0, relGrowth))
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Rule Checklist */}
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
              <span className="font-semibold text-foreground">
                {drawerType === "ADD" ? "Addition Rule Verification:" : "3-Part Retirement Rule Verification:"}
              </span>
              {drawerType === "ADD" ? (
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-positive shrink-0" />
                    <span>Untaught in course syllabus</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-positive shrink-0" />
                    <span>Demand share {(selectedSkill.latestShare * 100).toFixed(1)}% ≥ {(data.minShareForAdd * 100).toFixed(0)}% threshold</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-positive shrink-0" />
                    <span>Postings volume ({selectedSkill.postingsLatest}) ≥ {data.minPostings} min postings guard</span>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-negative shrink-0" />
                    <span>Falling momentum: trend &lt; 0 ({(selectedSkill.trend * 100).toFixed(2)} pp)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-negative shrink-0" />
                    <span>Substantial contraction: decline ≥ {(data.retireMinDecline * 100).toFixed(0)}% ({(selectedSkill.relativeGrowth * 100).toFixed(1)}%)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-negative shrink-0" />
                    <span>Non-dominant: share {(selectedSkill.latestShare * 100).toFixed(1)}% ≤ {(data.retireMaxShare * 100).toFixed(0)}% ceiling</span>
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

export default function CourseRecommendationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <TableSkeleton rows={5} cols={4} />
        </div>
      }
    >
      <CourseRecommendationsContent />
    </Suspense>
  )
}
