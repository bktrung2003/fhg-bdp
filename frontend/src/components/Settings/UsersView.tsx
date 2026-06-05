import { useSuspenseQuery } from "@tanstack/react-query"
import { Suspense, useMemo, useState } from "react"
import { Search, X, Users, ShieldAlert, MapPin } from "lucide-react"

import { type UserPublic, UsersService } from "@/client"
import AddUser from "@/components/Admin/AddUser"
import { columns, type UserTableData } from "@/components/Admin/columns"
import { DataTable } from "@/components/Common/DataTable"
import PendingUsers from "@/components/Pending/PendingUsers"
import useAuth from "@/hooks/useAuth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { MD, useMasterData } from "@/hooks/useMasterData"

const ROLES = ["CEO", "COO", "BD Director", "BD Manager", "Legal", "Finance", "IT Admin"]

function UsersTableContent({
  search, roleFilter, countryFilter, statusFilter,
}: {
  search: string; roleFilter: string; countryFilter: string; statusFilter: string
}) {
  const { user: currentUser } = useAuth()
  const { data: users } = useSuspenseQuery({
    queryKey: ["users"],
    queryFn: () => UsersService.readUsers({ skip: 0, limit: 500 }),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.data.filter((u: UserPublic) => {
      const role = (u as any).role as string | undefined
      const country = (u as any).country as string | undefined
      const title = (u as any).title as string | undefined
      if (q && !`${u.full_name ?? ""} ${u.email} ${title ?? ""}`.toLowerCase().includes(q)) return false
      if (roleFilter && role !== roleFilter) return false
      if (countryFilter === "__global__" && country) return false
      if (countryFilter && countryFilter !== "__global__" && country !== countryFilter) return false
      if (statusFilter === "active" && !u.is_active) return false
      if (statusFilter === "inactive" && u.is_active) return false
      return true
    })
  }, [users.data, search, roleFilter, countryFilter, statusFilter])

  const tableData: UserTableData[] = filtered.map((user: UserPublic) => ({
    ...user,
    isCurrentUser: currentUser?.id === user.id,
  }))

  return <DataTable columns={columns} data={tableData} />
}

export function UsersView() {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [countryFilter, setCountryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const COUNTRIES = useMasterData(MD.COUNTRY)

  const { data: users } = useSuspenseQuery({
    queryKey: ["users"],
    queryFn: () => UsersService.readUsers({ skip: 0, limit: 500 }),
  })
  const all: UserPublic[] = users.data

  // KPI counts
  const totalUsers = all.length
  const activeUsers = all.filter(u => u.is_active).length
  const superUsers = all.filter(u => u.is_superuser).length
  const countryScoped = all.filter(u => (u as any).country).length

  // Role breakdown
  const roleCounts: Record<string, number> = {}
  for (const u of all) {
    const r = (u as any).role as string | undefined
    if (r) roleCounts[r] = (roleCounts[r] ?? 0) + 1
  }

  const hasFilters = !!(search || roleFilter || countryFilter || statusFilter)

  return (
    <div className="flex flex-col gap-4">
      {/* Description */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Manage user accounts, system roles, and country scope. Country scope is captured now —
          full RBAC enforcement (BD Director sees only their country, etc.) is a Phase 2 feature.
        </p>
        <AddUser />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Users className="h-3.5 w-3.5" />} label="Total Users" value={totalUsers} sub={`${activeUsers} active`} />
        <Kpi icon={<ShieldAlert className="h-3.5 w-3.5 text-red-500" />} label="Superusers" value={superUsers} sub="full admin" />
        <Kpi icon={<MapPin className="h-3.5 w-3.5" />} label="Country-scoped" value={countryScoped} sub={`${totalUsers - countryScoped} global`} />
        <Kpi icon={<Users className="h-3.5 w-3.5" />} label="Active / Inactive" value={`${activeUsers} / ${totalUsers - activeUsers}`} sub="logins" />
      </div>

      {/* Role breakdown chips */}
      {Object.keys(roleCounts).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">By role:</span>
          {Object.entries(roleCounts).sort((a,b) => b[1] - a[1]).map(([role, count]) => (
            <button key={role}
              onClick={() => setRoleFilter(roleFilter === role ? "" : role)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-semibold transition-all ${
                roleFilter === role
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 hover:bg-muted border-transparent"
              }`}>
              {role} <span className="opacity-80">· {count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Search name, email, title..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter || "__all__"} onValueChange={v => setRoleFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="All roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All roles</SelectItem>
            {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={countryFilter || "__all__"} onValueChange={v => setCountryFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="All scopes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All scopes</SelectItem>
            <SelectItem value="__global__">— Global only —</SelectItem>
            {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter || "__all__"} onValueChange={v => setStatusFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="All status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All status</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setRoleFilter(""); setCountryFilter(""); setStatusFilter("") }}>
            <X className="h-3.5 w-3.5 mr-1" />Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Suspense fallback={<PendingUsers />}>
        <UsersTableContent
          search={search}
          roleFilter={roleFilter}
          countryFilter={countryFilter}
          statusFilter={statusFilter}
        />
      </Suspense>

      {/* Phase 2 RBAC roadmap note */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
        <p className="font-semibold mb-1">🔒 Phase 2 — RBAC roadmap (planned)</p>
        <ul className="space-y-0.5 list-disc list-inside text-blue-800">
          <li><b>BD Manager</b>: sees only their own assigned deals (already enforced)</li>
          <li><b>BD Director (country)</b>: sees all deals in their country scope</li>
          <li><b>Legal / Finance</b>: read-only across all data</li>
          <li><b>COO / CEO</b>: full read + write across all countries</li>
          <li><b>IT Admin</b>: settings + master data only, no business data</li>
        </ul>
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}{label}
      </p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}
