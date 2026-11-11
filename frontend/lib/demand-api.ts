export interface DemandSummary {
  totalPostings: number
  totalSkills: number
  totalRoles: number
  totalDistricts: number
  totalCourses: number
  latestMonth: string
  latestMonthPostings: number
  synthetic: boolean
}

export interface SkillDemandItem {
  skillId: number
  name: string
  category: string
  postingsWithSkill: number
  share: number
}

export interface DemandSkillsResponse {
  from: string
  to: string
  roleId: number | null
  districtId: number | null
  totalPostingsInScope: number
  skills: SkillDemandItem[]
}

export interface TrendPoint {
  month: string
  postingsWithSkill: number
  postingsTotal: number
  share: number
}

export interface SkillTrendResponse {
  skillId: number
  name: string
  roleId: number | null
  districtId: number | null
  points: TrendPoint[]
}

export interface DistrictDemandItem {
  districtId: number
  name: string
  state: string
  postings: number
}

export interface DistrictDemandResponse {
  from: string
  to: string
  districts: DistrictDemandItem[]
}

export interface TrendWindowRange {
  from: string
  to: string
}

export interface SkillTrendItem {
  skillId: number
  name: string
  category: string
  shareLatest: number
  sharePrevious: number
  change: number
  relativeGrowth: number | null
  postingsLatest: number
  postingsPrevious: number
}

export interface DemandTrendsResponse {
  window: number
  minPostings: number
  roleId: number | null
  districtId: number | null
  latestWindow: TrendWindowRange
  previousWindow: TrendWindowRange
  rising: SkillTrendItem[]
  declining: SkillTrendItem[]
}

export const LOW_SAMPLE_THRESHOLD = 30

export function isLowSample(
  latestWindowPostings: number | undefined | null,
  threshold: number = LOW_SAMPLE_THRESHOLD
): boolean {
  if (latestWindowPostings === undefined || latestWindowPostings === null) return false
  return latestWindowPostings < threshold
}

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://127.0.0.1:8080"

export async function fetchDemandSummary(): Promise<DemandSummary> {
  const res = await fetch(`${BACKEND_URL}/api/demand/summary`, {
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Demand summary failed with status ${res.status}`)
  }
  return res.json()
}

export async function fetchTopSkills(params?: {
  roleId?: number | null
  districtId?: number | null
  from?: string
  to?: string
  limit?: number
}): Promise<DemandSkillsResponse> {
  const searchParams = new URLSearchParams()
  if (params?.roleId != null) {
    searchParams.set("role", String(params.roleId))
  }
  if (params?.districtId != null) {
    searchParams.set("district", String(params.districtId))
  }
  if (params?.from) {
    searchParams.set("from", params.from)
  }
  if (params?.to) {
    searchParams.set("to", params.to)
  }
  if (params?.limit != null) {
    searchParams.set("limit", String(params.limit))
  }

  const query = searchParams.toString()
  const url = `${BACKEND_URL}/api/demand/skills${query ? `?${query}` : ""}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Demand skills failed with status ${res.status}`)
  }
  return res.json()
}

export async function fetchSkillTrend(
  skillId: number,
  params?: {
    districtId?: number | null
    from?: string
    to?: string
  }
): Promise<SkillTrendResponse> {
  const searchParams = new URLSearchParams()
  if (params?.districtId != null) {
    searchParams.set("district", String(params.districtId))
  }
  if (params?.from) {
    searchParams.set("from", params.from)
  }
  if (params?.to) {
    searchParams.set("to", params.to)
  }

  const query = searchParams.toString()
  const url = `${BACKEND_URL}/api/demand/skills/${skillId}/trend${
    query ? `?${query}` : ""
  }`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Skill trend failed with status ${res.status}`)
  }
  return res.json()
}

export async function fetchDistricts(params?: {
  from?: string
  to?: string
}): Promise<DistrictDemandResponse> {
  const searchParams = new URLSearchParams()
  if (params?.from) {
    searchParams.set("from", params.from)
  }
  if (params?.to) {
    searchParams.set("to", params.to)
  }

  const query = searchParams.toString()
  const url = `${BACKEND_URL}/api/demand/districts${query ? `?${query}` : ""}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Districts demand failed with status ${res.status}`)
  }
  return res.json()
}

