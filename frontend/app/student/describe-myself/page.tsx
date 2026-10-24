"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowRight, Loader2, Sparkles, X } from "lucide-react"
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
import { careerInterests } from "@/lib/skill-data"

export default function DescribeMyselfPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
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
    if (isPending) return

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

    startTransition(() => {
      router.push(`/student/skill-analysis?${params.toString()}`)
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Describe Myself
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your current skill set and optional target industry so we can map your learning journey.
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
              <Label htmlFor="student-skills">Your current skills</Label>
              <div className="flex min-h-24 flex-wrap content-start gap-2 rounded-lg border border-input bg-card p-3 focus-within:ring-2 focus-within:ring-ring/50">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-md bg-teal-500/10 py-1 pl-2.5 pr-1 text-sm font-medium text-teal-700 dark:text-teal-400"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="flex h-4 w-4 items-center justify-center rounded-sm text-teal-700/70 hover:bg-teal-500/20 hover:text-teal-700 transition-colors"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <input
                  id="student-skills"
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
              <Select value={interest ?? undefined} onValueChange={(v) => setInterest(v)}>
                <SelectTrigger id="interest" className="w-full">
                  <SelectValue placeholder="Select a field that excites you" />
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

            <Button
              type="submit"
              size="lg"
              disabled={isPending || (skills.length === 0 && !draft.trim())}
              className="mt-2 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Analyzing…
                </>
              ) : (
                <>
                  Analyze my skills
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
