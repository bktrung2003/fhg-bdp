import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Briefcase, Search, X, Trash2 } from "lucide-react"
import { useState } from "react"

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
const projNumber = (n?: number | null) => n != null ? `FUS-P-${String(n).padStart(5, "0")}` : "—"

function ProjectsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["projects", { search, statusFilter }],
    queryFn: () => ProjectsService.listProjects({
      search: search || undefined,
      status: (statusFilter as any) || undefined,
      limit: 300,
    }),
  })

  const projects = data?.data ?? []
  const { page, setPage, pageSize, setPageSize, totalPages, paginated, total } = usePagination(projects, 10)
  const total = data?.count ?? 0

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
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search project, city..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            {["Prospect","Active","On Hold","Operating","Lost","Closed"].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || statusFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("") }}>
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
        <div className="rounded-lg border bg-card overflow-x-auto">
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
          <PaginationControls
            page={page} totalPages={totalPages} pageSize={pageSize} total={total}
            onPageChange={setPage} onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  )
}
