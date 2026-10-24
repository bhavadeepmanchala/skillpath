import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BestMatchCard } from "@/components/results/best-match-card"
import { SkillGapCard } from "@/components/results/skill-gap-card"
import { CoursesCard } from "@/components/results/courses-card"
import { AdviceCard } from "@/components/results/advice-card"
import { dummyAnalysis } from "@/lib/skill-data"

async function fetchAnalysis(skills: string[], interest?: string) {
  try {
    const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8080"
    const res = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skills, careerInterest: interest ?? null }),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`Backend returned ${res.status}`)
    const data = await res.json()

    return {
      bestField: data.fieldName as string,
      matchScore: data.matchPercent as number,
      demand: data.demandLevel as "High" | "Medium" | "Low",
      trend: (data.trend as string).toLowerCase() as "rising" | "stable" | "declining",
      yourSkills: data.skillsHave as string[],
      missingSkills: data.missingSkills as string[],
      courses: (data.recommendedCourses as string[]).map((title) => ({
        title,
        provider: "Free resource",
        duration: "Self-paced",
        level: "Beginner" as const,
      })),
      advice: data.aiAdvice as string,
    }
  } catch (err) {
    console.error("Backend call failed, falling back to placeholder data:", err)
    return null
  }
}

export default async function SkillAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ skills?: string; interest?: string }>
}) {
  const { skills, interest } = await searchParams

  const skillsArray = skills
    ? skills.split(",").map((s) => s.trim()).filter(Boolean)
    : dummyAnalysis.yourSkills

  const liveResult = skillsArray.length > 0 ? await fetchAnalysis(skillsArray, interest) : null

  const result =
    liveResult ?? {
      ...dummyAnalysis,
      yourSkills: skillsArray,
    }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Skill Analysis & Personalized Learning
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analysis matched against real-time market hiring requirements.
          </p>
        </div>
        <Button
          render={<Link href="/student/describe-myself" />}
          nativeButton={false}
          variant="outline"
          size="sm"
          className="self-start sm:self-auto"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Edit Profile
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <BestMatchCard
          field={result.bestField}
          score={result.matchScore}
          demand={result.demand}
          trend={result.trend}
        />
        <SkillGapCard
          yourSkills={result.yourSkills}
          missingSkills={result.missingSkills}
        />
      </div>

      <CoursesCard courses={result.courses} />

      <AdviceCard advice={result.advice} />
    </div>
  )
}
