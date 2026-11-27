"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowRight, ExternalLink, RefreshCw, Compass } from "lucide-react"
import { Navbar } from "@/components/navbar"
import {
  fetchDemandSummary,
  fetchDemandTrends,
  type DemandSummary,
  type DemandTrendsResponse,
} from "@/lib/demand-api"
import { Skeleton } from "@/components/ui-kit/skeleton"
import { ReadinessProvider } from "@/components/readiness-provider"
import {
  BigNumber,
  FindingHeadline,
  SourceCaption,
  SectionRule,
} from "@/components/ui-kit/editorial"
import { DeltaBadge } from "@/components/ui-kit/delta-badge"
import { LowSampleBadge } from "@/components/ui-kit/data-badge"
import {
  buildSummaryFinding,
  buildRisingTrendFinding,
  formatPercent,
  formatMonthRange,
} from "@/lib/findings"

function HomePageContent() {
  const [summary, setSummary] = useState<DemandSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState(false)

  const [trends, setTrends] = useState<DemandTrendsResponse | null>(null)
  const [trendsLoading, setTrendsLoading] = useState(true)
  const [trendsError, setTrendsError] = useState(false)

  const figuresRef = useRef<HTMLDivElement | null>(null)
  const [figuresInView, setFiguresInView] = useState(false)

  const loadSummary = () => {
    setSummaryLoading(true)
    setSummaryError(false)
    fetchDemandSummary()
      .then((data) => {
        setSummary(data)
        setSummaryLoading(false)
      })
      .catch(() => {
        setSummaryError(true)
        setSummaryLoading(false)
      })
  }

  const loadTrends = () => {
    setTrendsLoading(true)
    setTrendsError(false)
    fetchDemandTrends({ limit: 5 })
      .then((data) => {
        setTrends(data)
        setTrendsLoading(false)
      })
      .catch(() => {
        setTrendsError(true)
        setTrendsLoading(false)
      })
  }

  useEffect(() => {
    loadSummary()
    loadTrends()
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
      { threshold: 0.1 }
    )
    observer.observe(figuresRef.current)
    return () => observer.disconnect()
  }, [figuresInView])

  const topRising = trends?.rising?.[0] || null
  const risingFindingSentence = buildRisingTrendFinding(
    topRising
      ? {
          name: topRising.name,
          shareLatest: topRising.shareLatest,
          change: topRising.change,
        }
      : null
  )

  const trendWindowText = trends
    ? formatMonthRange(trends.latestWindow?.from, trends.latestWindow?.to)
    : "Trailing 3-month window"

  return (
    <div data-mood="neutral" className="flex min-h-dvh flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        {/* Editorial Hero Section with Key Numbers Above the Fold */}
        <section className="border-b border-border py-12 sm:py-20 animate-page-enter">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  Workforce Intelligence
                </span>
                <span className="text-muted-foreground">&middot;</span>
                <SourceCaption showSynthetic={true} scope="India" />
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.12] text-balance">
                See which skills employers ask for, and where training falls short.
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-[65ch] text-balance">
                SkillPath compares the skills demanded in job postings against what vocational and university courses teach using explainable alignment scoring on synthetic Indian workforce data.
              </p>

              {/* Primary & Secondary Calls to Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/login?role=student"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-resting transition-colors duration-120 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-[1px]"
                >
                  <span>Explore as Student / Job Seeker</span>
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/login?role=policymaker"
                  className="inline-flex items-center justify-center rounded-md border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-resting transition-colors duration-120 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-[1px]"
                >
                  <span>Explore as Policymaker / Planner</span>
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Key Live Numbers Strip - Visible on First Screen Without Scrolling */}
            <div ref={figuresRef} className="mt-12 pt-8 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-6">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    National Dataset Overview
                  </h2>
                  <div className="font-serif text-sm font-medium text-foreground mt-0.5">
                    {summaryLoading ? (
                      <Skeleton className="h-4 w-72 mt-1" />
                    ) : summary ? (
                      buildSummaryFinding(summary)
                    ) : (
                      "Tracking job postings and employer requirements across India."
                    )}
                  </div>
                </div>
                <SourceCaption
                  showSynthetic={true}
                  window={summary?.latestMonth ? `Latest: ${summary.latestMonth}` : undefined}
                />
              </div>

              {summaryError ? (
                <div className="rounded-lg border border-border bg-card p-6 text-center shadow-resting">
                  <p className="text-sm text-muted-foreground">
                    Live figures unavailable. Start the backend to see live counts.
                  </p>
                  <button
                    onClick={loadSummary}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-resting"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry
                  </button>
                </div>
              ) : summaryLoading ? (
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-10 w-28" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                  <BigNumber
                    label="Total job postings"
                    rawValue={summary?.totalPostings}
                    footnote="Trailing 18-month seed"
                    animate={figuresInView}
                  />
                  <BigNumber
                    label="Skills tracked"
                    rawValue={summary?.totalSkills}
                    footnote="12 industry categories"
                    animate={figuresInView}
                  />
                  <BigNumber
                    label="Target occupations"
                    rawValue={summary?.totalRoles}
                    footnote="7 economic sectors"
                    animate={figuresInView}
                  />
                  <BigNumber
                    label="Reporting districts"
                    rawValue={summary?.totalDistricts}
                    footnote="Across 16 states"
                    animate={figuresInView}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Rising Now Panel from /api/demand/trends */}
        <section className="border-b border-border py-14 sm:py-18 bg-muted/20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-resting">
              <div className="border-b border-border pb-5">
                <FindingHeadline
                  kicker="Demand Momentum"
                  sentence={
                    trendsLoading
                      ? "Analyzing trailing skill demand trajectories nationally..."
                      : risingFindingSentence
                  }
                >
                  <SourceCaption
                    scope="National (all 40 reporting districts)"
                    window={trendWindowText}
                    showSynthetic={true}
                  />
                </FindingHeadline>
              </div>

              {trendsLoading ? (
                <div className="divide-y divide-border pt-4">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3.5">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-28" />
                    </div>
                  ))}
                </div>
              ) : trendsError ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    Unable to load trend signals. Ensure backend is running.
                  </p>
                  <button
                    onClick={loadTrends}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-resting"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry
                  </button>
                </div>
              ) : trends && trends.rising && trends.rising.length > 0 ? (
                <div className="mt-2 divide-y divide-border">
                  {trends.rising.slice(0, 5).map((item, index) => {
                    const isLow = (item.postingsLatest ?? 0) < 30
                    return (
                      <div
                        key={item.skillId}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3.5 gap-2 transition-colors duration-120 hover:bg-muted/30 -mx-2 px-2 rounded"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs text-muted-foreground w-6 shrink-0">
                            #{index + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-serif font-semibold text-foreground text-sm sm:text-base truncate">
                                {item.name}
                              </span>
                              {isLow && <LowSampleBadge threshold={30} />}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {item.category}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-end sm:self-auto font-mono text-xs shrink-0">
                          <span className="text-muted-foreground tabular-nums">
                            {formatPercent(item.shareLatest)} demand share
                          </span>
                          <DeltaBadge value={item.change} asPercentagePoints={false} size="sm" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="py-6 text-xs text-muted-foreground">
                  No trend signals currently recorded in the catalogue.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Section 3: How It Works & Transparent Formulas */}
        <section id="how-it-works" className="scroll-mt-20 border-b border-border py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="max-w-[70ch] space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Methodology &amp; Architecture
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
                An explainable three-step pipeline comparing demand to supply.
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                SkillPath avoids opaque black-box recommendations. Every score and delta is computed deterministically from synthetic labor records.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-6 shadow-resting">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
                  Step 01
                </div>
                <h3 className="font-serif text-lg font-semibold text-foreground mt-2">
                  1. Employer Demand
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Extracts skills mentioned across 40,000 job postings, grouped by occupation role, district location, and monthly time window.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-6 shadow-resting">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
                  Step 02
                </div>
                <h3 className="font-serif text-lg font-semibold text-foreground mt-2">
                  2. Training Supply
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Catalogs 24 courses and their offered seats across reporting districts, mapping taught skills and training durations to target occupations.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-6 shadow-resting">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
                  Step 03
                </div>
                <h3 className="font-serif text-lg font-semibold text-foreground mt-2">
                  3. Explainable Alignment
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Computes curriculum coverage, missing skill roadmaps for learners, and seat-to-openings oversupply flags for district planners.
                </p>
              </div>
            </div>

            {/* Core Scoring Formula Box */}
            <div className="mt-8 rounded-lg border border-border bg-card p-5 shadow-resting">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Core scoring formulas (deterministic backend logic)
              </div>
              <div className="grid gap-3 sm:grid-cols-3 font-mono text-xs">
                <div className="p-3 rounded bg-muted/30 border border-border/60">
                  <span className="font-semibold text-foreground block mb-1">Demand Share</span>
                  <code className="text-muted-foreground block text-[11px]">
                    postings_with_skill / all_postings_for_role
                  </code>
                </div>
                <div className="p-3 rounded bg-muted/30 border border-border/60">
                  <span className="font-semibold text-foreground block mb-1">Course Coverage</span>
                  <code className="text-muted-foreground block text-[11px]">
                    sum(taught_skill_shares) / sum(top_15_shares)
                  </code>
                </div>
                <div className="p-3 rounded bg-muted/30 border border-border/60">
                  <span className="font-semibold text-foreground block mb-1">Oversupply Ratio</span>
                  <code className="text-muted-foreground block text-[11px]">
                    offered_seats / estimated_local_openings
                  </code>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Two-Audience Breakdown */}
        <section className="border-b border-border py-16 sm:py-20 bg-muted/15">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Students card */}
              <div
                id="students"
                className="scroll-mt-20 rounded-xl border border-border bg-card p-6 sm:p-8 flex flex-col justify-between shadow-resting"
              >
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    For Job Seekers
                  </div>
                  <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground mt-1">
                    Students &amp; Career Navigators
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Evaluate your skill set against employer expectations and target the gaps that matter most.
                  </p>

                  <ul className="mt-6 space-y-3 text-xs sm:text-sm text-foreground">
                    <li className="flex items-start gap-2.5">
                      <span className="font-serif font-bold text-primary shrink-0">&bull;</span>
                      <span>Target occupation profiles across 18 tracked roles.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="font-serif font-bold text-primary shrink-0">&bull;</span>
                      <span>Tick current skills to compute transparent readiness percentages.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="font-serif font-bold text-primary shrink-0">&bull;</span>
                      <span>Receive an ordered skill roadmap and covering course catalogue.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-border">
                  <Link
                    href="/login?role=student"
                    className="inline-flex items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded transition-colors duration-120"
                  >
                    <span>Launch Career Navigator</span>
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Planners card */}
              <div
                id="planners"
                className="scroll-mt-20 rounded-xl border border-border bg-card p-6 sm:p-8 flex flex-col justify-between shadow-resting"
              >
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    For Decision Makers
                  </div>
                  <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground mt-1">
                    Planners &amp; Policymakers
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Identify district-level shortages, flag obsolete courses, and plan vocational seat allocations.
                  </p>

                  <ul className="mt-6 space-y-3 text-xs sm:text-sm text-foreground">
                    <li className="flex items-start gap-2.5">
                      <span className="font-serif font-bold text-primary shrink-0">&bull;</span>
                      <span>Monitor skill demand and hiring volumes across 40 reporting districts.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="font-serif font-bold text-primary shrink-0">&bull;</span>
                      <span>Track curriculum obsolescence and oversupply ratios (&gt;1.5x openings).</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="font-serif font-bold text-primary shrink-0">&bull;</span>
                      <span>Generate actionable district training plans with recommended seat shifts.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-border">
                  <Link
                    href="/login?role=policymaker"
                    className="inline-flex items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded transition-colors duration-120"
                  >
                    <span>Launch Policy Intelligence</span>
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Transparency: What is real, what is synthetic */}
        <section className="border-b border-border py-14 sm:py-18">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="max-w-[70ch]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Data Transparency
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                What is real, what is synthetic
              </h2>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-3 text-xs sm:text-sm text-muted-foreground">
              <div className="rounded-lg border border-border bg-card p-5 shadow-resting">
                <div className="font-serif font-semibold text-foreground text-sm mb-1">
                  Deterministic Dataset
                </div>
                All 40,000 job postings, 81 skills, and 24 courses are generated with a fixed random seed. Numbers are reproducible across environments.
              </div>

              <div className="rounded-lg border border-border bg-card p-5 shadow-resting">
                <div className="font-serif font-semibold text-foreground text-sm mb-1">
                  Tested Backend Code
                </div>
                Formulas for demand share, growth factors, curriculum coverage, and oversupply ratios run in Java unit-tested services.
              </div>

              <div className="rounded-lg border border-border bg-card p-5 shadow-resting">
                <div className="font-serif font-semibold text-foreground text-sm mb-1">
                  Demo Environment
                </div>
                Login is a client-side demo with no real user accounts. Your ticks and role selections stay in your browser.
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            <span className="font-serif font-semibold text-foreground">SkillPath</span>
            <span>&middot;</span>
            <span>Synthetic workforce data demonstration</span>
          </div>

          <a
            href="https://github.com/bhavadeepmanchala/skillpath"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1 active:translate-y-[1px]"
          >
            <span>GitHub repository</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </footer>
    </div>
  )
}

export default function HomePage() {
  return (
    <ReadinessProvider>
      <HomePageContent />
    </ReadinessProvider>
  )
}
