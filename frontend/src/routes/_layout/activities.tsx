import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { CheckSquare, Plus, Trash2, AlertCircle, Pencil } from "lucide-react"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"

import {
  TasksService, ActivitiesService, DealsService,
  type TaskPublic, type ActivityPublic,
  type TaskCreate, type TaskUpdate, type ActivityCreate,
} from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { MD, useMasterData } from "@/hooks/useMasterData"
import { usePagination, PaginationControls } from "@/components/Common/Pagination"

export const Route = createFileRoute("/_layout/activities")({
  component: ActivitiesPage,
  head: () => ({ meta: [{ title: "Activities & Tasks — Fusion BD CORE OS" }] }),
})

const STATUS_COLOR: Record<string, string> = {
  "Open": "bg-blue-100 text-blue-700", "In Progress": "bg-amber-100 text-amber-700",
  "Blocked": "bg-red-100 text-red-600", "Done": "bg-green-100 text-green-700",
}
const PRIORITY_COLOR: Record<string, string> = {
  "High": "bg-red-100 text-red-600", "Medium": "bg-amber-100 text-amber-700", "Low": "bg-gray-100 text-gray-600",
}

// ── Deal Picker Hook ──────────────────────────────────────────────────────────

function useDealPicker(enabled: boolean) {
  const { data } = useQuery({
    queryKey: ["deals-picker"],
    queryFn: () => DealsService.listDeals({ limit: 500 }),
    enabled,
  })
  return data?.data ?? []
}

// ── Add Task Dialog ───────────────────────────────────────────────────────────

