import { useEffect, useState } from "react"
import { Bell, BellOff, Smartphone, CheckCircle2, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import {
  disablePush,
  enablePush,
  getPushConfig,
  isSubscribed,
  pushSupported,
  sendTestPush,
} from "@/lib/push"

export function NotificationsView() {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [supported] = useState(pushSupported())
  const [serverEnabled, setServerEnabled] = useState<boolean | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  )

  useEffect(() => {
    if (!supported) return
    getPushConfig()
      .then((c) => setServerEnabled(c.enabled))
      .catch(() => setServerEnabled(false))
    isSubscribed().then(setSubscribed)
  }, [supported])

  const handleEnable = async () => {
    setBusy(true)
    try {
      await enablePush()
      setSubscribed(true)
      setPermission(Notification.permission)
      showSuccessToast("Notifications enabled on this device.")
    } catch (e: any) {
      showErrorToast(e?.message ?? "Could not enable notifications")
    } finally {
      setBusy(false)
    }
  }

  const handleDisable = async () => {
    setBusy(true)
    try {
      await disablePush()
      setSubscribed(false)
      showSuccessToast("Notifications disabled on this device.")
    } catch (e: any) {
      showErrorToast(e?.message ?? "Could not disable notifications")
    } finally {
      setBusy(false)
    }
  }

  const handleTest = async () => {
    setBusy(true)
    try {
      const msg = await sendTestPush()
      showSuccessToast(msg)
    } catch (e: any) {
      showErrorToast(e?.message ?? "Test failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Push Notifications
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Get alerts on this device when deals change stage or tasks become
          overdue — even when the app is closed. Enable per device you want to
          receive alerts on.
        </p>
      </div>

      {/* Not supported */}
      {!supported && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            This browser doesn't support web push. On iPhone, you must first{" "}
            <b>Add to Home Screen</b> (iOS 16.4+) and open the app from that
            icon, then return here.
          </div>
        </div>
      )}

      {/* Server not configured */}
      {supported && serverEnabled === false && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>Push is not configured on the server (VAPID keys missing).</div>
        </div>
      )}

      {/* Main control */}
      {supported && serverEnabled && (
        <div className="rounded-lg border bg-card p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-full p-2 ${
                  subscribed ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"
                }`}
              >
                {subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {subscribed ? "Enabled on this device" : "Disabled on this device"}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  {subscribed
                    ? "You'll receive alerts here"
                    : "Turn on to receive alerts here"}
                </p>
              </div>
            </div>

            {subscribed ? (
              <Button variant="outline" size="sm" onClick={handleDisable} disabled={busy}>
                <BellOff className="h-3.5 w-3.5 mr-1" />Disable
              </Button>
            ) : (
              <Button size="sm" onClick={handleEnable} disabled={busy}>
                <Bell className="h-3.5 w-3.5 mr-1" />Enable
              </Button>
            )}
          </div>

          {permission === "denied" && (
            <div className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">
              Notifications are blocked in your browser settings. Allow them for
              this site, then try again.
            </div>
          )}

          {subscribed && (
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-xs text-muted-foreground">
                Send a test notification to confirm it works.
              </span>
              <Button variant="ghost" size="sm" onClick={handleTest} disabled={busy}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Send test
              </Button>
            </div>
          )}
        </div>
      )}

      {/* What triggers notifications */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          You'll be notified when
        </p>
        <ul className="text-sm space-y-1.5">
          <li className="flex gap-2">
            <span className="text-primary">•</span> A deal changes stage (e.g. → HMA Signed) — sent to executives
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span> Your tasks become overdue — daily summary
          </li>
        </ul>
        <p className="text-[11px] text-muted-foreground mt-3">
          📱 iPhone: works only after installing the app to your Home Screen (iOS 16.4+).
          Android &amp; desktop Chrome/Edge work in the browser.
        </p>
      </div>
    </div>
  )
}
