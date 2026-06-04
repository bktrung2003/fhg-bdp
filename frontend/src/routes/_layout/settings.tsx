import { createFileRoute } from "@tanstack/react-router"
import { User, KeyRound, AlertOctagon, Users, Database } from "lucide-react"

import ChangePassword from "@/components/UserSettings/ChangePassword"
import DeleteAccount from "@/components/UserSettings/DeleteAccount"
import UserInformation from "@/components/UserSettings/UserInformation"
import { MasterDataView } from "@/components/Settings/MasterDataView"
import { UsersView } from "@/components/Settings/UsersView"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Settings - Fusion BD CORE OS" }],
  }),
})

const PERSONAL_TABS = [
  { value: "my-profile", title: "My Profile", icon: User, component: UserInformation },
  { value: "password", title: "Password", icon: KeyRound, component: ChangePassword },
  { value: "danger-zone", title: "Danger Zone", icon: AlertOctagon, component: DeleteAccount },
]

const ADMIN_TABS = [
  { value: "users", title: "Users", icon: Users, component: UsersView },
  { value: "master-data", title: "Master Data", icon: Database, component: MasterDataView },
]

function SettingsPage() {
  const { user: currentUser } = useAuth()
  if (!currentUser) return null

  const tabs = currentUser.is_superuser
    ? [...PERSONAL_TABS, ...ADMIN_TABS]
    : PERSONAL_TABS

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account, users and system configuration
        </p>
      </div>

      <Tabs defaultValue="my-profile">
        <TabsList className="grid grid-cols-3 md:grid-cols-5 w-full max-w-3xl gap-1">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
              <tab.icon className="h-3.5 w-3.5" />
              <span>{tab.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Group header for admin section */}
        {currentUser.is_superuser && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-4">
            Switch between personal settings and system configuration above
          </p>
        )}

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            <tab.component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
