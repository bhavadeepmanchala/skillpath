import Link from "next/link"
import { Compass } from "lucide-react"

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">SkillPath</span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/policymaker"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Policymaker View
          </Link>
          <Link
            href="/#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </Link>
        </nav>
      </div>
    </header>
  )
}
