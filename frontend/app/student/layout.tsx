"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Compass,
  LayoutDashboard,
  UserCheck,
  Sparkles,
  LogOut,
  User,
} from "lucide-react"
import { useAuthGuard } from "@/lib/auth"

const navItems = [
  { name: "Dashboard", href: "/student", icon: LayoutDashboard },
  { name: "Describe Myself", href: "/student/describe-myself", icon: UserCheck },
  { name: "Skill Analysis", href: "/student/skill-analysis", icon: Sparkles },
]

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { authorized, userName, logout } = useAuthGuard("student")

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Authenticating...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Dark left sidebar matching policy style */}
      <aside className="w-64 flex-shrink-0 bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col justify-between">
        <div>
          {/* Logo & Workspace label */}
          <div className="p-6 border-b border-slate-800/80">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm">
                <Compass className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold tracking-tight text-white">SkillPath</span>
            </Link>
            <div className="mt-3">
              <span className="inline-block rounded-md bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300">
                Student & Job Seeker Hub
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                item.href === "/student"
                  ? pathname === "/student"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-teal-600 text-white font-semibold"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Footer / Log out */}
        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with user name */}
        <header className="h-16 border-b border-border/60 bg-background/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Career Pathway & Skills Explorer
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 py-1.5 shadow-sm text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/10 text-teal-600">
                <User className="h-3.5 w-3.5" />
              </span>
              <span className="font-medium text-foreground">{userName}</span>
            </div>
          </div>
        </header>

        {/* Page children */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
