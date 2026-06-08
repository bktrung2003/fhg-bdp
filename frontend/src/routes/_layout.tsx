import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { Footer } from "@/components/Common/Footer"
import { Logo } from "@/components/Common/Logo"
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
        {/* Top bar. On mobile the sidebar is a drawer, so show the logo next to
            the hamburger for brand presence + tap-to-open. */}
        <header className="sticky top-0 z-10 flex h-12 md:h-10 shrink-0 items-center gap-2 border-b bg-background px-3">
          <SidebarTrigger className="h-8 w-8 md:h-7 md:w-7 text-muted-foreground" />
          <div className="md:hidden">
            <Logo variant="icon" asLink />
          </div>
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
