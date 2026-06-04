import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  CheckSquare, Plus, Trash2, AlertCircle, Pencil,
  Calendar, Clock, ListTodo, CheckCircle2, Search, X,
  User as UserIcon, Users as UsersGroup, Archive,
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import useAuth from "@/hooks/useAuth"

import {
  TasksService, ActivitiesService, DealsService, UsersService,
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

// ── Users Picker Hook ─────────────────────────────────────────────────────────

function useUsersPicker(enabled: boolean) {
  const { data } = useQuery({
    queryKey: ["users-team"],
    queryFn: () => UsersService.listTeam(),
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
  const users = useUsersPicker(open)
  const STATUSES = useMasterData(MD.TASK_STATUS)
  const PRIORITIES = useMasterData(MD.TASK_PRIORITY)
  const [dealId, setDealId] = useState("")
  const [dealName, setDealName] = useState("")
  const [ownerId, setOwnerId] = useState("")
  const { register, handleSubmit, reset, setValue } = useForm<any>({
    defaultValues: { priority_s: "Medium", status_s: "Open" },
  })

  const mut = useMutation({
    mutationFn: (d: TaskCreate) => TasksService.createTask({ requestBody: d }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); showSuccessToast("Task added."); reset(); setDealId(""); setDealName(""); setOwnerId(""); setOpen(false) },
  })

  const handleDeal = (v: string) => {
    if (v === "__none__") { setDealId(""); setDealName(""); return }
    const d = deals.find(x => x.id === v)
    if (d) { setDealId(d.id); setDealName(d.name) }
  }

  const onSubmit = (d: any) => mut.mutate({
    title: d.title, deal_id: dealId || undefined, deal_name: dealName || undefined,
    task_owner_id: ownerId || undefined,
    task_owner: d.task_owner || undefined, due_date: d.due_date || undefined,
    priority: d.priority_s, status: d.status_s, note: d.note || undefined,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Task</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Step 1 — Context */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
              <Label className="text-xs uppercase tracking-wider">Related Deal (optional)</Label>
            </div>
            <Select value={dealId || "__none__"} onValueChange={handleDeal}>
              <SelectTrigger><SelectValue placeholder="Select deal..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Standalone task —</SelectItem>
                {deals.map(d => <SelectItem key={d.id} value={d.id}>{d.name} · {d.country}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Link this task to a Deal to keep follow-ups tied to commercial opportunities. Project / Owner context comes through the deal chain.
            </p>
          </div>

          {/* Step 2 — Details */}
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
              <Label className="text-xs uppercase tracking-wider">Task Details</Label>
            </div>
            <div className="space-y-1.5">
              <Label>Task *</Label>
              <Input {...register("title", { required: true })} placeholder="e.g. Follow up with Sun Group on revised terms" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Assigned To *</Label>
                <Select value={ownerId || "__none__"} onValueChange={v => setOwnerId(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Pick user..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                        <span className="text-muted-foreground text-xs ml-1">· {u.role}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
  const users = useUsersPicker(open)
  const STATUSES = useMasterData(MD.TASK_STATUS)
  const PRIORITIES = useMasterData(MD.TASK_PRIORITY)
  const [dealId, setDealId] = useState(task.deal_id ?? "")
  const [dealName, setDealName] = useState(task.deal_name ?? "")
  const [ownerId, setOwnerId] = useState((task as any).task_owner_id ?? "")
  const { register, handleSubmit, setValue, reset } = useForm<any>()

  useEffect(() => {
    if (open) {
      reset({ title: task.title, due_date: task.due_date ?? "", note: task.note ?? "" })
      setDealId(task.deal_id ?? ""); setDealName(task.deal_name ?? "")
      setOwnerId((task as any).task_owner_id ?? "")
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
    task_owner_id: ownerId || undefined,
    due_date: d.due_date || undefined,
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
              <Label>Assigned To</Label>
              <Select value={ownerId || "__none__"} onValueChange={v => setOwnerId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Pick user..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Unassigned —</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                      <span className="text-muted-foreground text-xs ml-1">· {u.role}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Step 1 — Related Deal */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
              <Label className="text-xs uppercase tracking-wider">Related Deal (optional)</Label>
            </div>
            <Select value={dealId || "__none__"} onValueChange={handleDeal}>
              <SelectTrigger><SelectValue placeholder="Select deal..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Standalone activity —</SelectItem>
                {deals.map(d => <SelectItem key={d.id} value={d.id}>{d.name} · {d.country}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Linking to a Deal builds relationship history. Standalone activities = internal ops only.
            </p>
          </div>

          {/* Step 2 — Details */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
              <Label className="text-xs uppercase tracking-wider">Activity Details</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select defaultValue="Meeting" onValueChange={v => setValue("type_s", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input {...register("date", { required: true })} type="date" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input {...register("note")} placeholder="What happened? Context, outcome, next signals..." autoFocus />
              <p className="text-[10px] text-muted-foreground">
                Tip: capture context (who/what/why) — this becomes relationship memory for the team.
              </p>
            </div>
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

function TaskRow({ task, selected, onToggleSelect }: { task: TaskPublic; selected?: boolean; onToggleSelect?: () => void }) {
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
    <tr className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${selected ? "bg-primary/5" : ""}`}>
      {onToggleSelect !== undefined && (
        <td className="py-2.5 pl-3 w-8">
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label={`Select task: ${task.title}`} />
        </td>
      )}
      <td className="py-2.5 pr-3 pl-2">
        <div className="flex items-start gap-2">
          {task.is_overdue && <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />}
          <div>
            <p className={`text-sm font-medium ${task.status === "Done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
            {task.deal_name && <p className="text-xs text-muted-foreground">{task.deal_name}</p>}
          </div>
        </div>
      </td>
      <td className="py-2.5 pr-3 text-sm">
        {(task as any).task_owner_name ? (
          <div>
            <p className="text-sm">{(task as any).task_owner_name}</p>
            {(task as any).task_owner_role && (
              <p className="text-[10px] text-muted-foreground">{(task as any).task_owner_role}</p>
            )}
          </div>
        ) : task.task_owner ? (
          <span className="text-sm text-muted-foreground italic">{task.task_owner}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
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

// ── Date helpers ──────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split("T")[0]
const tomorrow = () => {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().split("T")[0]
}
const endOfWeek = () => {
  const d = new Date()
  const day = d.getDay() // 0=Sun
  const diff = 7 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split("T")[0]
}

type DateGroup = "Overdue" | "Today" | "Tomorrow" | "This Week" | "Later" | "No Date" | "Done"

function groupTaskByDate(t: TaskPublic): DateGroup {
  if (t.status === "Done") return "Done"
  if (!t.due_date) return "No Date"
  const tod = today()
  const tom = tomorrow()
  const eow = endOfWeek()
  if (t.due_date < tod) return "Overdue"
  if (t.due_date === tod) return "Today"
  if (t.due_date === tom) return "Tomorrow"
  if (t.due_date <= eow) return "This Week"
  return "Later"
}

const GROUP_ORDER: DateGroup[] = ["Overdue", "Today", "Tomorrow", "This Week", "Later", "No Date", "Done"]

const GROUP_STYLE: Record<DateGroup, { bg: string; text: string; icon: React.ElementType }> = {
  "Overdue":   { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: AlertCircle },
  "Today":     { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: Calendar },
  "Tomorrow":  { bg: "bg-orange-50 border-orange-200", text: "text-orange-700", icon: Calendar },
  "This Week": { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", icon: Calendar },
  "Later":     { bg: "bg-card border-muted", text: "text-muted-foreground", icon: Clock },
  "No Date":   { bg: "bg-card border-muted", text: "text-muted-foreground", icon: ListTodo },
  "Done":      { bg: "bg-green-50/50 border-green-200", text: "text-green-700", icon: CheckCircle2 },
}

// ── Activity date grouping ────────────────────────────────────────────────────

function fmtDateLabel(dateStr: string): string {
  const tod = today()
  const tom = tomorrow()
  if (dateStr === tod) return "Today"
  if (dateStr === tom) return "Tomorrow"
  const yest = new Date(); yest.setDate(yest.getDate() - 1)
  if (dateStr === yest.toISOString().split("T")[0]) return "Yesterday"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined })
}

function groupActivitiesByDate(activities: ActivityPublic[]) {
  const groups: Record<string, ActivityPublic[]> = {}
  activities.forEach(a => {
    if (!groups[a.date]) groups[a.date] = []
    groups[a.date].push(a)
  })
  // Return sorted entries desc
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
}

// ── Stats Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color = "text-foreground", onClick }: {
  icon: React.ElementType; label: string; value: number | string
  color?: string; onClick?: () => void
}) {
  return (
    <div
      className={`rounded-lg border bg-card p-4 ${onClick ? "cursor-pointer hover:bg-muted/40 transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

// ── Group Header ──────────────────────────────────────────────────────────────

function TaskGroupHeader({ group, count, defaultOpen, onToggle }: {
  group: DateGroup; count: number; defaultOpen: boolean; onToggle: () => void
}) {
  const style = GROUP_STYLE[group]
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-3 py-2 border ${style.bg} rounded-t-lg`}
    >
      <div className="flex items-center gap-2">
        <style.icon className={`h-4 w-4 ${style.text}`} />
        <span className={`font-semibold text-sm ${style.text}`}>{group}</span>
        <span className={`text-xs rounded-full px-2 py-0.5 bg-white border ${style.text}`}>{count}</span>
      </div>
      <span className={`text-xs ${style.text}`}>{defaultOpen ? "▼" : "▶"}</span>
    </button>
  )
}

// ── Date range helpers ───────────────────────────────────────────────────────

const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().split("T")[0]
}

type DateRangePreset = "all" | "7" | "30" | "90"

function ActivitiesPage() {
  const STATUSES = useMasterData(MD.TASK_STATUS)
  const PRIORITIES = useMasterData(MD.TASK_PRIORITY)
  const ACT_TYPES_MD = useMasterData(MD.ACTIVITY_TYPE)
  const { user: currentUser } = useAuth()
  const qc = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  // Task filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [dueRange, setDueRange] = useState<"all" | "overdue" | "today" | "this_week" | "this_month">("all")
  const [myTasksOnly, setMyTasksOnly] = useState(false)
  const [assigneeFilter, setAssigneeFilter] = useState<string>("")  // task_owner_id
  const [showArchived, setShowArchived] = useState(false)  // include Done > 30 days

  // Mutually exclusive: My Tasks vs Assigned To
  const effectiveOwnerId = myTasksOnly
    ? currentUser?.id ?? undefined
    : (assigneeFilter || undefined)

  // Activity filters
  const [actTypeFilter, setActTypeFilter] = useState("")
  const [actDateRange, setActDateRange] = useState<DateRangePreset>("30")
  const [actSearch, setActSearch] = useState("")

  // Bulk selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [bulkOwnerId, setBulkOwnerId] = useState("")
  const users = useUsersPicker(true)

  // Collapsible groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<DateGroup>>(new Set(["Done"]))
  const [showDone, setShowDone] = useState(false)
  const toggleGroup = (g: DateGroup) => {
    const next = new Set(collapsedGroups)
    if (next.has(g)) next.delete(g); else next.add(g)
    setCollapsedGroups(next)
  }

  // Fetch tasks with server-side filters
  const { data: tasksData } = useQuery({
    queryKey: ["tasks", { statusFilter, effectiveOwnerId, showArchived }],
    queryFn: () => TasksService.listTasks({
      status: (statusFilter as any) || undefined,
      taskOwnerId: effectiveOwnerId,
      hideArchived: !showArchived,
      limit: 500,
    }),
  })

  // Compute activity date_from based on preset
  const actDateFrom = useMemo(() => {
    if (actDateRange === "all") return undefined
    return daysAgo(parseInt(actDateRange))
  }, [actDateRange])

  const { data: actsData } = useQuery({
    queryKey: ["activities", { actDateFrom, actSearch }],
    queryFn: () => ActivitiesService.listActivities({
      dateFrom: actDateFrom,
      search: actSearch || undefined,
      limit: 500,
    }),
  })

  const allTasks = tasksData?.data ?? []
  const allActivities = actsData?.data ?? []

  // Apply client-side filters to tasks
  const tasks = useMemo(() => {
    let result = allTasks
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.deal_name ?? "").toLowerCase().includes(q) ||
        ((t as any).task_owner_name ?? "").toLowerCase().includes(q) ||
        (t.task_owner ?? "").toLowerCase().includes(q)
      )
    }
    if (priorityFilter) result = result.filter(t => t.priority === priorityFilter)
    // Due date range
    if (dueRange !== "all") {
      const tod = today()
      const tom = tomorrow()
      const eow = endOfWeek()
      const eom = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0); return d.toISOString().split("T")[0] })()
      result = result.filter(t => {
        if (dueRange === "overdue") return t.status !== "Done" && t.due_date && t.due_date < tod
        if (dueRange === "today") return t.due_date === tod
        if (dueRange === "this_week") return t.due_date && t.due_date >= tod && t.due_date <= eow
        if (dueRange === "this_month") return t.due_date && t.due_date >= tod && t.due_date <= eom
        return true
      })
    }
    return result
  }, [allTasks, search, priorityFilter, dueRange])

  // Group tasks by date
  const groupedTasks = useMemo(() => {
    const result: Record<DateGroup, TaskPublic[]> = {
      "Overdue": [], "Today": [], "Tomorrow": [], "This Week": [],
      "Later": [], "No Date": [], "Done": [],
    }
    tasks.forEach(t => {
      const g = groupTaskByDate(t)
      result[g].push(t)
    })
    return result
  }, [tasks])

  // Filter activities (client-side type filter; date_range + search applied server-side)
  const activities = useMemo(() => {
    let result = allActivities
    if (actTypeFilter) result = result.filter(a => a.activity_type === actTypeFilter)
    return result
  }, [allActivities, actTypeFilter])

  // Bulk action mutations
  const bulkUpdateMut = useMutation({
    mutationFn: async ({ ids, status, ownerId }: { ids: string[]; status?: string; ownerId?: string }) => {
      // Use fetch directly since bulk endpoint may not be in generated client yet
      const { OpenAPI } = await import("@/client")
      const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN() : OpenAPI.TOKEN
      const res = await fetch(`${OpenAPI.BASE}/api/v1/tasks/bulk-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          task_ids: ids,
          status: status,
          task_owner_id: ownerId,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
      showSuccessToast(data?.message ?? "Updated.")
      setSelectedTaskIds(new Set())
      setBulkOwnerId("")
    },
    onError: () => showErrorToast("Bulk update failed."),
  })

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const { OpenAPI } = await import("@/client")
      const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN() : OpenAPI.TOKEN
      const res = await fetch(`${OpenAPI.BASE}/api/v1/tasks/bulk-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ task_ids: ids }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
      showSuccessToast(data?.message ?? "Deleted.")
      setSelectedTaskIds(new Set())
    },
    onError: () => showErrorToast("Bulk delete failed."),
  })

  // Toggle individual / all in group
  const toggleSelect = (taskId: string) => {
    const next = new Set(selectedTaskIds)
    if (next.has(taskId)) next.delete(taskId); else next.add(taskId)
    setSelectedTaskIds(next)
  }
  const toggleSelectGroup = (groupTasks: TaskPublic[]) => {
    const next = new Set(selectedTaskIds)
    const allSelected = groupTasks.every(t => next.has(t.id))
    if (allSelected) {
      groupTasks.forEach(t => next.delete(t.id))
    } else {
      groupTasks.forEach(t => next.add(t.id))
    }
    setSelectedTaskIds(next)
  }

  // Stats
  const totalOpen = allTasks.filter(t => t.status !== "Done").length
  const overdueCount = allTasks.filter(t => t.is_overdue).length
  const inProgressCount = allTasks.filter(t => t.status === "In Progress").length
  const blockedCount = allTasks.filter(t => t.status === "Blocked").length
  const doneToday = allTasks.filter(t => t.status === "Done" && t.due_date === today()).length

  const hasFilters = !!(search || statusFilter || priorityFilter || myTasksOnly || assigneeFilter || dueRange !== "all")
  const selectedCount = selectedTaskIds.size

  return (
    <div className="flex flex-col gap-5 min-w-0 max-w-full">
      {/* Header */}
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={ListTodo} label="Open Tasks" value={totalOpen} color="text-blue-600" />
        <StatCard icon={AlertCircle} label="Overdue" value={overdueCount} color="text-red-600" />
        <StatCard icon={Clock} label="In Progress" value={inProgressCount} color="text-amber-600" />
        <StatCard icon={X} label="Blocked" value={blockedCount} color="text-red-500" />
        <StatCard icon={CheckCircle2} label="Done Today" value={doneToday} color="text-green-600" />
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks ({totalOpen})</TabsTrigger>
          <TabsTrigger value="activity">Activity Log ({allActivities.length})</TabsTrigger>
        </TabsList>

        {/* ── Tasks Tab ── */}
        <TabsContent value="tasks" className="mt-4 flex flex-col gap-4">
          {/* Quick filters row 1 — main */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-9" placeholder="Search task, deal, owner..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* My Tasks toggle */}
            <Button
              variant={myTasksOnly ? "default" : "outline"}
              size="sm"
              className="h-9"
              onClick={() => {
                setMyTasksOnly(v => !v)
                if (!myTasksOnly) setAssigneeFilter("")  // clear assignee filter when turning on
              }}
            >
              <UserIcon className="h-3.5 w-3.5 mr-1.5" />
              My Tasks
            </Button>

            {/* Assigned To dropdown — mutually exclusive with My Tasks */}
            <Select
              value={assigneeFilter || "__none__"}
              onValueChange={v => {
                const next = v === "__none__" ? "" : v
                setAssigneeFilter(next)
                if (next) setMyTasksOnly(false)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Assigned to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Anyone —</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email}
                    <span className="text-muted-foreground text-xs ml-1">· {u.role}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="All priority" /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter(""); setPriorityFilter(""); setMyTasksOnly(false); setAssigneeFilter(""); setDueRange("all") }}>
                <X className="h-4 w-4 mr-1" />Clear
              </Button>
            )}
          </div>

          {/* Quick filters row 2 — due range chips */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Due:</span>
            {([
              { v: "all", label: "All" },
              { v: "overdue", label: "Overdue" },
              { v: "today", label: "Today" },
              { v: "this_week", label: "This Week" },
              { v: "this_month", label: "This Month" },
            ] as const).map(({ v, label }) => (
              <Button
                key={v}
                size="sm"
                variant={dueRange === v ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setDueRange(v)}
              >
                {label}
              </Button>
            ))}

            <div className="ml-auto flex items-center gap-3">
              <label className="text-xs text-muted-foreground inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} />
                Show Done
              </label>
              <label className="text-xs text-muted-foreground inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
                <Archive className="h-3 w-3" />
                Include archived (Done &gt;30d)
              </label>
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedCount > 0 && (
            <div className="flex items-center gap-3 rounded-lg border-2 border-primary bg-primary/5 px-4 py-2 sticky top-12 z-10">
              <span className="text-sm font-semibold">{selectedCount} selected</span>
              <Button size="sm" variant="outline" onClick={() => bulkUpdateMut.mutate({ ids: Array.from(selectedTaskIds), status: "Done" })}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Mark Done
              </Button>
              <div className="flex items-center gap-1.5">
                <Select value={bulkOwnerId || "__none__"} onValueChange={v => setBulkOwnerId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Reassign to..." /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.email} · {u.role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" disabled={!bulkOwnerId}
                  onClick={() => bulkUpdateMut.mutate({ ids: Array.from(selectedTaskIds), ownerId: bulkOwnerId })}>
                  <UsersGroup className="h-3.5 w-3.5 mr-1" />Reassign
                </Button>
              </div>
              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50"
                onClick={() => {
                  if (confirm(`Delete ${selectedCount} task(s)?`)) bulkDeleteMut.mutate(Array.from(selectedTaskIds))
                }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
              </Button>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelectedTaskIds(new Set())}>
                <X className="h-3.5 w-3.5 mr-1" />Cancel
              </Button>
            </div>
          )}

          {/* Grouped tasks */}
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 rounded-lg border bg-card">
              <ListTodo className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {hasFilters ? "No tasks match your filters." : "No tasks yet. Click + New Task to get started."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {GROUP_ORDER.map(group => {
                const groupTasks = groupedTasks[group]
                if (groupTasks.length === 0) return null
                if (group === "Done" && !showDone) return null
                const isCollapsed = collapsedGroups.has(group)
                const allInGroupSelected = groupTasks.every(t => selectedTaskIds.has(t.id))
                return (
                  <div key={group}>
                    <TaskGroupHeader group={group} count={groupTasks.length}
                      defaultOpen={!isCollapsed} onToggle={() => toggleGroup(group)} />
                    {!isCollapsed && (
                      <div className="rounded-b-lg border border-t-0 bg-card overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/20">
                              <th className="w-8 py-2 pl-3">
                                <Checkbox
                                  checked={allInGroupSelected}
                                  onCheckedChange={() => toggleSelectGroup(groupTasks)}
                                  aria-label="Select all in group"
                                />
                              </th>
                              {["Task","Owner","Due","Priority","Status",""].map(h => (
                                <th key={h} className="text-left text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground py-2 pr-3 pl-2 first:pl-2">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {groupTasks.map(t => (
                              <TaskRow
                                key={t.id} task={t}
                                selected={selectedTaskIds.has(t.id)}
                                onToggleSelect={() => toggleSelect(t.id)}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Activity Log Tab ── */}
        <TabsContent value="activity" className="mt-4 flex flex-col gap-4">
          {/* Activity filters row 1 */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-9" placeholder="Search activity notes, deals..." value={actSearch} onChange={e => setActSearch(e.target.value)} />
            </div>
            <Select value={actTypeFilter} onValueChange={setActTypeFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All activity types" /></SelectTrigger>
              <SelectContent>{ACT_TYPES_MD.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            {(actTypeFilter || actSearch) && (
              <Button variant="ghost" size="sm" onClick={() => { setActTypeFilter(""); setActSearch("") }}>
                <X className="h-4 w-4 mr-1" />Clear
              </Button>
            )}
          </div>

          {/* Activity filters row 2 — date range */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Range:</span>
            {([
              { v: "7", label: "Last 7 days" },
              { v: "30", label: "Last 30 days" },
              { v: "90", label: "Last 90 days" },
              { v: "all", label: "All time" },
            ] as const).map(({ v, label }) => (
              <Button
                key={v}
                size="sm"
                variant={actDateRange === v ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setActDateRange(v)}
              >
                {label}
              </Button>
            ))}
            <span className="text-xs text-muted-foreground ml-auto">{activities.length} activit{activities.length === 1 ? "y" : "ies"}</span>
          </div>

          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 rounded-lg border bg-card">
              <Clock className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {actTypeFilter ? "No activities of this type." : "No activities yet. Click Log Activity to record interactions."}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-5">
              {/* Group by day */}
              <div className="flex flex-col gap-5">
                {groupActivitiesByDate(activities).map(([date, items]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{fmtDateLabel(date)}</p>
                      <span className="text-[10px] text-muted-foreground">({items.length})</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="relative pl-5 border-l-2 border-muted flex flex-col gap-2">
                      {items.map((a: ActivityPublic) => <ActivityItem key={a.id} activity={a} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
