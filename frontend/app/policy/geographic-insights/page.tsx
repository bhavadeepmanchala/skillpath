"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import {
  Search,
  TrendingUp,
  TrendingDown,
  Info,
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
  fetchDistricts,
  fetchTopSkills,
  fetchDemandTrends,
  isLowSample,
  type DistrictDemandItem,
  type DemandSkillsResponse,
  type DemandTrendsResponse,
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

interface ActiveDrawerDistrict {
  districtId: number
  name: string
  state?: string
  postings?: number
}

export default function GeographicInsightsPage() {
  // Date window filters
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")

  // Districts data
  const [districts, setDistricts] = useState<DistrictDemandItem[]>([])
  const [districtsLoading, setDistrictsLoading] = useState(true)
  const [districtsError, setDistrictsError] = useState<string | null>(null)

  // View & interactive filters
  const [selectedState, setSelectedState] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [barViewMode, setBarViewMode] = useState<"chart" | "table">("chart")

  // Selected district drawer
  const [drawerDistrict, setDrawerDistrict] = useState<ActiveDrawerDistrict | null>(null)
  const [districtSkills, setDistrictSkills] = useState<DemandSkillsResponse | null>(null)
  const [districtTrends, setDistrictTrends] = useState<DemandTrendsResponse | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)

  // 1. Fetch districts
  const loadDistricts = useCallback(async () => {
    setDistrictsLoading(true)
    setDistrictsError(null)
    try {
      const data = await fetchDistricts({
        from: fromDate || undefined,
        to: toDate || undefined,
      })
      setDistricts(data.districts)
    } catch {
      setDistrictsError("Could not load data. Is the backend running?")
    } finally {
      setDistrictsLoading(false)
    }
  }, [fromDate, toDate])

  useEffect(() => {
    loadDistricts()
  }, [loadDistricts])

  // 2. Shared opener: openDistrictDrawer(districtId, name)
  const openDistrictDrawer = useCallback(
    async (districtId?: number | string | null, name?: string) => {
      if (!districtId) {
        setDrawerDistrict({ districtId: 0, name: name || "Unknown District" })
        setDrawerLoading(false)
        setDrawerError(null)
        setDistrictSkills(null)
        setDistrictTrends(null)
        return
      }

      const numericId = Number(districtId)
      if (isNaN(numericId) || numericId <= 0) {
        setDrawerDistrict({ districtId: 0, name: name || "Unknown District" })
        setDrawerLoading(false)
        setDrawerError(null)
        setDistrictSkills(null)
        setDistrictTrends(null)
        return
      }

      const found = districts.find((d) => d.districtId === numericId)
      setDrawerDistrict({
        districtId: numericId,
        name: found?.name || name || `District #${numericId}`,
        state: found?.state,
        postings: found?.postings,
      })
      setDrawerLoading(true)
      setDrawerError(null)
      setDistrictSkills(null)
      setDistrictTrends(null)
      try {
        const [skillsRes, trendsRes] = await Promise.all([
          fetchTopSkills({ districtId: numericId, limit: 10 }),
          fetchDemandTrends({ districtId: numericId, limit: 5 }),
        ])
        setDistrictSkills(skillsRes)
        setDistrictTrends(trendsRes)
      } catch {
        setDrawerError("Could not load district details. Is the backend running?")
      } finally {
        setDrawerLoading(false)
      }
    },
    [districts]
  )

  // Derived state list
  const stateList = useMemo(() => {
    const states = Array.from(new Set(districts.map((d) => d.state))).sort()
    return states
  }, [districts])

  // Filtered and sorted districts
  const filteredDistricts = useMemo(() => {
    return districts
      .filter((d) => {
        const matchesState = selectedState === "ALL" || d.state === selectedState
        const query = searchQuery.trim().toLowerCase()
        const matchesQuery =
          !query ||
          d.name.toLowerCase().includes(query) ||
          d.state.toLowerCase().includes(query)
        return matchesState && matchesQuery
      })
      .sort((a, b) => b.postings - a.postings)
  }, [districts, selectedState, searchQuery])

  // Min and max postings for sequential color scale
  const { minPostings, maxPostings } = useMemo(() => {
    if (districts.length === 0) return { minPostings: 0, maxPostings: 1 }
    let min = Infinity
    let max = -Infinity
    for (const d of districts) {
      if (d.postings < min) min = d.postings
      if (d.postings > max) max = d.postings
    }
    return { minPostings: min === Infinity ? 0 : min, maxPostings: max <= 0 ? 1 : max }
  }, [districts])

  // Sequential single-hue color scale (Teal family)
  const getSequentialShade = (postings: number) => {
    if (maxPostings === minPostings) return "bg-primary/20 border-primary/30"
    const ratio = (postings - minPostings) / (maxPostings - minPostings)

    if (ratio > 0.75) return "bg-sky-600 text-white border-sky-700"
    if (ratio > 0.5) return "bg-sky-500/80 text-white border-sky-600"
    if (ratio > 0.25) return "bg-sky-200 text-sky-950 dark:bg-sky-900/60 dark:text-sky-100 border-sky-300 dark:border-sky-800"
    return "bg-sky-50 text-sky-900 dark:bg-sky-950/30 dark:text-sky-200 border-sky-200/60 dark:border-sky-900/50"
  }

  // Districts grouped by state for District Grid
  const districtsByState = useMemo(() => {
    const map = new Map<string, DistrictDemandItem[]>()
    for (const d of filteredDistricts) {
      const arr = map.get(d.state) || []
      arr.push(d)
      map.set(d.state, arr)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredDistricts])

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Geographic Insights"
        description="Spatial distribution of hiring demand across 40 monitored districts in 16 states, highlighting regional talent demand hubs."
        showSyntheticBadge
      />

      {/* Date Window & Search FilterBar */}
      <FilterBar
        isFiltered={Boolean(fromDate || toDate || selectedState !== "ALL" || searchQuery)}
        onReset={() => {
          setFromDate("")
          setToDate("")
          setSelectedState("ALL")
          setSearchQuery("")
        }}
      >
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="from-month" className="text-muted-foreground font-medium shrink-0">
            From:
          </label>
          <input
            id="from-month"
            type="text"
            placeholder="YYYY-MM (e.g. 2025-04)"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-32 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="to-month" className="text-muted-foreground font-medium shrink-0">
            To:
          </label>
          <input
            id="to-month"
            type="text"
            placeholder="YYYY-MM (e.g. 2026-09)"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-32 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <SelectField
          id="state-filter"
          label="State"
          value={selectedState}
          onChange={(val) => setSelectedState(val)}
          options={[
            { label: "All States (16)", value: "ALL" },
            ...stateList.map((st) => ({ label: st, value: st })),
          ]}
          disabled={districtsLoading}
        />

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search district or state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </FilterBar>

      {/* District Grid (Grouped by State) */}
      <SectionCard
        title="Regional District Density Grid"
        subtitle={`Comparative hiring density across ${filteredDistricts.length} districts grouped by state. Darker shading reflects higher aggregate job postings.`}
        actionSlot={
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Low</span>
            <div className="flex items-center gap-0.5">
              <span className="h-3 w-4 rounded-xs bg-sky-50 border border-sky-200 dark:bg-sky-950/30" />
              <span className="h-3 w-4 rounded-xs bg-sky-200 border border-sky-300 dark:bg-sky-900/60" />
              <span className="h-3 w-4 rounded-xs bg-sky-500/80 border border-sky-600" />
              <span className="h-3 w-4 rounded-xs bg-sky-600 border border-sky-700" />
            </div>
            <span>High</span>
          </div>
        }
      >
        {districtsLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 py-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="h-16 rounded-md bg-muted/60 animate-pulse" />
            ))}
          </div>
        ) : districtsError ? (
          <ErrorState message={districtsError} onRetry={loadDistricts} />
        ) : districtsByState.length === 0 ? (
          <EmptyState title="No matching districts" description="Try clearing your search query or state filter." />
        ) : (
          <div className="space-y-4">
            {districtsByState.map(([stateName, districtGroup]) => (
              <div key={stateName} className="space-y-1.5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {stateName} ({districtGroup.length})
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {districtGroup.map((d) => {
                    const shadeClass = getSequentialShade(d.postings)
                    return (
                      <button
                        key={d.districtId}
                        type="button"
                        onClick={() => openDistrictDrawer(d.districtId, d.name)}
                        className={`flex flex-col justify-between p-2.5 rounded-md border text-left transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${shadeClass}`}
                        title={`${d.name}, ${d.state}: ${d.postings.toLocaleString()} postings`}
                      >
                        <span className="font-semibold text-xs truncate w-full">{d.name}</span>
                        <div className="mt-2 flex items-center justify-between text-[11px] font-mono tabular-nums opacity-90">
                          <span>{d.postings.toLocaleString()}</span>
                          <span className="text-[10px] opacity-75">openings</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Note on Real Map */}
            <div className="flex items-center gap-2 pt-3 border-t border-border/60 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden="true" />
              <span>
                District grid groups regional centers. Rendering an interactive geospatial boundary map of India requires installing GeoJSON boundary assets and a dedicated mapping engine.
              </span>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Ranked Bar Chart of Districts */}
      <SectionCard
        title={`Ranked Hiring Volume (${filteredDistricts.length} Districts)`}
        subtitle="Ranked order of tracked job postings across monitored districts"
        showViewToggle
        viewMode={barViewMode}
        onViewModeChange={setBarViewMode}
      >
        {districtsLoading ? (
          <ChartSkeleton height={400} />
        ) : districtsError ? (
          <ErrorState message={districtsError} onRetry={loadDistricts} />
        ) : filteredDistricts.length === 0 ? (
          <EmptyState title="No districts found" description="No districts matched the filter criteria." />
        ) : barViewMode === "chart" ? (
          <div className="space-y-2">
            <div
              style={{ height: Math.max(360, filteredDistricts.length * 24) }}
              className="w-full"
              aria-label="Ranked bar chart of district hiring volume"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[...filteredDistricts].reverse()}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
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
                    tick={{ fontSize: 10, fill: "var(--foreground)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    width={110}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(v) => `${v.toLocaleString()} postings`}
                        labelFormatter={(l) => `District: ${l}`}
                      />
                    }
                  />
                  <Bar
                    dataKey="postings"
                    name="Job Postings"
                    fill="var(--primary)"
                    radius={[0, 3, 3, 0]}
                    barSize={14}
                    onClick={(data: unknown) => {
                      const record = data as { payload?: { districtId?: number; name?: string }; districtId?: number; name?: string } | undefined
                      const payload = record?.payload || record
                      if (payload && payload.districtId) {
                        openDistrictDrawer(payload.districtId, payload.name)
                      }
                    }}
                  >
                    {[...filteredDistricts].reverse().map((entry) => (
                      <Cell
                        key={`cell-${entry.districtId}`}
                        className="cursor-pointer hover:opacity-85"
                        onClick={() => openDistrictDrawer(entry.districtId, entry.name)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              Tip: Click any district bar or table row to inspect its top skills and trend trajectory.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="District postings table">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="py-2.5 pr-3 font-medium">Rank</th>
                  <th className="py-2.5 px-3 font-medium">District</th>
                  <th className="py-2.5 px-3 font-medium">State</th>
                  <th className="py-2.5 pl-3 text-right font-medium">Postings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredDistricts.map((d, index) => (
                  <tr
                    key={d.districtId}
                    onClick={() => openDistrictDrawer(d.districtId, d.name)}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-2 pr-3 font-mono font-medium text-muted-foreground">{index + 1}</td>
                    <td className="py-2 px-3 font-semibold text-foreground">{d.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{d.state}</td>
                    <td className="py-2 pl-3 text-right font-mono font-semibold tabular-nums text-foreground">
                      {d.postings.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* District Drawer */}
      <Drawer
        isOpen={Boolean(drawerDistrict)}
        onClose={() => setDrawerDistrict(null)}
        title={drawerDistrict?.name || "District Details"}
        subtitle={
          drawerDistrict && drawerDistrict.districtId > 0
            ? `${drawerDistrict.state || "Monitored District"}${
                drawerDistrict.postings !== undefined
                  ? ` — ${drawerDistrict.postings.toLocaleString()} total job postings`
                  : ""
              }`
            : undefined
        }
      >
        {!drawerDistrict || drawerDistrict.districtId <= 0 ? (
          <EmptyState
            title="No district selected"
            description="A valid district identifier was not provided. Please click a district from the grid, chart, or table."
          />
        ) : drawerLoading ? (
          <div className="space-y-4">
            <TableSkeleton rows={5} cols={3} />
            <TableSkeleton rows={4} cols={2} />
          </div>
        ) : drawerError ? (
          <ErrorState
            message={drawerError}
            onRetry={() => openDistrictDrawer(drawerDistrict.districtId, drawerDistrict.name)}
            compact
          />
        ) : (!districtSkills || districtSkills.skills.length === 0) &&
          (!districtTrends || (districtTrends.rising.length === 0 && districtTrends.declining.length === 0)) ? (
          <EmptyState
            title="No district data"
            description="No demand skills or trend records were found for this district."
          />
        ) : (
          <div className="space-y-6">
            {/* Top 10 Skills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Top 10 Required Skills
                </h4>
                {districtSkills && (
                  <span className="text-[11px] text-muted-foreground">
                    Scope: {districtSkills.totalPostingsInScope.toLocaleString()} postings
                  </span>
                )}
              </div>

              {!districtSkills || districtSkills.skills.length === 0 ? (
                <EmptyState title="No skills found" description="No skill records available for this district." />
              ) : (
                <div className="border border-border/80 rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground">
                      <tr>
                        <th className="py-1.5 px-2.5 font-medium">#</th>
                        <th className="py-1.5 px-2.5 font-medium">Skill</th>
                        <th className="py-1.5 px-2.5 font-medium">Category</th>
                        <th className="py-1.5 px-2.5 text-right font-medium">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {districtSkills.skills.slice(0, 10).map((s, idx) => (
                        <tr key={s.skillId} className="hover:bg-muted/30">
                          <td className="py-1.5 px-2.5 font-mono text-[11px] text-muted-foreground">{idx + 1}</td>
                          <td className="py-1.5 px-2.5 font-semibold text-foreground">{s.name}</td>
                          <td className="py-1.5 px-2.5 text-muted-foreground text-[11px]">{s.category}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-semibold text-primary">
                            {(s.share * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Rising & Declining Skills */}
            <div className="space-y-4 pt-2 border-t border-border/60">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Emerging & Declining Trajectory (Window: 3 Months)
              </h4>

              {districtTrends ? (
                <div className="space-y-4">
                  {/* Rising */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Top Rising Skills
                    </span>
                    {districtTrends.rising.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No rising skills met volume threshold.</p>
                    ) : (
                      <div className="border border-border/80 rounded-md overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <tbody className="divide-y divide-border/40">
                            {districtTrends.rising.slice(0, 5).map((r) => {
                              const lowSample = isLowSample(r.postingsLatest)
                              return (
                                <tr key={r.skillId} className="hover:bg-muted/30">
                                  <td className="py-1.5 px-2.5 font-medium text-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <span>{r.name}</span>
                                      {lowSample && <LowSampleBadge />}
                                    </div>
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right">
                                    <DeltaBadge value={r.change} size="sm" />
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Declining */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" /> Top Declining Skills
                    </span>
                    {districtTrends.declining.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No declining skills met volume threshold.</p>
                    ) : (
                      <div className="border border-border/80 rounded-md overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <tbody className="divide-y divide-border/40">
                            {districtTrends.declining.slice(0, 5).map((d) => {
                              const lowSample = isLowSample(d.postingsLatest)
                              return (
                                <tr key={d.skillId} className="hover:bg-muted/30">
                                  <td className="py-1.5 px-2.5 font-medium text-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <span>{d.name}</span>
                                      {lowSample && <LowSampleBadge />}
                                    </div>
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right">
                                    <DeltaBadge value={d.change} size="sm" />
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
