"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import {
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  Check,
  Split,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts"
import {
  fetchDistricts,
  fetchTopSkills,
  fetchSkillTrend,
  type DistrictDemandItem,
  type DemandSkillsResponse,
  type SkillDemandItem,
  type SkillTrendResponse,
} from "@/lib/demand-api"
import {
  PageHeader,
  SectionCard,
  FilterBar,
  SelectField,
  ErrorState,
  EmptyState,
  ChartTooltip,
  ChartSkeleton,
  TableSkeleton,
  Skeleton,
  ProgressBar,
  useChartAnimation,
} from "@/components/ui-kit"

export default function SkillDemandPage() {
  // District filter
  const [districts, setDistricts] = useState<DistrictDemandItem[]>([])
  const [districtsLoading, setDistrictsLoading] = useState(true)
  const [districtsError, setDistrictsError] = useState<string | null>(null)
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("")

  // Skills table
  const [limit, setLimit] = useState<number>(10)
  const [skillsData, setSkillsData] = useState<DemandSkillsResponse | null>(null)
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillsError, setSkillsError] = useState<string | null>(null)

  // Selected skill & trend
  const [selectedSkill, setSelectedSkill] = useState<SkillDemandItem | null>(null)
  const [hoveredSkillId, setHoveredSkillId] = useState<number | null>(null)
  const [trendData, setTrendData] = useState<SkillTrendResponse | null>(null)
  const [trendLoading, setTrendLoading] = useState(false)
  const [trendError, setTrendError] = useState<string | null>(null)
  const [trendViewMode, setTrendViewMode] = useState<"chart" | "table">("chart")

  // National comparison trend
  const [compareAllDistricts, setCompareAllDistricts] = useState(false)
  const [nationalTrendData, setNationalTrendData] = useState<SkillTrendResponse | null>(null)
  const [nationalLoading, setNationalLoading] = useState(false)

  // 1. Load districts
  const loadDistricts = useCallback(async () => {
    setDistrictsLoading(true)
    setDistrictsError(null)
    try {
      const data = await fetchDistricts()
      setDistricts(data.districts)
    } catch {
      setDistrictsError("Could not load data. Is the backend running?")
    } finally {
      setDistrictsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDistricts()
  }, [loadDistricts])

  // 2. Load top skills
  const loadTopSkills = useCallback(async () => {
    setSkillsLoading(true)
    setSkillsError(null)
    try {
      const districtParam = selectedDistrictId ? Number(selectedDistrictId) : null
      const data = await fetchTopSkills({ districtId: districtParam, limit })
      setSkillsData(data)

      // Auto-select skill
      if (data.skills && data.skills.length > 0) {
        setSelectedSkill((prev) => {
          if (prev) {
            const found = data.skills.find((s) => s.skillId === prev.skillId)
            if (found) return found
          }
          return data.skills[0]
        })
      } else {
        setSelectedSkill(null)
      }
    } catch {
      setSkillsError("Could not load data. Is the backend running?")
      setSelectedSkill(null)
    } finally {
      setSkillsLoading(false)
    }
  }, [selectedDistrictId, limit])

  useEffect(() => {
    loadTopSkills()
  }, [loadTopSkills])

  // 3. Load primary trend data
  const loadTrend = useCallback(async () => {
    if (!selectedSkill) {
      setTrendData(null)
      return
    }
    setTrendLoading(true)
    setTrendError(null)
    try {
      const districtParam = selectedDistrictId ? Number(selectedDistrictId) : null
      const data = await fetchSkillTrend(selectedSkill.skillId, {
        districtId: districtParam,
      })
      setTrendData(data)
    } catch {
      setTrendError("Could not load data. Is the backend running?")
      setTrendData(null)
    } finally {
      setTrendLoading(false)
    }
  }, [selectedSkill, selectedDistrictId])

  useEffect(() => {
    loadTrend()
  }, [loadTrend])

  // 4. Load comparison trend (all districts) when toggle is active and district is selected
  useEffect(() => {
    if (!compareAllDistricts || !selectedDistrictId || !selectedSkill) {
      setNationalTrendData(null)
      return
    }
    let isMounted = true
    setNationalLoading(true)
    fetchSkillTrend(selectedSkill.skillId, { districtId: null })
      .then((data) => {
        if (isMounted) setNationalTrendData(data)
      })
      .catch((err) => {
        console.error("Failed to load national comparison trend:", err)
      })
      .finally(() => {
        if (isMounted) setNationalLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [compareAllDistricts, selectedDistrictId, selectedSkill])

  // Merged chart data for comparison
  const mergedChartPoints = useMemo(() => {
    if (!trendData || !trendData.points) return []
    const nationalMap = new Map<string, number>()
    if (nationalTrendData && nationalTrendData.points) {
      for (const pt of nationalTrendData.points) {
        nationalMap.set(pt.month, Number((pt.share * 100).toFixed(2)))
      }
    }

    return trendData.points.map((pt) => ({
      month: pt.month,
      localShare: Number((pt.share * 100).toFixed(2)),
      postingsWithSkill: pt.postingsWithSkill,
      postingsTotal: pt.postingsTotal,
      allDistrictsShare: nationalMap.has(pt.month) ? nationalMap.get(pt.month) : undefined,
    }))
  }, [trendData, nationalTrendData])

  // Top 10 districts by postings
  const top10Districts = useMemo(() => {
    return [...districts].sort((a, b) => b.postings - a.postings).slice(0, 10)
  }, [districts])

  const maxDistrictPostings = useMemo(() => {
    return top10Districts[0]?.postings || 1
  }, [top10Districts])

  const selectedDistrictName = useMemo(() => {
    if (!selectedDistrictId) return "All Districts (Pan-India)"
    const found = districts.find((d) => String(d.districtId) === selectedDistrictId)
    return found ? `${found.name}, ${found.state}` : "Selected District"
  }, [districts, selectedDistrictId])

  const districtOptions = useMemo(() => {
    const opts = [{ label: "All Districts (Pan-India)", value: "" }]
    const sorted = [...districts].sort((a, b) => a.name.localeCompare(b.name))
    for (const d of sorted) {
      opts.push({ label: `${d.name} (${d.state})`, value: String(d.districtId) })
    }
    return opts
  }, [districts])

  const isChartAnimationActive = useChartAnimation()

  return (
    <div className="space-y-6 animate-page-enter">
      <PageHeader
        title="Skill Demand Analysis"
        description="Granular demand distribution across skills, monthly longitudinal trend trajectories, and regional hiring concentrations."
        showSyntheticBadge
      />

      {/* Filter Bar */}
      <FilterBar
        isFiltered={Boolean(selectedDistrictId)}
        onReset={() => setSelectedDistrictId("")}
      >
        <SelectField
          id="district-filter"
          label="Geographic scope"
          value={selectedDistrictId}
          onChange={(val) => setSelectedDistrictId(val)}
          options={districtOptions}
          disabled={districtsLoading}
        />
        <SelectField
          id="limit-filter"
          label="Display rows"
          value={limit}
          onChange={(val) => setLimit(Number(val))}
          options={[
            { label: "Top 10 skills", value: 10 },
            { label: "Top 20 skills", value: 20 },
            { label: "Top 50 skills", value: 50 },
          ]}
        />
      </FilterBar>

      {/* Main Grid: Left = Top Skills Table, Right = Trend & District Bar List */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Top Skills Table (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <SectionCard
            title={`Top ${limit} Skills by Hiring Demand`}
            subtitle={
              skillsData
                ? `Showing skills in ${selectedDistrictName} across ${skillsData.totalPostingsInScope.toLocaleString()} total postings`
                : `Showing skills in ${selectedDistrictName}`
            }
          >
            {skillsLoading ? (
              <TableSkeleton rows={limit > 10 ? 12 : limit} cols={4} />
            ) : skillsError ? (
              <ErrorState message={skillsError} onRetry={loadTopSkills} />
            ) : !skillsData || skillsData.skills.length === 0 ? (
              <EmptyState title="No skills found in synthetic catalogue" description="No skill records available for this geographic scope." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" aria-label="Top skills by demand">
                  <thead>
                    <tr className="sticky top-0 bg-card border-b border-border text-muted-foreground z-10">
                      <th className="py-2.5 pr-2 font-medium w-8">#</th>
                      <th className="py-2.5 px-3 font-medium">Skill Name</th>
                      <th className="py-2.5 px-3 font-medium hidden sm:table-cell">Category</th>
                      <th className="py-2.5 px-3 text-right font-medium">Postings</th>
                      <th className="py-2.5 pl-3 text-right font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {skillsData.skills.map((skill, index) => {
                      const isSelected = selectedSkill?.skillId === skill.skillId
                      const isHovered = hoveredSkillId === skill.skillId
                      const sharePercent = (skill.share * 100).toFixed(1)

                      return (
                        <tr
                          key={skill.skillId}
                          onClick={() => setSelectedSkill(skill)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              setSelectedSkill(skill)
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-selected={isSelected}
                          onMouseEnter={() => setHoveredSkillId(skill.skillId)}
                          onMouseLeave={() => setHoveredSkillId(null)}
                          className={`cursor-pointer transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                            isSelected
                              ? "bg-primary/10 font-medium text-foreground"
                              : isHovered
                              ? "bg-muted/50 text-foreground"
                              : "hover:bg-muted/50 text-foreground/90"
                          }`}
                        >
                          <td className="py-2.5 pr-2 font-mono text-[11px] text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{skill.name}</span>
                              {isSelected && (
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px]">
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground hidden sm:table-cell">
                            {skill.category}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-foreground">
                            {skill.postingsWithSkill.toLocaleString()}
                          </td>
                          <td className="py-2.5 pl-3 text-right font-mono tabular-nums font-semibold text-primary">
                            {sharePercent}%
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

        {/* Right Column: Trend Chart & Top Districts (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Monthly Trend Chart */}
          <SectionCard
            title={selectedSkill ? `Monthly Trend: ${selectedSkill.name}` : "Monthly Skill Trend"}
            subtitle={
              selectedSkill
                ? `Share of job postings requiring ${selectedSkill.name} (${selectedDistrictName})`
                : "Select a skill to inspect its longitudinal trend"
            }
            showViewToggle
            viewMode={trendViewMode}
            onViewModeChange={setTrendViewMode}
            actionSlot={
              selectedDistrictId && selectedSkill ? (
                <button
                  type="button"
                  onClick={() => setCompareAllDistricts((prev) => !prev)}
                  className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                    compareAllDistricts
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                  title="Compare with all districts"
                >
                  <Split className="h-3 w-3" aria-hidden="true" />
                  <span>Compare national</span>
                </button>
              ) : null
            }
          >
            {trendLoading ? (
              <ChartSkeleton height={220} />
            ) : trendError ? (
              <ErrorState message={trendError} onRetry={loadTrend} />
            ) : !selectedSkill ? (
              <EmptyState title="No skill selected" description="Click on any skill in the table to display its trend." />
            ) : !trendData || trendData.points.length === 0 ? (
              <EmptyState title="No trend points" description="No monthly points available for this skill in this scope." />
            ) : trendViewMode === "chart" ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={mergedChartPoints}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      unit="%"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          valueFormatter={(val, name) => `${val}%`}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                      }
                    />
                    <Legend
                      verticalAlign="top"
                      height={28}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="localShare"
                      name={selectedDistrictId ? "Selected District" : "Demand Share"}
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="var(--primary)"
                      fillOpacity={0.12}
                      isAnimationActive={isChartAnimationActive}
                      animationDuration={550}
                      animationEasing="ease-out"
                      activeDot={{ r: 4 }}
                    />
                    {compareAllDistricts && selectedDistrictId && (
                      <Line
                        type="monotone"
                        dataKey="allDistrictsShare"
                        name="All Districts"
                        stroke="var(--muted-foreground)"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        isAnimationActive={isChartAnimationActive}
                        animationDuration={550}
                        animationEasing="ease-out"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-card border-b border-border/60 text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Month</th>
                      <th className="py-2 px-3 text-right font-medium">Postings</th>
                      <th className="py-2 px-3 text-right font-medium">Total Postings</th>
                      <th className="py-2 pl-3 text-right font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {trendData.points.map((pt) => (
                      <tr key={pt.month} className="hover:bg-muted/30">
                        <td className="py-2 pr-3 font-mono font-medium text-foreground">{pt.month}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-foreground">
                          {pt.postingsWithSkill.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground">
                          {pt.postingsTotal.toLocaleString()}
                        </td>
                        <td className="py-2 pl-3 text-right font-mono tabular-nums font-semibold text-primary">
                          {(pt.share * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Top 10 Districts by Postings */}
          <SectionCard
            title="Top 10 Districts by Volume"
            subtitle="Click a district to filter the entire demand view"
          >
            {districtsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : districtsError ? (
              <ErrorState message={districtsError} onRetry={loadDistricts} compact />
            ) : top10Districts.length === 0 ? (
              <EmptyState title="No districts" description="No district data returned from the synthetic database." />
            ) : (
              <div className="space-y-2.5">
                {top10Districts.map((d, index) => {
                  const isSelected = selectedDistrictId === String(d.districtId)
                  const barPct = Math.max(5, Math.round((d.postings / maxDistrictPostings) * 100))

                  return (
                    <div
                      key={d.districtId}
                      onClick={() =>
                        setSelectedDistrictId((prev) =>
                          prev === String(d.districtId) ? "" : String(d.districtId)
                        )
                      }
                      className={`cursor-pointer rounded-md p-2 transition-colors duration-120 border ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-transparent hover:bg-muted/50"
                      }`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setSelectedDistrictId((prev) =>
                            prev === String(d.districtId) ? "" : String(d.districtId)
                          )
                        }
                      }}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2 truncate">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-muted-foreground bg-muted">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-foreground truncate">{d.name}</span>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            ({d.state})
                          </span>
                        </div>
                        <span className="font-mono font-medium text-foreground ml-2 shrink-0 tabular-nums">
                          {d.postings.toLocaleString()}
                        </span>
                      </div>
                      <ProgressBar
                        value={barPct}
                        className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
                        barClassName={`h-full rounded-full ${isSelected ? "bg-primary" : "bg-primary/70"}`}
                        label={`${d.name} hiring volume`}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