export async function fetchDemandTrends(params?: {
  districtId?: number | null
  roleId?: number | null
  window?: number
  limit?: number
}): Promise<DemandTrendsResponse> {
  const searchParams = new URLSearchParams()
  if (params?.districtId != null) {
    searchParams.set("district", String(params.districtId))
  }
  if (params?.roleId != null) {
    searchParams.set("role", String(params.roleId))
  }
  if (params?.window != null) {
    searchParams.set("window", String(params.window))
  }
  if (params?.limit != null) {
    searchParams.set("limit", String(params.limit))
  }

  const query = searchParams.toString()
  const url = `${BACKEND_URL}/api/demand/trends${query ? `?${query}` : ""}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Demand trends failed with status ${res.status}`)
  }
  return res.json()
}

export interface RoleItem {
  id: number
  name: string
  sector: string
}

export interface CourseItem {
  id: number
  name: string
  sector: string
  durationWeeks: number
  skillCount: number
  linkedRoleCount: number
}

export interface SkillShareItem {
  skillId: number
  name: string
  demandShare: number
}

export interface CourseAlignmentResponse {
  courseId: number
  courseName: string
  roleId: number
  roleName: string
  districtId: number | null
  windowMonths: number
  topN: number
  postingsInScope: number
  roleLinkedToCourse: boolean
  coverageScore: number
  coveredSkills: SkillShareItem[]
  missingSkills: SkillShareItem[]
}

export interface CourseOversupplyItem {
  courseId: number
  courseName: string
  districtId: number
  districtName: string
  year: number
  seats: number
  trainers: number
  linkedRoleCount: number
  postingsInWindow: number
  estimatedOpenings: number | null
  oversupplyRatio: number | null
  oversupplied: boolean
  lowSample: boolean
}

export interface FlagsResponse {
  windowMonths: number
  windowStart: string
  windowEnd: string
  scalingFactor: number
  oversupplyThreshold: number
  minOpenings: number
  items: CourseOversupplyItem[]
}

export interface SkillGapItem {
  name: string
  demand_share: number
  course_coverage: number
  growth_factor: number
  gap_score: number
}

export interface SkillItem {
  id: number
  name: string
  category: string
  aliases: string[]
}

export async function fetchSkills(): Promise<SkillItem[]> {
  const res = await fetch(`${BACKEND_URL}/api/skills`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Skills failed with status ${res.status}`)
  }
  return res.json()
}

export async function fetchRoles(): Promise<RoleItem[]> {
  const res = await fetch(`${BACKEND_URL}/api/roles`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Roles failed with status ${res.status}`)
  }
  return res.json()
}

export async function fetchCourses(): Promise<CourseItem[]> {
  const res = await fetch(`${BACKEND_URL}/api/courses`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Courses failed with status ${res.status}`)
  }
  return res.json()
}

export async function fetchCourseAlignment(
  courseId: number,
  params: {
    roleId: number
    districtId?: number | null
    topN?: number
    windowMonths?: number
  }
): Promise<CourseAlignmentResponse> {
  const searchParams = new URLSearchParams()
  searchParams.set("role", String(params.roleId))
  if (params.districtId != null) {
    searchParams.set("district", String(params.districtId))
  }
  if (params.topN != null) {
    searchParams.set("topN", String(params.topN))
  }
  if (params.windowMonths != null) {
    searchParams.set("windowMonths", String(params.windowMonths))
  }
  const query = searchParams.toString()
  const url = `${BACKEND_URL}/api/courses/${courseId}/alignment${
    query ? `?${query}` : ""
  }`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(
      `Course alignment for course ${courseId} failed with status ${res.status}`
    )
  }
  return res.json()
}

export async function fetchFlags(params?: {
  districtId?: number | null
  minOpenings?: number
}): Promise<FlagsResponse> {
  const searchParams = new URLSearchParams()
  if (params?.districtId != null) {
    searchParams.set("district", String(params.districtId))
  }
  if (params?.minOpenings != null) {
    searchParams.set("minOpenings", String(params.minOpenings))
  }
  const query = searchParams.toString()
  const url = `${BACKEND_URL}/api/flags${query ? `?${query}` : ""}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Flags failed with status ${res.status}`)
  }
  return res.json()
}

export async function fetchSkillGaps(): Promise<SkillGapItem[]> {
  const res = await fetch(`${BACKEND_URL}/api/alignment/gaps`, {
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Skill gaps failed with status ${res.status}`)
  }
  return res.json()
}
