import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { BestMatchCard } from "@/components/results/best-match-card"
import { SkillGapCard } from "@/components/results/skill-gap-card"
import { CoursesCard } from "@/components/results/courses-card"
import { AdviceCard } from "@/components/results/advice-card"
import { dummyAnalysis } from "@/lib/skill-data"

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ skills?: string; interest?: string }>
}) {
  const { skills, interest } = await searchParams

  // Placeholder analysis. Overlay the user's inputs onto dummy data for now —
  // swap this for a real backend API call later.
  const yourSkills = skills
    ? skills.split(",").map((s) => s.trim()).filter(Boolean)
    : dummyAnalysis.yourSkills
  const bestField = interest || dummyAnalysis.bestField

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
                field={bestField}
                matchScore={dummyAnalysis.matchScore}
                demand={dummyAnalysis.demand}
                trend={dummyAnalysis.trend}
              />
              <SkillGapCard
                yourSkills={yourSkills}
                missingSkills={dummyAnalysis.missingSkills}
              />
            </div>
            <div className="flex flex-col gap-6 lg:col-span-2">
              <AdviceCard advice={dummyAnalysis.advice} />
              <CoursesCard courses={dummyAnalysis.courses} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
