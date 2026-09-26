"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowRight, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Navbar } from "@/components/navbar"
import { careerInterests } from "@/lib/skill-data"

export default function AnalyzePage() {
  const router = useRouter()
  const [skills, setSkills] = useState<string[]>(["HTML", "CSS", "JavaScript", "React"])
  const [draft, setDraft] = useState("")
  const [interest, setInterest] = useState<string | null>(null)

  function addSkills(raw: string) {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length === 0) return
    setSkills((prev) => {
      const next = [...prev]
      for (const p of parts) {
        if (!next.some((s) => s.toLowerCase() === p.toLowerCase())) next.push(p)
      }
      return next
    })
    setDraft("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addSkills(draft)
    } else if (e.key === "Backspace" && draft === "" && skills.length > 0) {
      setSkills((prev) => prev.slice(0, -1))
    }
  }

  function removeSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Merge any unsubmitted draft, then hand off to the results dashboard.
    const all = [...skills]
    draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((p) => {
        if (!all.some((s) => s.toLowerCase() === p.toLowerCase())) all.push(p)
      })

    const params = new URLSearchParams()
    if (all.length) params.set("skills", all.join(","))
    if (interest) params.set("interest", interest)
    router.push(`/results?${params.toString()}`)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Analyze your skills
            </h1>
            <p className="mt-3 text-pretty text-muted-foreground">
              Add the skills you already have. We&apos;ll match them against real hiring demand.
            </p>
          </div>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Your profile</CardTitle>
              <CardDescription>
                Separate skills with a comma or press Enter to add each one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="skills">Your current skills</Label>
                  <div className="flex min-h-24 flex-wrap content-start gap-2 rounded-lg border border-input bg-card p-3 focus-within:ring-2 focus-within:ring-ring/50">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 py-1 pl-2.5 pr-1 text-sm font-medium text-primary"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="flex h-4 w-4 items-center justify-center rounded-sm text-primary/70 transition-colors hover:bg-primary/20 hover:text-primary"
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                    <input
                      id="skills"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={() => addSkills(draft)}
                      placeholder={skills.length ? "Add another…" : "e.g. Python, SQL, Figma"}
                      className="min-w-32 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="interest">
                    Career interest{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Select value={interest} onValueChange={(v) => setInterest(v)}>
                    <SelectTrigger id="interest" className="w-full">
                      <SelectValue placeholder="Choose a field to focus on" />
                    </SelectTrigger>
                    <SelectContent>
                      {careerInterests.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" size="lg" className="h-12 text-base" disabled={skills.length === 0 && draft.trim() === ""}>
                  <Sparkles className="mr-1 h-5 w-5" aria-hidden="true" />
                  Analyze My Skills
                  <ArrowRight className="ml-1 h-5 w-5" aria-hidden="true" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
