"use client"

import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  width?: string
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = "w-[min(480px,100vw)]",
}: DrawerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!mounted || !isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 z-[70] flex h-[100dvh] ${width} flex-col border-l border-border bg-background shadow-2xl animate-drawer-in`}
      >
        {/* Header - stays fixed at top of drawer */}
        <div className="flex shrink-0 items-start justify-between p-6 pb-4 border-b border-border/60">
          <div className="min-w-0 pr-4">
            <h3 id="drawer-title" className="text-base font-semibold text-foreground truncate">
              {title}
            </h3>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body - only scrolling part */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 pt-4 space-y-4">
          {children}
        </div>
      </aside>
    </div>,
    document.body
  )
}