function AddTask() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const deals = useDealPicker(open)
  const STATUSES = useMasterData(MD.TASK_STATUS)
  const PRIORITIES = useMasterData(MD.TASK_PRIORITY)
  const [dealId, setDealId] = useState("")
  const [dealName, setDealName] = useState("")
  const { register, handleSubmit, reset, setValue } = useForm<any>({
    defaultValues: { priority_s: "Medium", status_s: "Open" },
  })

  const mut = useMutation({
    mutationFn: (d: TaskCreate) => TasksService.createTask({ requestBody: d }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); showSuccessToast("Task added."); reset(); setDealId(""); setDealName(""); setOpen(false) },
  })

  const handleDeal = (v: string) => {
    if (v === "__none__") { setDealId(""); setDealName(""); return }
    const d = deals.find(x => x.id === v)
    if (d) { setDealId(d.id); setDealName(d.name) }
  }

  const onSubmit = (d: any) => mut.mutate({
    title: d.title, deal_id: dealId || undefined, deal_name: dealName || undefined,
    task_owner: d.task_owner || undefined, due_date: d.due_date || undefined,
    priority: d.priority_s, status: d.status_s, note: d.note || undefined,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Task</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Task *</Label>
            <Input {...register("title", { required: true })} placeholder="e.g. Follow up with Sun Group on terms" />
          </div>
          <div className="space-y-1.5">
            <Label>Related Deal</Label>
            <Select value={dealId || "__none__"} onValueChange={handleDeal}>
              <SelectTrigger><SelectValue placeholder="Select deal..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No deal —</SelectItem>
                {deals.map(d => <SelectItem key={d.id} value={d.id}>{d.name} · {d.country}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Task Owner</Label>
              <Input {...register("task_owner")} placeholder="e.g. COO, Legal" />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input {...register("due_date")} type="date" />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select defaultValue="Medium" onValueChange={v => setValue("priority_s", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue="Open" onValueChange={v => setValue("status_s", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input {...register("note")} placeholder="Additional context..." />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Saving..." : "Create Task"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Edit Task Dialog ──────────────────────────────────────────────────────────

function EditTask({ task }: { task: TaskPublic }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const deals = useDealPicker(open)
  const STATUSES = useMasterData(MD.TASK_STATUS)
  const PRIORITIES = useMasterData(MD.TASK_PRIORITY)
  const [dealId, setDealId] = useState(task.deal_id ?? "")
  const [dealName, setDealName] = useState(task.deal_name ?? "")
  const { register, handleSubmit, setValue, reset } = useForm<any>()

  useEffect(() => {
    if (open) {
      reset({ title: task.title, task_owner: task.task_owner ?? "", due_date: task.due_date ?? "", note: task.note ?? "" })
      setDealId(task.deal_id ?? ""); setDealName(task.deal_name ?? "")
    }
  }, [open, task, reset])

  const mut = useMutation({
    mutationFn: (d: TaskUpdate) => TasksService.updateTask({ id: task.id, requestBody: d }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); showSuccessToast("Task updated."); setOpen(false) },
  })

  const handleDeal = (v: string) => {
    if (v === "__none__") { setDealId(""); setDealName(""); return }
    const d = deals.find(x => x.id === v)
    if (d) { setDealId(d.id); setDealName(d.name) }
  }

  const onSubmit = (d: any) => mut.mutate({
    title: d.title, deal_id: dealId || undefined, deal_name: dealName || undefined,
    task_owner: d.task_owner || undefined, due_date: d.due_date || undefined,
    priority: d.priority_s ?? task.priority, status: d.status_s ?? task.status,
    note: d.note || undefined,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2"><Pencil className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Task *</Label>
            <Input {...register("title", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Related Deal</Label>
            <Select value={dealId || "__none__"} onValueChange={handleDeal}>
              <SelectTrigger><SelectValue placeholder="Select deal..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No deal —</SelectItem>
                {deals.map(d => <SelectItem key={d.id} value={d.id}>{d.name} · {d.country}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Task Owner</Label>
              <Input {...register("task_owner")} />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input {...register("due_date")} type="date" />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select defaultValue={task.priority ?? "Medium"} onValueChange={v => setValue("priority_s", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue={task.status ?? "Open"} onValueChange={v => setValue("status_s", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input {...register("note")} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Log Activity Dialog ───────────────────────────────────────────────────────

function LogActivity() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const deals = useDealPicker(open)
  const ACT_TYPES = useMasterData(MD.ACTIVITY_TYPE)
  const [dealId, setDealId] = useState("")
  const [dealName, setDealName] = useState("")
  const today = new Date().toISOString().split("T")[0]
  const { register, handleSubmit, reset, setValue } = useForm<any>({
    defaultValues: { type_s: "Meeting", date: today },
  })

  const mut = useMutation({
    mutationFn: (d: ActivityCreate) => ActivitiesService.createActivity({ requestBody: d }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["activities"] }); showSuccessToast("Activity logged."); reset({ type_s: "Meeting", date: today }); setDealId(""); setDealName(""); setOpen(false) },
  })

  const handleDeal = (v: string) => {
    if (v === "__none__") { setDealId(""); setDealName(""); return }
    const d = deals.find(x => x.id === v)
    if (d) { setDealId(d.id); setDealName(d.name) }
  }

  const onSubmit = (d: any) => mut.mutate({
    activity_type: d.type_s, date: d.date,
    deal_id: dealId || undefined, deal_name: dealName || undefined, note: d.note || undefined,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Log Activity</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select defaultValue="Meeting" onValueChange={v => setValue("type_s", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input {...register("date", { required: true })} type="date" />
          </div>
          <div className="space-y-1.5">
            <Label>Related Deal</Label>
            <Select value={dealId || "__none__"} onValueChange={handleDeal}>
              <SelectTrigger><SelectValue placeholder="Select deal..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No deal —</SelectItem>
                {deals.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input {...register("note")} placeholder="What happened?" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Task Row ──────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: TaskPublic }) {
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const markDone = useMutation({
    mutationFn: () => TasksService.updateTask({ id: task.id, requestBody: { status: "Done" } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); showSuccessToast("Done.") },
  })

  const del = useMutation({
    mutationFn: () => TasksService.deleteTask({ id: task.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); showSuccessToast("Deleted.") },
  })

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-2.5 pr-3 pl-2">
        <div className="flex items-start gap-2">
          {task.is_overdue && <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />}
          <div>
            <p className={`text-sm font-medium ${task.status === "Done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
            {task.deal_name && <p className="text-xs text-muted-foreground">{task.deal_name}</p>}
          </div>
        </div>
      </td>
      <td className="py-2.5 pr-3 text-sm">{task.task_owner ?? "—"}</td>
      <td className="py-2.5 pr-3">
        <span className={`text-xs font-medium ${task.is_overdue ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>{task.due_date ?? "—"}</span>
      </td>
      <td className="py-2.5 pr-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[task.priority ?? ""] ?? ""}`}>{task.priority}</span>
      </td>
      <td className="py-2.5 pr-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[task.status ?? ""] ?? ""}`}>{task.status}</span>
      </td>
      <td className="py-2.5 pr-2">
        <div className="flex gap-0.5">
          {task.status !== "Done" && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-green-600 hover:text-green-700" onClick={() => markDone.mutate()} title="Mark done">
              <CheckSquare className="h-3.5 w-3.5" />
            </Button>
          )}
          <EditTask task={task} />
          <Button variant="ghost" size="sm" className="h-7 px-2 text-red-400 hover:text-red-600" onClick={() => del.mutate()} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ── Activity Row ──────────────────────────────────────────────────────────────

function ActivityItem({ activity }: { activity: ActivityPublic }) {
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const del = useMutation({
    mutationFn: () => ActivitiesService.deleteActivity({ id: activity.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["activities"] }); showSuccessToast("Deleted.") },
  })

  return (
    <div className="relative group">
      <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold">{activity.activity_type}
            <span className="text-muted-foreground font-normal ml-2">{activity.date}</span>
          </p>
          {activity.deal_name && <p className="text-xs text-primary/70 font-medium">{activity.deal_name}</p>}
          {activity.note && <p className="text-xs text-foreground/70 mt-0.5">{activity.note}</p>}
        </div>
        <Button
          variant="ghost" size="sm"
          className="h-6 w-6 p-0 text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => del.mutate()}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function ActivitiesPage() {
  const [statusFilter, setStatusFilter] = useState("")
  const STATUSES = useMasterData(MD.TASK_STATUS)

  const { data: tasksData } = useQuery({
    queryKey: ["tasks", { status: statusFilter }],
    queryFn: () => TasksService.listTasks({ status: (statusFilter as any) || undefined, limit: 200 }),
  })
  const { data: actsData } = useQuery({
    queryKey: ["activities"],
    queryFn: () => ActivitiesService.listActivities({ limit: 50 }),
  })

  const tasks = tasksData?.data ?? []
  const { page, setPage, pageSize, setPageSize, totalPages, paginated, total } = usePagination(tasks, 10)
  const activities = actsData?.data ?? []
  const overdue = tasks.filter(t => t.is_overdue).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activities & Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            <span className="font-medium">Activity</span> = what already happened ·{" "}
            <span className="font-medium">Task</span> = what must happen next
          </p>
        </div>
        <div className="flex gap-2">
          <LogActivity />
          <AddTask />
        </div>
      </div>

      {overdue > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span><span className="font-semibold">{overdue} task{overdue > 1 ? "s" : ""} overdue</span> — action required</span>
        </div>
      )}

      <div className="grid grid-cols-[1fr_360px] gap-6">
        {/* Tasks */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Tasks <span className="text-muted-foreground font-normal text-sm">({tasks.length})</span></h2>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border bg-card overflow-x-auto">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">No tasks found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Task","Owner","Due","Priority","Status",""].map(h => (
                      <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5 pr-3 pl-2 first:pl-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{paginated.map(t => <TaskRow key={t.id} task={t} />)}</tbody>
              </table>
            )}
            {tasks.length > 0 && (
              <PaginationControls
                page={page} totalPages={totalPages} pageSize={pageSize} total={total}
                onPageChange={setPage} onPageSizeChange={setPageSize}
              />
            )}
          </div>
        </div>

        {/* Activities */}
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold">Recent Activities <span className="text-muted-foreground font-normal text-sm">({activities.length})</span></h2>
          <div className="rounded-lg border bg-card p-4 overflow-y-auto max-h-[600px]">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activities yet.</p>
            ) : (
              <div className="relative pl-4 border-l-2 border-muted flex flex-col gap-4">
                {activities.map((a: ActivityPublic) => <ActivityItem key={a.id} activity={a} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
