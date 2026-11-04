"use client"

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react"
import {
  Sparkles,
  CheckCircle2,
  Circle,
  RotateCcw,
  BookOpen,
  ChevronRight,
  TrendingUp,
  Layers,
  Info,
  Check,
} from "lucide-react"

import {
  PageHeader,
  SectionCard,
  DataBadge,
  LowSampleBadge,
  DeltaBadge,
  SelectField,
  Drawer,
  ErrorState,
  EmptyState,
  Skeleton,
  TableSkeleton,
} from "@/components/ui-kit"

import {
  fetchRoles,
  fetchCourses,
  fetchCourseAlignment,
  fetchTopSkills,
  fetchDemandTrends,
  isLowSample,
  LOW_SAMPLE_THRESHOLD,
  RoleItem,
  CourseItem,
  CourseAlignmentResponse,
  DemandTrendsResponse,
  SkillTrendItem,
  SkillDemandItem,
} from "@/lib/demand-api"

const STORAGE_ROLE_KEY = "skillpath.student.targetRoleId"
const getSkillStorageKey = (roleId: number | string) =>
  `skillpath.student.skills.${roleId}`

export default function CareerNavigatorPage() {
  // ---------------------------------------------------------------------------
  // 1. Roles & Target Role State
  // ---------------------------------------------------------------------------
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<string>("")
  const [isClientHydrated, setIsClientHydrated] = useState(false)

  // ---------------------------------------------------------------------------
  // 2. Skills & Trends State for Selected Role
  // ---------------------------------------------------------------------------
  const [skills, setSkills] = useState<SkillDemandItem[]>([])
  const [trends, setTrends] = useState<DemandTrendsResponse | null>(null)
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillsError, setSkillsError] = useState<string | null>(null)

  // Ticked skill IDs for the current role
  const [tickedSkillIds, setTickedSkillIds] = useState<number[]>([])

  // ---------------------------------------------------------------------------
  // 3. Courses & Alignments State
  // ---------------------------------------------------------------------------
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [coursesError, setCoursesError] = useState<string | null>(null)

  const [alignments, setAlignments] = useState<CourseAlignmentResponse[]>([])
  const [alignmentsLoading, setAlignmentsLoading] = useState(false)
  const [alignmentsError, setAlignmentsError] = useState<string | null>(null)

  // In-memory cache for role course alignments: key = roleId string
  const [alignmentCache, setAlignmentCache] = useState<
    Record<string, CourseAlignmentResponse[]>
  >({})
  const activeAlignmentRoleRef = useRef<string | null>(null)

  // Course Drawer state
  const [selectedAlignment, setSelectedAlignment] =
    useState<CourseAlignmentResponse | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // ---------------------------------------------------------------------------
  // 4. Client Hydration & Initial Data Loading
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setIsClientHydrated(true)
  }, [])

  const loadRolesAndCourses = useCallback(async () => {
    setRolesLoading(true)
    setRolesError(null)
    setCoursesLoading(true)
    setCoursesError(null)

    try {
      const [fetchedRoles, fetchedCourses] = await Promise.all([
        fetchRoles(),
        fetchCourses(),
      ])

      const sortedRoles = [...fetchedRoles].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
      setRoles(sortedRoles)
      setCourses(fetchedCourses)

      // Resolve initial role from localStorage (if valid) or first role
      let initialRoleId = ""
      try {
        const savedRole = localStorage.getItem(STORAGE_ROLE_KEY)
        if (savedRole && sortedRoles.some((r) => String(r.id) === savedRole)) {
          initialRoleId = savedRole
        }
      } catch {
        // localStorage blocked or empty
      }

      if (!initialRoleId && sortedRoles.length > 0) {
        initialRoleId = String(sortedRoles[0].id)
      }

      setSelectedRoleId(initialRoleId)
    } catch {
      setRolesError("Could not load roles. Is the backend running?")
      setCoursesError("Could not load courses.")
    } finally {
      setRolesLoading(false)
      setCoursesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRolesAndCourses()
  }, [loadRolesAndCourses])

  // ---------------------------------------------------------------------------
  // 5. Handle Role Selection Change & Storage Sync
  // ---------------------------------------------------------------------------
  const handleRoleChange = useCallback((newRoleId: string) => {
    setSelectedRoleId(newRoleId)
    try {
      localStorage.setItem(STORAGE_ROLE_KEY, newRoleId)
    } catch {
      // localStorage write error ignored
    }
  }, [])

  // Read saved ticks whenever selectedRoleId or client hydration changes
  useEffect(() => {
    if (!isClientHydrated || !selectedRoleId) {
      setTickedSkillIds([])
      return
    }

    try {
      const raw = localStorage.getItem(getSkillStorageKey(selectedRoleId))
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setTickedSkillIds(parsed.map(Number))
          return
        }
      }
    } catch {
      // localStorage read error ignored
    }
    setTickedSkillIds([])
  }, [selectedRoleId, isClientHydrated])

  // Save ticks to localStorage whenever tickedSkillIds change
  const saveTicks = useCallback(
    (roleId: string, nextTicks: number[]) => {
      setTickedSkillIds(nextTicks)
      if (!isClientHydrated || !roleId) return
      try {
        localStorage.setItem(
          getSkillStorageKey(roleId),
          JSON.stringify(nextTicks)
        )
      } catch {
        // localStorage write error ignored
      }
    },
    [isClientHydrated]
  )

  const toggleSkillTick = useCallback(
    (skillId: number) => {
      if (!selectedRoleId) return
      const next = tickedSkillIds.includes(skillId)
        ? tickedSkillIds.filter((id) => id !== skillId)
        : [...tickedSkillIds, skillId]
      saveTicks(selectedRoleId, next)
    },
    [selectedRoleId, tickedSkillIds, saveTicks]
  )

  const clearTicks = useCallback(() => {
    if (!selectedRoleId) return
    saveTicks(selectedRoleId, [])
  }, [selectedRoleId, saveTicks])

  // ---------------------------------------------------------------------------
  // 6. Fetch Skills & Trends for Selected Role (Limit = 15)
  // ---------------------------------------------------------------------------
  const loadSkillsAndTrends = useCallback(async () => {
    if (!selectedRoleId) return
    setSkillsLoading(true)
    setSkillsError(null)

    const roleIdNum = Number(selectedRoleId)
    try {
      const [skillsRes, trendsRes] = await Promise.all([
        fetchTopSkills({ roleId: roleIdNum, limit: 15 }),
        fetchDemandTrends({ roleId: roleIdNum }),
      ])
      setSkills(skillsRes.skills || [])
      setTrends(trendsRes)
    } catch {
      setSkillsError("Could not load skills or trends for this role.")
    } finally {
      setSkillsLoading(false)
    }
  }, [selectedRoleId])

  useEffect(() => {
    loadSkillsAndTrends()
  }, [loadSkillsAndTrends])

  // ---------------------------------------------------------------------------
  // 7. Fetch Course Alignments for Selected Role (Parallel)
  // ---------------------------------------------------------------------------
  const loadAlignmentsForRole = useCallback(async () => {
    if (!selectedRoleId || courses.length === 0) return

    activeAlignmentRoleRef.current = selectedRoleId

    // Check cache
    if (alignmentCache[selectedRoleId]) {
      setAlignments(alignmentCache[selectedRoleId])
      setAlignmentsLoading(false)
      setAlignmentsError(null)
      return
    }

    setAlignmentsLoading(true)
    setAlignmentsError(null)

    const roleIdNum = Number(selectedRoleId)
    try {
      // Parallel alignment calls across all courses; a bulk endpoint would be better later.
      const results = await Promise.all(
        courses.map((c) =>
          fetchCourseAlignment(c.id, {
            roleId: roleIdNum,
          })
        )
      )

      // Guard against stale responses if role changed mid-flight
      if (activeAlignmentRoleRef.current !== selectedRoleId) {
        return
      }

      setAlignmentCache((prev) => ({ ...prev, [selectedRoleId]: results }))
      setAlignments(results)
    } catch {
      if (activeAlignmentRoleRef.current === selectedRoleId) {
        setAlignmentsError("Could not calculate course alignments.")
      }
    } finally {
      if (activeAlignmentRoleRef.current === selectedRoleId) {
        setAlignmentsLoading(false)
      }
    }
  }, [selectedRoleId, courses, alignmentCache])

  useEffect(() => {
    loadAlignmentsForRole()
  }, [loadAlignmentsForRole])

  // ---------------------------------------------------------------------------
  // 8. Trends Mapping and Low-Sample Matching
  // ---------------------------------------------------------------------------
  const trendMap = useMemo(() => {
    const map = new Map<string, SkillTrendItem>()
    if (!trends) return map

    const allItems = [...(trends.rising || []), ...(trends.declining || [])]
    for (const item of allItems) {
      if (item.skillId != null) {
        map.set(`id:${item.skillId}`, item)
      }
      if (item.name) {
        map.set(`name:${item.name.toLowerCase().trim()}`, item)
      }
    }
    return map
  }, [trends])

  const getTrendForItem = useCallback(
    (item: SkillDemandItem): SkillTrendItem | undefined => {
      if (item.skillId != null && trendMap.has(`id:${item.skillId}`)) {
        return trendMap.get(`id:${item.skillId}`)
      }
      if (item.name && trendMap.has(`name:${item.name.toLowerCase().trim()}`)) {
        return trendMap.get(`name:${item.name.toLowerCase().trim()}`)
      }
      return undefined
    },
    [trendMap]
  )

  // Top 15 skills
  const top15Skills = useMemo(() => skills.slice(0, 15), [skills])

  // ---------------------------------------------------------------------------
  // 9. Readiness Metric Calculation
  // ---------------------------------------------------------------------------
  const { readinessPct, tickedCount, totalCount, totalShare, tickedShare } =
    useMemo(() => {
      const totalCount = top15Skills.length
      const totalShare = top15Skills.reduce((sum, s) => sum + s.share, 0)

      const tickedSkills = top15Skills.filter((s) =>
        tickedSkillIds.includes(s.skillId)
      )
      const tickedCount = tickedSkills.length
      const tickedShare = tickedSkills.reduce((sum, s) => sum + s.share, 0)

      const readinessPct =
        totalShare > 0 ? (tickedShare / totalShare) * 100 : 0

      return {
        readinessPct,
        tickedCount,
        totalCount,
        totalShare,
        tickedShare,
      }
    }, [top15Skills, tickedSkillIds])

  // ---------------------------------------------------------------------------
  // 10. Roadmap: What to Learn Next (Unticked skills sorted by share desc)
  // ---------------------------------------------------------------------------
  const untickedSkills = useMemo(() => {
    const unticked = top15Skills.filter(
      (s) => !tickedSkillIds.includes(s.skillId)
    )
    return [...unticked].sort((a, b) => {
      if (b.share !== a.share) return b.share - a.share
      return a.name.localeCompare(b.name)
    })
  }, [top15Skills, tickedSkillIds])

  // Unticked skill IDs set for matching courses
  const untickedSkillIdsSet = useMemo(() => {
    return new Set(untickedSkills.map((s) => s.skillId))
  }, [untickedSkills])

  // ---------------------------------------------------------------------------
  // 11. Courses Linked to This Role
  // ---------------------------------------------------------------------------
  const linkedCourseAlignments = useMemo(() => {
    const filtered = alignments.filter((a) => a.roleLinkedToCourse === true)
    return [...filtered].sort(
      (a, b) => (b.coverageScore ?? 0) - (a.coverageScore ?? 0)
    )
  }, [alignments])

  // Find course item details by id
  const courseDetailsMap = useMemo(() => {
    const map = new Map<number, CourseItem>()
    for (const c of courses) {
      map.set(c.id, c)
    }
    return map
  }, [courses])

  const selectedCourseItem = useMemo(() => {
    if (!selectedAlignment) return null
    return courseDetailsMap.get(selectedAlignment.courseId) || null
  }, [selectedAlignment, courseDetailsMap])

  // Current selected role object
  const currentRole = useMemo(() => {
    return roles.find((r) => String(r.id) === selectedRoleId)
  }, [roles, selectedRoleId])

  // Role options for SelectField
  const roleSelectOptions = useMemo(() => {
    return roles.map((r) => ({
      label: r.name,
      value: String(r.id),
    }))
  }, [roles])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header with Title and Synthetic Data Badge */}
      <PageHeader
        title="Career Navigator"
        description="Explore live employer demand for your target role, track your skill readiness, and find courses that close your gaps. All data is synthetic."
        showSyntheticBadge={true}
      />

      {/* Honesty Note */}
      <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300 flex items-start gap-2.5">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
        <div className="space-y-0.5">
          <p className="font-medium">
            Your ticks are saved in this browser only (demo, no accounts).
            Clearing browser data erases them.
          </p>
          <p className="text-sky-700 dark:text-sky-400">
            All data is synthetic.
          </p>
        </div>
      </div>

      {/* Section A: Target Role Selector */}
      <div className="rounded-lg border border-border/80 bg-card p-4 text-card-foreground shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            {rolesLoading ? (
              <div className="flex items-center gap-2 w-full">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 flex-1" />
              </div>
            ) : rolesError ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-destructive">{rolesError}</span>
                <button
                  type="button"
                  onClick={loadRolesAndCourses}
                  className="text-xs text-primary underline"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="w-full">
                <SelectField
                  id="target-role-select"
                  label="Target Role"
                  value={selectedRoleId}
                  onChange={handleRoleChange}
                  options={roleSelectOptions}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {currentRole && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="inline-block px-2 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono">
                Sector: {currentRole.sector}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Skills Checklist & Readiness Metric */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Section B: Skills this role asks for (Checklist, 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <SectionCard
            title="Skills this role asks for"
            subtitle="Top 15 skills requested by employers. Tick the skills you currently possess to compute your readiness."
            actionSlot={
              <button
                type="button"
                onClick={clearTicks}
                disabled={tickedSkillIds.length === 0}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Reset all ticked skills for this role"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear my ticks
              </button>
            }
          >
            {skillsLoading ? (
              <TableSkeleton rows={8} cols={3} />
            ) : skillsError ? (
              <ErrorState
                message="Failed to load skills for this role."
                onRetry={loadSkillsAndTrends}
              />
            ) : top15Skills.length === 0 ? (
              <EmptyState
                title="No skills found"
                description="No employer demand postings found for this role."
              />
            ) : (
              <div className="divide-y divide-border/60">
                {top15Skills.map((skill, index) => {
                  const isTicked = tickedSkillIds.includes(skill.skillId)
                  const trend = getTrendForItem(skill)
                  const lowSample = trend
                    ? isLowSample(
                        trend.postingsLatest,
                        trends?.minPostings || LOW_SAMPLE_THRESHOLD
                      )
                    : false

                  return (
                    <label
                      key={skill.skillId}
                      className={`flex items-center justify-between gap-3 py-2.5 px-2 rounded-md cursor-pointer transition-colors ${
                        isTicked
                          ? "bg-teal-500/10 dark:bg-teal-950/20"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isTicked}
                          onChange={() => toggleSkillTick(skill.skillId)}
                          className="h-4 w-4 rounded border-border text-teal-600 focus:ring-teal-500 shrink-0 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <span
                            className={`text-sm ${
                              isTicked
                                ? "font-medium text-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {skill.name}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            Rank #{index + 1} &middot; {skill.category}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono tabular-nums text-muted-foreground">
                          {(skill.share * 100).toFixed(1)}%
                        </span>

                        {trend && (
                          <DeltaBadge
                            value={trend.change}
                            size="sm"
                            showLabel={false}
                          />
                        )}

                        {lowSample && <LowSampleBadge />}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Section C: Readiness Card (1 col) */}
        <div className="space-y-4">
          <SectionCard
            title="Readiness"
            subtitle="Employer demand coverage based on your ticked skills"
          >
            {skillsLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : skillsError ? (
              <div className="p-4">
                <span className="text-xs text-destructive">{skillsError}</span>
              </div>
            ) : (
              <div className="p-2 space-y-4">
                <div>
                  <div className="text-4xl font-bold font-mono tracking-tight text-foreground tabular-nums">
                    {readinessPct.toFixed(1)}%
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, readinessPct))}%`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground font-mono leading-relaxed">
                    (sum of demand share of ticked skills) / (sum of demand
                    share of all 15 listed skills) &times; 100
                  </p>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Skills marked</span>
                  <span className="font-mono font-medium text-foreground">
                    {tickedCount} of {totalCount} skills ticked
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Ticked demand share</span>
                  <span className="font-mono text-foreground">
                    {(tickedShare * 100).toFixed(1)}% /{" "}
                    {(totalShare * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Section D: What to Learn Next Roadmap */}
      <SectionCard
        title="What to learn next"
        subtitle="Prioritized roadmap of skills you have not yet ticked, ordered by employer demand"
      >
        {skillsLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : skillsError ? (
          <ErrorState
            message="Could not load learning roadmap."
            onRetry={loadSkillsAndTrends}
          />
        ) : untickedSkills.length === 0 ? (
          <EmptyState
            title="All 15 skills ticked"
            description="You have marked all top employer skills for this role! Explore courses below to reinforce or validate your competencies."
            icon={CheckCircle2}
          />
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs font-medium text-muted-foreground">
                    <th className="py-2.5 px-3 w-12">#</th>
                    <th className="py-2.5 px-3">Skill</th>
                    <th className="py-2.5 px-3 text-right">Demand Share</th>
                    <th className="py-2.5 px-3 text-right">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {untickedSkills.map((skill, idx) => {
                    const trend = getTrendForItem(skill)
                    const lowSample = trend
                      ? isLowSample(
                          trend.postingsLatest,
                          trends?.minPostings || LOW_SAMPLE_THRESHOLD
                        )
                      : false

                    return (
                      <tr
                        key={skill.skillId}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-foreground">
                          <div>
                            <span>{skill.name}</span>
                            <span className="block text-[11px] font-normal text-muted-foreground">
                              {skill.category}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-foreground text-xs">
                          {(skill.share * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {trend ? (
                              <DeltaBadge
                                value={trend.change}
                                size="sm"
                                showLabel={true}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )}
                            {lowSample && <LowSampleBadge />}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground pt-2 border-t border-border/60">
              Highest employer demand first; the badge shows whether demand is
              rising.
            </p>
          </div>
        )}
      </SectionCard>

      {/* Section E: Courses that cover this role */}
      <SectionCard
        title="Courses that cover this role"
        subtitle="Catalog courses formally linked to this target role, ranked by alignment coverage"
      >
        {coursesLoading || alignmentsLoading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : coursesError || alignmentsError ? (
          <ErrorState
            message="Could not load courses or alignment data."
            onRetry={loadAlignmentsForRole}
          />
        ) : linkedCourseAlignments.length === 0 ? (
          <EmptyState
            title="No linked courses found"
            description="There are currently no courses in the catalog linked to this role."
          />
        ) : (
          <div className="space-y-3">
            <div className="divide-y divide-border/60">
              {linkedCourseAlignments.map((alignment) => {
                const courseItem = courseDetailsMap.get(alignment.courseId)
                // Compute how many unticked skills this course teaches
                const missingTaughtCount = alignment.coveredSkills.filter(
                  (cs) => untickedSkillIdsSet.has(cs.skillId)
                ).length

                const coverageScore = alignment.coverageScore ?? 0

                return (
                  <div
                    key={alignment.courseId}
                    onClick={() => {
                      setSelectedAlignment(alignment)
                      setIsDrawerOpen(true)
                    }}
                    className="py-3.5 px-3 -mx-3 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm">
                          {alignment.courseName}
                        </span>
                        {courseItem?.sector && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {courseItem.sector}
                          </span>
                        )}
                        {courseItem?.durationWeeks != null && (
                          <span className="text-[11px] text-muted-foreground">
                            {courseItem.durationWeeks} weeks
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-teal-700 dark:text-teal-400 font-medium">
                        teaches {missingTaughtCount} of your missing skills
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                      <div className="text-right min-w-32">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-teal-600 rounded-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, coverageScore)
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                            {coverageScore.toFixed(1)}%
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Role coverage score
                        </span>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-muted-foreground pt-2 border-t border-border/60">
              Coverage ignores the taught level of a skill.
            </p>
          </div>
        )}
      </SectionCard>

      {/* Course Detail Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedAlignment?.courseName || "Course Alignment"}
        subtitle={
          selectedCourseItem
            ? `${selectedCourseItem.sector} · ${selectedCourseItem.durationWeeks} weeks`
            : undefined
        }
      >
        {selectedAlignment && (
          <div className="space-y-6 text-sm">
            {/* Summary Banner */}
            <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Target Role
                </span>
                <span className="font-medium text-foreground">
                  {selectedAlignment.roleName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Role Coverage Score
                </span>
                <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">
                  {(selectedAlignment.coverageScore ?? 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Postings Analyzed
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {selectedAlignment.postingsInScope.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Covered Skills */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Covered Skills</span>
                <span className="font-mono text-[11px] font-normal">
                  {selectedAlignment.coveredSkills.length} skills
                </span>
              </h3>

              {selectedAlignment.coveredSkills.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  None of the top skills for this role are taught in this
                  course.
                </p>
              ) : (
                <div className="divide-y divide-border/60 rounded-md border border-border bg-card">
                  {selectedAlignment.coveredSkills.map((s) => {
                    const isMissingForStudent = untickedSkillIdsSet.has(
                      s.skillId
                    )
                    return (
                      <div
                        key={s.skillId}
                        className="p-2.5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                          <span className="font-medium text-foreground">
                            {s.name}
                          </span>
                          {isMissingForStudent && (
                            <span className="px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[10px]">
                              closes your gap
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-muted-foreground tabular-nums">
                          {(s.demandShare * 100).toFixed(1)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Missing Skills */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Missing Skills</span>
                <span className="font-mono text-[11px] font-normal">
                  {selectedAlignment.missingSkills.length} skills
                </span>
              </h3>

              {selectedAlignment.missingSkills.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  This course covers all top skills for the role.
                </p>
              ) : (
                <div className="divide-y divide-border/60 rounded-md border border-border bg-card">
                  {selectedAlignment.missingSkills.map((s) => (
                    <div
                      key={s.skillId}
                      className="p-2.5 flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span>{s.name}</span>
                      <span className="font-mono tabular-nums">
                        {(s.demandShare * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground italic pt-2">
              Coverage ignores the taught level of a skill.
            </p>
          </div>
        )}
      </Drawer>
    </div>
  )
}
