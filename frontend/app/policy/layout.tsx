"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Compass,
  LayoutDashboard,
  TrendingUp,
  GitCompare,
  BarChart3,
  MapPin,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react"
import { useAuthGuard } from "@/lib/auth"

const navItems = [
  { name: "Overview", href: "/policy", icon: LayoutDashboard },
  { name: "Skill Demand", href: "/policy/skill-demand", icon: TrendingUp },
  { name: "Workforce Skill Gaps", href: "/policy/workforce-skill-gaps", icon: GitCompare },
  { name: "Job Market Trends", href: "/policy/job-market-trends", icon: BarChart3 },
  { name: "Geographic Insights", href: "/policy/geographic-insights", icon: MapPin },
]

export default function PolicyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { authorized, userName, logout } = useAuthGuard("policymaker")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Authenticating...
      </div>
    )
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Mobile drawer portaled into document.body */}
      {mobileMenuOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-160"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Mobile panel */}
            <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col h-[100dvh] shadow-raised animate-drawer-in">
              <div className="p-5 border-b border-slate-800 shrink-0">
                <div className="flex items-center justify-between">
                  <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileMenuOpen(false)}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-resting">
                      <Compass className="h-5 w-5" />
                    </span>
                    <span className="text-lg font-bold tracking-tight text-white">SkillPath</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded p-1 text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Close sidebar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-3">
                  <span className="inline-block rounded border border-slate-800 bg-slate-900/90 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                    Policy intelligence - Demo data
                  </span>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    item.href === "/policy"
                      ? pathname === "/policy"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-resting"
                          : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </nav>

              <div className="mt-auto shrink-0 p-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors duration-120 active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Log out</span>
                </button>
              </div>
            </aside>
          </div>,
          document.body
        )}

      {/* Desktop Left Sidebar (never scrolls with page, logout pinned at bottom) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:shrink-0 bg-slate-950 text-slate-200 border-r border-slate-800 h-full overflow-hidden">
        {/* Logo & Workspace label */}
        <div className="p-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-resting transition-transform group-hover:scale-105">
                <Compass className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold tracking-tight text-white">SkillPath</span>
            </Link>
          </div>
          <div className="mt-3">
            <span className="inline-block rounded border border-slate-800 bg-slate-900/90 px-2 py-0.5 text-[11px] font-medium text-slate-400">
              Policy intelligence - Demo data
            </span>
          </div>
        </div>

        {/* Navigation - only this part scrolls if window is very short */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === "/policy"
                ? pathname === "/policy"
                : pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-resting"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer / Log out pinned at the bottom */}
        <div className="mt-auto shrink-0 p-3 border-t border-slate-800">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors duration-120 active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top bar with user name - stays visible */}
        <header className="h-14 shrink-0 border-b border-border bg-background/90 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Workforce Intelligence Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 shadow-resting text-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-3 w-3" aria-hidden="true" />
              </span>
              <span className="font-medium text-foreground">{userName}</span>
            </div>
          </div>
        </header>

        {/* Page children - the ONLY scrolling container */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  )
}
