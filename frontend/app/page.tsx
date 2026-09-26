import Link from "next/link"
import { ArrowRight, Target, GraduationCap, Sparkles, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"

const steps = [
  {
    icon: Target,
    title: "Enter your skills",
    description: "List what you already know — languages, tools, frameworks, anything.",
  },
  {
    icon: TrendingUp,
    title: "See real demand",
    description: "We match your profile against live hiring trends to find your best-fit field.",
  },
  {
    icon: GraduationCap,
    title: "Close the gap",
    description: "Get the exact missing skills and courses to become job-ready faster.",
  },
]

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-60"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 0%, oklch(0.93 0.05 195) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                Skill gap analysis for students
              </span>
              <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Know your skill gap before the market does
              </h1>
              <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
                SkillPath compares your current skills against real hiring demand, then shows you
                exactly what to learn next to land the role you want.
              </p>
              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
                <Button
                  render={<Link href="/analyze" />}
                  nativeButton={false}
                  size="lg"
                  className="h-12 px-8 text-base"
                >
                  Get Started
                  <ArrowRight className="ml-1 h-5 w-5" aria-hidden="true" />
                </Button>
                <Button
                  render={<Link href="/#how-it-works" />}
                  nativeButton={false}
                  variant="ghost"
                  size="lg"
                  className="h-12 px-6 text-base"
                >
                  How it works
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-t border-border/60 bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                How it works
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Three simple steps from where you are to where the jobs are.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((step, index) => (
                <Card
                  key={step.title}
                  className="border-border/60 shadow-sm transition-shadow hover:shadow-md"
                >
                  <CardContent className="flex flex-col gap-4 p-6">
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <step.icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground/70">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                    <p className="text-pretty leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-14 flex justify-center">
              <Button
                render={<Link href="/analyze" />}
                nativeButton={false}
                size="lg"
                className="h-12 px-8 text-base"
              >
                Analyze my skills
                <ArrowRight className="ml-1 h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground sm:px-6">
          SkillPath — Know your skill gap before the market does.
        </div>
      </footer>
    </div>
  )
}
