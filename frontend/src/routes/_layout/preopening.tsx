import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Rocket, Plus, Trash2, Search, X, AlertCircle, Pencil, Briefcase, LayoutGrid, ListFilter, Calendar } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"

import {
  MilestonesService, ProjectsService,
  type MilestonePublic, type MilestoneCreate, type MilestoneUpdate,
  type ProjectPublic,
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

// ── Constants ────────────────────────────────────────────────────────────────

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
const DEPT_COLOR: Record<string, string> = {
  Ops:         "bg-blue-100 text-blue-700",
  IT:          "bg-cyan-100 text-cyan-700",
  Finance:     "bg-emerald-100 text-emerald-700",
  Design:      "bg-violet-100 text-violet-700",
  Legal:       "bg-purple-100 text-purple-700",
  Procurement: "bg-orange-100 text-orange-700",
  HR:          "bg-rose-100 text-rose-700",
  Marketing:   "bg-pink-100 text-pink-700",
}

function daysUntil(date?: string | null): { days: number; tone: string; label: string } {
  if (!date) return { days: 0, tone: "text-muted-foreground", label: "—" }
  const due = new Date(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0)  return { days: diff, tone: "text-red-600 font-semibold",   label: `${-diff}d overdue` }
  if (diff === 0) return { days: 0,    tone: "text-red-600 font-semibold",   label: "Due today" }
  if (diff <= 7) return { days: diff, tone: "text-amber-600 font-semibold", label: `${diff}d left` }
  if (diff <= 30) return { days: diff, tone: "text-foreground",              label: `${diff}d left` }
  return { days: diff, tone: "text-muted-foreground", label: `${diff}d left` }
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
  const selectedProject = projects.find(p => p.id === projectId)

  const mut = useMutation({
    mutationFn: (d: MilestoneCreate) => MilestonesService.createMilestone({ requestBody: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestones"] })
      qc.invalidateQueries({ queryKey: ["project-milestones"] })
      showSuccessToast("Milestone added.")
      reset(); setProjectId(defaultProjectId ?? ""); setOpen(false)
    },
  })

  const onSubmit = (d: any) => mut.mutate({
    name: d.name,
    project_id: projectId || undefined,
    project_name: selectedProject?.name || undefined,
    department: d.dept_s,
    milestone_owner: d.milestone_owner || undefined,
    due_date: d.due_date || undefined,
    status: d.status_s,
    blocker: d.blocker || undefined,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Milestone</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Pre-opening Milestone</DialogTitle></DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* ── Section 1: Project Selection ── */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
              <Briefcase className="h-4 w-4" />
              Select Project (Hotel Asset)
            </h3>
            <Select value={projectId || "__none__"} onValueChange={v => setProjectId(v === "__none__" ? "" : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a project..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No project (legacy/orphan) —</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    <span className="text-muted-foreground text-xs ml-2">· {p.city ?? p.country}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedProject && (
              <div className="rounded-md bg-card border p-3 grid grid-cols-4 gap-3 text-xs">
                <Cell label="Owner"    value={selectedProject.owner_name ?? "—"} />
                <Cell label="Location" value={selectedProject.city ?? selectedProject.country ?? "—"} />
                <Cell label="Keys"     value={String(selectedProject.keys ?? "—")} />
                <Cell label="Type"     value={selectedProject.project_type ?? "—"} />
              </div>
            )}

            {!projectId && (
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                Pre-opening milestones belong to a hotel asset (Project), not specific deals.
              </div>
            )}
          </div>

          {/* ── Section 2: Milestone Details ── */}
          <div className="rounded-lg border bg-card p-4 space-y-5">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
              Milestone Details
            </h3>

            {/* Row A — Identity */}
            <div className="space-y-1.5">
              <Label>Milestone Name *</Label>
              <Input {...register("name", { required: true })} placeholder="e.g. PMS Implementation · Brand Compliance Audit · Pre-opening Marketing Launch" />
            </div>

            {/* Row B — Classification: Department · Gate · Owner */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Classification</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Department *</Label>
                  <Select defaultValue="Ops" onValueChange={v => setValue("dept_s", v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Gate Status</Label>
                  <Select defaultValue="Green" onValueChange={v => setValue("status_s", v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{GATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Milestone Owner</Label>
                  <Input {...register("milestone_owner")} placeholder="e.g. IT Manager · Pre-opening Director" />
                </div>
              </div>
            </div>

            {/* Row C — Schedule */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Schedule</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input {...register("due_date")} type="date" />
                  <p className="text-[10px] text-muted-foreground">Target completion date — typically 30/60/90 days before hotel opening.</p>
                </div>
                <div />
              </div>
            </div>

            {/* Row D — Notes */}
            <div className="space-y-1.5">
              <Label>Blocker / Note</Label>
              <Input {...register("blocker")} placeholder="Any blockers, dependencies, escalation notes..." />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Saving..." : "Create Milestone"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

// ── Edit Milestone Dialog ────────────────────────────────────────────────────

function EditMilestone({ milestone }: { milestone: MilestonePublic }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const DEPTS = useMasterData(MD.MILESTONE_DEPT)
  const GATES = useMasterData(MD.MILESTONE_GATE)
  const { register, handleSubmit, reset, setValue } = useForm<any>()

  const { data: projectsData } = useQuery({
    queryKey: ["projects-picker"],
    queryFn: () => ProjectsService.listProjects({ limit: 500 }),
    enabled: open,
  })
  const projects = projectsData?.data ?? []
  const [projectId, setProjectId] = useState(milestone.project_id ?? "")
  const selectedProject = projects.find(p => p.id === projectId)

  useEffect(() => {
    if (open) {
      reset({
        name: milestone.name,
        dept_s: milestone.department ?? "Ops",
        status_s: milestone.status ?? "Green",
        milestone_owner: milestone.milestone_owner ?? "",
        due_date: milestone.due_date ?? "",
        blocker: milestone.blocker ?? "",
      })
      setProjectId(milestone.project_id ?? "")
    }
  }, [open, milestone, reset])

  const mut = useMutation({
    mutationFn: (d: MilestoneUpdate) => MilestonesService.updateMilestone({ id: milestone.id, requestBody: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestones"] })
      qc.invalidateQueries({ queryKey: ["project-milestones"] })
      showSuccessToast("Milestone updated.")
      setOpen(false)
    },
  })

  const onSubmit = (d: any) => mut.mutate({
    name: d.name,
    project_id: projectId || undefined,
    project_name: selectedProject?.name || undefined,
    department: d.dept_s,
    milestone_owner: d.milestone_owner || undefined,
    due_date: d.due_date || undefined,
    status: d.status_s,
    blocker: d.blocker || undefined,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Milestone — {milestone.name}</DialogTitle></DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Section 1: Project */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
              <Briefcase className="h-4 w-4" />
              Linked Project (Hotel Asset)
            </h3>
            <Select value={projectId || "__none__"} onValueChange={v => setProjectId(v === "__none__" ? "" : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a project..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No project —</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}<span className="text-muted-foreground text-xs ml-2">· {p.city ?? p.country}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProject && (
              <div className="rounded-md bg-card border p-3 grid grid-cols-4 gap-3 text-xs">
                <Cell label="Owner"    value={selectedProject.owner_name ?? "—"} />
                <Cell label="Location" value={selectedProject.city ?? selectedProject.country ?? "—"} />
                <Cell label="Keys"     value={String(selectedProject.keys ?? "—")} />
                <Cell label="Type"     value={selectedProject.project_type ?? "—"} />
              </div>
            )}
          </div>

          {/* Section 2: Details */}
          <div className="rounded-lg border bg-card p-4 space-y-5">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
              Milestone Details
            </h3>

            <div className="space-y-1.5">
              <Label>Milestone Name</Label>
              <Input {...register("name", { required: true })} />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Classification</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select defaultValue={milestone.department ?? "Ops"} onValueChange={v => setValue("dept_s", v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Gate Status</Label>
                  <Select defaultValue={milestone.status ?? "Green"} onValueChange={v => setValue("status_s", v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{GATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Milestone Owner</Label>
                  <Input {...register("milestone_owner")} />
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Schedule</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input {...register("due_date")} type="date" />
                </div>
                <div />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Blocker / Note</Label>
              <Input {...register("blocker")} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Saving..." : "Save Changes"}</Button>
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
      id: milestone.id, requestBody: { status: next as MilestoneUpdate["status"] },
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milestones"] }),
  })
  return (
    <button onClick={() => mut.mutate()} disabled={mut.isPending}
      title={`Click to change to ${next}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${GATE_COLOR[milestone.status ?? "Green"]}`}>
      <span className={`h-2 w-2 rounded-full ${GATE_DOT[milestone.status ?? "Green"]}`} />
      {milestone.status}
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function PreopeningPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [gateFilter, setGateFilter] = useState("")
  const [projectFilter, setProjectFilter] = useState("")
  const [view, setView] = useState<"flat" | "grouped">("flat")
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

  const { data: projectsData } = useQuery({
    queryKey: ["projects-picker"],
    queryFn: () => ProjectsService.listProjects({ limit: 500 }),
  })
  const allProjects = projectsData?.data ?? []

  const allMilestones = data?.data ?? []
  const milestones = projectFilter
    ? allMilestones.filter(m => (m as any).project_id === projectFilter)
    : allMilestones

  const { page, setPage, pageSize, setPageSize, totalPages, paginated } = usePagination(milestones, 15)

  const redCount = milestones.filter(m => m.status === "Red").length
  const amberCount = milestones.filter(m => m.status === "Amber").length
  const greenCount = milestones.filter(m => m.status === "Green").length
  const overdueCount = milestones.filter(m => {
    const d = daysUntil(m.due_date).days
    return d < 0 && m.status !== "Green"
  }).length

  const hasFilters = !!(search || deptFilter || gateFilter || projectFilter)
  const total = milestones.length

  // Department breakdown
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const m of milestones) counts[m.department ?? "—"] = (counts[m.department ?? "—"] ?? 0) + 1
    return counts
  }, [milestones])

  // Group by project
  const groupedByProject = useMemo(() => {
    const groups: Record<string, { project?: ProjectPublic; items: MilestonePublic[] }> = {}
    for (const m of milestones) {
      const pid = (m as any).project_id ?? "__no_project__"
      if (!groups[pid]) {
        const proj = allProjects.find(p => p.id === pid)
        groups[pid] = { project: proj, items: [] }
      }
      groups[pid].items.push(m)
    }
    return groups
  }, [milestones, allProjects])

  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const delMut = useMutation({
    mutationFn: (id: string) => MilestonesService.deleteMilestone({ id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["milestones"] }); showSuccessToast("Deleted.") },
  })

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pre-opening Tracker</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Post-HMA execution control — Green / Amber / Red gates across departments. Click any status badge to cycle.
          </p>
        </div>
        <AddMilestone />
      </div>

      {/* KPI cards — 4 metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard tone="emerald" count={greenCount} label="On Track" />
        <KpiCard tone="amber"   count={amberCount} label="Needs Attention" />
        <KpiCard tone="red"     count={redCount}   label="Escalation Required" />
        <KpiCard tone="slate"   count={overdueCount} label="Overdue (active)" sub={overdueCount > 0 ? "due-date passed" : "all on schedule"} />
      </div>

      {/* Red alert */}
      {redCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span><span className="font-semibold">{redCount} milestone{redCount > 1 ? "s" : ""} at Red</span> — COO escalation required</span>
        </div>
      )}

      {/* Department breakdown chips */}
      {Object.keys(deptCounts).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">By department:</span>
          {Object.entries(deptCounts).sort((a,b) => b[1] - a[1]).map(([dept, count]) => (
            <button key={dept}
              onClick={() => setDeptFilter(deptFilter === dept ? "" : dept)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold transition-all ${
                DEPT_COLOR[dept] ?? "bg-gray-100 text-gray-700"
              } ${deptFilter === dept ? "ring-2 ring-offset-1 ring-current" : "hover:ring-1 hover:ring-current"}`}>
              {dept} <span className="opacity-70">· {count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search milestone, owner, blocker..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={projectFilter || "__all__"} onValueChange={v => setProjectFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All projects</SelectItem>
            {allProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={deptFilter || "__all__"} onValueChange={v => setDeptFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All depts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All depts</SelectItem>
            {DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={gateFilter || "__all__"} onValueChange={v => setGateFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="All gates" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All gates</SelectItem>
            {GATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setDeptFilter(""); setGateFilter(""); setProjectFilter("") }}>
            <X className="h-4 w-4 mr-1" />Clear
          </Button>
        )}

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-1 rounded-md border bg-card p-0.5">
          <Button size="sm" variant={view === "flat" ? "default" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setView("flat")}>
            <ListFilter className="h-3.5 w-3.5 mr-1" />Flat
          </Button>
          <Button size="sm" variant={view === "grouped" ? "default" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setView("grouped")}>
            <LayoutGrid className="h-3.5 w-3.5 mr-1" />By Project
          </Button>
        </div>
      </div>

      {/* Empty / loading */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Loading...</div>
      ) : milestones.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed bg-card flex flex-col items-center justify-center h-48 gap-3">
          <Rocket className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasFilters ? "No milestones match your filters." : "No pre-opening milestones yet."}
          </p>
          {!hasFilters && <AddMilestone trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add first milestone</Button>} />}
        </div>
      ) : view === "flat" ? (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="p-3 border-b">
            <h2 className="font-semibold text-sm">COO Opening Risk Board</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} milestone{total !== 1 ? "s" : ""} · Click status badge to cycle Green → Amber → Red
            </p>
          </div>
          <MilestoneTable rows={paginated} onDelete={(id) => delMut.mutate(id)} onOpenProject={(pid) => navigate({ to: "/projects/$projectId" as any, params: { projectId: pid } })} showProject />
          {milestones.length > 0 && (
            <PaginationControls page={page} totalPages={totalPages} pageSize={pageSize} total={total}
              onPageChange={setPage} onPageSizeChange={setPageSize} />
          )}
        </div>
      ) : (
        /* Grouped by project */
        <div className="space-y-4">
          {Object.entries(groupedByProject).map(([pid, group]) => (
            <div key={pid} className="rounded-lg border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">
                    {group.project?.name ?? "— Unlinked milestones —"}
                  </h3>
                  {group.project && (
                    <p className="text-[11px] text-muted-foreground">
                      {group.project.city ?? group.project.country} · {group.project.keys ?? "?"} keys · {group.items.length} milestone{group.items.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {group.project && (
                    <Button size="sm" variant="outline" onClick={() => navigate({ to: "/projects/$projectId" as any, params: { projectId: pid } })}>
                      Open Project
                    </Button>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">{group.items.filter(m => m.status === "Red").length}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">{group.items.filter(m => m.status === "Amber").length}</span>
                    <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold">{group.items.filter(m => m.status === "Green").length}</span>
                  </span>
                </div>
              </div>
              <MilestoneTable rows={group.items} onDelete={(id) => delMut.mutate(id)} onOpenProject={() => {}} showProject={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Reusable table ───────────────────────────────────────────────────────────

function MilestoneTable({
  rows, onDelete, onOpenProject, showProject,
}: {
  rows: MilestonePublic[]
  onDelete: (id: string) => void
  onOpenProject: (projectId: string) => void
  showProject: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b bg-muted/20 text-xs uppercase tracking-wider text-muted-foreground">
            {showProject && <th className="text-left py-2.5 px-3 font-semibold">Project</th>}
            <th className="text-left py-2.5 px-3 font-semibold">Milestone</th>
            <th className="text-left py-2.5 px-3 font-semibold">Department</th>
            <th className="text-left py-2.5 px-3 font-semibold">Owner</th>
            <th className="text-left py-2.5 px-3 font-semibold whitespace-nowrap">Due Date</th>
            <th className="text-left py-2.5 px-3 font-semibold">Gate</th>
            <th className="text-left py-2.5 px-3 font-semibold">Blocker</th>
            <th className="text-right py-2.5 px-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(m => {
            const due = daysUntil(m.due_date)
            const projectId = (m as any).project_id as string | undefined
            return (
              <tr key={m.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${
                m.status === "Red" ? "bg-red-50/30" : m.status === "Amber" ? "bg-amber-50/20" : ""
              }`}>
                {showProject && (
                  <td className="py-2.5 px-3 text-xs">
                    {projectId ? (
                      <button onClick={() => onOpenProject(projectId)}
                        className="text-primary hover:underline font-medium text-left">
                        {m.project_name ?? "—"}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">{m.project_name ?? m.deal_name ?? "—"}</span>
                    )}
                  </td>
                )}
                <td className="py-2.5 px-3 font-medium">{m.name}</td>
                <td className="py-2.5 px-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${DEPT_COLOR[m.department ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                    {m.department}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-muted-foreground">{m.milestone_owner || "—"}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <div className="leading-tight">
                    <div className="text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {m.due_date || "—"}
                    </div>
                    {m.due_date && <div className={`text-[10px] ${due.tone}`}>{due.label}</div>}
                  </div>
                </td>
                <td className="py-2.5 px-3"><StatusToggle milestone={m} /></td>
                <td className="py-2.5 px-3 text-xs text-muted-foreground max-w-[200px] truncate" title={m.blocker || ""}>{m.blocker || "—"}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center justify-end gap-0.5">
                    <EditMilestone milestone={m} />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => { if (confirm(`Delete "${m.name}"?`)) onDelete(m.id) }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function KpiCard({ tone, count, label, sub }: { tone: "emerald" | "amber" | "red" | "slate"; count: number; label: string; sub?: string }) {
  const styles = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber:   "bg-amber-50   border-amber-200   text-amber-700",
    red:     "bg-red-50     border-red-200     text-red-600",
    slate:   "bg-slate-50   border-slate-200   text-slate-700",
  }[tone]
  return (
    <div className={`rounded-lg border ${styles} p-4`}>
      <p className="text-3xl font-bold tabular-nums">{count}</p>
      <p className="text-[10.5px] font-semibold uppercase tracking-wider mt-1">{label}</p>
      {sub && <p className="text-[10px] mt-0.5 opacity-80">{sub}</p>}
    </div>
  )
}
