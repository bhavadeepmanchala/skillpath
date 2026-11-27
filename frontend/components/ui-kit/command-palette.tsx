"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback, useId } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import {
  Search,
  X,
  ArrowRight,
  Compass,
  MapPin,
  BookOpen,
  Briefcase,
  Sparkles,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import {
  fetchSkills,
  fetchDistricts,
  fetchCourses,
  fetchRoles,
} from "@/lib/demand-api"
import {
  POLICY_PAGE_ENTRIES,
  searchPaletteEntries,
  type PaletteEntry,
  type PaletteGroup,
} from "@/lib/palette-search"
import { usePrefersReducedMotion } from "./motion-hooks"

export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

function getGroupIcon(group: PaletteGroup) {
  switch (group) {
    case "Pages":
      return <Compass className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
    case "Districts":
      return <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
    case "Courses":
      return <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
    case "Roles":
      return <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
    case "Skills":
      return <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
  }
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const reducedMotion = usePrefersReducedMotion()
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState("")
  const [entries, setEntries] = useState<PaletteEntry[]>(POLICY_PAGE_ENTRIES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const searchInputId = useId()

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadCatalogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [skills, districtRes, courses, roles] = await Promise.all([
        fetchSkills(),
        fetchDistricts(),
        fetchCourses(),
        fetchRoles(),
      ])

      const dynamicEntries: PaletteEntry[] = [
        ...POLICY_PAGE_ENTRIES,
        ...districtRes.districts.map((d) => ({
          id: `district-${d.districtId}`,
          group: "Districts" as const,
          title: d.name,
          subtitle: `${d.state} · District Plan & Regional Demand`,
          keywords: [d.state, "district", "plan"],
          href: `/policy/district-plan?district=${d.districtId}`,
        })),
        ...courses.map((c) => ({
          id: `course-${c.id}`,
          group: "Courses" as const,
          title: c.name,
          subtitle: `${c.sector} · Course Recommendations`,
          keywords: [c.sector, "course", "recommendations"],
          href: `/policy/course-recommendations?course=${c.id}`,
        })),
        ...roles.map((r) => ({
          id: `role-${r.id}`,
          group: "Roles" as const,
          title: r.name,
          subtitle: `${r.sector} · Skill Demand`,
          keywords: [r.sector, "role", "occupation"],
          href: `/policy/skill-demand?role=${r.id}`,
        })),
        ...skills.map((s) => ({
          id: `skill-${s.id}`,
          group: "Skills" as const,
          title: s.name,
          subtitle: `${s.category}${s.aliases?.length ? ` · ${s.aliases.join(", ")}` : ""}`,
          keywords: [s.category, ...(s.aliases || []), "skill"],
          href: `/policy/skill-demand?skill=${encodeURIComponent(s.name)}`,
        })),
      ]

      setEntries(dynamicEntries)
      setLoadedOnce(true)
    } catch {
      setError("Could not load skills, districts, courses, and roles. Is the backend running?")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && !loadedOnce && !loading) {
      loadCatalogs()
    }
  }, [isOpen, loadedOnce, loading, loadCatalogs])

  // Focus management & body lock
  useEffect(() => {
    if (isOpen) {
      if (document.activeElement instanceof HTMLElement) {
        triggerRef.current = document.activeElement
      }
      setQuery("")
      setActiveIndex(0)
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 40)
      return () => {
        clearTimeout(timer)
        document.body.style.overflow = originalOverflow
      }
    } else if (
      triggerRef.current &&
      typeof triggerRef.current.focus === "function"
    ) {
      const el = triggerRef.current
      triggerRef.current = null
      el.focus()
    }
  }, [isOpen])

  const { groups } = useMemo(
    () => searchPaletteEntries(query, entries, 6),
    [query, entries]
  )

  const flatItems = useMemo(
    () => groups.flatMap((g) => g.items),
    [groups]
  )

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const handleSelect = useCallback(
    (item: PaletteEntry) => {
      onClose()
      router.push(item.href)
    },
    [onClose, router]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (flatItems.length > 0) {
        setActiveIndex((prev) => (prev + 1) % flatItems.length)
      }
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (flatItems.length > 0) {
        setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length)
      }
      return
    }
    if (e.key === "Enter" && flatItems[activeIndex]) {
      e.preventDefault()
      handleSelect(flatItems[activeIndex])
      return
    }
    // Simple focus trap inside dialog
    if (e.key === "Tab" && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'input, button, [href], [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Search policymaker pages, skills, districts, courses, and roles"
          onKeyDown={handleKeyDown}
        >
          {/* Backdrop */}
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.14 }}
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            ref={dialogRef}
            initial={reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: reducedMotion ? 0 : 0.15 }}
            className="relative z-[90] w-full max-w-xl rounded-lg border border-border bg-card shadow-raised overflow-hidden"
          >
            {/* Search input header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-inset">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                id={searchInputId}
                name="commandPaletteSearch"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages, skills, districts, courses, roles..."
                aria-label="Search command palette"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {loading && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" aria-hidden="true" />
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close search"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results / 4 states */}
            <div className="max-h-[60vh] overflow-y-auto p-2 overscroll-contain">
              {loading && !loadedOnce ? (
                <div className="py-10 text-center text-xs text-muted-foreground space-y-2">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" aria-hidden="true" />
                  <p>Loading skills, districts, courses, and roles...</p>
                </div>
              ) : error && !loadedOnce ? (
                <div className="p-6 text-center space-y-3 text-xs">
                  <AlertTriangle className="h-5 w-5 text-attention mx-auto" aria-hidden="true" />
                  <p className="text-foreground font-medium">{error}</p>
                  <button
                    type="button"
                    onClick={loadCatalogs}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 font-medium text-foreground hover:bg-muted"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              ) : flatItems.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No matches found for &quot;{query}&quot;. Try a page, district, course, or skill name.
                </div>
              ) : (
                <div className="space-y-3 py-1" role="listbox" aria-label="Search results">
                  {groups.map((grp) => (
                    <div key={grp.group} className="space-y-1">
                      <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {grp.group}
                      </div>
                      {grp.items.map((item) => {
                        const idx = flatItems.findIndex((f) => f.id === item.id)
                        const isSelected = idx === activeIndex
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => handleSelect(item)}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-left text-xs transition-colors ${
                              isSelected
                                ? "bg-primary/10 text-foreground"
                                : "hover:bg-muted/50 text-foreground"
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="mt-0.5">{getGroupIcon(item.group)}</span>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground break-words">
                                  {item.title}
                                </div>
                                {item.subtitle && (
                                  <div className="text-[11px] text-muted-foreground break-words">
                                    {item.subtitle}
                                  </div>
                                )}
                              </div>
                            </div>
                            <ArrowRight
                              className={`h-3.5 w-3.5 shrink-0 transition-opacity ${
                                isSelected ? "opacity-100 text-primary" : "opacity-0"
                              }`}
                              aria-hidden="true"
                            />
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hints */}
            <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Use &uarr; &darr; to navigate, Enter to open</span>
              <span>Esc to close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
