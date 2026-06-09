import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { Footer } from "@/components/Common/Footer"
import { Logo } from "@/components/Common/Logo"
import { InstallPrompt } from "@/components/Common/InstallPrompt"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import { BottomNav } from "@/components/Sidebar/BottomNav"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { isLoggedIn } from "@/hooks/useAuth"
import { useIdleTimeout } from "@/hooks/useIdleTimeout"

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
  useIdleTimeout()
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-hidden">
        {/* Top bar. On mobile, the bottom nav handles navigation, so the top
            bar just shows the logo (centered-left). On desktop it's the
            sidebar trigger. */}
        <header className="sticky top-0 z-10 flex h-12 md:h-10 shrink-0 items-center gap-2 border-b bg-background px-3">
          <SidebarTrigger className="hidden md:flex h-7 w-7 text-muted-foreground" />
          <div className="md:hidden">
            <Logo variant="icon" asLink />
          </div>
        </header>
        {/* pb-20 on mobile keeps content clear of the fixed bottom nav */}
        <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6 min-w-0 overflow-hidden">
          <div className="min-w-0 max-w-full">
            <Outlet />
          </div>
        </main>
        <Footer />
        <BottomNav />
        <InstallPrompt />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
