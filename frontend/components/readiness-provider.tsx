"use client"

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { BACKEND_URL } from "@/lib/demand-api"

export type ReadinessStatus = "checking" | "waking" | "ready" | "failed"

export interface ReadyResponseBody {
  ready?: boolean
  phase?: "seeding" | "ready" | "failed" | "empty" | string
  synthetic?: boolean
}

export interface ReadinessContextValue {
  status: ReadinessStatus
  elapsedSeconds: number
  remountKey: number
}

/**
 * Pure mapping function from HTTP status, response body, and/or errors to ReadinessStatus.
 *
 * Status rules:
 * - HTTP 404 -> "ready" (an older backend without this endpoint; never block the app)
 * - Any network error, timeout (AbortError), CORS error, or null status -> "waking"
 * - Non-200 / non-404 status (e.g. 502, 503, 500) -> "waking"
 * - HTTP 200 with valid JSON:
 *   - ready === true -> "ready"
 *   - phase === "failed" -> "failed"
 *   - ready === false (with phase "seeding", "empty", or any other) -> "waking"
 * - HTTP 200 with non-JSON body / JSON parse error -> "waking"
 */
export function mapReadinessResponse(
  httpStatus: number | null,
  body: ReadyResponseBody | null,
  error?: unknown
): ReadinessStatus {
  if (httpStatus === 404) {
    return "ready"
  }

  if (error || httpStatus === null) {
    return "waking"
  }

  if (httpStatus !== 200) {
    return "waking"
  }

  if (body && typeof body === "object") {
    if (body.ready === true) {
      return "ready"
    }
    if (body.phase === "failed") {
      return "failed"
    }
    return "waking"
  }

  return "waking"
}

export interface WakingBannerProps {
  status: ReadinessStatus
  elapsedSeconds?: number
}

export function WakingBanner({ status, elapsedSeconds = 0 }: WakingBannerProps) {
  if (status !== "waking" && status !== "failed") {
    return null
  }

  const isWaking = status === "waking"

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        isWaking
          ? "shrink-0 border-b border-warning/40 bg-warning-subtle px-4 py-2.5 text-warning-foreground transition-colors duration-150"
          : "shrink-0 border-b border-destructive/30 bg-destructive/10 px-4 py-2.5 text-destructive transition-colors duration-150"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2.5 text-xs sm:text-sm font-medium leading-5">
        {isWaking ? (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none text-warning-foreground"
            aria-hidden="true"
          />
        ) : (
          <AlertCircle
            className="h-4 w-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
        )}
        <span>
          {isWaking ? (
            <>
              Starting the demo server{elapsedSeconds > 0 ? ` (${elapsedSeconds}s)` : ""}. The free host sleeps when idle; this can take up to about 4 minutes. Pages will fill in automatically.
            </>
          ) : (
            "The demo data could not be prepared. Try again in a few minutes."
          )}
        </span>
      </div>
    </div>
  )
}

const ReadinessContext = createContext<ReadinessContextValue>({
  status: "checking",
  elapsedSeconds: 0,
  remountKey: 0,
})

export function useReadiness() {
  return useContext(ReadinessContext)
}

export interface ReadinessProviderProps {
  children: React.ReactNode
  showBanner?: boolean
}

export function ReadinessProvider({
  children,
  showBanner = true,
}: ReadinessProviderProps) {
  const [status, setStatus] = useState<ReadinessStatus>("checking")
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [remountKey, setRemountKey] = useState(0)

  // Track if backend was ever in a not-ready state ("waking" or "failed" or grace passed)
  const hadNotReadyRef = useRef(false)
  const statusRef = useRef<ReadinessStatus>("checking")
  statusRef.current = status

  // Track in-flight request to ensure only one request is in flight at a time
  const inFlightRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null)
  const graceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let mounted = true

    // No-flicker grace timer: stay in "checking" (show no banner) until first check completes or 2 seconds pass
    graceTimerRef.current = setTimeout(() => {
      if (!mounted) return
      if (statusRef.current === "checking") {
        hadNotReadyRef.current = true
        setStatus("waking")
      }
    }, 2000)

    const checkReadiness = async () => {
      if (!mounted || statusRef.current === "ready") {
        return
      }

      if (inFlightRef.current) {
        return
      }

      inFlightRef.current = true
      const controller = new AbortController()
      abortControllerRef.current = controller

      // 15-second per-request timeout
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 15000)

      let httpStatus: number | null = null
      let body: ReadyResponseBody | null = null
      let fetchError: unknown = null

      try {
        const res = await fetch(`${BACKEND_URL}/api/ready`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        })
        httpStatus = res.status
        if (httpStatus === 200) {
          try {
            body = (await res.json()) as ReadyResponseBody
          } catch (jsonErr) {
            fetchError = jsonErr
          }
        }
      } catch (err) {
        fetchError = err
      } finally {
        clearTimeout(timeoutId)
        inFlightRef.current = false
      }

      if (!mounted) return

      const newStatus = mapReadinessResponse(httpStatus, body, fetchError)

      // First check completed; clear grace timer if pending
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current)
        graceTimerRef.current = null
      }

      if (newStatus === "ready") {
        if (hadNotReadyRef.current) {
          // Transitioned from not-ready to ready: remount children so pages reload data!
          setRemountKey((k) => k + 1)
          hadNotReadyRef.current = false
        }
        setStatus("ready")
        // Stop polling once ready
        return
      }

      // Backend is not ready ("waking" or "failed")
      hadNotReadyRef.current = true
      setStatus(newStatus)

      // Poll every 5s while waking, slower (every 15s) while failed
      const delay = newStatus === "failed" ? 15000 : 5000
      pollTimerRef.current = setTimeout(checkReadiness, delay)
    }

    // Check immediately on mount
    checkReadiness()

    return () => {
      mounted = false
      inFlightRef.current = false
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current)
        graceTimerRef.current = null
      }
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Elapsed seconds timer: ticks every 1 second while status is "waking"
  useEffect(() => {
    if (status === "waking") {
      elapsedTimerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1)
      }, 1000)
    } else {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current)
        elapsedTimerRef.current = null
      }
      if (status === "ready") {
        setElapsedSeconds(0)
      }
    }

    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current)
        elapsedTimerRef.current = null
      }
    }
  }, [status])

  const isBannerVisible = showBanner && (status === "waking" || status === "failed")

  return (
    <ReadinessContext.Provider value={{ status, elapsedSeconds, remountKey }}>
      {isBannerVisible && <WakingBanner status={status} elapsedSeconds={elapsedSeconds} />}
      <div key={remountKey} className="contents">
        {children}
      </div>
    </ReadinessContext.Provider>
  )
}
