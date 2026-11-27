"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, MotionConfig } from "motion/react"
import {
  Compass,
  LogOut,
  Menu,
  X,
  Search,
} from "lucide-react"
import { useAuthGuard } from "@/lib/auth"
import { ReadinessProvider } from "@/components/readiness-provider"
import { CommandPalette } from "@/components/ui-kit"

const navItems = [
  { name: "Overview", href: "/policy" },
  { name: "Skill Demand", href: "/policy/skill-demand" },
  { name: "Skill Gaps", href: "/policy/workforce-skill-gaps" },
  { name: "Course Recommendations", href: "/policy/course-recommendations" },
  { name: "District Plan", href: "/policy/district-plan" },
  { name: "Employer Validation", href: "/policy/employer-validation" },
  { name: "Job Market Trends", href: "/policy/job-market-trends" },
  { name: "Geographic Insights", href: "/policy/geographic-insights" },
]

export default function PolicyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { authorized, userName, logout } = useAuthGuard("policymaker")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Global Ctrl+K / Cmd+K shortcut for Command Palette
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [])

  // Mobile menu sheet scroll lock & Escape
  useEffect(() => {
    if (!mobileMenuOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [mobileMenuOpen])

  if (!authorized) {
    return (
      <div
        data-mood="policy"
        className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-sm"
      >
        Authenticating...
      </div>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-mood="policy"
        className="min-h-dvh flex flex-col bg-background text-foreground"
      >
        {/* Mobile labelled menu sheet (< 768px) portaled to document.body */}
        {mobileMenuOpen &&
          mounted &&
          createPortal(
            <div
              data-mood="policy"
              className="fixed inset-0 z-[70] md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Policymaker Navigation Menu"
            >
              <div
                className="fixed inset-0 bg-slate-950/45"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />

              <div className="fixed inset-x-0 top-0 z-[80] max-h-[85dvh] overflow-y-auto bg-background border-b border-border shadow-raised p-4 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="font-serif text-base font-bold text-foreground">
                      Policymaker Sections
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close menu"
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <nav className="grid grid-cols-1 gap-1" aria-label="Mobile Policymaker Navigation">
                  {navItems.map((item) => {
                    const isActive =
                      item.href === "/policy"
                        ? pathname === "/policy"
                        : pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted/60"
                        }`}
                      >
                        {item.name}
                      </Link>
                    )
                  })}
                </nav>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground">Policymaker</span>
                    <span className="text-border">|</span>
                    <Link
                      href="/student"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-muted-foreground hover:text-primary font-medium"
                    >
                      Student view
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      logout()
                    }}
                    className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* Command Palette (Ctrl+K) */}
        <CommandPalette
          isOpen={paletteOpen}
          onClose={() => setPaletteOpen(false)}
        />

        {/* Editorial Masthead Shell (light paper, sticky section tabs, no dark chrome) */}
        <header className="sticky top-0 z-30 bg-background border-b border-border">
          {/* Row 1: Brand, Command Palette Trigger, Audience Switch, Log out */}
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
            {/* Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/"
                className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Compass className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="font-serif text-lg font-bold tracking-tight text-foreground">
                  SkillPath
                </span>
              </Link>
              <span className="hidden sm:inline-block text-[11px] text-muted-foreground border-l border-border pl-3">
                Policy edition &middot; Synthetic data
              </span>
            </div>

            {/* Global Search / Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex-1 max-w-md flex items-center justify-between gap-2 px-3 py-1.5 rounded-md border border-border bg-surface text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Search skills, districts, courses (Ctrl K)"
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Search skills, districts, courses</span>
                <span className="sm:hidden">Search...</span>
              </span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shrink-0">
                Ctrl K
              </kbd>
            </button>

            {/* Right controls: Audience Switch + User + Log out */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Audience Switch */}
              <div
                className="hidden md:flex items-center gap-1 text-xs border-r border-border pr-3"
                aria-label="Audience switch"
              >
                <span className="font-semibold text-foreground px-2 py-1 border-b-2 border-primary">
                  Policymaker
                </span>
                <Link
                  href="/student"
                  className="text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
                >
                  Student
                </Link>
              </div>

              <span className="hidden lg:inline text-xs text-muted-foreground">
                {userName}
              </span>

              <button
                type="button"
                onClick={logout}
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Log out</span>
              </button>

              {/* Mobile menu trigger (< 768px) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Open navigation menu"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
                <span>Menu</span>
              </button>
            </div>
          </div>

          {/* Row 2: Section Tabs with Sliding Underline Indicator (Desktop >= 768px) */}
          <div className="hidden md:block border-t border-border/60 bg-background">
            <nav
              className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-5 overflow-x-auto"
              aria-label="Policymaker Navigation"
            >
              {navItems.map((item) => {
                const isActive =
                  item.href === "/policy"
                    ? pathname === "/policy"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative py-2.5 text-xs whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs ${
                      isActive
                        ? "font-semibold text-primary"
                        : "font-medium text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{item.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="policy-masthead-underline"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                        className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
                      />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        </header>

        {/* Main Content: Centred Editorial Container */}
        <ReadinessProvider>
          <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
            {children}
          </main>
        </ReadinessProvider>
      </div>
    </MotionConfig>
  )
}
