"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Compass, Menu, X, ExternalLink } from "lucide-react"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sessionHref, setSessionHref] = useState<string | null>(null)

  useEffect(() => {
    try {
      const role = localStorage.getItem("user_role")
      if (role === "policymaker") {
        setSessionHref("/policy")
      } else if (role === "student") {
        setSessionHref("/student")
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mobileOpen])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">SkillPath</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
          <Link
            href="/#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1"
          >
            How it works
          </Link>
          <Link
            href="/#students"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1"
          >
            Students
          </Link>
          <Link
            href="/#planners"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1"
          >
            Planners
          </Link>
          <a
            href="https://github.com/bhavadeepmanchala/skillpath"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1"
          >
            <span>GitHub</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <Link
            href={sessionHref || "/login"}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-resting transition-colors duration-120 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:translate-y-[1px]"
          >
            {sessionHref ? "Open dashboard" : "Sign in"}
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          className="md:hidden rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors duration-120"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <nav
          className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3"
          aria-label="Mobile Navigation"
        >
          <Link
            href="/#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-muted-foreground hover:text-foreground py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2"
          >
            How it works
          </Link>
          <Link
            href="/#students"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-muted-foreground hover:text-foreground py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2"
          >
            Students
          </Link>
          <Link
            href="/#planners"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-muted-foreground hover:text-foreground py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2"
          >
            Planners
          </Link>
          <a
            href="https://github.com/bhavadeepmanchala/skillpath"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2"
          >
            <span>GitHub</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <div className="pt-2 border-t border-border">
            <Link
              href={sessionHref || "/login"}
              onClick={() => setMobileOpen(false)}
              className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-resting hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors duration-120 active:translate-y-[1px]"
            >
              {sessionHref ? "Open dashboard" : "Sign in"}
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
