import { EllipsisVertical, ShieldOff } from "lucide-react"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { OpenAPI, type UserPublic } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import DeleteUser from "./DeleteUser"
import EditUser from "./EditUser"

interface UserActionsMenuProps {
  user: UserPublic
}

export const UserActionsMenu = ({ user }: UserActionsMenuProps) => {
  const [open, setOpen] = useState(false)
  const { user: currentUser } = useAuth()
  const qc = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const reset2fa = useMutation({
    mutationFn: async () => {
      const token = typeof OpenAPI.TOKEN === "function" ? await (OpenAPI.TOKEN as any)({}) : OpenAPI.TOKEN
      const res = await fetch(`${OpenAPI.BASE}/api/v1/users/${user.id}/disable-2fa`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.detail ?? "Failed")
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); showSuccessToast("2FA reset for user.") },
    onError: (e: any) => showErrorToast(e?.message ?? "Failed to reset 2FA"),
  })

  if (user.id === currentUser?.id) {
    return null
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <EditUser user={user} onSuccess={() => setOpen(false)} />
        {(user as any).totp_enabled && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              if (confirm(`Reset 2FA for ${user.email}? They will sign in with password only until they re-enable it.`)) {
                reset2fa.mutate()
                setOpen(false)
              }
            }}
          >
            <ShieldOff className="h-4 w-4 mr-2 text-amber-600" />Reset 2FA
          </DropdownMenuItem>
        )}
        <DeleteUser id={user.id} onSuccess={() => setOpen(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
