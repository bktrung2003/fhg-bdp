import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  Users, Search, X, ArrowUpDown, ArrowUp, ArrowDown,
  Building2, Briefcase, Trash2, Pencil,
} from "lucide-react"
import { useMemo, useState } from "react"

import { OwnersService, type OwnerPublic } from "@/client"
import { AddOwner } from "@/components/Owners/AddOwner"
import { EditOwner } from "@/components/Owners/EditOwner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { MD, useMasterData } from "@/hooks/useMasterData"
import { usePagination, PaginationControls } from "@/components/Common/Pagination"

export const Route = createFileRoute("/_layout/owners")({
  component: OwnersPage,
  head: () => ({ meta: [{ title: "Owner CRM 360 — Fusion BD CORE OS" }] }),
})

// ── Color maps ────────────────────────────────────────────────────────────────

const CATCHUP_COLOR: Record<string, string> = {
  "Overdue":       "bg-red-100 text-red-700",
  "Due this week": "bg-amber-100 text-amber-700",
  "On track":      "bg-green-100 text-green-700",
  "No cadence":    "bg-gray-100 text-gray-600",
}

const REL_COLOR: Record<string, string> = {
  "Strategic Partner": "bg-green-100 text-green-700",
  "Strong":            "bg-blue-100 text-blue-700",
  "Warm":              "bg-orange-100 text-orange-700",
  "New":               "bg-gray-100 text-gray-600",
  "Risk / Unstable":   "bg-red-100 text-red-600",
}

const FH_COLOR: Record<string, string> = {
  "Strong":   "bg-green-100 text-green-700",
  "Moderate": "bg-amber-100 text-amber-700",
  "Unknown":  "bg-gray-100 text-gray-500",
}

const PRIORITY_COLOR: Record<string, string> = {
  "Strategic": "bg-purple-100 text-purple-700",
  "High":      "bg-red-100 text-red-600",
  "Medium":    "bg-amber-100 text-amber-700",
  "Low":       "bg-gray-100 text-gray-600",
}

