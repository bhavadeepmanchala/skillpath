"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import {
  TrendingUp,
  TrendingDown,
  Info,
  AlertTriangle,
  Flame,
  ChevronRight,
  ArrowRight,
  Search,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts"
import {
  fetchDistricts,
  fetchDemandTrends,
  fetchSkillTrend,
  LOW_SAMPLE_THRESHOLD,
  isLowSample,
  type DistrictDemandItem,
  type DemandTrendsResponse,
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
  FilterBar,
  SelectField,
  DumbbellRow,
  DumbbellScaleHeader,
  TypographicRow,
  DeltaBadge,
  LowSampleBadge,
  Drawer,
  ErrorState,
  EmptyState,
  ChartTooltip,
  ChartSkeleton,
  TableSkeleton,
  Skeleton,
  useChartAnimation,
} from "@/components/ui-kit"
import { computeDumbbellScale } from "@/lib/dumbbell"
import {
  buildRisingTrendFinding,
  formatPercent,
  formatPercentagePoints,
  formatInteger,
} from "@/lib/findings"

interface ActiveDrawerSkill {
  skillId: number
  name: string
}

export default function JobMarketTrendsPage() {
  // District filter
  const [districts, setDistricts] = useState<DistrictDemandItem[]>([])
  const [districtsLoading, setDistrictsLoading] = useState(true)
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("")

  // Window filter: 1, 3, 6 months
  const [selectedWindow, setSelectedWindow] = useState<number>(3)

  // Trends data
  const [trends, setTrends] = useState<DemandTrendsResponse | null>(null)
  const [trendsLoading, setTrendsLoading] = useState(true)
  const [trendsError, setTrendsError] = useState<string | null>(null)
  const [chartViewMode, setChartViewMode] = useState<"chart" | "table">("chart")

  // Search & Progressive disclosure state
  const [risingSearch, setRisingSearch] = useState("")
  const [decliningSearch, setDecliningSearch] = useState("")
  const [showAllRising, setShowAllRising] = useState(false)
  const [showAllDeclining, setShowAllDeclining] = useState(false)

  // Selected skill drawer
  const [drawerSkill, setDrawerSkill] = useState<ActiveDrawerSkill | null>(null)
  const [drawerTrend, setDrawerTrend] = useState<SkillTrendResponse | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)

  // 1. Load districts
  useEffect(() => {
    let isMounted = true
    setDistrictsLoading(true)
    fetchDistricts()
      .then((data) => {
        if (isMounted) setDistricts(data.districts)
      })
      .catch((err) => {
        console.error("Failed to load districts:", err)
      })
      .finally(() => {
        if (isMounted) setDistrictsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  // 2. Load trends
  const loadTrends = useCallback(async () => {
    setTrendsLoading(true)
    setTrendsError(null)
    try {
      const districtParam = selectedDistrictId ? Number(selectedDistrictId) : null
      const data = await fetchDemandTrends({
        districtId: districtParam,
        window: selectedWindow,
        limit: 20, // Comprehensive list so search and progressive disclosure work
      })
      setTrends(data)
    } catch {
      setTrendsError("Could not load market trends data. Is the backend running?")
    } finally {
      setTrendsLoading(false)
    }
  }, [selectedDistrictId, selectedWindow])

  useEffect(() => {
    loadTrends()
  }, [loadTrends])

  // 3. Shared opener: openSkillDrawer(skillId, name)
  const openSkillDrawer = useCallback(
    async (skillId?: number | string | null, name?: string) => {
      if (!skillId) return
      const numericId = Number(skillId)
      if (isNaN(numericId) || numericId <= 0) return

      setDrawerSkill({ skillId: numericId, name: name || `Skill #${numericId}` })
      setDrawerLoading(true)
      setDrawerError(null)
      setDrawerTrend(null)
      try {
        const districtParam = selectedDistrictId ? Number(selectedDistrictId) : null
        const data = await fetchSkillTrend(numericId, {
          districtId: districtParam,
        })
        setDrawerTrend(data)
      } catch {
        setDrawerError("Could not load skill trend history. Is the backend running?")
      } finally {
        setDrawerLoading(false)
      }
    },
    [selectedDistrictId]
  )

  const districtOptions = useMemo(() => {
    const opts = [{ label: "All Districts (Pan-India)", value: "" }]
    const sorted = [...districts].sort((a, b) => a.name.localeCompare(b.name))
    for (const d of sorted) {
      opts.push({ label: `${d.name} (${d.state})`, value: String(d.districtId) })
    }
    return opts
  }, [districts])

  const selectedDistrictName = useMemo(() => {
    if (!selectedDistrictId) return "All Districts (Pan-India)"
    const found = districts.find((d) => String(d.districtId) === selectedDistrictId)
    return found ? `${found.name}, ${found.state}` : "Selected District"
  }, [districts, selectedDistrictId])

  // Dumbbell chart items (top 8 rising + top 8 declining: previous window share -> latest window share)
  const dumbbellChartData = useMemo(() => {
    if (!trends) return []
    const risingItems = trends.rising.slice(0, 8).map((item) => ({
      name: item.name,
      category: item.category,
      skillId: item.skillId,
      sharePrevPct: Number((item.sharePrevious * 100).toFixed(1)),
      shareLatestPct: Number((item.shareLatest * 100).toFixed(1)),
      changePp: Number((item.change * 100).toFixed(2)),
      type: "rising" as const,
      raw: item,
    }))
    const decliningItems = trends.declining.slice(0, 8).map((item) => ({
      name: item.name,
      category: item.category,
      skillId: item.skillId,
      sharePrevPct: Number((item.sharePrevious * 100).toFixed(1)),
      shareLatestPct: Number((item.shareLatest * 100).toFixed(1)),
      changePp: Number((item.change * 100).toFixed(2)),
      type: "declining" as const,
      raw: item,
    }))
    return [...risingItems, ...decliningItems]
  }, [trends])

  const maxDumbbellShare = useMemo(() => {
    if (dumbbellChartData.length === 0) return 50
    const rawMax = Math.max(
      ...dumbbellChartData.flatMap((d) => [d.sharePrevPct, d.shareLatestPct]),
      10
    )
    // Round up to a clean multiple of 10
    return Math.min(100, Math.ceil(rawMax / 10) * 10)
  }, [dumbbellChartData])

  // Filtered rising skills
  const processedRising = useMemo(() => {
    if (!trends?.rising) return []
    const q = risingSearch.trim().toLowerCase()
    if (!q) return trends.rising
    return trends.rising.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    )
  }, [trends?.rising, risingSearch])

  const visibleRising = useMemo(() => {
    if (showAllRising || processedRising.length <= 10) return processedRising
    return processedRising.slice(0, 10)
  }, [processedRising, showAllRising])

  // Filtered declining skills
  const processedDeclining = useMemo(() => {
    if (!trends?.declining) return []
    const q = decliningSearch.trim().toLowerCase()
    if (!q) return trends.declining
    return trends.declining.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    )
  }, [trends?.declining, decliningSearch])

  const visibleDeclining = useMemo(() => {
    if (showAllDeclining || processedDeclining.length <= 10) return processedDeclining
    return processedDeclining.slice(0, 10)
  }, [processedDeclining, showAllDeclining])

  const maxRisingChange = Math.max(
    ...(trends?.rising.map((r) => Math.abs(r.change)) || [0.01]),
    0.01
  )
  const maxDecliningChange = Math.max(
    ...(trends?.declining.map((d) => Math.abs(d.change)) || [0.01]),
    0.01
  )

  // Drawer metric calculations
  const activeTrendItem = useMemo(() => {
    if (!drawerSkill || !trends || drawerSkill.skillId <= 0) return null
    return (
      trends.rising.find((s) => s.skillId === drawerSkill.skillId) ||
      trends.declining.find((s) => s.skillId === drawerSkill.skillId) ||
      null
    )
  }, [drawerSkill, trends])

  const {
    drawerCategory,
    drawerChange,
    drawerGrowth,
    drawerSharePrevious,
    drawerShareLatest,
    drawerPostingsPrevious,
    drawerPostingsLatest,
  } = useMemo(() => {
    if (activeTrendItem) {
      return {
        drawerCategory: activeTrendItem.category,
        drawerChange: activeTrendItem.change,
        drawerGrowth: activeTrendItem.relativeGrowth,
        drawerSharePrevious: activeTrendItem.sharePrevious,
        drawerShareLatest: activeTrendItem.shareLatest,
        drawerPostingsPrevious: activeTrendItem.postingsPrevious,
        drawerPostingsLatest: activeTrendItem.postingsLatest,
      }
    }
    if (drawerTrend && drawerTrend.points.length > 0) {
      const pts = drawerTrend.points
      const latestPt = pts[pts.length - 1]
      const prevPt = pts.length > 1 ? pts[pts.length - 2] : null
      return {
        drawerCategory: "Competency Trend",
        drawerChange: prevPt && latestPt ? latestPt.share - prevPt.share : 0,
        drawerGrowth: prevPt && prevPt.share > 0 ? (latestPt.share - prevPt.share) / prevPt.share : null,
        drawerSharePrevious: prevPt?.share ?? 0,
        drawerShareLatest: latestPt?.share ?? 0,
        drawerPostingsPrevious: prevPt?.postingsWithSkill ?? 0,
        drawerPostingsLatest: latestPt?.postingsWithSkill ?? 0,
      }
    }
    return {
      drawerCategory: "Competency Trend",
      drawerChange: 0,
      drawerGrowth: null,
      drawerSharePrevious: 0,
      drawerShareLatest: 0,
      drawerPostingsPrevious: 0,
      drawerPostingsLatest: 0,
    }
  }, [activeTrendItem, drawerTrend])

  const isChartAnimationActive = useChartAnimation()

  // Finding sentence calculation
  const findingHeadline = useMemo(() => {
    if (trends && trends.rising.length > 0) {
      return buildRisingTrendFinding(trends.rising[0], {
        districtName: selectedDistrictId ? selectedDistrictName : undefined,
      })
    }
    return "Tracking longitudinal trajectories of skill demand across employer hiring cohorts."
  }, [trends, selectedDistrictId, selectedDistrictName])

  return (
    <div className="space-y-8 animate-page-enter">
      {/* 1. Page Header with standfirst */}
      <PageHeader
        title="Job Market Trends"
        standfirst="Longitudinal trajectories of skill demand: identifying accelerating competencies and contracting requirements across India."
        showSyntheticBadge
        breadcrumbs={[
          { label: "Policymaker", href: "/policy" },
          { label: "Job Market Trends" },
        ]}
      />

      {/* 2. Filter Bar: District & Window */}
      <FilterBar
        isFiltered={Boolean(selectedDistrictId) || selectedWindow !== 3}
        onReset={() => {
          setSelectedDistrictId("")
          setSelectedWindow(3)
        }}
      >
        <SelectField
          id="district-trend-filter"
          label="Geographic scope"
          value={selectedDistrictId}
          onChange={(val) => setSelectedDistrictId(val)}
          options={districtOptions}
          disabled={districtsLoading}
          className="min-w-[240px]"
        />
        <SelectField
          id="window-trend-filter"
          label="Comparison window"
          value={selectedWindow}
          onChange={(val) => setSelectedWindow(Number(val))}
          options={[
            { label: "1 month comparison", value: 1 },
            { label: "3 month comparison", value: 3 },
            { label: "6 month comparison", value: 6 },
          ]}
        />
      </FilterBar>

      {/* 3. Finding Headline & Open FigureRow */}
      <section className="space-y-6">
        {trendsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : (
          <FindingHeadline
            kicker="Market Momentum Finding"
            sentence={findingHeadline}
          >
            <SourceCaption
              scope={selectedDistrictName}
              window={
                trends?.latestWindow
                  ? `${trends.latestWindow.from} – ${trends.latestWindow.to} vs ${trends.previousWindow.from} – ${trends.previousWindow.to}`
                  : `${selectedWindow}-month comparison window`
              }
              note={`Minimum volume guard: ≥ ${trends?.minPostings ?? 20} postings across comparison windows`}
            />
          </FindingHeadline>
        )}

        <FigureRow columns={4}>
          <BigNumber
            label="Top Rising Momentum"
            value={trends?.rising[0] ? formatPercentagePoints(trends.rising[0].change) : "—"}
            footnote={trends?.rising[0] ? `${trends.rising[0].name} (Rank #1)` : "No rising data"}
          />
          <BigNumber
            label="Sharpest Contraction"
            value={trends?.declining[0] ? formatPercentagePoints(trends.declining[0].change) : "—"}
            footnote={trends?.declining[0] ? `${trends.declining[0].name} (Rank #1)` : "No declining data"}
          />
          <BigNumber
            label="Skills Evaluated"
            rawValue={(trends?.rising.length ?? 0) + (trends?.declining.length ?? 0)}
            footnote={`Passing ${trends?.minPostings ?? 20} postings guard`}
          />
          <BigNumber
            label="Comparison Scope"
            value={`${selectedWindow} ${selectedWindow === 1 ? "Month" : "Months"}`}
            footnote={selectedDistrictName}
          />
        </FigureRow>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 1: Signature Dumbbell Chart (Open section, no card box)      */}
      {/* ===================================================================== */}
      <section className="space-y-4">
        <SectionHeader
          title="Window-to-Window Share Shift (Dumbbell View)"
          subtitle={`Posting share shift from ${trends?.previousWindow.from ?? "previous"}–${trends?.previousWindow.to ?? "window"} to ${trends?.latestWindow.from ?? "latest"}–${trends?.latestWindow.to ?? "window"} for top rising & contracting skills.`}
          actions={
            <div className="inline-flex rounded-md border border-border p-0.5 bg-muted/40 text-xs">
              <button
                type="button"
                onClick={() => setChartViewMode("chart")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  chartViewMode === "chart"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Dumbbell Chart
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode("table")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  chartViewMode === "table"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Plain-Text List
              </button>
            </div>
          }
        />

        {trendsLoading ? (
          <ChartSkeleton height={320} />
        ) : trendsError ? (
          <ErrorState message={trendsError} onRetry={loadTrends} />
        ) : !trends || (trends.rising.length === 0 && trends.declining.length === 0) ? (
          <EmptyState title="No trend data" description="No skills met the minimum volume threshold for this window." />
        ) : chartViewMode === "chart" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 text-[11px] text-muted-foreground">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full border-2 border-muted-foreground bg-background inline-block" aria-hidden="true" />
                  <span>Previous window share</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-positive-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-positive inline-block" aria-hidden="true" />
                  <span>Latest share (Rising)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-negative-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-negative inline-block" aria-hidden="true" />
                  <span>Latest share (Declining)</span>
                </span>
              </div>
              <span className="font-mono">Axis: 0% to {maxDumbbellShare}% posting share</span>
            </div>

            <div
              role="region"
              aria-label={`Dumbbell chart comparing previous and latest posting share for ${dumbbellChartData.length} top rising and declining skills on a 0% to ${maxDumbbellShare}% axis.`}
            >
              <DumbbellScaleHeader
                leftLabel="Skill & Trajectory"
                maxScale={maxDumbbellShare}
                unit="%"
                rightLabel="Prev → Latest"
              />
              <div className="divide-y divide-border/70 border-b border-border/70">
                {dumbbellChartData.map((item, idx) => (
                  <DumbbellRow
                    key={item.skillId}
                    label={item.name}
                    sublabel={item.category}
                    previousValue={item.sharePrevPct}
                    latestValue={item.shareLatestPct}
                    maxScale={maxDumbbellShare}
                    previousText={`${item.sharePrevPct.toFixed(1)}%`}
                    latestText={`${item.shareLatestPct.toFixed(1)}%`}
                    tone={item.type === "rising" ? "positive" : "negative"}
                    staggerIndex={idx}
                    badge={<DeltaBadge value={item.changePp} asPercentagePoints size="sm" showLabel />}
                    onClick={() => openSkillDrawer(item.skillId, item.name)}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span>
                  Hollow circle marks previous window share; solid dot marks latest window share. Minimum guard: {trends.minPostings} postings in scope.
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Click or press Enter on any row to inspect its 18-month trend drawer.
              </span>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/70 border-y border-border/70">
            {dumbbellChartData.map((item, idx) => (
              <TypographicRow
                key={item.skillId}
                rank={idx + 1}
                title={item.name}
                subtitle={item.category}
                staggerIndex={idx}
                primaryFigure={`${item.sharePrevPct.toFixed(1)}% → ${item.shareLatestPct.toFixed(1)}%`}
                badges={<DeltaBadge value={item.changePp} asPercentagePoints showLabel size="sm" />}
                onClick={() => openSkillDrawer(item.skillId, item.name)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 2: Rising and Declining Skills (Open typographic lists)       */}
      {/* ===================================================================== */}
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Top Rising Skills */}
        <section>
          <SectionHeader
            title="Accelerating Competencies (Rising)"
            subtitle={`Bar length = size of the change in share; number = current share. ${visibleRising.length} skills shown.`}
          />

          {trendsLoading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : trendsError ? (
            <ErrorState message={trendsError} onRetry={loadTrends} compact />
          ) : visibleRising.length === 0 ? (
            <EmptyState title="No rising skills" description="No skills passed the threshold." />
          ) : (
            <div className="divide-y divide-border/70 border-b border-border/70">
              {visibleRising.map((item, idx) => {
                const widthPct = Math.min(100, Math.max(8, Math.round((Math.abs(item.change) / maxRisingChange) * 100)))
                const lowSample = isLowSample(item.postingsLatest)

                return (
                  <TypographicRow
                    key={item.skillId}
                    rank={idx + 1}
                    title={item.name}
                    subtitle={item.category}
                    staggerIndex={idx}
                    primaryFigure={formatPercent(item.shareLatest)}
                    badges={
                      <div className="flex items-center gap-1.5">
                        {lowSample && <LowSampleBadge />}
                        <DeltaBadge value={item.change} size="sm" showLabel />
                      </div>
                    }
                    onClick={() => openSkillDrawer(item.skillId, item.name)}
                    visual={
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 flex-1 rounded-full bg-muted/60 overflow-hidden" aria-hidden="true">
                          <div
                            className="h-full rounded-full bg-positive transition-all duration-300"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono tabular-nums font-medium text-positive-foreground shrink-0">
                          {formatPercentagePoints(item.change)}
                        </span>
                      </div>
                    }
                  />
                )
              })}
            </div>
          )}

          {processedRising.length > 10 && (
            <div className="pt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Top {visibleRising.length} of {processedRising.length}</span>
              <button
                type="button"
                onClick={() => setShowAllRising((prev) => !prev)}
                className="font-semibold text-primary hover:underline"
              >
                {showAllRising ? "Show top 10" : `Show all ${processedRising.length}`}
              </button>
            </div>
          )}
        </section>

        {/* Top Declining Skills */}
        <section>
          <SectionHeader
            title="Contracting Requirements (Declining)"
            subtitle={`Bar length = size of the change in share; number = current share. ${visibleDeclining.length} skills shown.`}
          />

          {trendsLoading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : trendsError ? (
            <ErrorState message={trendsError} onRetry={loadTrends} compact />
          ) : visibleDeclining.length === 0 ? (
            <EmptyState title="No declining skills" description="No skills recorded contracting momentum." />
          ) : (
            <div className="divide-y divide-border/70 border-b border-border/70">
              {visibleDeclining.map((item, idx) => {
                const widthPct = Math.min(100, Math.max(8, Math.round((Math.abs(item.change) / maxDecliningChange) * 100)))
                const lowSample = isLowSample(item.postingsLatest)

                return (
                  <TypographicRow
                    key={item.skillId}
                    rank={idx + 1}
                    title={item.name}
                    subtitle={item.category}
                    staggerIndex={idx}
                    primaryFigure={formatPercent(item.shareLatest)}
                    badges={
                      <div className="flex items-center gap-1.5">
                        {lowSample && <LowSampleBadge />}
                        <DeltaBadge value={item.change} size="sm" showLabel />
                      </div>
                    }
                    onClick={() => openSkillDrawer(item.skillId, item.name)}
                    visual={
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 flex-1 rounded-full bg-muted/60 overflow-hidden" aria-hidden="true">
                          <div
                            className="h-full rounded-full bg-negative transition-all duration-300"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono tabular-nums font-medium text-negative-foreground shrink-0">
                          {formatPercentagePoints(item.change)}
                        </span>
                      </div>
                    }
                  />
                )
              })}
            </div>
          )}

          {processedDeclining.length > 10 && (
            <div className="pt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Top {visibleDeclining.length} of {processedDeclining.length}</span>
              <button
                type="button"
                onClick={() => setShowAllDeclining((prev) => !prev)}
                className="font-semibold text-primary hover:underline"
              >
                {showAllDeclining ? "Show top 10" : `Show all ${processedDeclining.length}`}
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Caution footnote */}
      <div className="rounded-lg border border-border/80 bg-muted/20 p-3.5 flex items-start gap-2.5 text-xs text-muted-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0 text-attention mt-0.5" aria-hidden="true" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-foreground">Sampling Notice:</strong> The &quot;low sample&quot; badge indicates fewer than {LOW_SAMPLE_THRESHOLD} postings for this skill in the latest window. District evaluations naturally possess smaller sample counts; percentages should be interpreted alongside raw volume.
        </p>
      </div>

      {/* 4. Side Panel / Drawer for Skill Details (1-click drilldown) */}
      <Drawer
        isOpen={Boolean(drawerSkill)}
        onClose={() => setDrawerSkill(null)}
        title={drawerSkill?.name || "Skill Details"}
        subtitle={
          drawerSkill && drawerSkill.skillId > 0
            ? `${drawerCategory} · ${selectedDistrictName}`
            : undefined
        }
      >
        {!drawerSkill || drawerSkill.skillId <= 0 ? (
          <EmptyState
            title="No skill selected"
            description="Select a skill from the bar list or chart to inspect its longitudinal trend."
          />
        ) : drawerLoading ? (
          <div className="space-y-4">
            <ChartSkeleton height={200} />
            <TableSkeleton rows={4} cols={3} />
          </div>
        ) : drawerError ? (
          <ErrorState
            message={drawerError}
            onRetry={() => openSkillDrawer(drawerSkill.skillId, drawerSkill.name)}
            compact
          />
        ) : !drawerTrend || drawerTrend.points.length === 0 ? (
          <EmptyState
            title="No monthly history"
            description="No monthly demand observations found for this skill in the selected scope."
          />
        ) : (
          <div className="space-y-5 text-xs">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Trajectory Delta
                </span>
                <div className="pt-0.5">
                  <DeltaBadge value={drawerChange} showLabel size="md" />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Relative Shift
                </span>
                <div className="font-serif text-lg font-bold font-mono text-foreground">
                  {drawerGrowth !== null
                    ? `${drawerGrowth >= 0 ? "+" : ""}${(drawerGrowth * 100).toFixed(1)}%`
                    : "New requirement"}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Previous Share
                </span>
                <div className="font-serif text-lg font-bold font-mono text-foreground">
                  {formatPercent(drawerSharePrevious)}
                </div>
                <span className="text-[10px] text-muted-foreground block font-mono">
                  ({drawerPostingsPrevious} postings)
                </span>
              </div>

              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Latest Share
                </span>
                <div className="font-serif text-lg font-bold font-mono text-primary">
                  {formatPercent(drawerShareLatest)}
                </div>
                <span className="text-[10px] text-muted-foreground block font-mono">
                  ({drawerPostingsLatest} postings)
                </span>
              </div>
            </div>

            {/* Monthly Trend in Drawer */}
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Longitudinal 18-Month Trajectory
              </h4>
              <div className="h-48 w-full border border-border rounded-lg p-2 bg-card">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={drawerTrend.points.map((pt) => ({
                      month: pt.month,
                      sharePct: Number((pt.share * 100).toFixed(1)),
                      postings: pt.postingsWithSkill,
                    }))}
                    margin={{ top: 8, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                    />
                    <YAxis
                      unit="%"
                      tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          valueFormatter={(v) => `${v}%`}
                          labelFormatter={(l) => `Cohort: ${l}`}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="sharePct"
                      name="Demand Share"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="var(--primary)"
                      fillOpacity={0.15}
                      isAnimationActive={isChartAnimationActive}
                      animationDuration={550}
                      animationEasing="ease-out"
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Points Breakdown */}
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Monthly Data Points
              </h4>
              <div className="border-t border-b border-border max-h-48 overflow-y-auto divide-y divide-border text-xs">
                <div className="grid grid-cols-4 gap-2 py-1.5 px-2 text-[11px] font-medium text-muted-foreground bg-muted/30 sticky top-0">
                  <span>Month</span>
                  <span className="text-right">Postings</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">Share</span>
                </div>
                {drawerTrend.points.map((pt) => (
                  <div
                    key={pt.month}
                    className="grid grid-cols-4 gap-2 py-1.5 px-2 hover:bg-muted/30 items-center"
                  >
                    <span className="font-mono text-[11px] text-foreground">{pt.month}</span>
                    <span className="text-right font-mono tabular-nums text-foreground">
                      {formatInteger(pt.postingsWithSkill)}
                    </span>
                    <span className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatInteger(pt.postingsTotal)}
                    </span>
                    <span className="text-right font-mono tabular-nums font-semibold text-primary">
                      {formatPercent(pt.share)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Link to Skill Demand Analysis */}
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Explore across all roles:</span>
              <a
                href={`/policy/skill-demand?district=${selectedDistrictId || ""}`}
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                <span>Skill demand view</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
