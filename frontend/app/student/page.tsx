import Link from "next/link"
import { Compass, Sparkles, UserCheck, BookOpen, ArrowRight, Award } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function StudentDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Student Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your skill readiness, map your learning journey, and target in-demand career paths.
        </p>
      </div>

      {/* Quick Action Banner */}
      <div className="rounded-xl border border-teal-500/20 bg-gradient-to-r from-teal-50/80 via-sky-50/60 to-background p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
              <Sparkles className="h-3.5 w-3.5" /> Next Recommended Step
            </span>
            <h2 className="text-xl font-bold text-foreground">Complete Your Skills Profile</h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              Add your current competencies and target role to generate a personalized skill gap analysis and tailored learning curriculum.
            </p>
          </div>
          <Button
            render={<Link href="/student/describe-myself" />}
            nativeButton={false}
            className="bg-teal-600 hover:bg-teal-700 text-white shrink-0"
          >
            Describe Myself <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profile Status</CardTitle>
            <UserCheck className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">80% Ready</div>
            <p className="mt-1 text-xs text-muted-foreground">4 core technical skills registered</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recommended Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">3 Modules</div>
            <p className="mt-1 text-xs text-muted-foreground">Targeting high-demand gap competencies</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Market Match</CardTitle>
            <Award className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">Strong Fit</div>
            <p className="mt-1 text-xs text-muted-foreground">Top alignment in Web & Mobile Development</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Describe Myself</CardTitle>
            <CardDescription>Input your current tools, libraries, and career interests</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Our AI engine matches your existing capabilities against live job market descriptions to calculate where you excel and what you need next.
            </p>
            <Button
              render={<Link href="/student/describe-myself" />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              Update Profile
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Skill Analysis & Courses</CardTitle>
            <CardDescription>View your personalized gap breakdown and roadmap</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Explore your best-fit industry sector, missing prerequisite capabilities, and free curated learning paths to reach job readiness.
            </p>
            <Button
              render={<Link href="/student/skill-analysis" />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              View Latest Analysis
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
