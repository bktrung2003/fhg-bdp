import { createFileRoute } from "@tanstack/react-router"

import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Dashboard - Fusion BD CORE OS",
      },
    ],
  }),
})

function Dashboard() {
  const { user: currentUser } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome back, {currentUser?.full_name || currentUser?.email}
      </h1>
      <p className="text-muted-foreground mt-1">
        Fusion BD CORE OS · Business Development Operating System
      </p>
    </div>
  )
}
