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
  ShieldAlert,
  Percent,
} from "lucide-react"
import {
  fetchRoles,
  fetchSkills,
  fetchValidations,
  createValidation,
  ValidationApiError,
  type RoleItem,
  type SkillItem,
  type ValidationSummaryItem,
} from "@/lib/demand-api"
import {
  PageHeader,
  SectionCard,
  SelectField,
  KpiCard,
  KpiCardSkeleton,
  Skeleton,
  ErrorState,
  EmptyState,
  DataBadge,
  ProgressBar,
} from "@/components/ui-kit"

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
  const [skillSearchQuery, setSkillSearchQuery] = useState("")
  const [status, setStatus] = useState<"CONFIRMED" | "DISPUTED" | "">("")
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

  // ---------------------------------------------------------------------------
  // 1. Initial Load: Roles and Skills
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // 2. Fetch Validation Counts & Confidence when (Role, Skill) are picked
  // ---------------------------------------------------------------------------
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
          // If no submissions exist yet for this role+skill, baseline confidence is 0.5
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

  // ---------------------------------------------------------------------------
  // Skills Filtering & Grouping
  // ---------------------------------------------------------------------------
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
      { label: "Select a role...", value: "" },
      ...roles.map((r) => ({ label: `${r.name} (${r.sector})`, value: String(r.id) })),
    ]
  }, [roles])

  // ---------------------------------------------------------------------------
  // 3. Form Submission
  // ---------------------------------------------------------------------------
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

      // On 201/200 success: show confirmation, clear form inputs
      const skillName = selectedSkill?.name || `Skill #${selectedSkillId}`
      setSubmitSuccess(
        `Successfully submitted ${response.status.toLowerCase()} validation for "${skillName}". Reported confidence is now ${(response.confidence * 100).toFixed(1)}%.`
      )
      setStatus("")
      setNote("")
      setSelectedSkillId(null)
      setSkillSearchQuery("")

      // Refresh counts for that role and skill
      await loadCounts(selectedRoleId, selectedSkillId)
    } catch (err) {
      if (err instanceof ValidationApiError) {
        if (err.status === 429) {
          setSubmitError({
            message:
              "The demo has reached its validation limit. Try again after the next restart.",
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

  return (
    <div className="space-y-6 p-6 animate-page-enter">
      {/* Page Header */}
      <PageHeader
        title="Employer Validation"
        description="Verify or dispute whether demanded skills truly reflect hiring requirements for specific roles. Validations adjust model confidence via Bayesian smoothing."
        badge={<DataBadge label="Synthetic data" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Section */}
        <div className="lg:col-span-7 space-y-6">
          <SectionCard
            title="Submit employer feedback"
            subtitle="Provide ground-truth validation on whether a skill is required for an employment role."
          >
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
                  <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <div className="flex-1 leading-relaxed">{submitSuccess}</div>
                    <button
                      type="button"
                      onClick={() => setSubmitSuccess(null)}
                      className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 transition-colors"
                      aria-label="Dismiss alert"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Error Banner with Retry if network */}
                {submitError && (
                  <div className="flex flex-col gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-300">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                      <div className="flex-1 leading-relaxed font-medium">
                        {submitError.message}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSubmitError(null)}
                        className="text-rose-700 hover:text-rose-900 dark:text-rose-300 transition-colors"
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
                          className="inline-flex items-center gap-1.5 rounded bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-resting hover:bg-rose-700 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Retry Submission</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Role Field */}
                <div>
                  <SelectField
                    id="role-select"
                    label="Role (Required)"
                    value={selectedRoleId}
                    onChange={(val) => {
                      setSelectedRoleId(val)
                      setSubmitSuccess(null)
                      setSubmitError(null)
                    }}
                    options={roleOptions}
                  />
                </div>

                {/* Skill Field (Searchable category grouping) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="skill-search-input"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Skill (Required)
                  </label>

                  {selectedSkill ? (
                    <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/20">
                      <div className="flex items-center gap-2">
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
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Change</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <input
                          id="skill-search-input"
                          type="text"
                          value={skillSearchQuery}
                          onChange={(e) => setSkillSearchQuery(e.target.value)}
                          placeholder="Search skills by name or alias (e.g. Docker, Python, SQL)..."
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

                      <div className="max-h-52 overflow-y-auto rounded-md border border-border/80 bg-background divide-y divide-border/40 p-1">
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
                                      className="flex items-center justify-between text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors text-foreground"
                                    >
                                      <span className="truncate">{s.name}</span>
                                      {s.aliases && s.aliases.length > 0 && (
                                        <span className="text-[10px] text-muted-foreground ml-1 shrink-0">
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

                {/* Status Selection (Confirm / Dispute) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground">
                    Validation Status (Required)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setStatus("CONFIRMED")}
                      className={`flex items-center justify-center gap-2 rounded-md border p-3 text-xs font-semibold transition-all duration-120 ${
                        status === "CONFIRMED"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/30"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span>Confirm (Skill Needed)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatus("DISPUTED")}
                      className={`flex items-center justify-center gap-2 rounded-md border p-3 text-xs font-semibold transition-all duration-120 ${
                        status === "DISPUTED"
                          ? "border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-300 ring-2 ring-rose-500/30"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <ThumbsDown className="h-4 w-4" />
                      <span>Dispute (Skill Not Needed)</span>
                    </button>
                  </div>
                </div>

                {/* Note Field (Optional, max 500 characters, live counter) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="validation-note"
                      className="block text-xs font-semibold text-foreground"
                    >
                      Employer Review Note (Optional)
                    </label>
                    <span
                      className={`text-[11px] font-mono tabular-nums ${
                        note.length > 480
                          ? "text-rose-600 dark:text-rose-400 font-bold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {note.length} / 500 characters
                    </span>
                  </div>
                  <textarea
                    id="validation-note"
                    value={note}
                    maxLength={500}
                    rows={3}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Provide optional qualitative context from hiring managers or recruiters..."
                    className="w-full rounded-md border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  />
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
          </SectionCard>
        </div>

        {/* Right Column: Validation Counts & Confidence Panel */}
        <div className="lg:col-span-5 space-y-6">
          <SectionCard
            title="Validation signals"
            subtitle="Current community submissions and resulting statistical confidence for the selected pair."
          >
            {!selectedRoleId || selectedSkillId == null ? (
              <EmptyState
                title="Select role and skill"
                description="Pick a target role and skill in the form to inspect current employer feedback counts and calculated confidence."
              />
            ) : countsLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <KpiCardSkeleton />
                  <KpiCardSkeleton />
                </div>
                <Skeleton className="h-14 w-full" />
              </div>
            ) : countsError ? (
              <ErrorState
                message={countsError}
                onRetry={() => loadCounts(selectedRoleId, selectedSkillId)}
              />
            ) : counts ? (
              <div className="space-y-4">
                {/* Pair Context */}
                <div className="rounded-md border border-border/80 bg-muted/20 p-3 text-xs space-y-0.5">
                  <div className="text-muted-foreground text-[11px]">Selected pair:</div>
                  <div className="font-semibold text-foreground">
                    {selectedRole?.name} &bull; {selectedSkill?.name}
                  </div>
                </div>

                {/* Counts KPI Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <KpiCard
                    label="Confirmed"
                    rawValue={counts.confirmedCount}
                    icon={ThumbsUp}
                    footnote="Confirming employer submissions"
                    className="border-emerald-200/80 bg-emerald-50/20 dark:border-emerald-950 dark:bg-emerald-950/10"
                  />
                  <KpiCard
                    label="Disputed"
                    rawValue={counts.disputedCount}
                    icon={ThumbsDown}
                    footnote="Disputing employer submissions"
                    className="border-rose-200/80 bg-rose-50/20 dark:border-rose-950 dark:bg-rose-950/10"
                  />
                </div>

                {/* Confidence Card */}
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Percent className="h-4 w-4 text-primary" />
                      <span>Signal Confidence</span>
                    </div>
                    <div className="text-lg font-bold font-mono tabular-nums text-foreground">
                      {(counts.confidence * 100).toFixed(1)}%
                    </div>
                  </div>

                  <ProgressBar value={Math.round(counts.confidence * 100)} />

                  <div className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
                    Calculated confidence:{" "}
                    <span className="font-mono font-medium text-foreground">
                      {counts.confidence.toFixed(3)}
                    </span>{" "}
                    from {counts.confirmedCount + counts.disputedCount} total
                    evaluations.
                  </div>
                </div>

                {/* Formula Box */}
                <div className="rounded-md border border-border/70 bg-muted/30 p-3 space-y-1 text-xs">
                  <div className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
                    Bayesian Smoothing Formula
                  </div>
                  <div className="font-mono text-xs text-foreground bg-background/80 p-2 rounded border border-border">
                    confidence = (confirmed + 1) / (confirmed + disputed + 2)
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                    Prior distribution assumes a balanced 50.0% confidence at 0
                    submissions, updating gradually with empirical feedback.
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No data"
                description="No validation signals available."
              />
            )}
          </SectionCard>

          {/* Visible Transparency Notes */}
          <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <span>Demonstration notes</span>
            </div>
            <p className="leading-relaxed">
              Synthetic data. Anyone can submit here (demo, no accounts).
              Validations are stored in memory and are lost on restart. The
              limit is 2000 submissions.
            </p>
            <p className="leading-relaxed border-t border-border/40 pt-1.5">
              Validation changes the reported confidence, not the underlying
              demand counts.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
