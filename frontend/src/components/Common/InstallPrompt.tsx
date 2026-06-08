import { useEffect, useState } from "react"
import { Download, Share, X, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

const DISMISS_KEY = "pwa-install-dismissed"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  )
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

/**
 * Floating banner that nudges browser users to install the PWA.
 * - Android / Chrome / Edge: captures beforeinstallprompt → one-tap install.
 * - iOS Safari: shows Add-to-Home-Screen instructions (Apple blocks
 *   programmatic install).
 * Hidden when already installed, or after the user dismisses it.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [iosHelp, setIosHelp] = useState(false)

  useEffect(() => {
    if (isStandalone()) return // already installed
    if (localStorage.getItem(DISMISS_KEY)) return // user dismissed before

    // Android / desktop Chromium
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)

    // iOS has no beforeinstallprompt — show the manual hint instead.
    if (isIOS()) setShow(true)

    // Hide once installed
    const onInstalled = () => setShow(false)
    window.addEventListener("appinstalled", onInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const dismiss = () => {
    setShow(false)
    setIosHelp(false)
    localStorage.setItem(DISMISS_KEY, "1")
  }

  const install = async () => {
    if (deferred) {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === "accepted") setShow(false)
      setDeferred(null)
    } else if (isIOS()) {
      setIosHelp(true)
    }
  }

  if (!show) return null

  return (
    <>
      {/* Banner — sits above the mobile bottom nav (bottom-16) */}
      <div className="fixed inset-x-0 bottom-16 md:bottom-4 z-50 px-3 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-md rounded-xl border bg-card shadow-lg p-3 flex items-center gap-3">
          <img src="/pwa-192.png" alt="" className="h-10 w-10 rounded-lg shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Install Fusion BDP</p>
            <p className="text-[11px] text-muted-foreground">
              Add to your home screen for full-screen, app-like access.
            </p>
          </div>
          <Button size="sm" className="shrink-0" onClick={install}>
            <Download className="h-3.5 w-3.5 mr-1" />Install
          </Button>
          <button
            onClick={dismiss}
            className="shrink-0 text-muted-foreground hover:text-foreground p-1"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* iOS step-by-step sheet */}
      {iosHelp && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3" onClick={() => setIosHelp(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">Install on iPhone / iPad</p>
              <button onClick={() => setIosHelp(false)} className="text-muted-foreground p-1"><X className="h-4 w-4" /></button>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                <span className="flex items-center gap-1.5">Tap the <Share className="h-4 w-4 inline text-blue-500" /> <b>Share</b> button in Safari</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
                <span className="flex items-center gap-1.5">Choose <Plus className="h-4 w-4 inline" /> <b>Add to Home Screen</b></span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
                <span>Tap <b>Add</b> — done! Open Fusion BDP from your home screen.</span>
              </li>
            </ol>
            <p className="text-[11px] text-muted-foreground mt-4">
              Requires Safari on iOS 16.4+. Installing also enables push notifications.
            </p>
            <Button className="w-full mt-4" variant="outline" onClick={dismiss}>Got it</Button>
          </div>
        </div>
      )}
    </>
  )
}
