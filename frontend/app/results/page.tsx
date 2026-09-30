import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { BestMatchCard } from "@/components/results/best-match-card"
import { SkillGapCard } from "@/components/results/skill-gap-card"
import { CoursesCard } from "@/components/results/courses-card"
import { AdviceCard } from "@/components/results/advice-card"
import { dummyAnalysis } from "@/lib/skill-data"

async function fetchAnalysis(skills: string[], interest?: string) {
  try {
    const res = await fetch("http://127.0.0.1:8080/api/analyze", {
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

export default async function ResultsPage({
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
      bestField: interest || dummyAnalysis.bestField,
    }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Your results
              </h1>
              <p className="mt-2 text-muted-foreground">
                Based on your skills and current hiring demand.
              </p>
            </div>
            <Button render={<Link href="/analyze" />} nativeButton={false} variant="outline">
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              Edit skills
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="flex flex-col gap-6 lg:col-span-3">
              <BestMatchCard
                field={result.bestField}
                matchScore={result.matchScore}
                demand={result.demand}
                trend={result.trend}
              />
              <SkillGapCard
                yourSkills={result.yourSkills}
                missingSkills={result.missingSkills}
              />
            </div>
            <div className="flex flex-col gap-6 lg:col-span-2">
              <AdviceCard advice={result.advice} />
              <CoursesCard courses={result.courses} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}