function Badge({ label, colorMap }: { label?: string | null; colorMap: Record<string, string> }) {
  if (!label) return null
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${colorMap[label] ?? "bg-gray-100 text-gray-600"}`}>
      {label}
    </span>
  )
}

// ── Sort definitions ──────────────────────────────────────────────────────────

type SortField = "company" | "country" | "priority" | "deal_count" | "project_count" | "last_interaction"
type SortDir = "asc" | "desc"

const PRIORITY_RANK: Record<string, number> = {
  "Strategic": 0, "High": 1, "Medium": 2, "Low": 3,
}

function sortOwners(owners: OwnerPublic[], field: SortField, dir: SortDir): OwnerPublic[] {
  const sorted = [...owners]
  const factor = dir === "asc" ? 1 : -1
  sorted.sort((a, b) => {
    switch (field) {
      case "company":
        return a.company.localeCompare(b.company) * factor
      case "country":
        return (a.country ?? "").localeCompare(b.country ?? "") * factor
      case "priority":
        return ((PRIORITY_RANK[a.priority ?? "Low"] ?? 99) - (PRIORITY_RANK[b.priority ?? "Low"] ?? 99)) * factor
      case "deal_count":
        return ((a.deal_count ?? 0) - (b.deal_count ?? 0)) * factor
      case "project_count":
        return (((a as any).project_count ?? 0) - ((b as any).project_count ?? 0)) * factor
      case "last_interaction":
        return ((a.last_interaction ?? "").localeCompare(b.last_interaction ?? "")) * factor
    }
  })
  return sorted
}

// ── Sort Header Cell ──────────────────────────────────────────────────────────

function SortHeader({
  label, field, currentField, currentDir, onSort,
}: {
  label: string; field: SortField; currentField: SortField; currentDir: SortDir
  onSort: (field: SortField) => void
}) {
  const active = currentField === field
  const Icon = !active ? ArrowUpDown : currentDir === "asc" ? ArrowUp : ArrowDown
  return (
    <button
      onClick={() => onSort(field)}
      className={`inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider hover:text-foreground transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
    >
      {label}
      <Icon className="h-3 w-3" />
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function OwnersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  // Filters
  const [search, setSearch] = useState("")
  const [country, setCountry] = useState("")
  const [type, setType] = useState("")
  const [priority, setPriority] = useState("")
  const [relationship, setRelationship] = useState("")
  const [catchup, setCatchup] = useState("")
  const [financial, setFinancial] = useState("")

  // Sort
  const [sortField, setSortField] = useState<SortField>("company")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  // Master data
  const COUNTRIES = useMasterData(MD.COUNTRY)
  const TYPES = useMasterData(MD.OWNER_TYPE)
  const RELATIONSHIPS = useMasterData(MD.OWNER_RELATIONSHIP)
  const CATCHUPS = useMasterData(MD.CATCHUP_STATUS)

  // Data
  const { data, isLoading } = useQuery({
    queryKey: ["owners", { search, country, type, relationship, catchup }],
    queryFn: () => OwnersService.listOwners({
      search: search || undefined,
      ownerType: (type as any) || undefined,
      relationship: (relationship as any) || undefined,
      catchupStatus: (catchup as any) || undefined,
      limit: 500,
    }),
  })

  // Client-side filter for country/priority/financial (not in backend API yet)
  const filtered = useMemo(() => {
    let result = data?.data ?? []
    if (country) result = result.filter(o => o.country === country)
    if (priority) result = result.filter(o => o.priority === priority)
    if (financial) result = result.filter(o => o.financial_health === financial)
    return sortOwners(result, sortField, sortDir)
  }, [data, country, priority, financial, sortField, sortDir])

  // Pagination
  const { page, setPage, pageSize, setPageSize, totalPages, paginated, total } = usePagination(filtered, 10)

  const hasFilters = !!(search || country || type || priority || relationship || catchup || financial)

  function clearFilters() {
    setSearch(""); setCountry(""); setType(""); setPriority(""); setRelationship(""); setCatchup(""); setFinancial("")
  }

  // Stats
  const totalProjects = filtered.reduce((s, o) => s + ((o as any).project_count ?? 0), 0)
  const totalDeals = filtered.reduce((s, o) => s + (o.deal_count ?? 0), 0)
  const overdueCount = filtered.filter(o => o.catchup_status === "Overdue").length

  // Delete handler (only superuser)
  const delMut = useMutation({
    mutationFn: (id: string) => OwnersService.deleteOwner({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owners"] })
      showSuccessToast("Owner deleted.")
    },
    onError: () => showErrorToast("Failed to delete owner."),
  })

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Owner CRM 360</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Strategic owner relationships — {isLoading ? "loading..." : `${filtered.length} owner${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <AddOwner />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Owners</p>
          <p className="text-2xl font-bold mt-1">{filtered.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Projects</p>
          <p className="text-2xl font-bold mt-1">{totalProjects}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Deals</p>
          <p className="text-2xl font-bold mt-1">{totalDeals}</p>
        </div>
        <div className={`rounded-lg border p-3 ${overdueCount > 0 ? "bg-red-50 border-red-200" : "bg-card"}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${overdueCount > 0 ? "text-red-600" : "text-muted-foreground"}`}>Overdue Catch-ups</p>
          <p className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? "text-red-700" : ""}`}>{overdueCount}</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search company, country..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Country" /></SelectTrigger>
          <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>

        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Owner Type" /></SelectTrigger>
          <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>

        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            {["Strategic","High","Medium","Low"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={relationship} onValueChange={setRelationship}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Relationship" /></SelectTrigger>
          <SelectContent>{RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>

        <Select value={catchup} onValueChange={setCatchup}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Catch-up" /></SelectTrigger>
          <SelectContent>{CATCHUPS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>

        <Select value={financial} onValueChange={setFinancial}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Financial" /></SelectTrigger>
          <SelectContent>
            {["Strong","Moderate","Unknown"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading owners...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <div className="rounded-full bg-muted p-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">No owners found</p>
            <p className="text-sm text-muted-foreground">
              {hasFilters ? "Try adjusting your filters." : "Create your first owner."}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 pr-3 pl-3"><SortHeader label="Company" field="company" currentField={sortField} currentDir={sortDir} onSort={handleSort} /></th>
                <th className="text-left py-3 pr-3">Type</th>
                <th className="text-left py-3 pr-3"><SortHeader label="Country" field="country" currentField={sortField} currentDir={sortDir} onSort={handleSort} /></th>
                <th className="text-left py-3 pr-3"><SortHeader label="Priority" field="priority" currentField={sortField} currentDir={sortDir} onSort={handleSort} /></th>
                <th className="text-left py-3 pr-3">Relationship</th>
                <th className="text-left py-3 pr-3">Catch-up</th>
                <th className="text-right py-3 pr-3"><SortHeader label="Projects" field="project_count" currentField={sortField} currentDir={sortDir} onSort={handleSort} /></th>
                <th className="text-right py-3 pr-3"><SortHeader label="Deals" field="deal_count" currentField={sortField} currentDir={sortDir} onSort={handleSort} /></th>
                <th className="text-left py-3 pr-3"><SortHeader label="Last Met" field="last_interaction" currentField={sortField} currentDir={sortDir} onSort={handleSort} /></th>
                <th className="text-left py-3 pr-3">Financial</th>
                <th className="w-[80px] py-3 pr-2"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((o) => (
                <tr key={o.id}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate({ to: "/owners/$ownerId" as any, params: { ownerId: o.id } })}
                >
                  <td className="py-3 pr-3 pl-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {o.company.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{o.company}</p>
                        {o.assets && <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{o.assets}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground whitespace-nowrap">{o.owner_type}</td>
                  <td className="py-3 pr-3 text-sm">{o.country}</td>
                  <td className="py-3 pr-3"><Badge label={o.priority} colorMap={PRIORITY_COLOR} /></td>
                  <td className="py-3 pr-3"><Badge label={o.relationship} colorMap={REL_COLOR} /></td>
                  <td className="py-3 pr-3">
                    <div>
                      <Badge label={o.catchup_status} colorMap={CATCHUP_COLOR} />
                      {o.next_catchup && <p className="text-[10px] text-muted-foreground mt-0.5">Next: {o.next_catchup}</p>}
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <div className="inline-flex items-center gap-1 tabular-nums">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-semibold">{(o as any).project_count ?? 0}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <div className="inline-flex items-center gap-1 tabular-nums">
                      <Briefcase className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-semibold">{o.deal_count}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground whitespace-nowrap">{o.last_interaction ?? "—"}</td>
                  <td className="py-3 pr-3"><Badge label={o.financial_health} colorMap={FH_COLOR} /></td>
                  <td className="py-3 pr-2" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-0.5">
                      <EditOwner owner={o} trigger={
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      } />
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" title="Delete"
                        onClick={() => { if (confirm(`Delete owner "${o.company}"?`)) delMut.mutate(o.id) }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls
            page={page} totalPages={totalPages} pageSize={pageSize} total={total}
            onPageChange={setPage} onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  )
}
