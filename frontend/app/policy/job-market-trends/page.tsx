"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import {
  TrendingUp,
  TrendingDown,
  Info,
  AlertTriangle,
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
} from "@/lib/demand-api"
import {
  PageHeader,
  SectionCard,
  FilterBar,
  SelectField,
  DeltaBadge,
  LowSampleBadge,
  Drawer,
  ErrorState,
  EmptyState,
  ChartTooltip,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/ui-kit"

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
        limit: 10,
      })
      setTrends(data)
    } catch {
      setTrendsError("Could not load data. Is the backend running?")
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
      if (!skillId) {
        setDrawerSkill({ skillId: 0, name: name || "Unknown Skill" })
        setDrawerLoading(false)
        setDrawerError(null)
        setDrawerTrend(null)
        return
      }

      const numericId = Number(skillId)
      if (isNaN(numericId) || numericId <= 0) {
        setDrawerSkill({ skillId: 0, name: name || "Unknown Skill" })
        setDrawerLoading(false)
        setDrawerError(null)
        setDrawerTrend(null)
        return
      }

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
        setDrawerError("Could not load skill trend data. Is the backend running?")
        setDrawerTrend(null)
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

  // Diverging chart items: Combine rising and declining skills
  const divergingChartData = useMemo(() => {
    if (!trends) return []
    const risingItems = trends.rising.map((item) => ({
      name: item.name,
      category: item.category,
      skillId: item.skillId,
      changePp: Number((item.change * 100).toFixed(2)),
      type: "rising" as const,
      raw: item,
    }))
    const decliningItems = trends.declining.map((item) => ({
      name: item.name,
      category: item.category,
      skillId: item.skillId,
      changePp: Number((item.change * 100).toFixed(2)),
      type: "declining" as const,
      raw: item,
    }))
    return [...risingItems, ...decliningItems]
  }, [trends])

  const selectedDistrictName = useMemo(() => {
    if (!selectedDistrictId) return "All Districts (Pan-India)"
    const found = districts.find((d) => String(d.districtId) === selectedDistrictId)
    return found ? `${found.name}, ${found.state}` : "Selected District"
  }, [districts, selectedDistrictId])

  // Find active trend item in rising/declining if available
  const activeTrendItem = useMemo(() => {
    if (!drawerSkill || !trends || drawerSkill.skillId <= 0) return null
    return (
      trends.rising.find((s) => s.skillId === drawerSkill.skillId) ||
      trends.declining.find((s) => s.skillId === drawerSkill.skillId) ||
      null
    )
  }, [drawerSkill, trends])

  // Derive metrics for drawer
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

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Job Market Trends"
        description="Shift in employer demand share across window cohorts, separating accelerating competencies from declining requirements."
        showSyntheticBadge
      />

      {/* Filter Bar */}
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

      {/* Diverging Bar Chart */}
      <SectionCard
        title="Diverging Trajectory of Demand Share"
        subtitle={
          trends
            ? `Shift in percentage points comparing latest window (${trends.latestWindow.from} to ${trends.latestWindow.to}) vs previous window (${trends.previousWindow.from} to ${trends.previousWindow.to}) in ${selectedDistrictName}`
            : "Shift in percentage points between comparison windows"
        }
        showViewToggle
        viewMode={chartViewMode}
        onViewModeChange={setChartViewMode}
      >
        {trendsLoading ? (
          <ChartSkeleton height={320} />
        ) : trendsError ? (
          <ErrorState message={trendsError} onRetry={loadTrends} />
        ) : !trends || (trends.rising.length === 0 && trends.declining.length === 0) ? (
          <EmptyState title="No trend data" description="No skills met the minimum postings threshold for this window." />
        ) : chartViewMode === "chart" ? (
          <div className="space-y-3">
            <div className="h-96 w-full" aria-label="Diverging horizontal bar chart of skill demand changes">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={divergingChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.6} />
                  <XAxis
                    type="number"
                    unit=" pp"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: "var(--foreground)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    width={110}
                  />
                  <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1.5} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(v) => `${v > 0 ? "+" : ""}${v} pp`}
                        labelFormatter={(label) => `Skill: ${label}`}
                      />
                    }
                  />
                  <Bar
                    dataKey="changePp"
                    name="Demand Share Delta"
                    radius={[4, 4, 4, 4]}
                    onClick={(data: unknown) => {
                      const record = data as { payload?: { skillId?: number; name?: string }; skillId?: number; name?: string } | undefined
                      const payload = record?.payload || record
                      if (payload && payload.skillId) {
                        openSkillDrawer(payload.skillId, payload.name)
                      }
                    }}
                  >
                    {divergingChartData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.changePp >= 0 ? "var(--positive)" : "var(--negative)"}
                        className="cursor-pointer hover:opacity-85"
                        onClick={() => openSkillDrawer(entry.skillId, entry.name)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Note under chart */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" aria-hidden="true" />
                <span>
                  Ranked by absolute change in demand share. Skills with very few postings are excluded (minimum {trends.minPostings} postings across both windows).
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                Click any bar or table row to inspect longitudinal history.
              </span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Trajectory</th>
                  <th className="py-2 px-3 font-medium">Skill</th>
                  <th className="py-2 px-3 font-medium">Category</th>
                  <th className="py-2 pl-3 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {divergingChartData.map((item) => (
                  <tr
                    key={item.skillId}
                    onClick={() => openSkillDrawer(item.skillId, item.name)}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-2 pr-3">
                      {item.type === "rising" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <TrendingUp className="h-3.5 w-3.5" /> Rising
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                          <TrendingDown className="h-3.5 w-3.5" /> Declining
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-semibold text-foreground">{item.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{item.category}</td>
                    <td className="py-2 pl-3 text-right">
                      <DeltaBadge value={item.changePp} asPercentagePoints />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Tables: Rising Skills & Declining Skills */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Rising Skills Table */}
        <SectionCard
          title="Rising Skills"
          subtitle={
            trends
              ? `Competencies with expanding hiring footprint (${trends.latestWindow.from} to ${trends.latestWindow.to})`
              : "Competencies with expanding hiring footprint"
          }
        >
          {trendsLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : trendsError ? (
            <ErrorState message={trendsError} onRetry={loadTrends} compact />
          ) : !trends || trends.rising.length === 0 ? (
            <EmptyState title="No rising skills" description="No rising skills detected in this window." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Rising skills table">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Skill</th>
                    <th className="py-2 px-2 text-right font-medium">Prev Share</th>
                    <th className="py-2 px-2 text-right font-medium">Latest Share</th>
                    <th className="py-2 px-2 text-right font-medium">Change</th>
                    <th className="py-2 px-2 text-right font-medium hidden sm:table-cell">Growth</th>
                    <th className="py-2 pl-2 text-right font-medium hidden md:table-cell">Postings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {trends.rising.map((item) => {
                    const lowSample = isLowSample(item.postingsLatest)
                    return (
                      <tr
                        key={item.skillId}
                        onClick={() => openSkillDrawer(item.skillId, item.name)}
                        className="cursor-pointer hover:bg-muted/40 transition-colors group"
                      >
                        <td className="py-2.5 pr-2">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{item.category}</span>
                              {lowSample && <LowSampleBadge />}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-muted-foreground">
                          {(item.sharePrevious * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums font-medium text-foreground">
                          {(item.shareLatest * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <DeltaBadge value={item.change} size="sm" />
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-muted-foreground hidden sm:table-cell">
                          {item.relativeGrowth !== null
                            ? `${item.relativeGrowth >= 0 ? "+" : ""}${(item.relativeGrowth * 100).toFixed(1)}%`
                            : <span className="text-[11px] font-sans font-medium text-emerald-600">new</span>}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-mono tabular-nums text-muted-foreground hidden md:table-cell">
                          {item.postingsPrevious} → {item.postingsLatest}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Declining Skills Table */}
        <SectionCard
          title="Declining Skills"
          subtitle={
            trends
              ? `Competencies with contracting hiring footprint (${trends.latestWindow.from} to ${trends.latestWindow.to})`
              : "Competencies with contracting hiring footprint"
          }
        >
          {trendsLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : trendsError ? (
            <ErrorState message={trendsError} onRetry={loadTrends} compact />
          ) : !trends || trends.declining.length === 0 ? (
            <EmptyState title="No declining skills" description="No declining skills detected in this window." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Declining skills table">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Skill</th>
                    <th className="py-2 px-2 text-right font-medium">Prev Share</th>
                    <th className="py-2 px-2 text-right font-medium">Latest Share</th>
                    <th className="py-2 px-2 text-right font-medium">Change</th>
                    <th className="py-2 px-2 text-right font-medium hidden sm:table-cell">Growth</th>
                    <th className="py-2 pl-2 text-right font-medium hidden md:table-cell">Postings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {trends.declining.map((item) => {
                    const lowSample = isLowSample(item.postingsLatest)
                    return (
                      <tr
                        key={item.skillId}
                        onClick={() => openSkillDrawer(item.skillId, item.name)}
                        className="cursor-pointer hover:bg-muted/40 transition-colors group"
                      >
                        <td className="py-2.5 pr-2">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{item.category}</span>
                              {lowSample && <LowSampleBadge />}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-muted-foreground">
                          {(item.sharePrevious * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums font-medium text-foreground">
                          {(item.shareLatest * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <DeltaBadge value={item.change} size="sm" />
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-muted-foreground hidden sm:table-cell">
                          {item.relativeGrowth !== null
                            ? `${item.relativeGrowth >= 0 ? "+" : ""}${(item.relativeGrowth * 100).toFixed(1)}%`
                            : <span className="text-[11px] font-sans font-medium text-muted-foreground">-</span>}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-mono tabular-nums text-muted-foreground hidden md:table-cell">
                          {item.postingsPrevious} → {item.postingsLatest}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Caution footnote */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 flex items-start gap-2.5 text-xs text-muted-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden="true" />
        <p>
          <strong className="font-semibold text-foreground">Display Caution:</strong> The &quot;low sample&quot; badge indicates fewer than {LOW_SAMPLE_THRESHOLD} postings for this skill in the latest window; district views have smaller samples. It serves as a visual reminder that percentage shifts on modest volume can exhibit heightened statistical volatility.
        </p>
      </div>

      {/* Side Panel / Drawer for Skill Details */}
      <Drawer
        isOpen={Boolean(drawerSkill)}
        onClose={() => setDrawerSkill(null)}
        title={drawerSkill?.name || "Skill Details"}
        subtitle={
          drawerSkill && drawerSkill.skillId > 0
            ? `${drawerCategory} — ${selectedDistrictName}`
            : undefined
        }
      >
        {!drawerSkill || drawerSkill.skillId <= 0 ? (
          <EmptyState
            title="No skill selected"
            description="A valid skill identifier was not provided. Please select a skill from the chart or table."
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
          <div className="space-y-5">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-border bg-card p-3">
                <span className="text-[11px] text-muted-foreground font-medium">Trajectory Delta</span>
                <div className="mt-1">
                  <DeltaBadge value={drawerChange} showLabel />
                </div>
              </div>
              <div className="rounded border border-border bg-card p-3">
                <span className="text-[11px] text-muted-foreground font-medium">Relative Growth</span>
                <div className="mt-1 text-sm font-mono font-semibold text-foreground">
                  {drawerGrowth !== null
                    ? `${drawerGrowth >= 0 ? "+" : ""}${(drawerGrowth * 100).toFixed(1)}%`
                    : "New skill"}
                </div>
              </div>
              <div className="rounded border border-border bg-card p-3">
                <span className="text-[11px] text-muted-foreground font-medium">Previous Share</span>
                <div className="mt-1 text-sm font-mono font-medium text-foreground">
                  {(drawerSharePrevious * 100).toFixed(1)}%
                </div>
                <span className="text-[10px] text-muted-foreground">({drawerPostingsPrevious} postings)</span>
              </div>
              <div className="rounded border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium">Latest Share</span>
                  {isLowSample(drawerPostingsLatest) && <LowSampleBadge />}
                </div>
                <div className="mt-1 text-sm font-mono font-semibold text-primary">
                  {(drawerShareLatest * 100).toFixed(1)}%
                </div>
                <span className="text-[10px] text-muted-foreground">({drawerPostingsLatest} postings)</span>
              </div>
            </div>

            {/* Monthly Trend in Drawer */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">Longitudinal Monthly Trajectory</h4>
              <div className="h-48 w-full border border-border/80 rounded-md p-2 bg-card">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={drawerTrend.points.map((pt) => ({
                      month: pt.month,
                      sharePct: Number((pt.share * 100).toFixed(1)),
                      postings: pt.postingsWithSkill,
                    }))}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="drawerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                          labelFormatter={(l) => `Month: ${l}`}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="sharePct"
                      name="Demand Share"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="url(#drawerGradient)"
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Points Breakdown */}
            {drawerTrend.points.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground">Monthly Data Points</h4>
                <div className="border border-border/80 rounded-md overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground sticky top-0">
                      <tr>
                        <th className="py-1.5 px-2 font-medium">Month</th>
                        <th className="py-1.5 px-2 text-right font-medium">Skill Postings</th>
                        <th className="py-1.5 px-2 text-right font-medium">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {drawerTrend.points.map((pt) => (
                        <tr key={pt.month} className="hover:bg-muted/30">
                          <td className="py-1.5 px-2 font-mono text-[11px] text-foreground">{pt.month}</td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums text-foreground">
                            {pt.postingsWithSkill.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums font-semibold text-primary">
                            {(pt.share * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
