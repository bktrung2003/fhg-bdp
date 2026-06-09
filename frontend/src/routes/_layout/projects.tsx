import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Briefcase, Search, X, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"

import { ProjectsService, type ProjectPublic } from "@/client"
import { AddProject } from "@/components/Projects/AddProject"
import { EditProject } from "@/components/Projects/EditProject"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { usePagination, PaginationControls } from "@/components/Common/Pagination"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/projects")({
  component: ProjectsPage,
  head: () => ({ meta: [{ title: "Projects — Fusion BD CORE OS" }] }),
})

const STATUS_COLOR: Record<string, string> = {
  "Prospect":  "bg-gray-100 text-gray-700",
  "Active":    "bg-blue-100 text-blue-700",
  "On Hold":   "bg-amber-100 text-amber-700",
  "Operating": "bg-green-100 text-green-700",
  "Lost":      "bg-red-100 text-red-600",
  "Closed":    "bg-gray-200 text-gray-500",
}

const fmtM = (n?: number | null) => n != null ? `$${(n / 1_000_000).toFixed(1)}M` : "—"
const projNumber = (n?: number | null) => n != null ? `FHG-P-${String(n).padStart(5, "0")}` : "—"

function ProjectsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [countryFilter, setCountryFilter] = useState("")
  const [ownerFilter, setOwnerFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [sortBy, setSortBy] = useState("name")

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => ProjectsService.listProjects({ limit: 500 }),
  })

  const allProjects = (data?.data ?? []) as ProjectPublic[]
  const total = data?.count ?? 0

  // Filter option lists derived from data
  const countries = useMemo(() => Array.from(new Set(allProjects.map(p => p.country).filter(Boolean))).sort(), [allProjects])
  const owners = useMemo(() => Array.from(new Set(allProjects.map(p => p.owner_name).filter(Boolean))).sort(), [allProjects])
  const types = useMemo(() => Array.from(new Set(allProjects.map(p => p.project_type).filter(Boolean))).sort(), [allProjects])

  const projects = useMemo(() => {
    const q = search.trim().toLowerCase()
    let arr = allProjects.filter(p =>
      (!q || `${p.name} ${p.city ?? ""} ${p.country ?? ""} ${p.owner_name ?? ""}`.toLowerCase().includes(q)) &&
      (!statusFilter || p.status === statusFilter) &&
      (!countryFilter || p.country === countryFilter) &&
      (!ownerFilter || p.owner_name === ownerFilter) &&
      (!typeFilter || p.project_type === typeFilter))
    arr = [...arr].sort((a, b) =>
      sortBy === "keys" ? ((b.keys ?? 0) - (a.keys ?? 0))
      : sortBy === "deals" ? (((b as any).deal_count ?? 0) - ((a as any).deal_count ?? 0))
      : sortBy === "pipeline" ? (((b as any).active_pipeline_value ?? 0) - ((a as any).active_pipeline_value ?? 0))
      : String(a.name).localeCompare(String(b.name)))
    return arr
  }, [allProjects, search, statusFilter, countryFilter, ownerFilter, typeFilter, sortBy])

  const filteredCount = projects.length
  const hasFilters = !!(search || statusFilter || countryFilter || ownerFilter || typeFilter)
  const clearAll = () => { setSearch(""); setStatusFilter(""); setCountryFilter(""); setOwnerFilter(""); setTypeFilter("") }
  const { page, setPage, pageSize, setPageSize, totalPages, paginated } = usePagination(projects, 10)

  const delMut = useMutation({
    mutationFn: (id: string) => ProjectsService.deleteProject({ id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); showSuccessToast("Project deleted.") },
    onError: (err: any) => alert(err?.body?.detail ?? "Failed to delete project."),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Hotel assets / development opportunities — {isLoading ? "loading..." : `${total} project${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <AddProject />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Search name, city, owner..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter || "__all__"} onValueChange={v => setStatusFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="All status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All status</SelectItem>
            {["Prospect","Active","On Hold","Operating","Lost","Closed"].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={countryFilter || "__all__"} onValueChange={v => setCountryFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="All countries" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All countries</SelectItem>
            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ownerFilter || "__all__"} onValueChange={v => setOwnerFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="All owners" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All owners</SelectItem>
            {owners.map(o => <SelectItem key={o} value={o!}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter || "__all__"} onValueChange={v => setTypeFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All types</SelectItem>
            {types.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort: Name</SelectItem>
            <SelectItem value="keys">Sort: Keys</SelectItem>
            <SelectItem value="deals">Sort: Deals</SelectItem>
            <SelectItem value="pipeline">Sort: Pipeline</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center">{filteredCount} of {total}</span>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="h-4 w-4 mr-1" />Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3">
          <Briefcase className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No projects yet. Create your first project.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-2 p-2">
            {paginated.map((p: ProjectPublic) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate({ to: "/projects/$projectId" as any, params: { projectId: p.id } })}
                className="w-full text-left rounded-lg border bg-card p-3 active:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {[p.city, p.country].filter(Boolean).join(", ") || "—"}
                      {p.owner_name ? ` · ${p.owner_name}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[p.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <span><span className="text-muted-foreground">Keys </span><b className="tabular-nums">{p.keys ?? "—"}</b></span>
                  <span><span className="text-muted-foreground">Deals </span><b className="tabular-nums">{p.deal_count}</b></span>
                  <span><span className="text-muted-foreground">Pipeline </span><b className="tabular-nums text-primary">{fmtM(p.active_pipeline_value)}</b></span>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["#","Project","Owner","Location","Type","Keys","Status","Deals","Pipeline",""].map(h => (
                  <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5 pr-3 pl-3 first:pl-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((p: ProjectPublic) => (
                <tr
                  key={p.id}
                  className="border-b last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => navigate({ to: "/projects/$projectId" as any, params: { projectId: p.id } })}
                >
                  <td className="py-3 pr-3 pl-3 font-mono text-xs text-muted-foreground">{projNumber(p.project_number)}</td>
                  <td className="py-3 pr-3">
                    <p className="text-sm font-semibold">{p.name}</p>
                    {p.city && <p className="text-xs text-muted-foreground">{p.city}</p>}
                  </td>
                  <td className="py-3 pr-3 text-sm">{p.owner_name ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="py-3 pr-3">
                    <p className="text-sm">{p.country}</p>
                    {p.region && <p className="text-xs text-muted-foreground">{p.region}</p>}
                  </td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground">{p.project_type ?? "—"}</td>
                  <td className="py-3 pr-3 text-sm tabular-nums">{p.keys ?? "—"}</td>
                  <td className="py-3 pr-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[p.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-sm font-semibold tabular-nums">{p.deal_count}</td>
                  <td className="py-3 pr-3 text-sm tabular-nums text-primary font-medium">{fmtM(p.active_pipeline_value)}</td>
                  <td className="py-3 pr-2" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-0.5">
                      <EditProject project={p} trigger={
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      } />
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                        title="Delete"
                        onClick={() => { if (confirm(`Delete project "${p.name}"?`)) delMut.mutate(p.id) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <PaginationControls
            page={page} totalPages={totalPages} pageSize={pageSize} total={total}
            onPageChange={setPage} onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  )
}
