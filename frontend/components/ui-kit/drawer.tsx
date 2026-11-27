"use client"

import React, { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { X } from "lucide-react"
import { usePrefersReducedMotion } from "./motion-hooks"

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
  const triggerElementRef = useRef<HTMLElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Capture trigger focus & restore on close
  useEffect(() => {
    if (isOpen) {
      if (document.activeElement instanceof HTMLElement) {
        triggerElementRef.current = document.activeElement
      }
      const focusTimer = setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 60)
      return () => clearTimeout(focusTimer)
    } else if (
      triggerElementRef.current &&
      typeof triggerElementRef.current.focus === "function"
    ) {
      const el = triggerElementRef.current
      triggerElementRef.current = null
      el.focus()
    }
  }, [isOpen])

  // Lock body scroll & Escape listener while open
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.16 }}
            className="fixed inset-0 z-[60] bg-slate-950/45 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel: spring slide */}
          <motion.aside
            initial={reducedMotion ? { x: 0 } : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reducedMotion ? { x: "100%" } : { x: "100%" }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 360, damping: 34, mass: 0.9 }
            }
            className={`fixed top-0 right-0 z-[70] flex h-[100dvh] ${width} flex-col border-l border-border bg-background shadow-raised`}
          >
            {/* Header - stays fixed at top of drawer */}
            <div className="flex shrink-0 items-start justify-between p-6 pb-4 border-b border-border bg-card">
              <div className="min-w-0 pr-4">
                <h3
                  id="drawer-title"
                  className="font-serif text-lg font-semibold leading-snug text-foreground break-words"
                >
                  {title}
                </h3>
                {subtitle && (
                  <p className="mt-0.5 text-xs font-normal leading-4 text-muted-foreground break-words">
                    {subtitle}
                  </p>
                )}
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-120"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Body - scrolls vertically */}
            <div className="flex-1 overflow-y-auto p-6 overscroll-contain">
              {children}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
