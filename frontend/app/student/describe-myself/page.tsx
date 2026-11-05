"use client"

import React, { useEffect, useState, useMemo, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, Search, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  PageHeader,
  SectionCard,
  SelectField,
  Skeleton,
  ErrorState,
  EmptyState,
} from "@/components/ui-kit"
import {
  fetchRoles,
  fetchSkills,
  RoleItem,
  SkillItem,
} from "@/lib/demand-api"

export default function DescribeMyselfPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Data states
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [selectedRoleId, setSelectedRoleId] = useState<string>("")
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rolesData, skillsData] = await Promise.all([
        fetchRoles(),
        fetchSkills(),
      ])
      const sortedRoles = [...rolesData].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
      const sortedSkills = [...skillsData].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
      setRoles(sortedRoles)
      setSkills(sortedSkills)
    } catch {
      setError("Could not load roles and skills from backend. Is the server running?")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    const map = new Map<string, SkillItem[]>()
    for (const skill of skills) {
      const cat = skill.category || "General"
      if (!map.has(cat)) {
        map.set(cat, [])
      }
      map.get(cat)!.push(skill)
    }
    // Sort categories alphabetically
    const sortedMap = new Map<string, SkillItem[]>()
    Array.from(map.keys())
      .sort((a, b) => a.localeCompare(b))
      .forEach((cat) => {
        sortedMap.set(cat, map.get(cat)!)
      })
    return sortedMap
  }, [skills])

  // Filter skills by search query (matching name or aliases case-insensitively)
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return skillsByCategory

    const result = new Map<string, SkillItem[]>()
    for (const [category, catSkills] of skillsByCategory.entries()) {
      const matchingSkills = catSkills.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.aliases?.some((a) => a.toLowerCase().includes(q))
      )
      if (matchingSkills.length > 0) {
        result.set(category, matchingSkills)
      }
    }
    return result
  }, [skillsByCategory, searchQuery])

  // Map of skills for quick lookup by ID
  const skillById = useMemo(() => {
    const map = new Map<number, SkillItem>()
    for (const s of skills) {
      map.set(s.id, s)
    }
    return map
  }, [skills])

  const toggleSkill = useCallback((id: number) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }, [])

  const removeSkill = useCallback((id: number) => {
    setSelectedSkillIds((prev) => prev.filter((item) => item !== id))
  }, [])

  const clearSkills = useCallback(() => {
    setSelectedSkillIds([])
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoleId || isPending) return

    const params = new URLSearchParams()
    params.set("role", selectedRoleId)
    params.set("skills", selectedSkillIds.join(","))

    startTransition(() => {
      router.push(`/student/skill-analysis?${params.toString()}`)
    })
  }

  const roleOptions = useMemo(() => {
    return [
      { label: "Choose a role", value: "" },
      ...roles.map((r) => ({ label: r.name, value: String(r.id) })),
    ]
  }, [roles])

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <PageHeader
        title="Describe Myself"
        description="Select your target career role and the skills you already possess to evaluate your readiness against real market demand."
        showSyntheticBadge={true}
      />

      {loading ? (
        <SectionCard title="Target Role & Current Skills">
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full max-w-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
              <div className="flex flex-wrap gap-2 pt-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-24 rounded-md" />
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      ) : error ? (
        <SectionCard title="Target Role & Current Skills">
          <ErrorState message={error} onRetry={loadData} />
        </SectionCard>
      ) : roles.length === 0 || skills.length === 0 ? (
        <SectionCard title="Target Role & Current Skills">
          <EmptyState
            title="No catalog data found"
            description="Could not find roles or skills in the database."
          />
        </SectionCard>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target Role Section */}
          <SectionCard
            title="1. Target Role"
            subtitle="Choose the role you aspire to work towards (required)."
          >
            <div className="max-w-md">
              <SelectField
                id="target-role"
                label="Target role"
                value={selectedRoleId ?? ""}
                onChange={(v) => setSelectedRoleId(v)}
                options={roleOptions}
                className="w-full"
              />
            </div>
          </SectionCard>

          {/* Skills You Already Have Section */}
          <SectionCard
            title="2. Skills you already have"
            subtitle="Search and select all skills you currently possess. Zero skills is allowed."
            actionSlot={
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {selectedSkillIds.length} selected
                </span>
                {selectedSkillIds.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSkills}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
            }
          >
            <div className="space-y-4">
              {/* Selected skills chips */}
              {selectedSkillIds.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border border-border/60 bg-muted/20 min-h-12 items-center">
                  {selectedSkillIds.map((id) => {
                    const item = skillById.get(id)
                    const label = item ? item.name : `Skill #${id}`
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-md bg-teal-500/10 px-2.5 py-1 text-xs font-medium text-teal-700 dark:text-teal-400 border border-teal-500/20"
                      >
                        {label}
                        <button
                          type="button"
                          onClick={() => removeSkill(id)}
                          className="flex h-3.5 w-3.5 items-center justify-center rounded-sm hover:bg-teal-500/20 hover:text-teal-900 transition-colors"
                          aria-label={`Remove ${label}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-dashed border-border/60 bg-muted/10 text-xs text-muted-foreground text-center">
                  No skills selected yet. Select from the categories below or proceed with 0 skills.
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search skills by name or alias (e.g. Python, K8s, AWS, React)..."
                  className="w-full rounded-md border border-border bg-background pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Grouped Skills List */}
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                {Array.from(filteredCategories.entries()).length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No skills matched &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : (
                  Array.from(filteredCategories.entries()).map(
                    ([category, catSkills]) => (
                      <div key={category} className="space-y-1.5">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {category}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {catSkills.map((s) => {
                            const isSelected = selectedSkillIds.includes(s.id)
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => toggleSkill(s.id)}
                                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors border ${
                                  isSelected
                                    ? "bg-teal-600 text-white border-teal-600 font-medium"
                                    : "bg-card text-foreground border-border hover:bg-muted/60"
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3 shrink-0" />}
                                <span>{s.name}</span>
                                {s.aliases && s.aliases.length > 0 && (
                                  <span
                                    className={`text-[10px] ${
                                      isSelected ? "text-teal-100" : "text-muted-foreground"
                                    }`}
                                  >
                                    ({s.aliases.join(", ")})
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </div>
          </SectionCard>

          {/* Submit Action */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {!selectedRoleId ? "Please select a target role to proceed." : ""}
            </p>
            <Button
              type="submit"
              size="lg"
              disabled={!selectedRoleId || isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                  Analyzing…
                </>
              ) : (
                <>
                  Analyze my skills
                  <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
