import { BarChart3, Briefcase, Building2, CheckSquare, FileText, Home, HelpCircle, Rocket, Settings, UserCheck } from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { User } from "./User"

const baseItems: Item[] = [
  { icon: Home, title: "Dashboard", path: "/" },
  { icon: UserCheck, title: "Owner CRM 360", path: "/owners" },
  { icon: Briefcase, title: "Projects", path: "/projects" },
  { icon: Building2, title: "Deal Pipeline", path: "/deals" },
  { icon: CheckSquare, title: "Activities & Tasks", path: "/activities" },
  { icon: FileText, title: "Documents", path: "/documents" },
  { icon: BarChart3, title: "Feasibility", path: "/feasibility" },
  { icon: Rocket, title: "Pre-opening", path: "/preopening" },
]

export function AppSidebar() {
  const { user: currentUser } = useAuth()

  // Single Settings entry — contains Profile + Password + (Admin Users + Master Data) for superusers
  const items: Item[] = [
    ...baseItems,
    { icon: HelpCircle, title: "Help", path: "/help" },
    { icon: Settings, title: "Settings", path: "/settings" },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
