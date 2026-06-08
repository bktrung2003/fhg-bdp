/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching"
import { registerRoute, NavigationRoute } from "workbox-routing"

declare const self: ServiceWorkerGlobalScope

// Precache the build manifest (app shell + hashed assets).
precacheAndRoute(self.__WB_MANIFEST)

// SPA navigation fallback → index.html, except API/docs which must hit network.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api/, /^\/docs/, /^\/openapi.json/, /^\/sw\.js$/],
  }),
)

// Take control ASAP after an update.
self.addEventListener("install", () => {
  self.skipWaiting()
})
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// ── Web Push ────────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let data: any = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: "Fusion BDP", body: event.data?.text() ?? "" }
  }
  const title = data.title || "Fusion BDP"
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/pwa-192.png",
      badge: "/pwa-192.png",
      tag: data.tag || undefined,
      data: { url: data.url || "/" },
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        // Focus an existing tab if open, navigating it to the target.
        if ("focus" in client) {
          ;(client as WindowClient).navigate(url)
          return (client as WindowClient).focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
