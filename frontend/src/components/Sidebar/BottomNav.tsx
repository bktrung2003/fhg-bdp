import { Link, useRouterState } from "@tanstack/react-router"
import { Home, Building2, UserCheck, CheckSquare, Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"

// Five thumb-friendly primary destinations. Everything else lives behind
// "More" (opens the full sidebar drawer).
const PRIMARY = [
  { icon: Home, title: "Home", path: "/" },
  { icon: Building2, title: "Pipeline", path: "/deals" },
  { icon: UserCheck, title: "Owners", path: "/owners" },
  { icon: CheckSquare, title: "Tasks", path: "/activities" },
] as const

export function BottomNav() {
  const { setOpenMobile } = useSidebar()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path)

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur
                 supports-[backdrop-filter]:bg-background/80"
      // iOS home-bar safe area
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5 h-14">
        {PRIMARY.map((item) => {
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              <span>{item.title}</span>
            </Link>
          )
        })}
        {/* More → open the full sidebar drawer */}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium
                     text-muted-foreground transition-colors active:text-primary"
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  )
}
