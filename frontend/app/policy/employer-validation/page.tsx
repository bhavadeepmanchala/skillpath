"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react"
import {
  CheckCircle2,
  XCircle,
  Search,
  X,
  Loader2,
  Info,
  AlertTriangle,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Percent,
  Check,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import {
  fetchRoles,
  fetchSkills,
  fetchTopSkills,
  fetchValidations,
  createValidation,
  ValidationApiError,
  type RoleItem,
  type SkillItem,
  type SkillDemandItem,
  type ValidationSummaryItem,
} from "@/lib/demand-api"
import {
  PageHeader,
  FindingHeadline,
  BigNumber,
  FigureRow,
  SectionHeader,
  SourceCaption,
  SelectField,
  ProgressBar,
  ErrorState,
  EmptyState,
  Skeleton,
} from "@/components/ui-kit"
import {
  formatPercent,
  formatInteger,
} from "@/lib/findings"

export default function EmployerValidationPage() {
  // ---------------------------------------------------------------------------
  // Catalogs State: Roles & Skills (Section 1 4-states)
  // ---------------------------------------------------------------------------
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(true)
  const [catalogsError, setCatalogsError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Form State
  // ---------------------------------------------------------------------------
  const [selectedRoleId, setSelectedRoleId] = useState<string>("")
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null)
  const [roleTopSkills, setRoleTopSkills] = useState<SkillDemandItem[]>([])
  const [roleTopSkillsLoading, setRoleTopSkillsLoading] = useState(false)
  const [roleTopSkillsError, setRoleTopSkillsError] = useState<string | null>(null)
  const [showAllSkillsSearch, setShowAllSkillsSearch] = useState(false)
  const [skillSearchQuery, setSkillSearchQuery] = useState("")
  const [status, setStatus] = useState<"CONFIRMED" | "DISPUTED" | "">("")
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState("")

  // Form submission state & feedback
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<{
    message: string
    isNetwork: boolean
  } | null>(null)

  // ---------------------------------------------------------------------------
  // Validation Summary State (Section 2 4-states)
  // ---------------------------------------------------------------------------
  const [counts, setCounts] = useState<ValidationSummaryItem | null>(null)
  const [countsLoading, setCountsLoading] = useState(false)
  const [countsError, setCountsError] = useState<string | null>(null)
  const activeCountRequestKey = useRef<string>("")

  // 1. Initial Load: Roles and Skills
  const loadCatalogs = useCallback(async () => {
    setCatalogsLoading(true)
    setCatalogsError(null)
    try {
      const [roleData, skillData] = await Promise.all([
        fetchRoles(),
        fetchSkills(),
      ])
      const sortedRoles = [...roleData].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
      const sortedSkills = [...skillData].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
      setRoles(sortedRoles)
      setSkills(sortedSkills)
    } catch {
      setCatalogsError(
        "Failed to load roles and skills catalog. Is the backend running?"
      )
    } finally {
      setCatalogsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCatalogs()
  }, [loadCatalogs])

  // 2. Fetch Validation Counts & Confidence when (Role, Skill) are picked
  const loadCounts = useCallback(async (roleIdStr: string, skillIdNum: number | null) => {
    if (!roleIdStr || skillIdNum == null) {
      setCounts(null)
      setCountsLoading(false)
      setCountsError(null)
      return
    }

    const key = `${roleIdStr}:${skillIdNum}`
    activeCountRequestKey.current = key

    setCountsLoading(true)
    setCountsError(null)

    try {
      const summaryList = await fetchValidations({
        roleId: Number(roleIdStr),
        skillId: skillIdNum,
      })

      if (activeCountRequestKey.current === key) {
        if (summaryList && summaryList.length > 0) {
          setCounts(summaryList[0])
        } else {
          // Baseline prior is 0.5 with 0 evaluations
          setCounts({
            roleId: Number(roleIdStr),
            skillId: skillIdNum,
            confirmedCount: 0,
            disputedCount: 0,
            confidence: 0.5,
          })
        }
      }
    } catch {
      if (activeCountRequestKey.current === key) {
        setCountsError(
          "Could not fetch validation summary counts. Is the backend running?"
        )
      }
    } finally {
      if (activeCountRequestKey.current === key) {
        setCountsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    loadCounts(selectedRoleId, selectedSkillId)
  }, [selectedRoleId, selectedSkillId, loadCounts])

  // Skills Filtering & Grouping
  const skillsByCategory = useMemo(() => {
    const map = new Map<string, SkillItem[]>()
    for (const skill of skills) {
      const cat = skill.category || "General"
      if (!map.has(cat)) {
        map.set(cat, [])
      }
      map.get(cat)!.push(skill)
    }
    const sorted = new Map<string, SkillItem[]>()
    Array.from(map.keys())
      .sort((a, b) => a.localeCompare(b))
      .forEach((cat) => {
        sorted.set(cat, map.get(cat)!)
      })
    return sorted
  }, [skills])

  const filteredCategories = useMemo(() => {
    const q = skillSearchQuery.trim().toLowerCase()
    if (!q) return skillsByCategory

    const result = new Map<string, SkillItem[]>()
    for (const [category, catSkills] of skillsByCategory.entries()) {
      const matching = catSkills.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.aliases?.some((a) => a.toLowerCase().includes(q))
      )
      if (matching.length > 0) {
        result.set(category, matching)
      }
    }
    return result
  }, [skillsByCategory, skillSearchQuery])

  const selectedSkill = useMemo(() => {
    if (selectedSkillId == null) return null
    return skills.find((s) => s.id === selectedSkillId) || null
  }, [skills, selectedSkillId])

  const selectedRole = useMemo(() => {
    if (!selectedRoleId) return null
    return roles.find((r) => String(r.id) === selectedRoleId) || null
  }, [roles, selectedRoleId])

  const roleOptions = useMemo(() => {
    return [
      { label: "Select a target role...", value: "" },
      ...roles.map((r) => ({ label: `${r.name} (${r.sector})`, value: String(r.id) })),
    ]
  }, [roles])

  // 3. Form Submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!selectedRoleId || selectedSkillId == null || !status || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setSubmitSuccess(null)
    setSubmitError(null)

    try {
      const response = await createValidation({
        roleId: Number(selectedRoleId),
        skillId: selectedSkillId,
        status,
        note: note.trim() ? note.trim() : null,
      })

      const skillName = selectedSkill?.name || `Skill #${selectedSkillId}`
      setSubmitSuccess(
        `Successfully submitted ${response.status.toLowerCase()} validation for "${skillName}". Reported confidence is now ${(response.confidence * 100).toFixed(1)}%.`
      )
      setStatus("")
      setNote("")

      // Refresh live signals counts
      await loadCounts(selectedRoleId, selectedSkillId)
    } catch (err) {
      if (err instanceof ValidationApiError) {
        if (err.status === 429) {
          setSubmitError({
            message:
              "The demo has reached its 2,000 validation submission limit. Further writes are restricted.",
            isNetwork: false,
          })
        } else if (err.status === 404) {
          setSubmitError({
            message: "The requested role or skill was not found on the server.",
            isNetwork: false,
          })
        } else if (err.status === 400) {
          setSubmitError({
            message: err.message || "Invalid validation submission data.",
            isNetwork: false,
          })
        } else {
          setSubmitError({
            message:
              err.message ||
              "Network error connecting to the validation service. Please check CORS and server connectivity.",
            isNetwork: true,
          })
        }
      } else {
        setSubmitError({
          message:
            "Network error connecting to the validation service. Please check CORS and server connectivity.",
          isNetwork: true,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fetch top 12 demanded skills for the selected role (with loading, error/retry, and empty states)
  const loadRoleTopSkills = useCallback(async (roleIdStr: string) => {
    if (!roleIdStr) {
      setRoleTopSkills([])
      setRoleTopSkillsError(null)
      setRoleTopSkillsLoading(false)
      return
    }
    setRoleTopSkillsLoading(true)
    setRoleTopSkillsError(null)
    try {
      const res = await fetchTopSkills({ roleId: Number(roleIdStr), limit: 12 })
      setRoleTopSkills(res.skills.slice(0, 12))
    } catch {
      setRoleTopSkills([])
      setRoleTopSkillsError("Could not load top demanded skills for this role.")
    } finally {
      setRoleTopSkillsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRoleTopSkills(selectedRoleId)
  }, [selectedRoleId, loadRoleTopSkills])

  // Finding sentence calculation
  const findingHeadline = useMemo(() => {
    if (selectedRole && selectedSkill && counts) {
      const total = counts.confirmedCount + counts.disputedCount
      if (total === 0) {
        return `${selectedSkill.name} for ${selectedRole.name} currently holds a neutral 50.0% prior with no employer submissions yet.`
      }
      return `${selectedSkill.name} for ${selectedRole.name} has ${counts.confirmedCount} confirmed and ${counts.disputedCount} disputed reviews (${(counts.confidence * 100).toFixed(1)}% statistical confidence).`
    }
    return "Confirm or dispute whether a skill is needed for a role"
  }, [selectedRole, selectedSkill, counts])

  return (
    <div className="space-y-5 animate-page-enter">
      {/* 1. Page Header (Synthetic data shown in masthead & source caption) */}
      <PageHeader
        title="Employer Validation"
        standfirst="Verify or dispute whether demanded skills truly reflect hiring requirements for specific roles using confidence from employer votes."
        showSyntheticBadge={false}
      />

      {/* 2. Finding Headline & Open FigureRow */}
      <section className="space-y-6">
        <FindingHeadline
          kicker="Validation Intelligence Finding"
          sentence={findingHeadline}
        >
          <SourceCaption
            scope={
              selectedRole && selectedSkill
                ? `${selectedRole.name} · ${selectedSkill.name}`
                : "Employer skill review"
            }
            window="Confidence = (confirmed + 1) / (confirmed + disputed + 2)"
            note="Stored in database and capped at 2,000 submissions"
          />
        </FindingHeadline>

        {selectedRole && selectedSkill && (
          <FigureRow columns={4}>
            <BigNumber
              label="Confirmed Reviews"
              rawValue={counts?.confirmedCount ?? 0}
              footnote={`${selectedSkill.name} · ${selectedRole.name}`}
            />
            <BigNumber
              label="Disputed Reviews"
              rawValue={counts?.disputedCount ?? 0}
              footnote="Selected pair only"
            />
            <BigNumber
              label="Signal Confidence"
              value={counts ? `${(counts.confidence * 100).toFixed(1)}%` : "50.0%"}
              footnote="Weighted by employer votes"
            />
            <BigNumber
              label="Pair Submissions"
              rawValue={(counts?.confirmedCount ?? 0) + (counts?.disputedCount ?? 0)}
              footnote="Demo cap: 2,000 total"
            />
          </FigureRow>
        )}
      </section>

      {/* 3. Simplified Two-Column Layout: Form sits directly next to Live Signals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Validation Form (7 cols) */}
        <div className="lg:col-span-7 rounded-lg border border-border bg-card p-5 sm:p-6 shadow-resting">
          <div className="pb-4 border-b border-border">
            <h3 className="font-serif text-base font-semibold text-foreground">
              Submit Employer Review
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Confirm or dispute whether a skill is genuinely required for an occupation.
            </p>
          </div>

          <div className="mt-5">
            {catalogsLoading ? (
              <div className="space-y-4 py-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : catalogsError ? (
              <ErrorState message={catalogsError} onRetry={loadCatalogs} />
            ) : roles.length === 0 || skills.length === 0 ? (
              <EmptyState
                title="No catalog data available"
                description="Unable to retrieve roles or skills catalog from the alignment engine."
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Success Banner */}
                {submitSuccess && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-positive/30 bg-positive-subtle p-3 text-xs text-positive-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-positive mt-0.5" aria-hidden="true" />
                    <div className="flex-1 leading-relaxed">{submitSuccess}</div>
                    <button
                      type="button"
                      onClick={() => setSubmitSuccess(null)}
                      className="text-positive-foreground hover:opacity-80"
                      aria-label="Dismiss alert"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Error Banner with Retry */}
                {submitError && (
                  <div className="flex flex-col gap-2 rounded-lg border border-negative/30 bg-negative-subtle p-3 text-xs text-negative-foreground">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-negative mt-0.5" aria-hidden="true" />
                      <div className="flex-1 leading-relaxed font-medium">
                        {submitError.message}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSubmitError(null)}
                        className="text-negative-foreground hover:opacity-80"
                        aria-label="Dismiss error"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {submitError.isNetwork && (
                      <div className="pl-6 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSubmit()}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1.5 rounded bg-negative px-2.5 py-1 text-[11px] font-semibold text-negative-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Retry Submission</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 1: Choose a Role */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Step 1
                  </span>
                  <SelectField
                    id="role-select"
                    label="Choose a role"
                    value={selectedRoleId}
                    onChange={(val) => {
                      setSelectedRoleId(val)
                      setSubmitSuccess(null)
                      setSubmitError(null)
                    }}
                    options={roleOptions}
                  />
                </div>

                {/* Step 2: Choose a Skill */}
                <div className="space-y-2.5 pt-1 border-t border-border/60">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary block">
                        Step 2
                      </span>
                      <span className="block text-xs font-semibold text-foreground">
                        Choose a skill
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAllSkillsSearch((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1.5 py-0.5"
                    >
                      <Search className="h-3 w-3" aria-hidden="true" />
                      <span>{showAllSkillsSearch ? "Hide all 81 skills" : "Search all 81 skills"}</span>
                    </button>
                  </div>

                  {selectedSkill && (
                    <div className="flex items-center justify-between p-3 rounded-md border border-primary/40 bg-primary/5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-foreground">
                          {selectedSkill.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          ({selectedSkill.category})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSkillId(null)
                          setSubmitSuccess(null)
                        }}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Change</span>
                      </button>
                    </div>
                  )}

                  {/* Before a role is chosen: short hint only (no full 81-skill list unless expanded) */}
                  {!selectedRoleId ? (
                    <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border bg-muted/20 px-3 py-2.5">
                      Choose a role to see its most demanded skills.
                    </p>
                  ) : (
                    /* Top 12 Demanded Skills Chips for Selected Role */
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-muted-foreground">
                        Top demanded skills for {selectedRole?.name}:
                      </div>
                      {roleTopSkillsLoading ? (
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-7 w-24 rounded-full" />
                          ))}
                        </div>
                      ) : roleTopSkillsError ? (
                        <ErrorState
                          message={roleTopSkillsError}
                          onRetry={() => loadRoleTopSkills(selectedRoleId)}
                          compact
                        />
                      ) : roleTopSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {roleTopSkills.map((ts) => {
                            const isSelected = selectedSkillId === ts.skillId
                            return (
                              <button
                                key={ts.skillId}
                                type="button"
                                onClick={() => {
                                  setSelectedSkillId(ts.skillId)
                                  setSubmitSuccess(null)
                                  setSubmitError(null)
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                  isSelected
                                    ? "border-primary bg-primary text-primary-foreground font-semibold"
                                    : "border-border bg-background text-foreground hover:bg-muted/60"
                                }`}
                              >
                                <span>{ts.name}</span>
                                <span
                                  className={`text-[10px] font-mono tabular-nums ${
                                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                                  }`}
                                >
                                  {formatPercent(ts.share, 0)}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No top demanded skills recorded for this role. Use &quot;Search all 81 skills&quot; to choose any skill.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Expandable Search All 81 Skills */}
                  {showAllSkillsSearch && (
                    <div className="space-y-2 pt-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <input
                          id="skill-search-input"
                          name="skillSearch"
                          type="text"
                          value={skillSearchQuery}
                          onChange={(e) => setSkillSearchQuery(e.target.value)}
                          aria-label="Search 81 skills by name or alias"
                          placeholder="Search 81 skills by name or alias (e.g. Docker, Python, SQL)..."
                          className="w-full rounded-md border border-border bg-background pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        {skillSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setSkillSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label="Clear search"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background divide-y divide-border/40 p-1">
                        {Array.from(filteredCategories.entries()).length === 0 ? (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            No skills matching &quot;{skillSearchQuery}&quot;
                          </div>
                        ) : (
                          Array.from(filteredCategories.entries()).map(
                            ([category, catSkills]) => (
                              <div key={category} className="p-2 space-y-1">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                                  {category}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                  {catSkills.map((s) => (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedSkillId(s.id)
                                        setSkillSearchQuery("")
                                        setSubmitSuccess(null)
                                        setSubmitError(null)
                                      }}
                                      className="flex items-center justify-between gap-1 text-left px-2 py-1.5 rounded text-xs hover:bg-muted text-foreground"
                                    >
                                      <span className="break-words">{s.name}</span>
                                      {s.aliases && s.aliases.length > 0 && (
                                        <span className="text-[10px] text-muted-foreground ml-1 shrink-0 font-mono">
                                          {s.aliases[0]}
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3: Verdict & Optional Note */}
                <div className="space-y-3 pt-1 border-t border-border/60">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-primary block">
                      Step 3
                    </span>
                    <span
                      id="step3-verdict-heading"
                      className="block text-xs font-semibold text-foreground"
                    >
                      Is this skill needed for the role?
                    </span>
                  </div>
                  <div
                    role="group"
                    aria-labelledby="step3-verdict-heading"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => setStatus("CONFIRMED")}
                      className={`flex items-center justify-center gap-2 rounded-md border p-3.5 text-xs font-semibold transition-all text-center ${
                        status === "CONFIRMED"
                          ? "border-positive bg-positive-subtle text-positive-foreground ring-2 ring-positive/30"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4 text-positive shrink-0" aria-hidden="true" />
                      <span>Yes, employers need this skill</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatus("DISPUTED")}
                      className={`flex items-center justify-center gap-2 rounded-md border p-3.5 text-xs font-semibold transition-all text-center ${
                        status === "DISPUTED"
                          ? "border-negative bg-negative-subtle text-negative-foreground ring-2 ring-negative/30"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <ThumbsDown className="h-4 w-4 text-negative shrink-0" aria-hidden="true" />
                      <span>No, employers do not need this skill</span>
                    </button>
                  </div>
                </div>

                {/* Collapsible Note Field (Optional, max 500 characters, live counter) */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowNote((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded py-0.5"
                    aria-expanded={showNote}
                  >
                    {showNote ? (
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>Add a note (optional)</span>
                  </button>

                  {showNote && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="validation-note"
                          className="block text-xs font-semibold text-foreground"
                        >
                          Reviewer Note
                        </label>
                        <span
                          className={`text-[11px] font-mono tabular-nums ${
                            note.length > 480
                              ? "text-negative font-bold"
                              : "text-muted-foreground"
                          }`}
                        >
                          {note.length} / 500 characters
                        </span>
                      </div>
                      <textarea
                        id="validation-note"
                        name="validationNote"
                        value={note}
                        maxLength={500}
                        rows={3}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Provide optional qualitative context from hiring managers or recruiters..."
                        className="w-full rounded-md border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                      />
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={
                      !selectedRoleId ||
                      selectedSkillId == null ||
                      !status ||
                      isSubmitting
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-resting hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting validation...</span>
                      </>
                    ) : (
                      <span>Submit Validation</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Live Signals Panel (5 cols, open editorial layout) */}
        <div className="lg:col-span-5 space-y-6">
          <SectionHeader
            title="Live Validation Signals"
            subtitle="Live employer consensus and vote-based confidence for the selected pair."
            className="pt-0 border-t-0 pb-3 border-b border-border"
          />

          {!selectedRoleId || selectedSkillId == null ? (
            <EmptyState
              title="Select role and skill"
              description="Pick a target role and skill in the form to inspect current employer feedback counts and calculated confidence."
            />
          ) : countsLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
              <Skeleton className="h-16 w-full" />
            </div>
          ) : countsError ? (
            <ErrorState
              message={countsError}
              onRetry={() => loadCounts(selectedRoleId, selectedSkillId)}
            />
          ) : counts ? (
            <div className="space-y-5">
              {/* Pair Context */}
              <div className="rounded-md border border-border/80 bg-muted/20 p-3 text-xs space-y-0.5">
                <div className="text-muted-foreground text-[11px]">Selected pair:</div>
                <div className="font-semibold text-foreground">
                  {selectedRole?.name} &bull; {selectedSkill?.name}
                </div>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg border border-positive/30 bg-positive-subtle/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-positive-foreground">
                    <ThumbsUp className="h-3.5 w-3.5 text-positive" aria-hidden="true" />
                    <span>Confirmed</span>
                  </div>
                  <div className="font-serif text-2xl font-bold font-mono tabular-nums text-foreground">
                    {counts.confirmedCount}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Affirming reviews
                  </span>
                </div>

                <div className="p-3.5 rounded-lg border border-negative/30 bg-negative-subtle/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-negative-foreground">
                    <ThumbsDown className="h-3.5 w-3.5 text-negative" aria-hidden="true" />
                    <span>Disputed</span>
                  </div>
                  <div className="font-serif text-2xl font-bold font-mono tabular-nums text-foreground">
                    {counts.disputedCount}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Contesting reviews
                  </span>
                </div>
              </div>

              {/* Confidence Card */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Percent className="h-4 w-4 text-primary" />
                    <span>Statistical Confidence</span>
                  </div>
                  <div className="font-serif text-xl font-bold font-mono tabular-nums text-foreground">
                    {(counts.confidence * 100).toFixed(1)}%
                  </div>
                </div>

                <ProgressBar value={Math.round(counts.confidence * 100)} />

                <div className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
                  Calculated score:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {counts.confidence.toFixed(3)}
                  </span>{" "}
                  from {counts.confirmedCount + counts.disputedCount} total evaluations.
                </div>
              </div>

              {/* Formula Transparency Box */}
              <div className="rounded-md border border-border/70 bg-muted/30 p-3.5 space-y-1.5 text-xs">
                <div className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                  Confidence Formula
                </div>
                <div className="font-mono text-xs text-foreground bg-background p-2 rounded border border-border">
                  confidence = (confirmed + 1) / (confirmed + disputed + 2)
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                  Starts at 50.0% confidence when there are 0 votes, and updates gradually as employers confirm or dispute.
                </p>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No data"
              description="No validation signals available."
            />
          )}

          {/* Demonstration Notice */}
          <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <span>Demonstration notes</span>
            </div>
            <p className="leading-relaxed">
              Demo only, no accounts. Submissions are stored in the database and capped at 2000.
            </p>
            <p className="leading-relaxed border-t border-border/40 pt-1.5">
              Validation changes the reported confidence, not the underlying demand counts.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
