"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react"
import Link from "next/link"
import {
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BookOpen,
  Briefcase,
  Users,
  ChevronRight,
  ShieldAlert,
  Percent,
  AlertCircle,
  TrendingDown,
  ArrowRight,
  Search,
} from "lucide-react"
import {
  fetchRoles,
  fetchCourses,
  fetchCourseAlignment,
  fetchFlags,
  fetchDistricts,
  fetchSkillGaps,
  type RoleItem,
  type CourseItem,
  type CourseAlignmentResponse,
  type FlagsResponse,
  type CourseOversupplyItem,
  type DistrictDemandItem,
  type SkillGapItem,
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
  TypographicRow,
  DeltaBadge,
  LowSampleBadge,
  Drawer,
  ErrorState,
  EmptyState,
  ProgressBar,
  Skeleton,
  TableSkeleton,
} from "@/components/ui-kit"
import {
  buildCoverageFinding,
  formatPercent,
  formatInteger,
} from "@/lib/findings"

export default function WorkforceSkillGapsPage() {
  // ---------------------------------------------------------------------------
  // Filters State: Roles & Districts
  // ---------------------------------------------------------------------------
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<string>("")

  const [districts, setDistricts] = useState<DistrictDemandItem[]>([])
  const [districtsLoading, setDistrictsLoading] = useState(true)
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("")

  // Courses catalog (for parallel alignment calls)
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [coursesError, setCoursesError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Section 1: Course Coverage State & Cache
  // ---------------------------------------------------------------------------
  const [alignmentCache, setAlignmentCache] = useState<
    Record<string, CourseAlignmentResponse[]>
  >({})
  const [alignments, setAlignments] = useState<CourseAlignmentResponse[]>([])
  const [alignmentsLoading, setAlignmentsLoading] = useState(true)
  const [alignmentsError, setAlignmentsError] = useState<string | null>(null)
  const [includeUnlinked, setIncludeUnlinked] = useState(false)
  const [courseSearch, setCourseSearch] = useState("")
  const [courseSortBy, setCourseSortBy] = useState<"lowest" | "highest" | "alpha">("lowest")
  const [showAllCourses, setShowAllCourses] = useState(false)
  const activeAlignmentRequestKey = useRef<string>("")

  // Course Drawer state
  const [selectedCourseDrawer, setSelectedCourseDrawer] =
    useState<CourseAlignmentResponse | null>(null)
  const [isCourseDrawerOpen, setIsCourseDrawerOpen] = useState(false)

  // ---------------------------------------------------------------------------
  // Section 2: Oversupply Flags State
  // ---------------------------------------------------------------------------
  const [flags, setFlags] = useState<FlagsResponse | null>(null)
  const [flagsLoading, setFlagsLoading] = useState(true)
  const [flagsError, setFlagsError] = useState<string | null>(null)
  const [flagsSearch, setFlagsSearch] = useState("")
  const [flagsSortBy, setFlagsSortBy] = useState<"attention" | "ratio" | "seats">("attention")
  const [showAllFlags, setShowAllFlags] = useState(false)

  // Flag Drawer state
  const [selectedFlagDrawer, setSelectedFlagDrawer] =
    useState<CourseOversupplyItem | null>(null)
  const [isFlagDrawerOpen, setIsFlagDrawerOpen] = useState(false)

  // ---------------------------------------------------------------------------
  // Section 3: National Skill Gaps State
  // ---------------------------------------------------------------------------
  const [skillGaps, setSkillGaps] = useState<SkillGapItem[]>([])
  const [skillGapsLoading, setSkillGapsLoading] = useState(true)
  const [skillGapsError, setSkillGapsError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // 1. Initial Data Loading: Roles, Courses, Districts, National Skill Gaps
  // ---------------------------------------------------------------------------
  const loadRoles = useCallback(async () => {
    setRolesLoading(true)
    setRolesError(null)
    try {
      const data = await fetchRoles()
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name))
      setRoles(sorted)
      if (sorted.length > 0) {
        setSelectedRoleId((prev) => (prev ? prev : String(sorted[0].id)))
      }
    } catch {
      setRolesError("Failed to load roles. Is the backend running?")
    } finally {
      setRolesLoading(false)
    }
  }, [])

  const loadDistricts = useCallback(async () => {
    setDistrictsLoading(true)
    try {
      const data = await fetchDistricts()
      setDistricts(data.districts)
    } catch (err) {
      console.error("Failed to load districts:", err)
    } finally {
      setDistrictsLoading(false)
    }
  }, [])

  const loadCourses = useCallback(async () => {
    setCoursesLoading(true)
    setCoursesError(null)
    try {
      const data = await fetchCourses()
      setCourses(data)
    } catch {
      setCoursesError("Failed to load course catalog.")
    } finally {
      setCoursesLoading(false)
    }
  }, [])

  const loadSkillGaps = useCallback(async () => {
    setSkillGapsLoading(true)
    setSkillGapsError(null)
    try {
      const data = await fetchSkillGaps()
      setSkillGaps(data.slice(0, 10))
    } catch {
      setSkillGapsError("Failed to load national skill gaps.")
    } finally {
      setSkillGapsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRoles()
    loadDistricts()
    loadCourses()
    loadSkillGaps()
  }, [loadRoles, loadDistricts, loadCourses, loadSkillGaps])

  // ---------------------------------------------------------------------------
  // 2. Fetch Course Alignments (Section 1)
  // ---------------------------------------------------------------------------
  const loadAlignments = useCallback(async () => {
    if (!selectedRoleId || courses.length === 0) return

    const cacheKey = `${selectedRoleId}_${selectedDistrictId || "national"}`
    activeAlignmentRequestKey.current = cacheKey

    if (alignmentCache[cacheKey]) {
      setAlignments(alignmentCache[cacheKey])
      setAlignmentsLoading(false)
      setAlignmentsError(null)
      return
    }

    setAlignmentsLoading(true)
    setAlignmentsError(null)

    try {
      const roleIdNum = Number(selectedRoleId)
      const districtIdNum = selectedDistrictId
        ? Number(selectedDistrictId)
        : null

      const results = await Promise.all(
        courses.map((course) =>
          fetchCourseAlignment(course.id, {
            roleId: roleIdNum,
            districtId: districtIdNum,
          })
        )
      )

      if (activeAlignmentRequestKey.current !== cacheKey) {
        return
      }

      setAlignmentCache((prev) => ({ ...prev, [cacheKey]: results }))
      setAlignments(results)
    } catch {
      if (activeAlignmentRequestKey.current === cacheKey) {
        setAlignmentsError(
          "Could not load course alignment data. Is the backend running?"
        )
      }
    } finally {
      if (activeAlignmentRequestKey.current === cacheKey) {
        setAlignmentsLoading(false)
      }
    }
  }, [selectedRoleId, selectedDistrictId, courses, alignmentCache])

  useEffect(() => {
    if (selectedRoleId && courses.length > 0) {
      loadAlignments()
    }
  }, [selectedRoleId, selectedDistrictId, courses, loadAlignments])

  // ---------------------------------------------------------------------------
  // 3. Fetch Oversupply Flags (Section 2)
  // ---------------------------------------------------------------------------
  const loadFlags = useCallback(async () => {
    setFlagsLoading(true)
    setFlagsError(null)
    try {
      const districtIdNum = selectedDistrictId
        ? Number(selectedDistrictId)
        : null
      const data = await fetchFlags({ districtId: districtIdNum })
      setFlags(data)
    } catch {
      setFlagsError(
        "Could not load oversupply flags data. Is the backend running?"
      )
    } finally {
      setFlagsLoading(false)
    }
  }, [selectedDistrictId])

  useEffect(() => {
    loadFlags()
  }, [loadFlags])

  // Drawers
  const openCourseDrawer = useCallback((item: CourseAlignmentResponse) => {
    setSelectedCourseDrawer(item)
    setIsCourseDrawerOpen(true)
  }, [])

  const openFlagDrawer = useCallback((item: CourseOversupplyItem) => {
    setSelectedFlagDrawer(item)
    setIsFlagDrawerOpen(true)
  }, [])

  // Filter labels
  const roleOptions = useMemo(() => {
    return roles.map((r) => ({
      label: `${r.name} (${r.sector})`,
      value: String(r.id),
    }))
  }, [roles])

  const districtOptions = useMemo(() => {
    const opts = [{ label: "All districts (national)", value: "" }]
    const sorted = [...districts].sort((a, b) => a.name.localeCompare(b.name))
    for (const d of sorted) {
      opts.push({
        label: `${d.name} (${d.state})`,
        value: String(d.districtId),
      })
    }
    return opts
  }, [districts])

  const selectedRoleName = useMemo(() => {
    const found = roles.find((r) => String(r.id) === selectedRoleId)
    return found ? found.name : "Selected Role"
  }, [roles, selectedRoleId])

  const selectedDistrictName = useMemo(() => {
    if (!selectedDistrictId) return "All districts (national)"
    const found = districts.find(
      (d) => String(d.districtId) === selectedDistrictId
    )
    return found ? `${found.name}, ${found.state}` : "Selected District"
  }, [districts, selectedDistrictId])

  // Processed Courses (Section 1 - Needs-attention first: lowest coverage first)
  const processedCourses = useMemo(() => {
    let list = alignments.filter((a) => (includeUnlinked ? true : a.roleLinkedToCourse))

    // Search query
    const q = courseSearch.trim().toLowerCase()
    if (q) {
      list = list.filter((c) => c.courseName.toLowerCase().includes(q))
    }

    // Sort order
    if (courseSortBy === "lowest") {
      list.sort((a, b) => a.coverageScore - b.coverageScore)
    } else if (courseSortBy === "highest") {
      list.sort((a, b) => b.coverageScore - a.coverageScore)
    } else if (courseSortBy === "alpha") {
      list.sort((a, b) => a.courseName.localeCompare(b.courseName))
    }

    return list
  }, [alignments, includeUnlinked, courseSearch, courseSortBy])

  const visibleCourses = useMemo(() => {
    if (showAllCourses || processedCourses.length <= 10) {
      return processedCourses
    }
    return processedCourses.slice(0, 10)
  }, [processedCourses, showAllCourses])

  // Processed Flags (Section 2 - Oversupplied, Obsolete, Low Sample)
  const processedFlags = useMemo(() => {
    if (!flags?.items) return []
    let list = [...flags.items]

    // Search query
    const q = flagsSearch.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (f) =>
          f.courseName.toLowerCase().includes(q) ||
          f.districtName.toLowerCase().includes(q)
      )
    }

    // Sort order: "attention" puts oversupplied and obsolete first
    if (flagsSortBy === "attention") {
      list.sort((a, b) => {
        const aScore = (a.oversupplied ? 4 : 0) + (a.obsolete ? 2 : 0) + (a.lowSample ? -1 : 0)
        const bScore = (b.oversupplied ? 4 : 0) + (b.obsolete ? 2 : 0) + (b.lowSample ? -1 : 0)
        if (bScore !== aScore) return bScore - aScore
        return (b.oversupplyRatio ?? 0) - (a.oversupplyRatio ?? 0)
      })
    } else if (flagsSortBy === "ratio") {
      list.sort((a, b) => {
        if (a.oversupplyRatio == null && b.oversupplyRatio == null) return 0
        if (a.oversupplyRatio == null) return 1
        if (b.oversupplyRatio == null) return -1
        return b.oversupplyRatio - a.oversupplyRatio
      })
    } else if (flagsSortBy === "seats") {
      list.sort((a, b) => b.seats - a.seats)
    }

    return list
  }, [flags, flagsSearch, flagsSortBy])

  const visibleFlags = useMemo(() => {
    if (showAllFlags || processedFlags.length <= 10) {
      return processedFlags
    }
    return processedFlags.slice(0, 10)
  }, [processedFlags, showAllFlags])

  // Section 3: max gap score for normalization
  const maxGapScore = useMemo(() => {
    return Math.max(...skillGaps.map((g) => g.gap_score), 0.001)
  }, [skillGaps])

  // Finding sentence calculation
  const findingHeadline = useMemo(() => {
    if (processedCourses.length > 0) {
      const lowest = processedCourses[0]
      return buildCoverageFinding({
        courseName: lowest.courseName,
        coverage: lowest.coverageScore,
        roleName: selectedRoleName,
        missingCount: lowest.missingSkills.length,
      })
    }
    return "Analyzing curriculum alignment against employer skill requirements."
  }, [processedCourses, selectedRoleName])

  // Attention summary numbers
  const oversuppliedCount = useMemo(() => {
    return flags?.items.filter((i) => i.oversupplied).length ?? 0
  }, [flags])

  const obsoleteCount = useMemo(() => {
    return flags?.items.filter((i) => Boolean(i.obsolete)).length ?? 0
  }, [flags])

  const lowestCoverage = useMemo(() => {
    if (processedCourses.length === 0) return null
    return processedCourses[0].coverageScore
  }, [processedCourses])

  const handleResetFilters = useCallback(() => {
    setSelectedDistrictId("")
    if (roles.length > 0) {
      setSelectedRoleId(String(roles[0].id))
    }
    setCourseSearch("")
    setFlagsSearch("")
    setCourseSortBy("lowest")
    setFlagsSortBy("attention")
    setIncludeUnlinked(false)
  }, [roles])

  const isFiltered = useMemo(() => {
    const defaultRoleId = roles.length > 0 ? String(roles[0].id) : ""
    return (
      selectedDistrictId !== "" ||
      (!!defaultRoleId && selectedRoleId !== defaultRoleId) ||
      Boolean(courseSearch || flagsSearch || includeUnlinked)
    )
  }, [roles, selectedDistrictId, selectedRoleId, courseSearch, flagsSearch, includeUnlinked])

  return (
    <div className="space-y-5 animate-page-enter">
      {/* 1. Page Header with standfirst */}
      <PageHeader
        title="Skill Gap Explorer"
        standfirst="Detect curriculum coverage deficits, oversupplied seat quotas, and nationwide workforce shortages."
        showSyntheticBadge={false}
      />

      {/* 2. Filter Bar: Role, District & Reset */}
      <FilterBar onReset={handleResetFilters} isFiltered={isFiltered}>
        {rolesLoading ? (
          <Skeleton className="h-7 w-32" />
        ) : rolesError ? (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <span>{rolesError}</span>
            <button onClick={loadRoles} className="underline font-medium">Retry</button>
          </div>
        ) : (
          <SelectField
            id="role-filter"
            label="Target role"
            value={selectedRoleId}
            onChange={(val) => setSelectedRoleId(val)}
            options={roleOptions}
          />
        )}

        <SelectField
          id="district-filter"
          label="Geographic scope"
          value={selectedDistrictId}
          disabled={districtsLoading}
          onChange={(val) => setSelectedDistrictId(val)}
          options={districtOptions}
        />
      </FilterBar>

      {/* 3. Finding Headline & Open FigureRow */}
      <section className="space-y-6">
        {alignmentsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : (
          <FindingHeadline
            kicker="Curriculum Alignment Finding"
            sentence={findingHeadline}
          >
            <SourceCaption
              scope={`${selectedRoleName} · ${selectedDistrictName}`}
              window={flags ? `${flags.windowStart} – ${flags.windowEnd}` : "Trailing evaluation window"}
              note="Coverage reflects presence in curriculum vs top demanded skills"
            />
          </FindingHeadline>
        )}

        {alignmentsLoading || flagsLoading ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 border-y border-border py-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <FigureRow columns={4}>
            <BigNumber
              label="Lowest Course Coverage"
              value={lowestCoverage != null ? `${lowestCoverage.toFixed(1)}%` : "—"}
              footnote={
                processedCourses[0]
                  ? `${processedCourses[0].courseName} (Needs attention)`
                  : "No course data"
              }
            />
            <BigNumber
              label="Flagged Oversupplied"
              rawValue={oversuppliedCount}
              footnote="Seats exceed local openings"
            />
            <BigNumber
              label="Flagged Obsolete"
              rawValue={obsoleteCount}
              footnote="Low coverage & declining skills"
            />
            <BigNumber
              label="Top National Gap"
              size="text"
              value={skillGaps[0] ? skillGaps[0].name : "—"}
              footnote={
                skillGaps[0]
                  ? `${Math.round(skillGaps[0].demand_share * 100)}% demand vs ${Math.round(skillGaps[0].course_coverage * 100)}% taught`
                  : "Largest national disparity"
              }
            />
          </FigureRow>
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 1: Needs-Attention Courses (Dumbbell: Taught vs 100% Demand) */}
      {/* ===================================================================== */}
      <section className="space-y-4">
        <SectionHeader
          title="Course Coverage & Alignment (Needs Attention First)"
          subtitle={`Taught coverage share vs 100% of demanded skills for ${selectedRoleName} in ${selectedDistrictName} (lowest coverage courses first).`}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <input
                  id="gap-course-search"
                  name="courseSearch"
                  type="text"
                  placeholder="Search course..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  aria-label="Search course"
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <SelectField
                id="course-sort"
                label="Sort"
                value={courseSortBy}
                onChange={(val) => setCourseSortBy(val as "lowest" | "highest" | "alpha")}
                options={[
                  { label: "Lowest coverage first (priority)", value: "lowest" },
                  { label: "Highest coverage first", value: "highest" },
                  { label: "Course name (A–Z)", value: "alpha" },
                ]}
              />
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground select-none">
                <input
                  id="gap-include-unlinked"
                  name="includeUnlinked"
                  type="checkbox"
                  checked={includeUnlinked}
                  onChange={(e) => setIncludeUnlinked(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Include unlinked</span>
              </label>
            </div>
          }
        />

        {alignmentsLoading || coursesLoading ? (
          <TableSkeleton rows={8} cols={4} />
        ) : alignmentsError || coursesError ? (
          <ErrorState
            message={alignmentsError || coursesError || "Failed to load course coverage."}
            onRetry={loadAlignments}
          />
        ) : processedCourses.length === 0 ? (
          <EmptyState
            title="No courses found"
            description={
              includeUnlinked
                ? "No course alignment data is available."
                : "No courses are linked to this role. Check 'Include unlinked' to explore the full catalog."
            }
          />
        ) : (
          <div>
            <DumbbellScaleHeader
              leftLabel="Course & Role Link"
              maxScale={100}
              unit="%"
              rightLabel="Covered → 100% Demand"
            />
            <div className="divide-y divide-border/70 border-b border-border/70">
              {visibleCourses.map((item, idx) => {
                const scorePct = Number(item.coverageScore.toFixed(1))
                const isNeedsAttention = scorePct < 40.0

                return (
                  <DumbbellRow
                    key={item.courseId}
                    rank={idx + 1}
                    label={item.courseName}
                    sublabel={`${item.roleLinkedToCourse ? "Linked" : "Unlinked"} · ${item.coveredSkills.length} covered, ${item.missingSkills.length} missing`}
                    previousValue={scorePct}
                    latestValue={100}
                    maxScale={100}
                    previousText={`${scorePct}% taught`}
                    latestText="100%"
                    tone={isNeedsAttention ? "negative" : "positive"}
                    staggerIndex={idx}
                    onClick={() => openCourseDrawer(item)}
                    className={!item.roleLinkedToCourse ? "opacity-75" : ""}
                    badge={
                      isNeedsAttention ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-attention-foreground bg-attention-subtle px-1.5 py-0.5 rounded border border-attention/30">
                          <AlertTriangle className="h-3 w-3 text-attention" aria-hidden="true" />
                          <span>Critical gap</span>
                        </span>
                      ) : undefined
                    }
                  />
                )
              })}
            </div>

            {processedCourses.length > 10 && (
              <div className="pt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Showing {visibleCourses.length} of {processedCourses.length} courses
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllCourses((prev) => !prev)}
                  className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1"
                >
                  {showAllCourses ? "Show top 10 only" : `Show all ${processedCourses.length} courses`}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 2: Oversupply & Obsolescence Flags (Typographic rows)         */}
      {/* ===================================================================== */}
      <section className="space-y-4">
        <SectionHeader
          title="Course Oversupply & Obsolescence Flags"
          subtitle={`Comparing training seats to local employer openings (${flags?.items?.length ?? 0} offerings evaluated).`}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-52">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <input
                  id="gap-flags-search"
                  name="flagsSearch"
                  type="text"
                  placeholder="Search course or district..."
                  value={flagsSearch}
                  onChange={(e) => setFlagsSearch(e.target.value)}
                  aria-label="Search course or district"
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <SelectField
                id="flags-sort"
                label="Sort"
                value={flagsSortBy}
                onChange={(val) => setFlagsSortBy(val as "attention" | "ratio" | "seats")}
                options={[
                  { label: "Needs attention first (flags)", value: "attention" },
                  { label: "Oversupply ratio (high to low)", value: "ratio" },
                  { label: "Total seat capacity", value: "seats" },
                ]}
              />
            </div>
          }
        />

        {flagsLoading ? (
          <TableSkeleton rows={8} cols={4} />
        ) : flagsError ? (
          <ErrorState message={flagsError} onRetry={loadFlags} />
        ) : processedFlags.length === 0 ? (
          <EmptyState
            title="No oversupply flags found"
            description="No offerings matched the selected scope or search query."
          />
        ) : (
          <div>
            <div className="divide-y divide-border/70 border-y border-border/70">
              {visibleFlags.map((item, idx) => {
                const ratio = item.oversupplyRatio
                const isMuted = item.lowSample

                return (
                  <TypographicRow
                    key={`${item.courseId}_${item.districtId}`}
                    title={item.courseName}
                    subtitle={`${item.districtName} · ${item.seats.toLocaleString("en-IN")} seats vs ${
                      item.estimatedOpenings != null ? `${item.estimatedOpenings.toFixed(1)} openings` : "—"
                    }`}
                    staggerIndex={idx}
                    className={isMuted ? "opacity-65" : ""}
                    primaryFigure={ratio != null ? `${ratio.toFixed(1)}x` : "—"}
                    secondaryFigure="ratio"
                    onClick={() => openFlagDrawer(item)}
                    badges={
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.obsolete && (
                          <span className="inline-flex items-center gap-1 rounded border border-attention/40 bg-attention-subtle px-2 py-0.5 text-[10px] font-semibold text-attention-foreground uppercase tracking-wide">
                            <TrendingDown className="h-3 w-3 text-attention" aria-hidden="true" />
                            <span>Obsolete</span>
                          </span>
                        )}
                        {item.lowSample ? (
                          <LowSampleBadge threshold={flags?.minOpenings} />
                        ) : item.oversupplied ? (
                          <span className="inline-flex items-center gap-1 rounded border border-negative/40 bg-negative-subtle px-2 py-0.5 text-[10px] font-semibold text-negative-foreground uppercase tracking-wide">
                            <AlertTriangle className="h-3 w-3 text-negative" aria-hidden="true" />
                            <span>Oversupplied</span>
                          </span>
                        ) : !item.obsolete ? (
                          <span className="inline-flex items-center gap-1 rounded border border-positive/40 bg-positive-subtle px-2 py-0.5 text-[10px] font-medium text-positive-foreground">
                            <CheckCircle2 className="h-3 w-3 text-positive" aria-hidden="true" />
                            <span>Balanced</span>
                          </span>
                        ) : null}
                        <Link
                          href={`/policy/course-recommendations?course=${item.courseId}&district=${item.districtId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline px-1.5 py-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <span>Recommendations</span>
                          <ChevronRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      </div>
                    }
                  />
                )
              })}
            </div>

            {processedFlags.length > 10 && (
              <div className="pt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Showing {visibleFlags.length} of {processedFlags.length} flagged offerings
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllFlags((prev) => !prev)}
                  className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1"
                >
                  {showAllFlags ? "Show top 10 only" : `Show all ${processedFlags.length} offerings`}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 3: National Skill Gaps Top 10 (Dumbbell: Taught vs Demand)    */}
      {/* ===================================================================== */}
      <section className="space-y-4">
        <SectionHeader
          title="National Skill Gaps (Top 10 Shortages)"
          subtitle="Dumbbell compares national course coverage (%) against employer demand share (%) across all 24 courses."
        />

        {skillGapsLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : skillGapsError ? (
          <ErrorState message={skillGapsError} onRetry={loadSkillGaps} />
        ) : skillGaps.length === 0 ? (
          <EmptyState title="No skill gaps" description="No national gaps returned." />
        ) : (
          <div>
            <DumbbellScaleHeader
              leftLabel="Skill"
              maxScale={100}
              unit="%"
              rightLabel="Taught → Demand Share"
            />
            <div className="divide-y divide-border/70 border-b border-border/70">
              {skillGaps.map((item, index) => {
                const demandPct = Math.round(item.demand_share * 100)
                const coveragePct = Math.round(item.course_coverage * 100)
                const growthPct = Math.round((item.growth_factor - 1) * 100)

                return (
                  <DumbbellRow
                    key={item.name}
                    rank={index + 1}
                    label={item.name}
                    sublabel={`Growth factor: ${growthPct >= 0 ? `+${growthPct}%` : `${growthPct}%`}`}
                    previousValue={coveragePct}
                    latestValue={demandPct}
                    maxScale={100}
                    previousText={`${coveragePct}% taught`}
                    latestText={`${demandPct}% demand`}
                    tone={demandPct > coveragePct ? "negative" : "positive"}
                    staggerIndex={index}
                    badge={
                      <span className="font-mono text-[11px] font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                        gap {item.gap_score.toFixed(2)}
                      </span>
                    }
                  />
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* DRAWER 1: Course Alignment Detail                                     */}
      {/* ===================================================================== */}
      <Drawer
        isOpen={isCourseDrawerOpen}
        onClose={() => setIsCourseDrawerOpen(false)}
        title={selectedCourseDrawer?.courseName || "Course Alignment"}
        subtitle={`Role: ${selectedCourseDrawer?.roleName || selectedRoleName} · ${
          selectedCourseDrawer?.districtId ? selectedDistrictName : "National"
        }`}
        width="w-[min(520px,100vw)]"
      >
        {selectedCourseDrawer && (
          <div className="space-y-5">
            {selectedCourseDrawer.postingsInScope === 0 ? (
              <EmptyState
                title="No postings in scope"
                description={`No job postings were found for ${selectedCourseDrawer.roleName} in this scope over the ${selectedCourseDrawer.windowMonths}-month evaluation window.`}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg border border-border bg-card">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Coverage Score
                    </span>
                    <div className="font-serif text-2xl font-bold font-mono tabular-nums text-foreground mt-0.5">
                      {selectedCourseDrawer.coverageScore.toFixed(1)}%
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Against top {selectedCourseDrawer.topN} demanded skills
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Postings in Scope
                    </span>
                    <div className="font-serif text-2xl font-bold font-mono tabular-nums text-foreground mt-0.5">
                      {formatInteger(selectedCourseDrawer.postingsInScope)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Over {selectedCourseDrawer.windowMonths} months window
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border/80 bg-muted/20 text-xs text-muted-foreground leading-relaxed">
                  Coverage score reflects presence in curriculum vs top {selectedCourseDrawer.topN} demanded skills. Coverage ignores the taught level of a skill.
                </div>

                {/* Covered Skills */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-positive" aria-hidden="true" />
                      <span>Covered Skills ({selectedCourseDrawer.coveredSkills.length})</span>
                    </h4>
                    <span className="text-[11px] text-muted-foreground">Demand share</span>
                  </div>

                  {selectedCourseDrawer.coveredSkills.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded">
                      None of the top demanded skills are taught by this course.
                    </p>
                  ) : (
                    <div className="space-y-1.5 border border-border rounded-md p-2 bg-card max-h-52 overflow-y-auto">
                      {selectedCourseDrawer.coveredSkills.map((s) => (
                        <div
                          key={s.skillId}
                          className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-muted/40"
                        >
                          <span className="font-medium text-foreground">{s.name}</span>
                          <span className="font-mono text-[11px] tabular-nums font-semibold text-positive-foreground">
                            {formatPercent(s.demandShare)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Missing Skills */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <XCircle className="h-3.5 w-3.5 text-attention" aria-hidden="true" />
                      <span>Missing Skills ({selectedCourseDrawer.missingSkills.length})</span>
                    </h4>
                    <span className="text-[11px] text-muted-foreground">Demand share</span>
                  </div>

                  {selectedCourseDrawer.missingSkills.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded">
                      All top demanded skills for this role are covered!
                    </p>
                  ) : (
                    <div className="space-y-1.5 border border-border rounded-md p-2 bg-card max-h-52 overflow-y-auto">
                      {selectedCourseDrawer.missingSkills.map((s) => (
                        <div
                          key={s.skillId}
                          className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-muted/40"
                        >
                          <span className="text-muted-foreground">{s.name}</span>
                          <span className="font-mono text-[11px] tabular-nums font-semibold text-attention-foreground">
                            {formatPercent(s.demandShare)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>

      {/* ===================================================================== */}
      {/* DRAWER 2: Oversupply & Obsolescence Flag Breakdown                    */}
      {/* ===================================================================== */}
      <Drawer
        isOpen={isFlagDrawerOpen}
        onClose={() => setIsFlagDrawerOpen(false)}
        title={selectedFlagDrawer?.courseName || "Oversupply Breakdown"}
        subtitle={`District: ${selectedFlagDrawer?.districtName || "District"}`}
        width="w-[min(500px,100vw)]"
      >
        {selectedFlagDrawer && (
          <div className="space-y-5">
            {/* Verdict Card */}
            <div className="p-3.5 rounded-lg border border-border bg-card flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Evaluation:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedFlagDrawer.obsolete && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-attention-foreground bg-attention-subtle px-2 py-0.5 rounded border border-attention/30">
                    <TrendingDown className="h-3.5 w-3.5 text-attention" aria-hidden="true" />
                    <span>Obsolete Curriculum</span>
                  </span>
                )}
                {selectedFlagDrawer.lowSample ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-attention-foreground bg-attention-subtle px-2 py-0.5 rounded border border-attention/30">
                    <AlertTriangle className="h-3.5 w-3.5 text-attention" aria-hidden="true" />
                    <span>Low Sample</span>
                  </span>
                ) : selectedFlagDrawer.oversupplied ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-negative-foreground bg-negative-subtle px-2 py-0.5 rounded border border-negative/30">
                    <AlertTriangle className="h-3.5 w-3.5 text-negative" aria-hidden="true" />
                    <span>Oversupplied Capacity</span>
                  </span>
                ) : !selectedFlagDrawer.obsolete ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-positive-foreground bg-positive-subtle px-2 py-0.5 rounded border border-positive/30">
                    <CheckCircle2 className="h-3.5 w-3.5 text-positive" aria-hidden="true" />
                    <span>Balanced Supply</span>
                  </span>
                ) : null}
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Training Seats
                </span>
                <div className="font-serif text-xl font-bold font-mono tabular-nums text-foreground">
                  {formatInteger(selectedFlagDrawer.seats)}
                </div>
                <span className="text-[11px] text-muted-foreground block">
                  {selectedFlagDrawer.trainers} trainers assigned
                </span>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Est. Openings
                </span>
                <div className="font-serif text-xl font-bold font-mono tabular-nums text-foreground">
                  {selectedFlagDrawer.estimatedOpenings != null
                    ? selectedFlagDrawer.estimatedOpenings.toFixed(1)
                    : "—"}
                </div>
                <span className="text-[11px] text-muted-foreground block">
                  from {selectedFlagDrawer.postingsInWindow} postings
                </span>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Oversupply Ratio
                </span>
                <div className="font-serif text-xl font-bold font-mono tabular-nums text-foreground">
                  {selectedFlagDrawer.oversupplyRatio != null
                    ? `${selectedFlagDrawer.oversupplyRatio.toFixed(2)}x`
                    : "—"}
                </div>
                <span className="text-[11px] text-muted-foreground block">
                  Threshold: {flags?.oversupplyThreshold ?? 1.5}x
                </span>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Course Coverage
                </span>
                <div className="font-serif text-xl font-bold font-mono tabular-nums text-foreground">
                  {selectedFlagDrawer.coverage != null
                    ? `${selectedFlagDrawer.coverage.toFixed(1)}%`
                    : "—"}
                </div>
                <span className="text-[11px] text-muted-foreground block">
                  Threshold: &lt; {flags?.obsoleteCoverageThreshold ?? 40}%
                </span>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Key Skill Trend
                </span>
                <div className="pt-0.5">
                  <DeltaBadge value={selectedFlagDrawer.keySkillTrend ?? 0} size="sm" />
                </div>
                <span className="text-[11px] text-muted-foreground block">
                  {selectedFlagDrawer.fallingSkillCount ?? 0} of {selectedFlagDrawer.keySkillCount ?? 0} skills falling
                </span>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Offering Year
                </span>
                <div className="font-serif text-xl font-bold font-mono tabular-nums text-foreground">
                  {selectedFlagDrawer.year}
                </div>
                <span className="text-[11px] text-muted-foreground block">
                  {selectedFlagDrawer.linkedRoleCount} linked roles
                </span>
              </div>
            </div>

            {/* Thresholds & Parameters Card (moved from wide table) */}
            <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 text-xs space-y-1.5">
              <span className="font-semibold text-foreground">Evaluation Parameters:</span>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>• Window: {flags?.windowStart} to {flags?.windowEnd} ({flags?.windowMonths} months)</li>
                <li>• Scaling factor: {flags?.scalingFactor ?? 1.0} (1 job posting = 1 opening)</li>
                <li>• Oversupply threshold: {flags?.oversupplyThreshold ?? 1.5}x</li>
                <li>• Minimum openings guard: {flags?.minOpenings ?? 20} (suppresses small-sample noise)</li>
                <li>• Obsolete coverage threshold: {flags?.obsoleteCoverageThreshold ?? 40}%</li>
              </ul>
            </div>

            {/* View Recommendations Link */}
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Actionable curriculum advice:
              </span>
              <Link
                href={`/policy/course-recommendations?course=${selectedFlagDrawer.courseId}&district=${selectedFlagDrawer.districtId}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <span>Open course recommendations</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
