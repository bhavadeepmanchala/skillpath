"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react"
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
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
  ProgressBar,
  Skeleton,
} from "@/components/ui-kit"

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

  // Courses catalog (for 24 parallel alignment calls)
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [coursesError, setCoursesError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Section 1: Course Coverage State & Cache
  // ---------------------------------------------------------------------------
  // Parallel alignment calls across all courses; a bulk endpoint would be better later.
  const [alignmentCache, setAlignmentCache] = useState<
    Record<string, CourseAlignmentResponse[]>
  >({})
  const [alignments, setAlignments] = useState<CourseAlignmentResponse[]>([])
  const [alignmentsLoading, setAlignmentsLoading] = useState(true)
  const [alignmentsError, setAlignmentsError] = useState<string | null>(null)
  const [includeUnlinked, setIncludeUnlinked] = useState(false)
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

    // Use cached results if available
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

      // Parallel alignment calls across all courses; a bulk endpoint would be better later.
      const results = await Promise.all(
        courses.map((course) =>
          fetchCourseAlignment(course.id, {
            roleId: roleIdNum,
            districtId: districtIdNum,
          })
        )
      )

      // Guard against stale responses when filters changed mid-flight
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

  // ---------------------------------------------------------------------------
  // Shared Opener Handlers for Drawers
  // ---------------------------------------------------------------------------
  const openCourseDrawer = useCallback((item: CourseAlignmentResponse) => {
    setSelectedCourseDrawer(item)
    setIsCourseDrawerOpen(true)
  }, [])

  const closeCourseDrawer = useCallback(() => {
    setIsCourseDrawerOpen(false)
  }, [])

  const openFlagDrawer = useCallback((item: CourseOversupplyItem) => {
    setSelectedFlagDrawer(item)
    setIsFlagDrawerOpen(true)
  }, [])

  const closeFlagDrawer = useCallback(() => {
    setIsFlagDrawerOpen(false)
  }, [])

  // ---------------------------------------------------------------------------
  // Filter Options & Derived Data
  // ---------------------------------------------------------------------------
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

  // Section 1: Ranked course alignments
  // Show linked courses first, lowest coverage first. If toggle is on, include unlinked courses.
  const rankedCourses = useMemo(() => {
    const linked = alignments
      .filter((a) => a.roleLinkedToCourse)
      .sort((a, b) => a.coverageScore - b.coverageScore)

    if (!includeUnlinked) {
      return linked
    }

    const unlinked = alignments
      .filter((a) => !a.roleLinkedToCourse)
      .sort((a, b) => a.coverageScore - b.coverageScore)

    return [...linked, ...unlinked]
  }, [alignments, includeUnlinked])

  // Section 2: Sorted oversupply items (descending ratio, nulls last)
  const sortedFlagItems = useMemo(() => {
    if (!flags?.items) return []
    return [...flags.items].sort((a, b) => {
      if (a.oversupplyRatio == null && b.oversupplyRatio == null) return 0
      if (a.oversupplyRatio == null) return 1
      if (b.oversupplyRatio == null) return -1
      return b.oversupplyRatio - a.oversupplyRatio
    })
  }, [flags])

  // Section 3: max gap score for bar normalization
  const maxGapScore = useMemo(() => {
    return Math.max(...skillGaps.map((g) => g.gap_score), 0.001)
  }, [skillGaps])

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setSelectedDistrictId("")
    if (roles.length > 0) {
      setSelectedRoleId(String(roles[0].id))
    }
  }, [roles])

  const isFiltered = useMemo(() => {
    const defaultRoleId = roles.length > 0 ? String(roles[0].id) : ""
    return selectedDistrictId !== "" || (!!defaultRoleId && selectedRoleId !== defaultRoleId)
  }, [roles, selectedDistrictId, selectedRoleId])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-page-enter">
      {/* Page Header */}
      <PageHeader
        title="Skill Gap Explorer"
        description="Analyze curriculum coverage across target roles, identify oversupplied course programs, and explore nationwide workforce skill shortages."
        showSyntheticBadge={true}
        breadcrumbs={[
          { label: "Policymaker", href: "/policy" },
          { label: "Skill Gap Explorer" },
        ]}
      />

      {/* Honesty Notice Banner */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-sky-300/60 bg-sky-50/70 p-3 text-xs text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200 shadow-resting">
        <div className="flex items-center gap-1.5 font-medium">
          <Info className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400" />
          <span>Coverage ignores the taught level of a skill</span>
        </div>
        <span className="text-sky-400 dark:text-sky-700 hidden sm:inline">•</span>
        <div className="text-muted-foreground dark:text-sky-300/80">
          All data is synthetic and deterministic.
        </div>
      </div>

      {/* Filter Bar: Role & District */}
      <FilterBar onReset={handleResetFilters} isFiltered={isFiltered}>
        {rolesLoading ? (
          <div className="flex items-center gap-2 py-1.5">
            <Skeleton className="h-4 w-28" />
          </div>
        ) : rolesError ? (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <span>{rolesError}</span>
            <button
              onClick={loadRoles}
              className="underline font-medium hover:opacity-80"
            >
              Retry
            </button>
          </div>
        ) : (
          <SelectField
            id="role-filter"
            label="Role"
            value={selectedRoleId}
            onChange={(val) => setSelectedRoleId(val)}
            options={roleOptions}
          />
        )}

        <SelectField
          id="district-filter"
          label="District"
          value={selectedDistrictId}
          disabled={districtsLoading}
          onChange={(val) => setSelectedDistrictId(val)}
          options={districtOptions}
        />
      </FilterBar>

      {/* ===================================================================== */}
      {/* SECTION 1: Course coverage for this role                             */}
      {/* ===================================================================== */}
      <SectionCard
        title="Course coverage for this role"
        subtitle={`Ranked curriculum alignment for ${selectedRoleName} in ${selectedDistrictName}`}
        actionSlot={
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground select-none">
            <input
              type="checkbox"
              checked={includeUnlinked}
              onChange={(e) => setIncludeUnlinked(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span>Include courses not linked to this role</span>
          </label>
        }
      >
        {alignmentsLoading || coursesLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : alignmentsError || coursesError ? (
          <ErrorState
            message={alignmentsError || coursesError || "Failed to load course coverage."}
            onRetry={loadAlignments}
          />
        ) : rankedCourses.length === 0 ? (
          <EmptyState
            title="No courses found"
            description={
              includeUnlinked
                ? "No course alignment data is available."
                : "No courses are linked to this role. Check 'Include courses not linked to this role' above to view unlinked courses."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/30 text-muted-foreground uppercase text-[11px] tracking-wide">
                <tr>
                  <th className="py-3 px-4 font-medium">Rank & Course</th>
                  <th className="py-3 px-3 font-medium">Role Link</th>
                  <th className="py-3 px-4 font-medium min-w-[200px]">
                    Coverage Score (Lowest First)
                  </th>
                  <th className="py-3 px-3 text-right font-medium">Covered</th>
                  <th className="py-3 px-3 text-right font-medium">Missing</th>
                  <th className="py-3 px-3 text-right font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rankedCourses.map((item, idx) => {
                  const isUnlinked = !item.roleLinkedToCourse
                  const scorePct = Number(item.coverageScore.toFixed(1))
                  const barColor =
                    scorePct < 25
                      ? "bg-rose-500"
                      : scorePct < 60
                      ? "bg-amber-500"
                      : "bg-emerald-600"

                  return (
                    <tr
                      key={item.courseId}
                      onClick={() => openCourseDrawer(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          openCourseDrawer(item)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={`cursor-pointer transition-colors duration-120 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        isUnlinked ? "opacity-60 bg-muted/10" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-foreground">
                            {item.courseName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {item.roleLinkedToCourse ? (
                          <span className="inline-flex items-center rounded-md border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                            Linked
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Unlinked
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <ProgressBar
                            value={scorePct}
                            className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                            barClassName={`h-full rounded-full ${barColor}`}
                            label={`${item.courseName} coverage score`}
                          />
                          <span className="w-12 text-right font-mono text-xs font-semibold tabular-nums text-foreground">
                            {scorePct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-medium">
                        {item.coveredSkills.length}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400 font-medium">
                        {item.missingSkills.length}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center text-muted-foreground hover:text-foreground">
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ===================================================================== */}
      {/* SECTION 2: Oversupply flags                                          */}
      {/* ===================================================================== */}
      <SectionCard
        title="Oversupply flags"
        subtitle="Comparing training seat capacity to trailing 12-month employer job postings"
      >
        {flagsLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
            </div>
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : flagsError ? (
          <ErrorState message={flagsError} onRetry={loadFlags} />
        ) : !flags || sortedFlagItems.length === 0 ? (
          <EmptyState
            title="No oversupply flags found"
            description="No course offerings were found for the selected district scope."
          />
        ) : (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard
                label="Pairs evaluated"
                rawValue={sortedFlagItems.length}
                icon={BookOpen}
                footnote="Course-district offerings in scope"
              />
              <KpiCard
                label="Flagged oversupplied"
                rawValue={sortedFlagItems.filter((i) => i.oversupplied).length}
                icon={ShieldAlert}
                footnote={`Ratio > ${flags.oversupplyThreshold}x with ≥${flags.minOpenings} openings`}
                className="border-rose-200/80 bg-rose-50/20 dark:border-rose-950 dark:bg-rose-950/10"
              />
              <KpiCard
                label="Low sample"
                rawValue={sortedFlagItems.filter((i) => i.lowSample).length}
                icon={AlertTriangle}
                footnote={`Fewer than ${flags.minOpenings} estimated openings`}
              />
            </div>

            {/* Response Parameters Caption */}
            <div className="rounded-md border border-border/60 bg-muted/20 px-3.5 py-2 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Window:</span>{" "}
              {flags.windowStart} to {flags.windowEnd} ({flags.windowMonths} months)
              <span className="mx-2 text-border">•</span>
              <span className="font-semibold text-foreground">Scaling factor:</span>{" "}
              {flags.scalingFactor} (assumes 1 job posting = 1 opening)
              <span className="mx-2 text-border">•</span>
              <span className="font-semibold text-foreground">Ratio threshold:</span>{" "}
              {flags.oversupplyThreshold}x
              <span className="mx-2 text-border">•</span>
              <span className="font-semibold text-foreground">Min openings:</span>{" "}
              {flags.minOpenings}
            </div>

            {/* Oversupply Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="border-b border-border/60 bg-muted/30 text-muted-foreground uppercase text-[11px] tracking-wide">
                  <tr>
                    <th className="py-3 px-4 font-medium">Course</th>
                    <th className="py-3 px-3 font-medium">District</th>
                    <th className="py-3 px-3 text-right font-medium">Seats</th>
                    <th className="py-3 px-3 text-right font-medium">Est. Openings</th>
                    <th className="py-3 px-3 text-right font-medium">Ratio</th>
                    <th className="py-3 px-4 text-center font-medium">Status</th>
                    <th className="py-3 px-3 text-right font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {sortedFlagItems.map((item) => {
                    const isMuted = item.lowSample

                    return (
                      <tr
                        key={`${item.courseId}_${item.districtId}`}
                        onClick={() => openFlagDrawer(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            openFlagDrawer(item)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className={`cursor-pointer transition-colors duration-120 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          isMuted ? "opacity-60 text-muted-foreground" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {item.courseName}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {item.districtName}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-foreground">
                          {item.seats.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-foreground">
                          {item.estimatedOpenings != null
                            ? item.estimatedOpenings.toFixed(1)
                            : "—"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums text-foreground">
                          {item.oversupplyRatio != null
                            ? `${item.oversupplyRatio.toFixed(2)}x`
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.lowSample ? (
                            <LowSampleBadge threshold={flags.minOpenings} />
                          ) : item.oversupplied ? (
                            <Badge
                              variant="destructive"
                              className="border border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            >
                              Oversupplied
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            >
                              OK
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="inline-flex items-center text-muted-foreground hover:text-foreground">
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ===================================================================== */}
      {/* SECTION 3: National skill gaps                                       */}
      {/* ===================================================================== */}
      <SectionCard
        title="National skill gaps"
        subtitle="Ranked disparity between employer hiring demand and course curriculum coverage across India"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground italic">
            Coverage here is a skill-level number across all courses nationally, not a per-course score.
          </p>

          {skillGapsLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : skillGapsError ? (
            <ErrorState message={skillGapsError} onRetry={loadSkillGaps} />
          ) : skillGaps.length === 0 ? (
            <EmptyState
              title="No skill gaps found"
              description="No national skill gap data returned from backend."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="border-b border-border/60 bg-muted/30 text-muted-foreground uppercase text-[11px] tracking-wide">
                  <tr>
                    <th className="py-3 px-4 font-medium">Rank & Skill</th>
                    <th className="py-3 px-3 font-medium">Demand Share</th>
                    <th className="py-3 px-3 font-medium">Course Coverage</th>
                    <th className="py-3 px-3 font-medium">Growth</th>
                    <th className="py-3 px-4 font-medium min-w-[180px]">Gap Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {skillGaps.map((item, index) => {
                    const demandPct = Math.round(item.demand_share * 100)
                    const coveragePct = Math.round(item.course_coverage * 100)
                    const growthPct = Math.round((item.growth_factor - 1) * 100)
                    const growthFormatted = `${growthPct >= 0 ? "+" : ""}${growthPct}%`
                    const barWidthPct = Math.min(
                      100,
                      Math.max(4, Math.round((item.gap_score / maxGapScore) * 100))
                    )

                    return (
                      <tr key={item.name} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground">
                              {index + 1}
                            </span>
                            <span>{item.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          appears in{" "}
                          <span className="font-semibold text-foreground">
                            {demandPct}%
                          </span>{" "}
                          of postings
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {coveragePct}%
                          </span>{" "}
                          of courses teach it
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 font-medium dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          >
                            {growthFormatted}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <ProgressBar
                              value={barWidthPct}
                              className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                              barClassName="h-full rounded-full bg-primary"
                              label={`${item.name} gap score`}
                            />
                            <span className="w-10 text-right font-mono text-xs font-semibold tabular-nums text-foreground">
                              {item.gap_score.toFixed(2)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ===================================================================== */}
      {/* DRAWER 1: Course Alignment Breakdown                                 */}
      {/* ===================================================================== */}
      <Drawer
        isOpen={isCourseDrawerOpen}
        onClose={closeCourseDrawer}
        title={selectedCourseDrawer?.courseName || "Course Alignment"}
        subtitle={`Role: ${selectedCourseDrawer?.roleName || selectedRoleName} • ${
          selectedCourseDrawer?.districtId ? selectedDistrictName : "National"
        }`}
        width="w-[min(520px,100vw)]"
      >
        {selectedCourseDrawer && (
          <div className="space-y-5">
            {/* Check for 0 postings in scope */}
            {selectedCourseDrawer.postingsInScope === 0 ? (
              <EmptyState
                title="No postings in scope"
                description={`No job postings were found for ${selectedCourseDrawer.roleName} in this district/national scope over the ${selectedCourseDrawer.windowMonths}-month evaluation window. Alignment requires active postings to measure skill demand.`}
              />
            ) : (
              <>
                {/* Metrics Summary Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                    <div className="text-[11px] font-medium text-muted-foreground">
                      Coverage Score
                    </div>
                    <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-foreground">
                      {selectedCourseDrawer.coverageScore.toFixed(1)}%
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(2, selectedCourseDrawer.coverageScore)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                    <div className="text-[11px] font-medium text-muted-foreground">
                      Postings in Scope
                    </div>
                    <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-foreground">
                      {selectedCourseDrawer.postingsInScope.toLocaleString()}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Over {selectedCourseDrawer.windowMonths} months window
                    </div>
                  </div>
                </div>

                {/* Honesty note */}
                <div className="rounded-md border border-sky-200/60 bg-sky-50/50 p-2.5 text-[11px] text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300 flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                  <span>
                    Coverage score reflects presence in curriculum vs top {selectedCourseDrawer.topN} demanded skills. Coverage ignores the taught level of a skill.
                  </span>
                </div>

                {/* Covered Skills */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        Covered Skills ({selectedCourseDrawer.coveredSkills.length})
                      </span>
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      Demand share
                    </span>
                  </div>

                  {selectedCourseDrawer.coveredSkills.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded">
                      None of the top demanded skills are covered by this course.
                    </p>
                  ) : (
                    <div className="space-y-1.5 border border-border/60 rounded-md p-2 bg-card max-h-56 overflow-y-auto">
                      {selectedCourseDrawer.coveredSkills.map((s) => {
                        const sharePct = (s.demandShare * 100).toFixed(1)
                        return (
                          <div
                            key={s.skillId}
                            className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-muted/40"
                          >
                            <span className="font-medium text-foreground truncate pr-2">
                              {s.name}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-[11px] tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                                {sharePct}%
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Missing Skills */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <XCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>
                        Missing Skills ({selectedCourseDrawer.missingSkills.length})
                      </span>
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      Demand share
                    </span>
                  </div>

                  {selectedCourseDrawer.missingSkills.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded">
                      All top demanded skills for this role are covered.
                    </p>
                  ) : (
                    <div className="space-y-1.5 border border-border/60 rounded-md p-2 bg-card max-h-56 overflow-y-auto">
                      {selectedCourseDrawer.missingSkills.map((s) => {
                        const sharePct = (s.demandShare * 100).toFixed(1)
                        return (
                          <div
                            key={s.skillId}
                            className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-muted/40"
                          >
                            <span className="text-muted-foreground truncate pr-2">
                              {s.name}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-[11px] tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                                {sharePct}%
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>

      {/* ===================================================================== */}
      {/* DRAWER 2: Oversupply Flag Breakdown                                  */}
      {/* ===================================================================== */}
      <Drawer
        isOpen={isFlagDrawerOpen}
        onClose={closeFlagDrawer}
        title={selectedFlagDrawer?.courseName || "Oversupply Breakdown"}
        subtitle={`District: ${selectedFlagDrawer?.districtName || "District"}`}
        width="w-[min(480px,100vw)]"
      >
        {selectedFlagDrawer && (
          <div className="space-y-5">
            {/* Status Header Badge */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-muted/20">
              <span className="text-xs font-medium text-muted-foreground">
                Evaluation Verdict:
              </span>
              {selectedFlagDrawer.lowSample ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Low sample (flagging suppressed)</span>
                </span>
              ) : selectedFlagDrawer.oversupplied ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Flagged Oversupplied</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Balanced Supply (OK)</span>
                </span>
              )}
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                  <Users className="h-3.5 w-3.5" />
                  <span>Training Seats</span>
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {selectedFlagDrawer.seats.toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {selectedFlagDrawer.trainers} trainers assigned
                </div>
              </div>

              <div className="rounded-md border border-border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Est. Openings</span>
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {selectedFlagDrawer.estimatedOpenings != null
                    ? selectedFlagDrawer.estimatedOpenings.toFixed(1)
                    : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  from {selectedFlagDrawer.postingsInWindow} job postings
                </div>
              </div>

              <div className="rounded-md border border-border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                  <Percent className="h-3.5 w-3.5" />
                  <span>Oversupply Ratio</span>
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {selectedFlagDrawer.oversupplyRatio != null
                    ? `${selectedFlagDrawer.oversupplyRatio.toFixed(2)}x`
                    : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Threshold: {flags?.oversupplyThreshold ?? 1.5}x
                </div>
              </div>

              <div className="rounded-md border border-border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Offering Year</span>
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {selectedFlagDrawer.year}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {selectedFlagDrawer.linkedRoleCount} linked roles
                </div>
              </div>
            </div>

            {/* Explanation Note */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-xs">
              <h4 className="font-semibold text-foreground">Policy Analysis</h4>
              <p className="text-muted-foreground leading-relaxed">
                {selectedFlagDrawer.lowSample
                  ? `Estimated openings (${selectedFlagDrawer.estimatedOpenings?.toFixed(1) ?? 0}) are below the minimum threshold of ${flags?.minOpenings ?? 20}. To avoid policy distortion from small district sample sizes, this offering is not flagged as oversupplied.`
                  : selectedFlagDrawer.oversupplied
                  ? `Training seat capacity (${selectedFlagDrawer.seats}) exceeds estimated market openings (${selectedFlagDrawer.estimatedOpenings?.toFixed(1)}) by ${selectedFlagDrawer.oversupplyRatio?.toFixed(2)}x. This surpasses the policy threshold of ${flags?.oversupplyThreshold ?? 1.5}x with a verified sample size.`
                  : `Training seat capacity is well-aligned with market openings (${selectedFlagDrawer.oversupplyRatio?.toFixed(2)}x vs threshold ${flags?.oversupplyThreshold ?? 1.5}x).`}
              </p>
              <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/40">
                Calculation: estimatedOpenings = postingsInWindow × scalingFactor ({flags?.scalingFactor ?? 1.0}). Assumes 1 job posting = 1 opening.
              </p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
