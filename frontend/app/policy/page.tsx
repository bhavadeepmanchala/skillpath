"use client"

import React, { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Briefcase,
  Sparkles,
  Users,
  MapPin,
  GraduationCap,
  Calendar,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts"
import {
  fetchDemandSummary,
  fetchDemandTrends,
  fetchDistricts,
  type DemandSummary,
  type DemandTrendsResponse,
  type DistrictDemandItem,
} from "@/lib/demand-api"
import {
  PageHeader,
  KpiCard,
  KpiCardSkeleton,
  SectionCard,
  DeltaBadge,
  ErrorState,
  EmptyState,
  ChartTooltip,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/ui-kit"

export default function PolicyOverviewPage() {
  // Summary KPIs state
  const [summary, setSummary] = useState<DemandSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  // Trends state
  const [trends, setTrends] = useState<DemandTrendsResponse | null>(null)
  const [trendsLoading, setTrendsLoading] = useState(true)
  const [trendsError, setTrendsError] = useState<string | null>(null)

  // Districts state
  const [districts, setDistricts] = useState<DistrictDemandItem[]>([])
  const [districtsLoading, setDistrictsLoading] = useState(true)
  const [districtsError, setDistrictsError] = useState<string | null>(null)
  const [districtsViewMode, setDistrictsViewMode] = useState<"chart" | "table">("chart")

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const data = await fetchDemandSummary()
      setSummary(data)
    } catch {
      setSummaryError("Could not load data. Is the backend running?")
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
      setTrendsError("Could not load data. Is the backend running?")
    } finally {
      setTrendsLoading(false)
    }
  }, [])

  const loadDistricts = useCallback(async () => {
    setDistrictsLoading(true)
    setDistrictsError(null)
    try {
      const data = await fetchDistricts()
      const sorted = [...data.districts].sort((a, b) => b.postings - a.postings).slice(0, 5)
      setDistricts(sorted)
    } catch {
      setDistrictsError("Could not load data. Is the backend running?")
    } finally {
      setDistrictsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSummary()
    loadTrends()
    loadDistricts()
  }, [loadSummary, loadTrends, loadDistricts])

  const maxRisingChange = Math.max(
    ...(trends?.rising.map((r) => Math.abs(r.change)) || [0.01]),
    0.01
  )
  const maxDecliningChange = Math.max(
    ...(trends?.declining.map((d) => Math.abs(d.change)) || [0.01]),
    0.01
  )

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Policy Intelligence Overview"
        description="High-level workforce demand signals, macro skill trajectories, and geographic concentrations across monitored regions."
        showSyntheticBadge
      />

      {/* 1. KPI Row from /api/demand/summary */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : summaryError ? (
        <ErrorState
          message={summaryError}
          onRetry={loadSummary}
          compact
        />
      ) : summary ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="Total Postings"
            rawValue={summary.totalPostings}
            footnote="Aggregated across all cohorts"
            icon={Briefcase}
          />
          <KpiCard
            label="Skills Tracked"
            rawValue={summary.totalSkills}
            footnote="Unique taxonomy skills"
            icon={Sparkles}
          />
          <KpiCard
            label="Roles"
            rawValue={summary.totalRoles}
            footnote="Target occupation profiles"
            icon={Users}
          />
          <KpiCard
            label="Districts"
            rawValue={summary.totalDistricts}
            footnote="Reporting geographic areas"
            icon={MapPin}
          />
          <KpiCard
            label="Courses"
            rawValue={summary.totalCourses}
            footnote="Curriculum supply items"
            icon={GraduationCap}
          />
          <KpiCard
            label={`Postings in ${summary.latestMonth}`}
            rawValue={summary.latestMonthPostings}
            footnote="Latest monthly cohort"
            icon={Calendar}
          />
        </div>
      ) : null}

      {/* 2. Emerging Skills & Declining Skills */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Emerging Skills */}
        <SectionCard
          title="Emerging Skills"
          subtitle={
            trends
              ? `Top 5 skills with largest increase in demand share (${trends.latestWindow.from} to ${trends.latestWindow.to})`
              : "Top 5 skills with largest increase in demand share"
          }
          actionSlot={
            <Link
              href="/policy/job-market-trends"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-2"
            >
              <span>View all trends</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          }
        >
          {trendsLoading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : trendsError ? (
            <ErrorState message={trendsError} onRetry={loadTrends} compact />
          ) : !trends || trends.rising.length === 0 ? (
            <EmptyState title="No emerging skills data" description="No rising skills found for the default window." />
          ) : (
            <div className="space-y-3">
              {trends.rising.map((item, idx) => {
                const widthPct = Math.min(100, Math.max(8, Math.round((Math.abs(item.change) / maxRisingChange) * 100)))
                return (
                  <div key={item.skillId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-muted-foreground bg-muted">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-foreground truncate">{item.name}</span>
                        <span className="text-[11px] text-muted-foreground truncate">({item.category})</span>
                      </div>
                      <DeltaBadge value={item.change} size="sm" showLabel />
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        {/* Declining Skills */}
        <SectionCard
          title="Declining Skills"
          subtitle={
            trends
              ? `Top 5 skills with largest decrease in demand share (${trends.latestWindow.from} to ${trends.latestWindow.to})`
              : "Top 5 skills with largest decrease in demand share"
          }
          actionSlot={
            <Link
              href="/policy/job-market-trends"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-2"
            >
              <span>View all trends</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          }
        >
          {trendsLoading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : trendsError ? (
            <ErrorState message={trendsError} onRetry={loadTrends} compact />
          ) : !trends || trends.declining.length === 0 ? (
            <EmptyState title="No declining skills data" description="No declining skills found for the default window." />
          ) : (
            <div className="space-y-3">
              {trends.declining.map((item, idx) => {
                const widthPct = Math.min(100, Math.max(8, Math.round((Math.abs(item.change) / maxDecliningChange) * 100)))
                return (
                  <div key={item.skillId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-muted-foreground bg-muted">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-foreground truncate">{item.name}</span>
                        <span className="text-[11px] text-muted-foreground truncate">({item.category})</span>
                      </div>
                      <DeltaBadge value={item.change} size="sm" showLabel />
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-rose-500 transition-all duration-300"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* 3. Top Districts by Postings */}
      <SectionCard
        title="Top Districts by Postings"
        subtitle="Top 5 regional centers by total tracked job openings across all recorded periods"
        showViewToggle
        viewMode={districtsViewMode}
        onViewModeChange={setDistrictsViewMode}
        actionSlot={
          <Link
            href="/policy/geographic-insights"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-2"
          >
            <span>Geographic insights</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        }
      >
        {districtsLoading ? (
          <ChartSkeleton height={220} />
        ) : districtsError ? (
          <ErrorState message={districtsError} onRetry={loadDistricts} />
        ) : districts.length === 0 ? (
          <EmptyState title="No district records" description="No district demand figures returned from backend." />
        ) : districtsViewMode === "chart" ? (
          <div className="h-64 w-full" aria-label="Horizontal bar chart of top 5 districts by postings">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...districts].reverse()}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
              >
                <XAxis
                  type="number"
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
                  width={90}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      valueFormatter={(v) => `${v.toLocaleString()} postings`}
                    />
                  }
                />
                <Bar
                  dataKey="postings"
                  name="Job Openings"
                  fill="var(--primary)"
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Rank</th>
                  <th className="py-2 px-4 font-medium">District</th>
                  <th className="py-2 px-4 font-medium">State</th>
                  <th className="py-2 pl-4 text-right font-medium">Postings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {districts.map((d, i) => (
                  <tr key={d.districtId} className="hover:bg-muted/30">
                    <td className="py-2.5 pr-4 font-mono font-medium text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 px-4 font-medium text-foreground">{d.name}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{d.state}</td>
                    <td className="py-2.5 pl-4 text-right font-mono font-medium text-foreground">
                      {d.postings.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
