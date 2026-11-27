"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  GraduationCap,
} from "lucide-react"
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts"
import {
  fetchDemandSummary,
  fetchDemandTrends,
  fetchDistricts,
  fetchFlags,
  fetchSkillTrend,
  type DemandSummary,
  type DemandTrendsResponse,
  type DistrictDemandItem,
  type FlagsResponse,
  type SkillTrendResponse,
  type SkillTrendItem,
} from "@/lib/demand-api"
import {
  PageHeader,
  FindingHeadline,
  BigNumber,
  FigureRow,
  SectionHeader,
  SourceCaption,
  DumbbellRow,
  DumbbellScaleHeader,
  TypographicRow,
  TypographicList,
  DeltaBadge,
  Drawer,
  ErrorState,
  EmptyState,
  ChartTooltip,
  ChartSkeleton,
  TableSkeleton,
  Skeleton,
  useChartAnimation,
} from "@/components/ui-kit"
import {
  buildSummaryFinding,
  buildRisingTrendFinding,
  formatInteger,
  formatPercent,
} from "@/lib/findings"
import { computeDumbbellScale } from "@/lib/dumbbell"

export default function PolicyOverviewPage() {
  const router = useRouter()

  // 1. Summary state
  const [summary, setSummary] = useState<DemandSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  // 2. Trends state
  const [trends, setTrends] = useState<DemandTrendsResponse | null>(null)
  const [trendsLoading, setTrendsLoading] = useState(true)
  const [trendsError, setTrendsError] = useState<string | null>(null)

  // 3. Flags state (for "What needs attention" strip)
  const [flags, setFlags] = useState<FlagsResponse | null>(null)
  const [flagsLoading, setFlagsLoading] = useState(true)
  const [flagsError, setFlagsError] = useState<string | null>(null)

  // 4. Districts state
  const [districts, setDistricts] = useState<DistrictDemandItem[]>([])
  const [totalDistrictPostings, setTotalDistrictPostings] = useState<number>(0)
  const [districtsLoading, setDistrictsLoading] = useState(true)
  const [districtsError, setDistrictsError] = useState<string | null>(null)

  // 5. Drawer state for skill drill-down
  const [drawerSkill, setDrawerSkill] = useState<{
    skillId: number
    name: string
    category: string
    item?: SkillTrendItem
  } | null>(null)
  const [drawerTrend, setDrawerTrend] = useState<SkillTrendResponse | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const isDrawerChartAnimationActive = useChartAnimation(
    isDrawerOpen,
    Boolean(drawerTrend?.points?.length)
  )

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const data = await fetchDemandSummary()
      setSummary(data)
    } catch {
      setSummaryError("Could not load summary figures. Is the backend running?")
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const loadTrends = useCallback(async () => {
    setTrendsLoading(true)
    setTrendsError(null)
    try {
      const data = await fetchDemandTrends({ limit: 5 })
      setTrends(data)
    } catch {
      setTrendsError("Could not load skill trends. Is the backend running?")
    } finally {
      setTrendsLoading(false)
    }
  }, [])

  const loadFlags = useCallback(async () => {
    setFlagsLoading(true)
    setFlagsError(null)
    try {
      const data = await fetchFlags()
      setFlags(data)
    } catch {
      setFlagsError("Could not load attention signals. Is the backend running?")
    } finally {
      setFlagsLoading(false)
    }
  }, [])

  const loadDistricts = useCallback(async () => {
    setDistrictsLoading(true)
    setDistrictsError(null)
    try {
      const data = await fetchDistricts()
      const total = data.districts.reduce((sum, d) => sum + d.postings, 0)
      const sorted = [...data.districts].sort((a, b) => b.postings - a.postings).slice(0, 8)
      setTotalDistrictPostings(total)
      setDistricts(sorted)
    } catch {
      setDistrictsError("Could not load regional hiring volume. Is the backend running?")
    } finally {
      setDistrictsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSummary()
    loadTrends()
    loadFlags()
    loadDistricts()
  }, [loadSummary, loadTrends, loadFlags, loadDistricts])

  const openSkillDrawer = useCallback(async (item: SkillTrendItem) => {
    setDrawerSkill({
      skillId: item.skillId,
      name: item.name,
      category: item.category,
      item,
    })
    setIsDrawerOpen(true)
    setDrawerLoading(true)
    setDrawerError(null)
    setDrawerTrend(null)
    try {
      const trend = await fetchSkillTrend(item.skillId)
      setDrawerTrend(trend)
    } catch {
      setDrawerError("Could not load monthly trend points for this skill.")
    } finally {
      setDrawerLoading(false)
    }
  }, [])

  // Finding headline computation
  const findingHeadline = useMemo(() => {
    if (trends && trends.rising.length > 0) {
      return buildRisingTrendFinding(trends.rising[0])
    }
    return buildSummaryFinding(summary)
  }, [trends, summary])

  // Attention strip numbers derived from real /api/flags
  const attentionMetrics = useMemo(() => {
    if (!flags || !flags.items) {
      return { oversupplied: 0, obsolete: 0, lowCoverage: 0, totalOfferings: 0 }
    }
    const oversupplied = flags.items.filter((i) => i.oversupplied).length
    const obsolete = flags.items.filter((i) => Boolean(i.obsolete)).length
    const threshold = flags.obsoleteCoverageThreshold ?? 40
    const lowCoverage = flags.items.filter(
      (i) => i.coverage !== undefined && i.coverage < threshold
    ).length
    return { oversupplied, obsolete, lowCoverage, totalOfferings: flags.items.length }
  }, [flags])

  const risingScale = useMemo(() => {
    const items = (trends?.rising ?? []).slice(0, 5).map((r) => ({
      prev: r.sharePrevious * 100,
      latest: r.shareLatest * 100,
    }))
    return computeDumbbellScale(items, { minMax: 20, step: 10, capAt: 100 })
  }, [trends?.rising])

  const decliningScale = useMemo(() => {
    const items = (trends?.declining ?? []).slice(0, 5).map((d) => ({
      prev: d.sharePrevious * 100,
      latest: d.shareLatest * 100,
    }))
    return computeDumbbellScale(items, { minMax: 20, step: 10, capAt: 100 })
  }, [trends?.declining])

  return (
    <div className="space-y-5 animate-page-enter">
      {/* 1. Page Header */}
      <PageHeader
        title="Policy Intelligence Overview"
        standfirst="High-level workforce demand signals, macro skill trajectories, and curriculum alignment priorities across India."
        showSyntheticBadge={false}
      />

      {/* 2. Editorial Finding Headline + Open FigureRow (no KPI boxes) */}
      <section className="space-y-3.5">
        {trendsLoading && summaryLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : (
          <FindingHeadline kicker="National Macro Finding" sentence={findingHeadline}>
            <SourceCaption
              scope="National"
              window={
                trends?.latestWindow
                  ? `${trends.latestWindow.from} – ${trends.latestWindow.to}`
                  : summary?.latestMonth || "Latest 3-month window"
              }
              note="Calculated from synthetic job postings and curriculum offerings"
            />
          </FindingHeadline>
        )}

        {summaryLoading ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6 border-y border-border py-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : summaryError ? (
          <ErrorState message={summaryError} onRetry={loadSummary} compact />
        ) : summary ? (
          <FigureRow columns={6}>
            <BigNumber
              label="Total Postings"
              rawValue={summary.totalPostings}
              footnote="Aggregated demand"
            />
            <BigNumber
              label="Skills Tracked"
              rawValue={summary.totalSkills}
              footnote="Taxonomy universe"
            />
            <BigNumber
              label="Target Roles"
              rawValue={summary.totalRoles}
              footnote="Occupational profiles"
            />
            <BigNumber
              label="Districts"
              rawValue={summary.totalDistricts}
              footnote="Reporting hubs"
            />
            <BigNumber
              label="Courses"
              rawValue={summary.totalCourses}
              footnote="Curriculum catalog"
            />
            <BigNumber
              label={`Hiring in ${summary.latestMonth}`}
              rawValue={summary.latestMonthPostings}
              footnote="Latest monthly cohort"
            />
          </FigureRow>
        ) : null}
      </section>

      {/* 3. What Needs Attention Strip (Open hairline-separated columns, no card wrappers) */}
      <section>
        <SectionHeader
          title="What Needs Attention"
          subtitle={`Live flags across ${attentionMetrics.totalOfferings} evaluated course offerings`}
        />

        {flagsLoading ? (
          <div className="grid gap-6 sm:grid-cols-3 py-4 border-b border-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        ) : flagsError ? (
          <ErrorState message={flagsError} onRetry={loadFlags} compact />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border">
            {/* Action 1: Oversupplied Offerings -> District Plan */}
            <Link
              href="/policy/district-plan"
              className="group py-2.5 sm:px-5 sm:first:pl-0 sm:last:pr-0 hover:bg-primary/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-attention-foreground">
                    Oversupplied Capacity
                  </span>
                  <AlertTriangle className="h-4 w-4 text-attention shrink-0" aria-hidden="true" />
                </div>
                <div className="mt-1 font-serif text-xl font-bold tracking-tight text-foreground tabular-nums">
                  {attentionMetrics.oversupplied}{" "}
                  {attentionMetrics.oversupplied === 1 ? "Offering" : "Offerings"}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                  Seat quotas substantially exceed estimated local job openings.
                </p>
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
                <span>Review District Plan</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            </Link>

            {/* Action 2: Obsolete Offerings -> Skill Gap Explorer */}
            <Link
              href="/policy/workforce-skill-gaps"
              className="group py-2.5 sm:px-5 hover:bg-primary/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-negative-foreground">
                    Curriculum Obsolescence
                  </span>
                  <ShieldAlert className="h-4 w-4 text-negative shrink-0" aria-hidden="true" />
                </div>
                <div className="mt-1 font-serif text-xl font-bold tracking-tight text-foreground tabular-nums">
                  {attentionMetrics.obsolete}{" "}
                  {attentionMetrics.obsolete === 1 ? "Offering" : "Offerings"}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                  Low core coverage combined with contracting demand in taught skills.
                </p>
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
                <span>Investigate Skill Gaps</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            </Link>

            {/* Action 3: Low Coverage / Skills to Update -> Course Recommendations */}
            <Link
              href="/policy/course-recommendations"
              className="group py-2.5 sm:px-5 sm:last:pr-0 hover:bg-primary/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Curriculum Gaps
                  </span>
                  <GraduationCap className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                </div>
                <div className="mt-1.5 font-serif text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {attentionMetrics.lowCoverage}{" "}
                  {attentionMetrics.lowCoverage === 1 ? "Offering" : "Offerings"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Coverage under {flags?.obsoleteCoverageThreshold ?? 40}% requiring curriculum updates.
                </p>
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
                <span>View Recommendations</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            </Link>
          </div>
        )}
      </section>

      {/* 4. Top Rising & Top Contracting Skills using shared DumbbellRow */}
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Top Rising Skills */}
        <section>
          <SectionHeader
            title="Top Rising Skills"
            subtitle="Previous window share → latest window share. Click any skill to inspect its 18-month trend."
            actions={
              <Link
                href="/policy/job-market-trends"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <span>View all trends</span>
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            }
          />

          {trendsLoading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : trendsError ? (
            <ErrorState message={trendsError} onRetry={loadTrends} compact />
          ) : !trends || trends.rising.length === 0 ? (
            <EmptyState
              title="No rising skills"
              description="No emerging skills passed the threshold."
            />
          ) : (
            <div>
              <DumbbellScaleHeader
                leftLabel="Skill"
                maxScale={risingScale}
                unit="%"
                rightLabel="Prev → Latest"
              />
              <div className="divide-y divide-border/70 border-b border-border/70">
                {trends.rising.slice(0, 5).map((item, idx) => (
                  <DumbbellRow
                    key={item.skillId}
                    rank={idx + 1}
                    label={item.name}
                    sublabel={item.category}
                    previousValue={item.sharePrevious * 100}
                    latestValue={item.shareLatest * 100}
                    maxScale={risingScale}
                    previousText={formatPercent(item.sharePrevious)}
                    latestText={formatPercent(item.shareLatest)}
                    tone="positive"
                    staggerIndex={idx}
                    badge={<DeltaBadge value={item.change} size="sm" showLabel />}
                    onClick={() => openSkillDrawer(item)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Top Contracting Skills */}
        <section>
          <SectionHeader
            title="Top Contracting Skills"
            subtitle="Previous window share → latest window share. Click any skill to inspect contraction magnitude."
            actions={
              <Link
                href="/policy/job-market-trends"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <span>View all trends</span>
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            }
          />

          {trendsLoading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : trendsError ? (
            <ErrorState message={trendsError} onRetry={loadTrends} compact />
          ) : !trends || trends.declining.length === 0 ? (
            <EmptyState
              title="No contracting skills"
              description="No declining skills recorded."
            />
          ) : (
            <div>
              <DumbbellScaleHeader
                leftLabel="Skill"
                maxScale={decliningScale}
                unit="%"
                rightLabel="Prev → Latest"
              />
              <div className="divide-y divide-border/70 border-b border-border/70">
                {trends.declining.slice(0, 5).map((item, idx) => (
                  <DumbbellRow
                    key={item.skillId}
                    rank={idx + 1}
                    label={item.name}
                    sublabel={item.category}
                    previousValue={item.sharePrevious * 100}
                    latestValue={item.shareLatest * 100}
                    maxScale={decliningScale}
                    previousText={formatPercent(item.sharePrevious)}
                    latestText={formatPercent(item.shareLatest)}
                    tone="negative"
                    staggerIndex={idx}
                    badge={<DeltaBadge value={item.change} size="sm" showLabel />}
                    onClick={() => openSkillDrawer(item)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 5. Top Regional Hiring Centers (TypographicList, top 8) */}
      <section>
        <SectionHeader
          title="Top Regional Hiring Centers"
          subtitle="Top 8 districts by aggregated synthetic job posting volume, scaled to the highest-volume district."
          actions={
            <Link
              href="/policy/geographic-insights"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <span>View all districts</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          }
        />

        {districtsLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : districtsError ? (
          <ErrorState message={districtsError} onRetry={loadDistricts} />
        ) : districts.length === 0 ? (
          <EmptyState
            title="No district records"
            description="No district demand figures returned from backend."
          />
        ) : (
          <TypographicList
            totalCount={districts.length}
            visibleCount={districts.length}
            showAll={true}
            itemLabel="districts"
          >
            {districts.map((d, i) => {
              const maxPostings = districts[0]?.postings || 1
              const barWidth = Math.min(
                100,
                Math.max(4, Math.round((d.postings / maxPostings) * 100))
              )
              const sharePct =
                totalDistrictPostings > 0
                  ? (d.postings / totalDistrictPostings) * 100
                  : 0

              return (
                <TypographicRow
                  key={d.districtId}
                  rank={i + 1}
                  title={d.name}
                  subtitle={d.state}
                  staggerIndex={i}
                  primaryFigure={`${formatInteger(d.postings)} postings`}
                  secondaryFigure={`${sharePct.toFixed(1)}%`}
                  onClick={() =>
                    router.push(`/policy/district-plan?district=${d.districtId}`)
                  }
                  visual={
                    <div
                      className="h-1 w-full rounded-full bg-muted/60 overflow-hidden"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full bg-primary/80 transition-all duration-300"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  }
                />
              )
            })}
          </TypographicList>
        )}
      </section>

      {/* 6. Skill Trend Detail Drawer (Reachable in 1 click) */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={drawerSkill?.name || "Skill Details"}
        subtitle={
          drawerSkill?.category
            ? `Category: ${drawerSkill.category}`
            : "Longitudinal Demand"
        }
      >
        {drawerSkill && (
          <div className="space-y-6">
            {drawerSkill.item && (
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg border border-border bg-card">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Latest Share
                  </span>
                  <div className="font-serif text-xl font-bold tabular-nums text-foreground mt-0.5">
                    {formatPercent(drawerSkill.item.shareLatest)}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {drawerSkill.item.postingsLatest.toLocaleString("en-IN")} postings
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Trailing Shift
                  </span>
                  <div className="mt-1">
                    <DeltaBadge value={drawerSkill.item.change} showLabel size="md" />
                  </div>
                  {drawerSkill.item.relativeGrowth !== null && (
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">
                      {formatPercent(drawerSkill.item.relativeGrowth, 1, false)} relative growth
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                18-Month Demand Trajectory
              </h4>
              {drawerLoading ? (
                <ChartSkeleton height={180} />
              ) : drawerError ? (
                <ErrorState message={drawerError} compact />
              ) : drawerTrend && drawerTrend.points && drawerTrend.points.length > 0 ? (
                <div
                  className="h-48 w-full border border-border rounded-lg p-2 bg-card"
                  aria-label={`18-month demand trajectory area chart for ${drawerSkill.name}`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={drawerTrend.points.map((p) => ({
                        month: p.month,
                        sharePct: Number((p.share * 100).toFixed(2)),
                        postings: p.postingsWithSkill,
                      }))}
                      margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--border)" }}
                      />
                      <YAxis
                        domain={[0, "auto"]}
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--border)" }}
                        unit="%"
                      />
                      <Tooltip
                        content={
                          <ChartTooltip valueFormatter={(v) => `${v}% of postings`} />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="sharePct"
                        stroke="var(--primary)"
                        fill="var(--primary)"
                        fillOpacity={0.15}
                        strokeWidth={2}
                        isAnimationActive={isDrawerChartAnimationActive}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  title="No trend history"
                  description="No monthly points available."
                />
              )}
            </div>

            <div className="pt-2 border-t border-border">
              <Link
                href="/policy/skill-demand"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <span>Open in Skill Demand Analysis</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
