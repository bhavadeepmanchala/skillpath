"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  Search,
  TrendingUp,
  TrendingDown,
  Info,
  MapPin,
  Map,
  ChevronRight,
  ArrowRight,
  Building2,
} from "lucide-react"
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
  FindingHeadline,
  BigNumber,
  FigureRow,
  SectionHeader,
  SourceCaption,
  FilterBar,
  SelectField,
  TypographicRow,
  TypographicList,
  DeltaBadge,
  LowSampleBadge,
  Drawer,
  ErrorState,
  EmptyState,
  ChartSkeleton,
  TableSkeleton,
  Skeleton,
} from "@/components/ui-kit"
import {
  formatPercent,
  formatInteger,
  pluralize,
} from "@/lib/findings"

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

  // Interactive filters
  const [selectedState, setSelectedState] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [showAll, setShowAll] = useState<boolean>(false)

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
      setDistrictsError("Could not load geographic district data. Is the backend running?")
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
      if (!districtId) return
      const numericId = Number(districtId)
      if (isNaN(numericId) || numericId <= 0) return

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
        setDrawerError("Could not load district skill profile. Is the backend running?")
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

  // Progressive disclosure: top 10 by default
  const visibleDistricts = useMemo(() => {
    if (showAll || filteredDistricts.length <= 10) return filteredDistricts
    return filteredDistricts.slice(0, 10)
  }, [filteredDistricts, showAll])

  // Aggregate volume
  const totalPostingsInScope = useMemo(() => {
    return filteredDistricts.reduce((acc, d) => acc + d.postings, 0)
  }, [filteredDistricts])

  const maxDistrictPostings = useMemo(() => {
    if (districts.length === 0) return 1
    return Math.max(...districts.map((d) => d.postings), 1)
  }, [districts])

  const medianDistrictPostings = useMemo(() => {
    if (filteredDistricts.length === 0) return 0
    const mid = Math.floor(filteredDistricts.length / 2)
    return filteredDistricts[mid].postings
  }, [filteredDistricts])

  // Finding sentence calculation
  const findingHeadline = useMemo(() => {
    if (filteredDistricts.length === 0) {
      return "Analyzing spatial concentration of workforce hiring demand across India."
    }
    const top = filteredDistricts[0]
    const topPct = totalPostingsInScope > 0 ? (top.postings / totalPostingsInScope) * 100 : 0
    const scopeName = selectedState === "ALL" ? "nationally" : `in ${selectedState}`

    return `${top.name} (${top.state}) leads employer hiring volume ${scopeName} with ${formatInteger(
      top.postings
    )} postings (${topPct.toFixed(1)}% of evaluated demand).`
  }, [filteredDistricts, totalPostingsInScope, selectedState])

  return (
    <div className="space-y-5 animate-page-enter">
      {/* 1. Page Header with standfirst */}
      <PageHeader
        title="Geographic Insights"
        standfirst="Spatial concentration of hiring demand across 40 monitored districts in 16 Indian states."
        showSyntheticBadge={false}
      />

      {/* 2. Filter Bar: State, Search & Date Range */}
      <FilterBar
        isFiltered={Boolean(fromDate || toDate || selectedState !== "ALL" || searchQuery)}
        onReset={() => {
          setFromDate("")
          setToDate("")
          setSelectedState("ALL")
          setSearchQuery("")
        }}
      >
        <SelectField
          id="state-filter"
          label="State"
          value={selectedState}
          onChange={(val) => setSelectedState(val)}
          options={[
            { label: "All States (16 States)", value: "ALL" },
            ...stateList.map((st) => ({ label: st, value: st })),
          ]}
          disabled={districtsLoading}
          className="min-w-[200px]"
        />

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <input
            id="geo-district-search"
            name="districtSearch"
            type="text"
            aria-label="Search district or state"
            placeholder="Search district or state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs">
          <label htmlFor="from-month" className="text-muted-foreground font-medium shrink-0">
            From:
          </label>
          <input
            id="from-month"
            name="fromMonth"
            type="text"
            placeholder="YYYY-MM"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-24 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <label htmlFor="to-month" className="text-muted-foreground font-medium shrink-0">
            To:
          </label>
          <input
            id="to-month"
            name="toMonth"
            type="text"
            placeholder="YYYY-MM"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-24 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </FilterBar>

      {/* 3. Finding Headline & Open FigureRow */}
      <section className="space-y-6">
        {districtsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : (
          <FindingHeadline
            kicker="Geographic Concentration Finding"
            sentence={findingHeadline}
          >
            <SourceCaption
              scope={selectedState === "ALL" ? "All 16 States (40 Districts)" : `State: ${selectedState}`}
              window={fromDate && toDate ? `${fromDate} to ${toDate}` : "18-month observation horizon"}
              note="Aggregated from synthetic job postings across reporting districts"
            />
          </FindingHeadline>
        )}

        <FigureRow columns={4}>
          <BigNumber
            label="Total Postings in Scope"
            rawValue={totalPostingsInScope}
            footnote="Active openings evaluated"
          />
          <BigNumber
            label="Districts Monitored"
            rawValue={filteredDistricts.length}
            footnote={selectedState === "ALL" ? "All 40 regional hubs" : `In ${selectedState}`}
          />
          <BigNumber
            label="Leading Regional Hub"
            value={filteredDistricts[0] ? filteredDistricts[0].name : "—"}
            footnote={filteredDistricts[0] ? `${formatInteger(filteredDistricts[0].postings)} postings` : "Top demand center"}
          />
          <BigNumber
            label="Median District Postings"
            rawValue={medianDistrictPostings}
            footnote="Middle reporting center"
          />
        </FigureRow>
      </section>

      {/* ===================================================================== */}
      {/* Map Placeholder (Visually Quiet, Clearly Marked - No map built here)  */}
      {/* ===================================================================== */}
      <div className="border-y border-dashed border-border/80 py-4 text-xs text-muted-foreground flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Map className="h-4 w-4" aria-hidden="true" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="font-semibold text-foreground">Interactive India map: coming soon.</strong>{" "}
          The ranked list below already compares all 40 districts.
        </p>
      </div>

      {/* ===================================================================== */}
      {/* Main District Comparison as a TypographicList (40 Districts)          */}
      {/* ===================================================================== */}
      <section className="space-y-4">
        <SectionHeader
          title={`Ranked Hiring Volume by District (${filteredDistricts.length} Districts)`}
          subtitle="Ranked comparison of synthetic job openings. Click any row to inspect district skill demand in a drawer."
        />

        {districtsLoading ? (
          <TableSkeleton rows={10} cols={4} />
        ) : districtsError ? (
          <ErrorState message={districtsError} onRetry={loadDistricts} />
        ) : filteredDistricts.length === 0 ? (
          <EmptyState
            title="No districts matched criteria"
            description="Try adjusting your state filter or search keywords."
          />
        ) : (
          <TypographicList
            totalCount={filteredDistricts.length}
            visibleCount={visibleDistricts.length}
            showAll={showAll}
            onToggleShowAll={() => setShowAll((prev) => !prev)}
            itemLabel="monitored districts"
          >
            {visibleDistricts.map((d, index) => {
              const barPct = Math.min(100, Math.max(4, Math.round((d.postings / maxDistrictPostings) * 100)))
              const shareOfScope = totalPostingsInScope > 0 ? (d.postings / totalPostingsInScope) * 100 : 0

              return (
                <TypographicRow
                  key={d.districtId}
                  rank={index + 1}
                  title={d.name}
                  subtitle={d.state}
                  staggerIndex={index}
                  primaryFigure={`${formatInteger(d.postings)} postings`}
                  secondaryFigure={`${shareOfScope.toFixed(1)}%`}
                  onClick={() => openDistrictDrawer(d.districtId, d.name)}
                  visual={
                    <div className="h-1 w-full rounded-full bg-muted/60 overflow-hidden" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-primary/80 transition-all duration-300"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  }
                />
              )
            })}
          </TypographicList>
        )}
      </section>

      {/* 4. Per-District Detail Drawer (1-click drilldown) */}
      <Drawer
        isOpen={Boolean(drawerDistrict)}
        onClose={() => setDrawerDistrict(null)}
        title={drawerDistrict?.name || "District Details"}
        subtitle={
          drawerDistrict && drawerDistrict.districtId > 0
            ? `${drawerDistrict.state || "Monitored District"}${drawerDistrict.postings !== undefined
              ? ` · ${formatInteger(drawerDistrict.postings)} total job postings`
              : ""
            }`
            : undefined
        }
        width="w-[min(520px,100vw)]"
      >
        {!drawerDistrict || drawerDistrict.districtId <= 0 ? (
          <EmptyState
            title="No district selected"
            description="Click any district row to view its skill demand profile."
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
            description="No skill records available for this district."
          />
        ) : (
          <div className="space-y-6 text-xs">
            {/* Top 10 Required Skills */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Top 10 Required Skills in {drawerDistrict.name}
                </h4>
                {districtSkills && (
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {formatInteger(districtSkills.totalPostingsInScope)} postings
                  </span>
                )}
              </div>

              {!districtSkills || districtSkills.skills.length === 0 ? (
                <p className="text-muted-foreground italic p-2 border border-dashed rounded">
                  No skills recorded.
                </p>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                  {districtSkills.skills.slice(0, 10).map((s, idx) => (
                    <div key={s.skillId} className="flex items-center justify-between p-2.5 hover:bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] text-muted-foreground w-4">{idx + 1}</span>
                        <span className="font-medium text-foreground break-words">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">({s.category})</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono shrink-0">
                        <span className="text-muted-foreground text-[11px]">
                          {formatInteger(s.postingsWithSkill)}
                        </span>
                        <span className="font-bold text-primary tabular-nums">
                          {formatPercent(s.share)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Emerging & Contracting Trajectory in District */}
            {districtTrends && (
              <div className="space-y-4 pt-2 border-t border-border">
                <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Emerging & Contracting Skills ({districtTrends.window} Months Horizon)
                </h4>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Rising */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-positive-foreground flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-positive" aria-hidden="true" /> Top Rising Skills
                    </span>
                    {districtTrends.rising.length === 0 ? (
                      <p className="text-muted-foreground italic text-[11px] p-2 border border-dashed rounded">
                        No rising skills met volume threshold.
                      </p>
                    ) : (
                      <div className="border border-border rounded-md divide-y divide-border overflow-hidden">
                        {districtTrends.rising.slice(0, 5).map((r) => (
                          <div key={r.skillId} className="flex items-center justify-between gap-2 p-2">
                            <span className="font-medium text-foreground break-words text-[11px]">{r.name}</span>
                            <DeltaBadge value={r.change} size="sm" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Declining */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-negative-foreground flex items-center gap-1">
                      <TrendingDown className="h-3.5 w-3.5 text-negative" aria-hidden="true" /> Top Declining Skills
                    </span>
                    {districtTrends.declining.length === 0 ? (
                      <p className="text-muted-foreground italic text-[11px] p-2 border border-dashed rounded">
                        No declining skills met volume threshold.
                      </p>
                    ) : (
                      <div className="border border-border rounded-md divide-y divide-border overflow-hidden">
                        {districtTrends.declining.slice(0, 5).map((d) => (
                          <div key={d.skillId} className="flex items-center justify-between gap-2 p-2">
                            <span className="font-medium text-foreground break-words text-[11px]">{d.name}</span>
                            <DeltaBadge value={d.change} size="sm" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Action Links */}
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <Link
                href={`/policy/skill-demand?district=${drawerDistrict.districtId}`}
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline text-xs"
              >
                <span>View {drawerDistrict.name} skill demand</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <Link
                href={`/policy/district-plan?district=${drawerDistrict.districtId}`}
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline text-xs"
              >
                <span>Open district training plan</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
