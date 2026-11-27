"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Compass, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react"
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
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-16 animate-page-enter">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-resting">
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
          >
            <Compass className="h-4 w-4" />
            <span>SkillPath Demonstration</span>
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-2">
            Sign in to SkillPath
          </h1>
        </div>

        {/* Accessible Segmented Control */}
        <div className="mt-6">
          <div
            role="tablist"
            aria-label="User role selection"
            className="grid grid-cols-2 rounded-lg border border-border bg-muted/40 p-1"
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
              className={`rounded-md py-2 text-xs font-semibold transition-all duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeRole === "student"
                  ? "bg-background text-foreground shadow-resting font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Student / Job Seeker
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
              className={`rounded-md py-2 text-xs font-semibold transition-all duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeRole === "policymaker"
                  ? "bg-background text-foreground shadow-resting font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Policymaker / Planner
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground leading-relaxed">
            {activeRole === "student"
              ? "Assess your skills against employer requirements and view personalized course roadmaps."
              : "Review district hiring signals, curriculum coverage scores, and vocational training plans."}
          </p>
        </div>

        {/* Login Form Panel */}
        <div
          id="login-form-panel"
          role="tabpanel"
          aria-labelledby={`tab-${activeRole}`}
          className="mt-6"
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-foreground"
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="name@example.com"
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
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-resting placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  emailError
                    ? "border-negative focus-visible:ring-negative"
                    : "border-border"
                }`}
              />
              {emailError && (
                <p id="email-error" className="text-xs text-negative">
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
                  placeholder="••••••••"
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
                  className={`w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm text-foreground shadow-resting placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    passwordError
                      ? "border-negative focus-visible:ring-negative"
                      : "border-border"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-1"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p id="password-error" className="text-xs text-negative">
                  {passwordError}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-resting transition-colors duration-120 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 active:translate-y-[1px]"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : activeRole === "policymaker" ? (
                "Sign in as Policymaker"
              ) : (
                "Sign in as Student"
              )}
            </button>

            {/* Quick Demo Bypass Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDemoLogin}
              className="w-full inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-resting transition-colors duration-120 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 active:translate-y-[1px]"
            >
              <span>
                {activeRole === "policymaker"
                  ? "Continue as demo policymaker"
                  : "Continue as demo student"}
              </span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </form>

          {/* Honest Demo Notice */}
          <div className="mt-6 border-t border-border pt-4 text-center">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong className="font-semibold text-foreground">Demo environment:</strong> No real user accounts exist. Any valid-looking email and password will work. Credentials are never sent to a server.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div data-mood="neutral" className="flex min-h-dvh flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Suspense
          fallback={
            <div className="mx-auto w-full max-w-md px-4 py-16 text-center text-xs text-muted-foreground">
              Loading authentication portal...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>
    </div>
  )
}
