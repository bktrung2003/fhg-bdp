import type { ColumnDef } from "@tanstack/react-table"
import { MapPin, ShieldAlert } from "lucide-react"

import type { UserPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { UserActionsMenu } from "./UserActionsMenu"

export type UserTableData = UserPublic & {
  isCurrentUser: boolean
}

// Role badge colors — semantic, matches dropdown order
const ROLE_TONE: Record<string, string> = {
  CEO:            "bg-purple-100 text-purple-700 border-purple-200",
  COO:            "bg-purple-100 text-purple-700 border-purple-200",
  "BD Director":  "bg-blue-100 text-blue-700 border-blue-200",
  "BD Manager":   "bg-sky-100 text-sky-700 border-sky-200",
  Legal:          "bg-amber-100 text-amber-700 border-amber-200",
  Finance:        "bg-emerald-100 text-emerald-700 border-emerald-200",
  "IT Admin":     "bg-slate-100 text-slate-700 border-slate-200",
}

export const columns: ColumnDef<UserTableData>[] = [
  {
    accessorKey: "full_name",
    header: "Name & Title",
    cell: ({ row }) => {
      const fullName = row.original.full_name
      const title = (row.original as any).title as string | undefined
      return (
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className={cn("font-semibold text-sm", !fullName && "text-muted-foreground italic")}>
              {fullName || "Unnamed"}
            </span>
            {row.original.isCurrentUser && (
              <Badge variant="outline" className="text-[9px] h-4 px-1">You</Badge>
            )}
          </div>
          {title && <p className="text-[10.5px] text-muted-foreground mt-0.5">{title}</p>}
        </div>
      )
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground font-mono">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = (row.original as any).role as string | undefined
      const isSuper = row.original.is_superuser
      const tone = role ? ROLE_TONE[role] : "bg-gray-100 text-gray-700 border-gray-200"
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          {role && (
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${tone}`}>
              {role}
            </span>
          )}
          {isSuper && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-red-200 bg-red-50 text-red-700 px-1.5 py-0.5 text-[9.5px] font-bold" title="System superuser — full admin">
              <ShieldAlert className="h-2.5 w-2.5" />SUPER
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "country",
    header: "Scope",
    cell: ({ row }) => {
      const country = (row.original as any).country as string | undefined
      return country ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />{country}
        </span>
      ) : (
        <span className="text-[10.5px] text-muted-foreground italic">Global</span>
      )
    },
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", row.original.is_active ? "bg-green-500" : "bg-gray-400")} />
        <span className={cn("text-xs", row.original.is_active ? "" : "text-muted-foreground")}>
          {row.original.is_active ? "Active" : "Inactive"}
        </span>
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <UserActionsMenu user={row.original} />
      </div>
    ),
  },
]
