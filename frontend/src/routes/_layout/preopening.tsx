import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Rocket, Plus, Trash2, Search, X, AlertCircle, Pencil } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

import {
  MilestonesService, ProjectsService,
  type MilestonePublic, type MilestoneCreate, type MilestoneUpdate,
} from "@/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { MD, useMasterData } from "@/hooks/useMasterData"
import { usePagination, PaginationControls } from "@/components/Common/Pagination"

export const Route = createFileRoute("/_layout/preopening")({
  component: PreopeningPage,
  head: () => ({ meta: [{ title: "Pre-opening Tracker — Fusion BD CORE OS" }] }),
})

const GATE_COLOR: Record<string, string> = {
  Green: "bg-green-100 text-green-700",
  Amber: "bg-amber-100 text-amber-700",
  Red:   "bg-red-100 text-red-600",
}
const GATE_DOT: Record<string, string> = {
  Green: "bg-green-500",
  Amber: "bg-amber-400",
  Red:   "bg-red-500",
}

// ── Add Milestone Dialog ──────────────────────────────────────────────────────

interface AddMilestoneProps { defaultProjectId?: string; trigger?: React.ReactNode }

export function AddMilestone({ defaultProjectId, trigger }: AddMilestoneProps = {}) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const DEPTS = useMasterData(MD.MILESTONE_DEPT)
  const GATES = useMasterData(MD.MILESTONE_GATE)
  const { register, handleSubmit, reset, setValue } = useForm<any>({
    defaultValues: { dept_s: "Ops", status_s: "Green" },
  })

  const { data: projectsData } = useQuery({
    queryKey: ["projects-picker"],
    queryFn: () => ProjectsService.listProjects({ limit: 500 }),
    enabled: open,
  })
  const projects = projectsData?.data ?? []
  const [projectId, setProjectId] = useState(defaultProjectId ?? "")
  const [projectName, setProjectName] = useState("")

  const mut = useMutation({
    mutationFn: (d: MilestoneCreate) => MilestonesService.createMilestone({ requestBody: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestones"] })
      qc.invalidateQueries({ queryKey: ["project-milestones"] })
      showSuccessToast("Milestone added.")
      reset(); setProjectId(defaultProjectId ?? ""); setProjectName(""); setOpen(false)
    },
  })

  const onSubmit = (d: any) => mut.mutate({
    name: d.name,
    project_id: projectId || undefined,
    project_name: projectName || undefined,
    department: d.dept_s,
    milestone_owner: d.milestone_owner || undefined,
    due_date: d.due_date || undefined,
    status: d.status_s,
    blocker: d.blocker || undefined,
  })

  const handleProject = (v: string) => {
    if (v === "__none__") { setProjectId(""); setProjectName(""); return }
    const p = projects.find(x => x.id === v)
    if (p) { setProjectId(p.id); setProjectName(p.name) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Milestone</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Pre-opening Milestone</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Milestone *</Label>
            <Input {...register("name", { required: true })} placeholder="e.g. PMS Implementation" />
          </div>
          <div className="space-y-1.5">
            <Label>Project (Hotel Asset)</Label>
            <Select value={projectId || "__none__"} onValueChange={handleProject}>
              <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No project —</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Pre-opening milestones belong to the hotel asset, not specific deals.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select defaultValue="Ops" onValueChange={v => setValue("dept_s", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Gate Status</Label>
              <Select defaultValue="Green" onValueChange={v => setValue("status_s", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Input {...register("milestone_owner")} placeholder="e.g. IT Manager" />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input {...register("due_date")} type="date" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Blocker / Note</Label>
            <Input {...register("blocker")} placeholder="Any blockers or notes..." />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Saving..." : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Status Toggle Button ──────────────────────────────────────────────────────

function StatusToggle({ milestone }: { milestone: MilestonePublic }) {
  const qc = useQueryClient()
  const cycle: Record<string, string> = { Green: "Amber", Amber: "Red", Red: "Green" }
  const next = cycle[milestone.status ?? "Green"] ?? "Green"

  const mut = useMutation({
    mutationFn: () => MilestonesService.updateMilestone({
      id: milestone.id,
      requestBody: { status: next as MilestoneUpdate["status"] },
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milestones"] }),
  })

  return (
    <button
      onClick={() => mut.mutate()}
      disabled={mut.isPending}
      title={`Click to change to ${next}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${GATE_COLOR[milestone.status ?? "Green"]}`}
    >
      <span className={`h-2 w-2 rounded-full ${GATE_DOT[milestone.status ?? "Green"]}`} />
      {milestone.status}
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function PreopeningPage() {
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [gateFilter, setGateFilter] = useState("")
  const DEPTS = useMasterData(MD.MILESTONE_DEPT)
  const GATES = useMasterData(MD.MILESTONE_GATE)

  const { data, isLoading } = useQuery({
    queryKey: ["milestones", { search, deptFilter, gateFilter }],
    queryFn: () => MilestonesService.listMilestones({
      search: search || undefined,
      department: (deptFilter as any) || undefined,
      status: (gateFilter as any) || undefined,
      limit: 300,
    }),
  })

  const milestones = data?.data ?? []
  const { page, setPage, pageSize, setPageSize, totalPages, paginated, total } = usePagination(milestones, 10)
  const total = data?.count ?? 0
  const redCount = milestones.filter(m => m.status === "Red").length
  const amberCount = milestones.filter(m => m.status === "Amber").length
  const greenCount = milestones.filter(m => m.status === "Green").length
  const hasFilters = search || deptFilter || gateFilter

  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const delMut = useMutation({
    mutationFn: (id: string) => MilestonesService.deleteMilestone({ id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["milestones"] }); showSuccessToast("Deleted.") },
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pre-opening Tracker</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Post-HMA execution control — Green / Amber / Red gates across departments.
          </p>
        </div>
        <AddMilestone />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-green-50 border-green-200 p-4 text-center">
          <p className="text-3xl font-bold text-green-700">{greenCount}</p>
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mt-1">On Track</p>
        </div>
        <div className="rounded-lg border bg-amber-50 border-amber-200 p-4 text-center">
          <p className="text-3xl font-bold text-amber-700">{amberCount}</p>
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mt-1">Needs Attention</p>
        </div>
        <div className="rounded-lg border bg-red-50 border-red-200 p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{redCount}</p>
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mt-1">Escalation Required</p>
        </div>
      </div>

      {/* Red alert */}
      {redCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span><span className="font-semibold">{redCount} milestone{redCount > 1 ? "s" : ""} at Red</span> — COO escalation required</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search milestone, project, blocker..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All depts" /></SelectTrigger>
          <SelectContent>{DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={gateFilter} onValueChange={setGateFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="All gates" /></SelectTrigger>
          <SelectContent>{GATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setDeptFilter(""); setGateFilter("") }}>
            <X className="h-4 w-4 mr-1" />Clear
          </Button>
        )}
      </div>

      {/* COO Opening Risk Board */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">COO Opening Risk Board</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading ? "Loading..." : `${total} milestone${total !== 1 ? "s" : ""}`} · Click status badge to cycle Green → Amber → Red
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Loading...</div>
        ) : milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Rocket className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {hasFilters ? "No milestones match your filters." : "No pre-opening milestones yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Project","Milestone","Department","Owner","Due Date","Gate","Blocker",""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5 pr-3 pl-3 first:pl-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(m => (
                  <tr key={m.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${m.status === "Red" ? "bg-red-50/30" : m.status === "Amber" ? "bg-amber-50/20" : ""}`}>
                    <td className="py-2.5 pr-3 pl-3 text-xs text-muted-foreground">{(m as any).project_name || m.deal_name || "—"}</td>
                    <td className="py-2.5 pr-3 font-medium">{m.name}</td>
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">{m.department}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{m.milestone_owner || "—"}</td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">{m.due_date || "—"}</td>
                    <td className="py-2.5 pr-3"><StatusToggle milestone={m} /></td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground max-w-[200px] truncate">{m.blocker || "—"}</td>
                    <td className="py-2.5 pr-2">
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => delMut.mutate(m.id)}
                        disabled={delMut.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {milestones.length > 0 && (
          <PaginationControls
            page={page} totalPages={totalPages} pageSize={pageSize} total={total}
            onPageChange={setPage} onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </div>
  )
}
