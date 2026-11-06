"use client"

import React, { useEffect, useState, useRef } from "react"
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
  const [isRendered, setIsRendered] = useState(isOpen)
  const [isClosing, setIsClosing] = useState(false)
  const triggerElementRef = useRef<HTMLElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      // Store trigger element that was active before drawer opened
      if (document.activeElement instanceof HTMLElement) {
        triggerElementRef.current = document.activeElement
      }
      setIsRendered(true)
      setIsClosing(false)
    } else if (isRendered) {
      setIsClosing(true)
      const timer = setTimeout(() => {
        setIsRendered(false)
        setIsClosing(false)
        // Return focus to trigger element
        if (triggerElementRef.current && typeof triggerElementRef.current.focus === "function") {
          triggerElementRef.current.focus()
        }
      }, 220)
      return () => clearTimeout(timer)
    }
  }, [isOpen, isRendered])

  // Move focus into the drawer once opened
  useEffect(() => {
    if (isRendered && !isClosing) {
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isRendered, isClosing])

  useEffect(() => {
    if (!isRendered) return

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
  }, [isRendered, onClose])

  if (!mounted || !isRendered) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Backdrop: 160ms fade */}
      <div
        className={`fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-xs ${
          isClosing ? "animate-backdrop-out" : "animate-backdrop-in"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel: 220ms slide */}
      <aside
        className={`fixed top-0 right-0 z-[70] flex h-[100dvh] ${width} flex-col border-l border-border bg-background shadow-raised ${
          isClosing ? "animate-drawer-out" : "animate-drawer-in"
        }`}
      >
        {/* Header - stays fixed at top of drawer */}
        <div className="flex shrink-0 items-start justify-between p-6 pb-4 border-b border-border">
          <div className="min-w-0 pr-4">
            <h3 id="drawer-title" className="text-base font-semibold leading-6 text-foreground truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-xs font-normal leading-4 text-muted-foreground truncate">
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

        {/* Body - only scrolling part */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 pt-4 space-y-4">
          {children}
        </div>
      </aside>
    </div>,
    document.body
  )
}
