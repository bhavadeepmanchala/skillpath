"use client"

import React, {
  Suspense,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  BookOpen,
  ChevronRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  PageHeader,
  SectionCard,
  Drawer,
  Skeleton,
  ErrorState,
  EmptyState,
  DeltaBadge,
  LowSampleBadge,
} from "@/components/ui-kit"
import {
  fetchRoles,
  fetchSkills,
  fetchCourses,
  fetchCourseAlignment,
  fetchTopSkills,
  fetchDemandTrends,
  isLowSample,
  RoleItem,
  SkillItem,
  CourseItem,
  CourseAlignmentResponse,
  DemandTrendsResponse,
  SkillDemandItem,
  SkillTrendItem,
} from "@/lib/demand-api"

interface RoleFitItem {
  roleId: number
  name: string
  sector: string
  readinessPct: number
  coveredCount: number
  totalCount: number
  status: "ok" | "error"
}

function SkillAnalysisContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const roleParam = searchParams.get("role")
  const skillsParam = searchParams.get("skills")

  // Catalog base state
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [allSkills, setAllSkills] = useState<SkillItem[]>([])
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  // Current Role Data
  const [topSkills, setTopSkills] = useState<SkillDemandItem[]>([])
  const [trends, setTrends] = useState<DemandTrendsResponse | null>(null)
  const [roleDataLoading, setRoleDataLoading] = useState(true)
  const [roleDataError, setRoleDataError] = useState<string | null>(null)

  // Course Alignments
  const [alignments, setAlignments] = useState<CourseAlignmentResponse[]>([])
  const [alignmentsLoading, setAlignmentsLoading] = useState(true)
  const [alignmentsError, setAlignmentsError] = useState<string | null>(null)
  const [alignmentCache, setAlignmentCache] = useState<
    Record<string, CourseAlignmentResponse[]>
  >({})

  // Role Fits (All roles comparison)
  const [roleFits, setRoleFits] = useState<RoleFitItem[]>([])
  const [roleFitsLoading, setRoleFitsLoading] = useState(true)
  const [roleFitsError, setRoleFitsError] = useState<string | null>(null)
  const [roleFitCache, setRoleFitCache] = useState<Record<string, RoleFitItem[]>>({})

  // Course Drawer state
  const [selectedAlignment, setSelectedAlignment] =
    useState<CourseAlignmentResponse | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Active role tracker for ignoring stale responses
  const activeRoleRef = useRef<string | null>(roleParam)
  useEffect(() => {
    activeRoleRef.current = roleParam
  }, [roleParam])

  // 1. Load Initial Catalog Data
  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true)
    setCatalogError(null)
    try {
      const [fetchedRoles, fetchedSkills, fetchedCourses] = await Promise.all([
        fetchRoles(),
        fetchSkills(),
        fetchCourses(),
      ])
      setRoles(fetchedRoles)
      setAllSkills(fetchedSkills)
      setCourses(fetchedCourses)
    } catch {
      setCatalogError("Could not load role and course catalogues from the server.")
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  // Parse and validate selected skills
  const { selectedSkillIds, unknownSkillIds } = useMemo(() => {
    if (!skillsParam) return { selectedSkillIds: [], unknownSkillIds: [] }
    const rawTokens = skillsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const validIds: number[] = []
    const invalidIds: string[] = []

    const validIdSet = new Set(allSkills.map((s) => s.id))
    for (const token of rawTokens) {
      const n = Number(token)
      if (!isNaN(n) && validIdSet.has(n)) {
        validIds.push(n)
      } else {
        invalidIds.push(token)
      }
    }
    return { selectedSkillIds: validIds, unknownSkillIds: invalidIds }
  }, [skillsParam, allSkills])

  // Selected role object
  const currentRole = useMemo(() => {
    if (!roleParam || roles.length === 0) return null
    return roles.find((r) => String(r.id) === roleParam) || null
  }, [roleParam, roles])

  // 2. Load top skills & trends for target role
  const loadRoleDemandData = useCallback(async () => {
    if (!roleParam) return
    const roleIdNum = Number(roleParam)
    if (isNaN(roleIdNum)) return

    setRoleDataLoading(true)
    setRoleDataError(null)

    try {
      const [skillsRes, trendsRes] = await Promise.all([
        fetchTopSkills({ roleId: roleIdNum, limit: 15 }),
        fetchDemandTrends({ roleId: roleIdNum }),
      ])
      if (activeRoleRef.current === roleParam) {
        setTopSkills(skillsRes.skills || [])
        setTrends(trendsRes)
      }
    } catch {
      if (activeRoleRef.current === roleParam) {
        setRoleDataError("Could not load demand and trend data for this role.")
      }
    } finally {
      if (activeRoleRef.current === roleParam) {
        setRoleDataLoading(false)
      }
    }
  }, [roleParam])

  useEffect(() => {
    if (currentRole) {
      loadRoleDemandData()
    }
  }, [currentRole, loadRoleDemandData])

  // 3. Load course alignments for target role
  const loadAlignments = useCallback(async () => {
    if (!roleParam || courses.length === 0) return
    const roleIdNum = Number(roleParam)
    if (isNaN(roleIdNum)) return

    if (alignmentCache[roleParam]) {
      setAlignments(alignmentCache[roleParam])
      setAlignmentsLoading(false)
      setAlignmentsError(null)
      return
    }

    setAlignmentsLoading(true)
    setAlignmentsError(null)

    try {
      // Parallel alignment calls across all catalog courses; a bulk endpoint would be better later.
      const results = await Promise.all(
        courses.map((c) => fetchCourseAlignment(c.id, { roleId: roleIdNum }))
      )
      if (activeRoleRef.current === roleParam) {
        setAlignmentCache((prev) => ({ ...prev, [roleParam]: results }))
        setAlignments(results)
      }
    } catch {
      if (activeRoleRef.current === roleParam) {
        setAlignmentsError("Could not calculate course alignments for this role.")
      }
    } finally {
      if (activeRoleRef.current === roleParam) {
        setAlignmentsLoading(false)
      }
    }
  }, [roleParam, courses, alignmentCache])

  useEffect(() => {
    if (currentRole && courses.length > 0) {
      loadAlignments()
    }
  }, [currentRole, courses, loadAlignments])

  // 4. Load readiness fits across every role
  const loadRoleFits = useCallback(async () => {
    if (roles.length === 0) return

    const cacheKey = selectedSkillIds.slice().sort().join(",")
    if (roleFitCache[cacheKey]) {
      setRoleFits(roleFitCache[cacheKey])
      setRoleFitsLoading(false)
      setRoleFitsError(null)
      return
    }

    setRoleFitsLoading(true)
    setRoleFitsError(null)

    try {
      // Parallel top-skills calls across all roles; a bulk endpoint would be better later.
      const results: RoleFitItem[] = await Promise.all(
        roles.map(async (r) => {
          try {
            const res = await fetchTopSkills({ roleId: r.id, limit: 15 })
            const t15 = (res.skills || []).slice(0, 15)
            const totShare = t15.reduce((sum, s) => sum + s.share, 0)
            const covered = t15.filter((s) => selectedSkillIds.includes(s.skillId))
            const coveredShare = covered.reduce((sum, s) => sum + s.share, 0)
            const readiness = totShare > 0 ? (coveredShare / totShare) * 100 : 0
            return {
              roleId: r.id,
              name: r.name,
              sector: r.sector,
              readinessPct: readiness,
              coveredCount: covered.length,
              totalCount: t15.length,
              status: "ok" as const,
            }
          } catch {
            return {
              roleId: r.id,
              name: r.name,
              sector: r.sector,
              readinessPct: 0,
              coveredCount: 0,
              totalCount: 0,
              status: "error" as const,
            }
          }
        })
      )

      results.sort((a, b) => b.readinessPct - a.readinessPct)
      setRoleFitCache((prev) => ({ ...prev, [cacheKey]: results }))
      setRoleFits(results)
    } catch {
      setRoleFitsError("Could not compute fits across all roles.")
    } finally {
      setRoleFitsLoading(false)
    }
  }, [roles, selectedSkillIds, roleFitCache])

  useEffect(() => {
    if (roles.length > 0 && !catalogLoading) {
      loadRoleFits()
    }
  }, [roles, catalogLoading, loadRoleFits])

  // Trend mapping for quick lookup
  const trendMap = useMemo(() => {
    const map = new Map<number, SkillTrendItem>()
    if (!trends) return map
    const all = [...(trends.rising || []), ...(trends.declining || [])]
    for (const item of all) {
      if (item.skillId != null) {
        map.set(item.skillId, item)
      }
    }
    return map
  }, [trends])

  // Top 15 skills for target role
  const top15 = useMemo(() => topSkills.slice(0, 15), [topSkills])

  // Readiness calculations
  const {
    readinessPct,
    coveredTop15,
    missingTop15,
    totalTop15Share,
    coveredTop15Share,
  } = useMemo(() => {
    const totalShare = top15.reduce((sum, s) => sum + s.share, 0)
    const covered = top15.filter((s) => selectedSkillIds.includes(s.skillId))
    const missing = top15.filter((s) => !selectedSkillIds.includes(s.skillId))
    const coveredShare = covered.reduce((sum, s) => sum + s.share, 0)
    const pct = totalShare > 0 ? (coveredShare / totalShare) * 100 : 0

    return {
      readinessPct: pct,
      coveredTop15: covered,
      missingTop15: missing,
      totalTop15Share: totalShare,
      coveredTop15Share: coveredShare,
    }
  }, [top15, selectedSkillIds])

  // Other skills listed by student that are not in top 15
  const otherSelectedSkills = useMemo(() => {
    const top15Ids = new Set(top15.map((s) => s.skillId))
    return selectedSkillIds
      .filter((id) => !top15Ids.has(id))
      .map(
        (id) =>
          allSkills.find((s) => s.id === id) || {
            id,
            name: `Skill #${id}`,
            category: "Other",
            aliases: [],
          }
      )
  }, [selectedSkillIds, top15, allSkills])

  // Missing skills set for course gap closing
  const missingSkillIdsSet = useMemo(() => {
    return new Set(missingTop15.map((s) => s.skillId))
  }, [missingTop15])

  // What to learn next: missing top 15 skills ordered by demand share descending (ties broken by name)
  const whatToLearnNext = useMemo(() => {
    return [...missingTop15].sort((a, b) => {
      if (b.share !== a.share) return b.share - a.share
      return a.name.localeCompare(b.name)
    })
  }, [missingTop15])

  // Filter linked courses and rank by coverageScore descending
  const linkedAlignments = useMemo(() => {
    return alignments
      .filter((a) => a.roleLinkedToCourse === true)
      .sort((a, b) => (b.coverageScore ?? 0) - (a.coverageScore ?? 0))
  }, [alignments])

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

  // If catalog is loading
  if (catalogLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <PageHeader
          title="Skill Analysis"
          description="Your skills compared with synthetic job-posting demand for the role you chose."
          showSyntheticBadge={true}
        />
        <SectionCard title="Loading analysis…">
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </SectionCard>
      </div>
    )
  }

  // Catalog error
  if (catalogError) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <PageHeader
          title="Skill Analysis"
          description="Your skills compared with synthetic job-posting demand for the role you chose."
          showSyntheticBadge={true}
        />
        <SectionCard title="Error">
          <ErrorState message={catalogError} onRetry={loadCatalog} />
        </SectionCard>
      </div>
    )
  }

  // Invalid role or unknown skills check
  const isRoleInvalid = !roleParam || !currentRole
  const hasUnknownSkills = unknownSkillIds.length > 0

  if (isRoleInvalid || hasUnknownSkills) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-12">
        <PageHeader
          title="Skill Analysis"
          description="Your skills compared with synthetic job-posting demand for the role you chose."
          showSyntheticBadge={true}
        />
        <SectionCard title="Invalid Request">
          <EmptyState
            title={
              isRoleInvalid
                ? "No valid role selected"
                : "Unknown skill identifiers in URL"
            }
            description={
              isRoleInvalid
                ? "Please choose a target career role to view your skill readiness analysis."
                : `The URL contains unrecognized skill IDs (${unknownSkillIds.join(
                    ", "
                  )}). Please select skills from the catalog.`
            }
          />
          <div className="mt-4 flex justify-center">
            <Button
              render={<Link href="/student/describe-myself" />}
              nativeButton={false}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Go to Skill Profile
            </Button>
          </div>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Skill Analysis"
          description="Your skills compared with synthetic job-posting demand for the role you chose."
          showSyntheticBadge={true}
        />
        <Button
          render={<Link href="/student/describe-myself" />}
          nativeButton={false}
          variant="outline"
          size="sm"
          className="self-start sm:self-auto shrink-0"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Edit Profile
        </Button>
      </div>

      {/* SECTION 1: Readiness for <role name> */}
      <SectionCard title={`1. Readiness for ${currentRole.name}`}>
        {roleDataLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : roleDataError ? (
          <ErrorState message={roleDataError} onRetry={loadRoleDemandData} />
        ) : top15.length === 0 ? (
          <EmptyState
            title="No demand data"
            description="No top skills demand recorded for this role."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-4">
              <div className="text-4xl font-extrabold tracking-tight text-teal-600 dark:text-teal-400 font-mono">
                {readinessPct.toFixed(1)}%
              </div>
              <div className="text-sm text-foreground font-medium">
                {coveredTop15.length} of {top15.length} skills covered
              </div>
            </div>

            {/* Formula line */}
            <div className="p-3 rounded-lg border border-border/70 bg-muted/20 text-xs text-muted-foreground font-mono">
              Formula: (Covered Top-{top15.length} Demand Share: {(coveredTop15Share * 100).toFixed(1)}% / Total Top-{top15.length} Demand Share: {(totalTop15Share * 100).toFixed(1)}%) × 100 = {readinessPct.toFixed(1)}%
            </div>

            <p className="text-xs text-muted-foreground">
              Based on top {top15.length} skills demanded in job postings for {currentRole.name}. 0% is an accurate assessment when none of the top {top15.length} demanded skills are selected.
            </p>
          </div>
        )}
      </SectionCard>

      {/* SECTION 2: Skills you have and Missing skills */}
      <SectionCard
        title="2. Skills Breakdown"
        subtitle={`Skills you possess vs missing skills among the top ${top15.length} demand for ${currentRole.name}.`}
      >
        {roleDataLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : roleDataError ? (
          <ErrorState message={roleDataError} onRetry={loadRoleDemandData} />
        ) : top15.length === 0 ? (
          <EmptyState
            title="No skills breakdown"
            description="No skills data available for this role."
          />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Skills you have */}
              <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Skills you have ({coveredTop15.length})
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Top-{top15.length} Demand
                  </span>
                </div>

                {coveredTop15.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-4 text-center">
                    You have not selected any of the top {top15.length} skills for this role.
                  </p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {coveredTop15.map((s) => (
                      <div
                        key={s.skillId}
                        className="py-2 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                          <span className="font-medium text-foreground">
                            {s.name}
                          </span>
                        </div>
                        <span className="font-mono text-muted-foreground tabular-nums">
                          {(s.share * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Missing skills */}
              <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Missing skills ({missingTop15.length})
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Demand & Trend
                  </span>
                </div>

                {missingTop15.length === 0 ? (
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-medium py-4 text-center">
                    Great job! You have covered all top ${top15.length} skills for this role.
                  </p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {missingTop15.map((s) => {
                      const trendItem = trendMap.get(s.skillId)
                      const lowSample = isLowSample(trendItem?.postingsLatest)
                      return (
                        <div
                          key={s.skillId}
                          className="py-2 flex items-center justify-between text-xs"
                        >
                          <span className="text-foreground">{s.name}</span>
                          <div className="flex items-center gap-2">
                            {trendItem && (
                              <DeltaBadge
                                value={trendItem.change}
                                size="sm"
                                showLabel={false}
                              />
                            )}
                            {lowSample && <LowSampleBadge />}
                            <span className="font-mono text-muted-foreground tabular-nums">
                              {(s.share * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Other skills listed by student that are not in top 15 */}
            {otherSelectedSkills.length > 0 && (
              <div className="rounded-lg border border-border/80 bg-muted/15 p-4 space-y-2">
                <h3 className="text-xs font-semibold text-foreground">
                  Other skills you listed that are not in this role&apos;s top {top15.length}:
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  These skills are not among the top {top15.length} most demanded in job postings for {currentRole.name}. They are preserved here and not dropped:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {otherSelectedSkills.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground border border-border/60"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* SECTION 3: What to learn next */}
      <SectionCard
        title="3. What to learn next"
        subtitle="Priority roadmap of missing top skills ranked by market demand."
      >
        {roleDataLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : roleDataError ? (
          <ErrorState message={roleDataError} onRetry={loadRoleDemandData} />
        ) : whatToLearnNext.length === 0 ? (
          <EmptyState
            title="No skill gaps!"
            description={`You have already acquired all top ${top15.length} skills demanded for this role.`}
          />
        ) : (
          <div className="space-y-3">
            <div className="divide-y divide-border/60 rounded-md border border-border bg-card">
              {whatToLearnNext.map((s, idx) => {
                const trendItem = trendMap.get(s.skillId)
                const lowSample = isLowSample(trendItem?.postingsLatest)
                return (
                  <div
                    key={s.skillId}
                    className="p-3 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-mono font-medium text-muted-foreground">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-foreground">{s.name}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {trendItem && (
                        <DeltaBadge
                          value={trendItem.change}
                          size="sm"
                          showLabel={false}
                        />
                      )}
                      {lowSample && <LowSampleBadge />}
                      <span className="font-mono text-muted-foreground tabular-nums font-medium">
                        {(s.share * 100).toFixed(1)}% share
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              Skills ordered by employer demand share in descending order (ties broken alphabetically).
            </p>
          </div>
        )}
      </SectionCard>

      {/* SECTION 4: Courses that cover this role */}
      <SectionCard
        title="4. Courses that cover this role"
        subtitle={`Catalog courses linked to ${currentRole.name}, ranked by overall role coverage score.`}
      >
        {alignmentsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : alignmentsError ? (
          <ErrorState message={alignmentsError} onRetry={loadAlignments} />
        ) : linkedAlignments.length === 0 ? (
          <EmptyState
            title="No linked courses"
            description={`No courses in the synthetic catalogue are linked to ${currentRole.name}.`}
          />
        ) : (
          <div className="space-y-3">
            <div className="divide-y divide-border/60 rounded-md border border-border bg-card">
              {linkedAlignments.map((a) => {
                const courseInfo = courseDetailsMap.get(a.courseId)
                const missingTaughtCount = a.coveredSkills.filter((cs) =>
                  missingSkillIdsSet.has(cs.skillId)
                ).length

                return (
                  <button
                    key={a.courseId}
                    type="button"
                    onClick={() => {
                      setSelectedAlignment(a)
                      setIsDrawerOpen(true)
                    }}
                    className="w-full text-left p-3.5 hover:bg-muted/40 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-teal-600 shrink-0" />
                        <span className="text-xs font-semibold text-foreground">
                          {a.courseName}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        {courseInfo && (
                          <span>
                            {courseInfo.sector} · {courseInfo.durationWeeks} weeks
                          </span>
                        )}
                        <span>·</span>
                        <span className="font-medium text-teal-600 dark:text-teal-400">
                          Teaches {missingTaughtCount} of your missing skills
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {(a.coverageScore ?? 0).toFixed(1)}% coverage
                        </span>
                        <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-teal-600 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, a.coverageScore ?? 0))}%`,
                            }}
                          />
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              Coverage ignores the taught level of a skill. Courses come from the synthetic catalogue.
            </p>
          </div>
        )}
      </SectionCard>

      {/* SECTION 5: How your skills fit every role */}
      <SectionCard
        title="5. How your skills fit every role"
        subtitle="Compare your current skill readiness across all roles in the catalog. Click any row to analyze that role."
      >
        {roleFitsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : roleFitsError ? (
          <ErrorState message={roleFitsError} onRetry={loadRoleFits} />
        ) : roleFits.length === 0 ? (
          <EmptyState
            title="No role fits"
            description="Unable to compute role comparisons."
          />
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-md border border-border bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                  <tr>
                    <th className="p-3">Role</th>
                    <th className="p-3">Sector</th>
                    <th className="p-3 text-right">Readiness %</th>
                    <th className="p-3 text-right">Covered Skills</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {roleFits.map((r) => {
                    const isSelected = String(r.roleId) === roleParam
                    return (
                      <tr
                        key={r.roleId}
                        onClick={() => {
                          router.push(
                            `/student/skill-analysis?role=${r.roleId}&skills=${encodeURIComponent(
                              skillsParam || ""
                            )}`
                          )
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-teal-500/10 font-medium hover:bg-teal-500/15"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <td className="p-3 text-foreground flex items-center gap-2">
                          {isSelected && (
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                          )}
                          <span>{r.name}</span>
                          {isSelected && (
                            <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 bg-teal-500/20 px-1.5 py-0.5 rounded">
                              Selected
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">{r.sector}</td>
                        <td className="p-3 text-right font-mono tabular-nums">
                          {r.status === "ok" ? (
                            <span className={isSelected ? "font-bold text-teal-700 dark:text-teal-400" : ""}>
                              {r.readinessPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-destructive">unavailable</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground tabular-nums">
                          {r.status === "ok" ? (
                            `${r.coveredCount} / ${r.totalCount}`
                          ) : (
                            <span className="text-destructive">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              Share of each role&apos;s demand that your skills cover. Common soft skills appear in many roles, so scores overlap.
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
                <span className="text-xs text-muted-foreground">Target Role</span>
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
                  None of the top skills for this role are taught in this course.
                </p>
              ) : (
                <div className="divide-y divide-border/60 rounded-md border border-border bg-card">
                  {selectedAlignment.coveredSkills.map((s) => {
                    const isMissingForStudent = missingSkillIdsSet.has(s.skillId)
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
                            <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[10px]">
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

function SkillAnalysisSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default function SkillAnalysisPage() {
  return (
    <Suspense fallback={<SkillAnalysisSkeleton />}>
      <SkillAnalysisContent />
    </Suspense>
  )
}
