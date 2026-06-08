// Web Push client helpers — permission, subscribe, unsubscribe.
import { OpenAPI } from "@/client"

async function authFetch(path: string, init?: RequestInit) {
  const token =
    typeof OpenAPI.TOKEN === "function"
      ? await (OpenAPI.TOKEN as any)({})
      : OpenAPI.TOKEN
  const res = await fetch(`${OpenAPI.BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export interface PushConfig {
  enabled: boolean
  public_key: string
}

export async function getPushConfig(): Promise<PushConfig> {
  return authFetch("/api/v1/push/config")
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  // vite-plugin-pwa registers the SW; wait until it's ready.
  return navigator.serviceWorker.ready
}

export async function getSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await getRegistration()
  return reg.pushManager.getSubscription()
}

export async function isSubscribed(): Promise<boolean> {
  return (await getSubscription()) !== null
}

/** Request permission + subscribe + register with backend. Returns true on success. */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) throw new Error("Push not supported on this device/browser")

  const cfg = await getPushConfig()
  if (!cfg.enabled || !cfg.public_key)
    throw new Error("Push is not configured on the server")

  const permission = await Notification.requestPermission()
  if (permission !== "granted") throw new Error("Notification permission denied")

  const reg = await getRegistration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(cfg.public_key),
    })
  }

  const json = sub.toJSON() as any
  await authFetch("/api/v1/push/subscribe", {
    method: "POST",
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: json.keys,
      user_agent: navigator.userAgent.slice(0, 300),
    }),
  })
  return true
}

export async function disablePush(): Promise<void> {
  const sub = await getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  try {
    await sub.unsubscribe()
  } catch {
    /* ignore */
  }
  await authFetch(`/api/v1/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
    method: "DELETE",
  })
}

export async function sendTestPush(): Promise<string> {
  const r = await authFetch("/api/v1/push/test", { method: "POST" })
  return r.message as string
}
