import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { Footer } from "@/components/Common/Footer"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-hidden">
        {/* Thin top bar — only sidebar trigger, much smaller than before */}
        <header className="sticky top-0 z-10 flex h-10 shrink-0 items-center gap-2 border-b bg-background px-3">
          <SidebarTrigger className="h-7 w-7 text-muted-foreground" />
        </header>
        <main className="flex-1 p-4 md:p-6 min-w-0 overflow-hidden">
          <div className="min-w-0 max-w-full">
            <Outlet />
          </div>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
