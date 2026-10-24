"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Compass, ShieldCheck, GraduationCap, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/navbar"

export default function LoginPage() {
  const router = useRouter()

  // Policymaker form state
  const [policyEmail, setPolicyEmail] = useState("")
  const [policyPassword, setPolicyPassword] = useState("")
  const [policyError, setPolicyError] = useState("")

  // Student form state
  const [studentEmail, setStudentEmail] = useState("")
  const [studentPassword, setStudentPassword] = useState("")
  const [studentError, setStudentError] = useState("")

  const handlePolicySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!policyEmail.trim() || !policyPassword.trim()) {
      setPolicyError("Please enter both email and password")
      return
    }
    const displayName = policyEmail.split("@")[0] || "Policymaker"
    localStorage.setItem("user_role", "policymaker")
    localStorage.setItem("user_name", displayName)
    router.push("/policy")
  }

  const handlePolicyDemo = () => {
    localStorage.setItem("user_role", "policymaker")
    localStorage.setItem("user_name", "Sarah Jenkins (Policy Lead)")
    router.push("/policy")
  }

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentEmail.trim() || !studentPassword.trim()) {
      setStudentError("Please enter both email and password")
      return
    }
    const displayName = studentEmail.split("@")[0] || "Student"
    localStorage.setItem("user_role", "student")
    localStorage.setItem("user_name", displayName)
    router.push("/student")
  }

  const handleStudentDemo = () => {
    localStorage.setItem("user_role", "student")
    localStorage.setItem("user_name", "Alex Rivera (Job Seeker)")
    router.push("/student")
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-10 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Compass className="h-3.5 w-3.5 text-primary" /> SkillPath Access Portal
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Sign in to your account
            </h1>
            <p className="mt-2 text-muted-foreground">
              Select your role to access customized dashboards, analytics, and intelligence tools.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Policymaker Card */}
            <Card className="flex flex-col border-border/80 shadow-sm transition-all hover:border-primary/40">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-xl">Policymaker</CardTitle>
                    <CardDescription>Government agencies, institutions & workforce analysts</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <form id="policy-form" onSubmit={handlePolicySubmit} className="space-y-4">
                  {policyError && (
                    <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
                      {policyError}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="policy-email">Email</Label>
                    <Input
                      id="policy-email"
                      type="email"
                      placeholder="analyst@deptoflabor.gov"
                      value={policyEmail}
                      onChange={(e) => {
                        setPolicyEmail(e.target.value)
                        setPolicyError("")
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="policy-password">Password</Label>
                    <Input
                      id="policy-password"
                      type="password"
                      placeholder="••••••••"
                      value={policyPassword}
                      onChange={(e) => {
                        setPolicyPassword(e.target.value)
                        setPolicyError("")
                      }}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Sign in as Policymaker <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>

              <CardFooter className="flex flex-col border-t border-border/60 bg-muted/20 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handlePolicyDemo}
                >
                  Continue as demo user
                </Button>
              </CardFooter>
            </Card>

            {/* Student Card */}
            <Card className="flex flex-col border-border/80 shadow-sm transition-all hover:border-primary/40">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-xl">Student / Job seeker</CardTitle>
                    <CardDescription>Learners, career pivoters & active candidates</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <form id="student-form" onSubmit={handleStudentSubmit} className="space-y-4">
                  {studentError && (
                    <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
                      {studentError}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="student-email">Email</Label>
                    <Input
                      id="student-email"
                      type="email"
                      placeholder="alex.learner@university.edu"
                      value={studentEmail}
                      onChange={(e) => {
                        setStudentEmail(e.target.value)
                        setStudentError("")
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="student-password">Password</Label>
                    <Input
                      id="student-password"
                      type="password"
                      placeholder="••••••••"
                      value={studentPassword}
                      onChange={(e) => {
                        setStudentPassword(e.target.value)
                        setStudentError("")
                      }}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Sign in as Student <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>

              <CardFooter className="flex flex-col border-t border-border/60 bg-muted/20 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleStudentDemo}
                >
                  Continue as demo user
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
