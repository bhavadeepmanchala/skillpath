"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Compass, Eye, EyeOff, Loader2 } from "lucide-react"
import { Navbar } from "@/components/navbar"

type Role = "student" | "policymaker"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const roleParam = searchParams.get("role")
  const initialRole: Role = roleParam === "policymaker" ? "policymaker" : "student"

  const [activeRole, setActiveRole] = useState<Role>(initialRole)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const studentTabRef = useRef<HTMLButtonElement>(null)
  const policyTabRef = useRef<HTMLButtonElement>(null)

  // Redirect if already signed in
  useEffect(() => {
    try {
      const existingRole = localStorage.getItem("user_role")
      if (existingRole === "policymaker") {
        router.replace("/policy")
      } else if (existingRole === "student") {
        router.replace("/student")
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [router])

  // Sync role from URL param if changed externally
  useEffect(() => {
    if (roleParam === "policymaker") {
      setActiveRole("policymaker")
    } else if (roleParam === "student") {
      setActiveRole("student")
    }
  }, [roleParam])

  const handleRoleChange = (newRole: Role) => {
    setActiveRole(newRole)
    router.replace(`/login?role=${newRole}`, { scroll: false })
  }

  const handleKeyDownTab = (e: React.KeyboardEvent, currentRole: Role) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault()
      const targetRole: Role = currentRole === "student" ? "policymaker" : "student"
      handleRoleChange(targetRole)
      if (targetRole === "policymaker") {
        policyTabRef.current?.focus()
      } else {
        studentTabRef.current?.focus()
      }
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault()
      const targetRole: Role = currentRole === "student" ? "policymaker" : "student"
      handleRoleChange(targetRole)
      if (targetRole === "student") {
        studentTabRef.current?.focus()
      } else {
        policyTabRef.current?.focus()
      }
    }
  }

  const validateEmail = (val: string): string | null => {
    const trimmed = val.trim()
    if (!trimmed) {
      return "Email address is required"
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      return "Please enter a valid email address (e.g. name@domain.com)"
    }
    return null
  }

  const validatePassword = (val: string): string | null => {
    if (!val || !val.trim()) {
      return "Password is required"
    }
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setEmailTouched(true)
    setPasswordTouched(true)

    const eErr = validateEmail(email)
    const pErr = validatePassword(password)
    setEmailError(eErr)
    setPasswordError(pErr)

    if (eErr || pErr) {
      return
    }

    setIsSubmitting(true)

    try {
      const displayName =
        email.split("@")[0].trim() ||
        (activeRole === "policymaker" ? "Demo policymaker" : "Demo student")
      localStorage.setItem("user_role", activeRole)
      localStorage.setItem("user_name", displayName)
      router.push(activeRole === "policymaker" ? "/policy" : "/student")
    } catch {
      setIsSubmitting(false)
    }
  }

  const handleDemoLogin = () => {
    setIsSubmitting(true)
    try {
      const defaultName =
        activeRole === "policymaker" ? "Demo policymaker" : "Demo student"
      localStorage.setItem("user_role", activeRole)
      localStorage.setItem("user_name", defaultName)
      router.push(activeRole === "policymaker" ? "/policy" : "/student")
    } catch {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-16">
      <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <Compass className="h-4 w-4" />
            SkillPath Demo
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            Sign in to SkillPath
          </h1>
        </div>

        {/* Segmented Control */}
        <div className="mt-6">
          <div
            role="tablist"
            aria-label="User role selection"
            className="grid grid-cols-2 rounded-lg border border-border/80 bg-muted/30 p-1"
          >
            <button
              ref={studentTabRef}
              role="tab"
              id="tab-student"
              aria-controls="login-form-panel"
              aria-selected={activeRole === "student"}
              tabIndex={activeRole === "student" ? 0 : -1}
              onClick={() => handleRoleChange("student")}
              onKeyDown={(e) => handleKeyDownTab(e, "student")}
              className={`rounded-md py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeRole === "student"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Student
            </button>
            <button
              ref={policyTabRef}
              role="tab"
              id="tab-policymaker"
              aria-controls="login-form-panel"
              aria-selected={activeRole === "policymaker"}
              tabIndex={activeRole === "policymaker" ? 0 : -1}
              onClick={() => handleRoleChange("policymaker")}
              onKeyDown={(e) => handleKeyDownTab(e, "policymaker")}
              className={`rounded-md py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeRole === "policymaker"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Policymaker
            </button>
          </div>

          <p className="mt-2.5 text-center text-xs text-muted-foreground leading-relaxed">
            {activeRole === "student"
              ? "Explore employer skill demand, calculate job readiness, and find covering courses."
              : "Analyze macro skill trends, district hiring demand, and training supply gaps."}
          </p>
        </div>

        {/* Login Form */}
        <div id="login-form-panel" role="tabpanel" aria-labelledby={`tab-${activeRole}`} className="mt-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailTouched) {
                    setEmailError(validateEmail(e.target.value))
                  }
                }}
                onBlur={() => {
                  setEmailTouched(true)
                  setEmailError(validateEmail(email))
                }}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "email-error" : undefined}
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  emailError ? "border-destructive focus-visible:ring-destructive" : "border-border/80"
                }`}
              />
              {emailError && (
                <p id="email-error" className="text-xs text-destructive">
                  {emailError}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (passwordTouched) {
                      setPasswordError(validatePassword(e.target.value))
                    }
                  }}
                  onBlur={() => {
                    setPasswordTouched(true)
                    setPasswordError(validatePassword(password))
                  }}
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? "password-error" : undefined}
                  className={`w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    passwordError ? "border-destructive focus-visible:ring-destructive" : "border-border/80"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p id="password-error" className="text-xs text-destructive">
                  {passwordError}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : activeRole === "policymaker" ? (
                "Sign in as Policymaker"
              ) : (
                "Sign in as Student"
              )}
            </button>

            {/* Demo skip button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDemoLogin}
              className="w-full inline-flex items-center justify-center rounded-md border border-border/80 bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              {activeRole === "policymaker"
                ? "Continue as demo policymaker"
                : "Continue as demo student"}
            </button>
          </form>

          {/* Honest Demo Notice */}
          <p className="mt-5 text-center text-xs text-muted-foreground leading-relaxed border-t border-border/60 pt-4">
            Demo environment: there are no real accounts. Any valid-looking email and password will work. Nothing is sent to a server.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <Suspense
          fallback={
            <div className="mx-auto w-full max-w-md px-4 py-16 text-center text-xs text-muted-foreground">
              Loading login portal...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>
    </div>
  )
}
