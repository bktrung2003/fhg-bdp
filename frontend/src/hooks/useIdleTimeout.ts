import { useEffect, useRef } from "react"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"

export const IDLE_KEY = "idle_timeout_min"
export const IDLE_DEFAULT = 15 // minutes; 0 = disabled

export function getIdleTimeout(): number {
  const v = Number(localStorage.getItem(IDLE_KEY))
  return Number.isFinite(v) ? v : IDLE_DEFAULT
}
export function setIdleTimeout(min: number) {
  localStorage.setItem(IDLE_KEY, String(min))
  window.dispatchEvent(new Event("idle-timeout-changed"))
}

/**
 * Auto sign-out after N minutes of no user activity (mouse/key/touch/scroll).
 * Reads the per-device preference from localStorage; 0 = disabled.
 * Mounted once at the app layout level.
 */
export function useIdleTimeout() {
  const { logout } = useAuth()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let mins = getIdleTimeout()

    const clear = () => { if (timer.current) clearTimeout(timer.current) }
    const arm = () => {
      clear()
      if (!mins || mins <= 0) return
      if (!isLoggedIn()) return
      timer.current = setTimeout(() => {
        if (isLoggedIn()) {
          try { sessionStorage.setItem("idle_signed_out", "1") } catch {}
          logout()
        }
      }, mins * 60 * 1000)
    }

    const onActivity = () => arm()
    const onPrefChange = () => { mins = getIdleTimeout(); arm() }

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"]
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
    window.addEventListener("idle-timeout-changed", onPrefChange)
    // re-arm when tab regains focus
    document.addEventListener("visibilitychange", onActivity)

    arm()
    return () => {
      clear()
      events.forEach(e => window.removeEventListener(e, onActivity))
      window.removeEventListener("idle-timeout-changed", onPrefChange)
      document.removeEventListener("visibilitychange", onActivity)
    }
  }, [logout])
}
