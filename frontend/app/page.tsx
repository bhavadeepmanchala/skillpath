"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowRight, ExternalLink } from "lucide-react"
import { Navbar } from "@/components/navbar"
import {
  fetchDemandSummary,
  fetchDemandTrends,
  type DemandSummary,
  type DemandTrendsResponse,
} from "@/lib/demand-api"
import { useCountUp } from "@/components/ui-kit/motion-hooks"
import { Skeleton } from "@/components/ui-kit/skeleton"

function CountUpItem({
  label,
  value,
  loading,
  enabled,
}: {
  label: string
  value: number | null
  loading: boolean
  enabled: boolean
}) {
  const count = useCountUp(value ?? 0, 500, enabled)

  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-resting">
      <div className="text-xs font-normal leading-4 text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground tabular-nums leading-7">
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : value !== null ? (
          count.toLocaleString()
        ) : (
          "—"
        )}
      </div>
    </div>
  )
}

export default function HomePage() {
  const [summary, setSummary] = useState<DemandSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState(false)

  const [trends, setTrends] = useState<DemandTrendsResponse | null>(null)
  const [trendsLoading, setTrendsLoading] = useState(true)
  const [trendsError, setTrendsError] = useState(false)

  const figuresRef = useRef<HTMLDivElement | null>(null)
  const [figuresInView, setFiguresInView] = useState(false)

  useEffect(() => {
    let active = true

    fetchDemandSummary()
      .then((data) => {
        if (active) {
          setSummary(data)
          setSummaryLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setSummaryError(true)
          setSummaryLoading(false)
        }
      })

    fetchDemandTrends({ limit: 3 })
      .then((data) => {
        if (active) {
          setTrends(data)
          setTrendsLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setTrendsError(true)
          setTrendsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!figuresRef.current || figuresInView) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFiguresInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(figuresRef.current)
    return () => observer.disconnect()
  }, [figuresInView])

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-border py-16 sm:py-24 animate-page-enter">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3.5 py-1 text-xs font-medium text-muted-foreground">
              Synthetic data demo
            </div>

            <h1 className="mt-6 text-3xl sm:text-5xl font-bold tracking-tight text-foreground text-balance leading-tight max-w-[70ch] mx-auto">
              See which skills employers ask for, and where training falls short.
            </h1>

            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-[70ch] mx-auto text-balance leading-relaxed">
              SkillPath compares the skills demanded in job postings against what vocational and university courses teach using explainable alignment scoring on synthetic Indian workforce data.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login?role=student"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-resting transition-colors duration-120 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-[1px]"
              >
                I am a Student / Job Seeker <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/login?role=policymaker"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-resting transition-colors duration-120 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-[1px]"
              >
                I am a Policymaker / Planner
              </Link>
            </div>
          </div>
        </section>

        {/* Live figures strip */}
        <section className="border-b border-border py-10 bg-muted/10">
          <div ref={figuresRef} className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Synthetic dataset
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Deterministic backend seed
              </span>
            </div>

            {summaryError ? (
              <p className="text-xs text-muted-foreground py-4">
                Live figures unavailable. Start the backend to see them.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <CountUpItem
                  label="Total postings"
                  value={summary?.totalPostings ?? null}
                  loading={summaryLoading}
                  enabled={figuresInView}
                />
                <CountUpItem
                  label="Skills tracked"
                  value={summary?.totalSkills ?? null}
                  loading={summaryLoading}
                  enabled={figuresInView}
                />
                <CountUpItem
                  label="Target roles"
                  value={summary?.totalRoles ?? null}
                  loading={summaryLoading}
                  enabled={figuresInView}
                />
                <CountUpItem
                  label="Reporting districts"
                  value={summary?.totalDistricts ?? null}
                  loading={summaryLoading}
                  enabled={figuresInView}
                />
              </div>
            )}
          </div>
        </section>

        {/* Rising now panel */}
        <section className="border-b border-border py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="rounded-lg border border-border bg-card p-5 sm:p-6 shadow-resting">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-border">
                <div>
                  <h2 className="text-base font-semibold leading-6 text-foreground">
                    Rising skill demand
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-4">
                    Top 3 skills with largest increase in demand share nationally
                  </p>
                </div>
                {trends?.latestWindow && trends?.previousWindow && (
                  <span className="text-xs font-mono text-muted-foreground">
                    Window: {trends.latestWindow.from} to {trends.latestWindow.to} vs{" "}
                    {trends.previousWindow.from} to {trends.previousWindow.to}
                  </span>
                )}
              </div>

              {trendsLoading ? (
                <div className="py-6 space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : trendsError ? (
                <p className="text-xs text-muted-foreground py-4">
                  Live figures unavailable. Start the backend to see them.
                </p>
              ) : trends && trends.rising && trends.rising.length > 0 ? (
                <div className="divide-y divide-border mt-2">
                  {trends.rising.slice(0, 3).map((item, index) => {
                    const changePp = (item.change * 100).toFixed(1)
                    const isPositive = item.change >= 0
                    return (
                      <div
                        key={item.skillId}
                        className="flex items-center justify-between py-3 text-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-mono text-muted-foreground w-4">
                            #{index + 1}
                          </span>
                          <span className="font-medium text-foreground truncate">
                            {item.name}
                          </span>
                          <span className="hidden sm:inline-block text-xs text-muted-foreground">
                            &middot; {item.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                          <span className="tabular-nums text-muted-foreground">
                            {(item.shareLatest * 100).toFixed(1)}% share
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 font-semibold ${
                              isPositive
                                ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {isPositive ? `+${changePp}` : changePp} pp
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4">
                  No trend signals currently recorded.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-b border-border py-16 sm:py-20 bg-muted/15">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="max-w-[70ch]">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-7">
                How it works
              </h2>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
                An explainable three-step pipeline comparing employer demand signals to training supply.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-5 shadow-resting">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">
                  Step 01
                </div>
                <h3 className="mt-2 text-base font-semibold leading-6 text-foreground">
                  1. Demand
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Job postings and the skills they mention across occupations, industry sectors, and geographic districts.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-5 shadow-resting">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">
                  Step 02
                </div>
                <h3 className="mt-2 text-base font-semibold leading-6 text-foreground">
                  2. Supply
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  What each vocational or university course teaches, tracked by duration, linked roles, and curriculum skills.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-5 shadow-resting">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">
                  Step 03
                </div>
                <h3 className="mt-2 text-base font-semibold leading-6 text-foreground">
                  3. Compare
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Explainable readiness percentages, missing-skill learning roadmaps, and course-seat oversupply flags.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Core scoring formula
              </div>
              <pre className="font-mono text-xs p-3.5 rounded-lg border border-border bg-card text-foreground overflow-x-auto shadow-resting">
Demand share = postings that mention a skill / all postings for the role
              </pre>
            </div>
          </div>
        </section>

        {/* Students & Planners two-column section */}
        <section className="border-b border-border py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Students column */}
              <div id="students" className="scroll-mt-20 rounded-lg border border-border bg-card p-6 flex flex-col justify-between shadow-resting">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground leading-7">
                    For Students &amp; Job Seekers
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Measure your current profile against actual demand requirements.
                  </p>

                  <ul className="mt-6 space-y-3 text-xs sm:text-sm text-foreground">
                    <li className="flex items-start gap-2.5">
                      <span className="font-mono font-bold text-primary shrink-0">&bull;</span>
                      <span>Pick a target occupation profile from 18 tracked roles.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="font-mono font-bold text-primary shrink-0">&bull;</span>
                      <span>Tick skills you possess to calculate explainable readiness.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="font-mono font-bold text-primary shrink-0">&bull;</span>
                      <span>View a prioritized learning roadmap and covering courses.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-border">
                  <Link
                    href="/login?role=student"
                    className="inline-flex items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded transition-colors duration-120"
                  >
                    Explore as a student <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Planners column */}
              <div id="planners" className="scroll-mt-20 rounded-lg border border-border bg-card p-6 flex flex-col justify-between shadow-resting">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground leading-7">
                    For Planners &amp; Policymakers
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Detect macro labor shortages and misaligned training capacity.
                  </p>

                  <ul className="mt-6 space-y-3 text-xs sm:text-sm text-foreground">
                    <li className="flex items-start gap-2.5">
                      <span className="font-mono font-bold text-primary shrink-0">&bull;</span>
                      <span>Monitor skill demand and hiring volumes across 40 reporting districts.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="font-mono font-bold text-primary shrink-0">&bull;</span>
                      <span>Track emerging and declining skill trajectories over 3-month windows.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="font-mono font-bold text-primary shrink-0">&bull;</span>
                      <span>Review curriculum coverage scores and seats-to-openings oversupply flags.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-border">
                  <Link
                    href="/login?role=policymaker"
                    className="inline-flex items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded transition-colors duration-120"
                  >
                    Explore as a planner <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What is real, what is synthetic */}
        <section className="border-b border-border bg-muted/15 py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-lg font-bold tracking-tight text-foreground leading-7">
              What is real, what is synthetic
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3 text-xs sm:text-sm text-muted-foreground">
              <div className="rounded-md border border-border bg-card p-4 shadow-resting">
                <div className="font-semibold text-foreground mb-1">Deterministic Dataset</div>
                All 40,000 job postings, 81 skills, and 24 courses are generated with a fixed random seed.
              </div>
              <div className="rounded-md border border-border bg-card p-4 shadow-resting">
                <div className="font-semibold text-foreground mb-1">Tested Backend Code</div>
                Formulas for demand share, growth factors, coverage, and oversupply run in Java unit-tested services.
              </div>
              <div className="rounded-md border border-border bg-card p-4 shadow-resting">
                <div className="font-semibold text-foreground mb-1">Demo Environment</div>
                Login is a client-side demo with no real user accounts. Your ticks and role selections stay in your browser.
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>Synthetic data. Demo login only.</p>
          <a
            href="https://github.com/bhavadeepmanchala/skillpath"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1 active:translate-y-[1px]"
          >
            <span>GitHub repository</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </footer>
    </div>
  )
}
