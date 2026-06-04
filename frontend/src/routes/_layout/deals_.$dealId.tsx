import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowLeft, FileText, CheckSquare, BarChart3, Rocket, Clock, Shield,
} from "lucide-react"

import {
  DealsService, TasksService, DocumentsService, MilestonesService,
  ActivitiesService,
  type DealPublic, type TaskPublic, type DocumentPublic,
  type MilestonePublic, type ActivityPublic, type DealAuditLogPublic,
} from "@/client"
import { Button } from "@/components/ui/button"
import { EditDeal } from "@/components/Deals/EditDeal"
import { StageChange } from "@/components/Deals/StageChange"

export const Route = createFileRoute("/_layout/deals_/$dealId")({
  component: DealWorkspace,
  head: () => ({ meta: [{ title: "Deal Workspace — Fusion BD CORE OS" }] }),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMoney = (v?: number | null) => v != null ? `$${Math.round(v).toLocaleString(`en-US`)}` : `—`
const fmtM = (v?: number | null) => v != null ? `$${(v / 1_000_000).toFixed(1)}M` : `—`

const STAGE_COLOR: Record<string, string> = {
  "Lead":"bg-gray-100 text-gray-700","NDA / Qualified":"bg-blue-100 text-blue-700",
  "Feasibility":"bg-sky-100 text-sky-700","Proposal":"bg-violet-100 text-violet-700",
  "Negotiation":"bg-orange-100 text-orange-700","LOI Signed":"bg-yellow-100 text-yellow-800",
  "HMA Signed":"bg-emerald-100 text-emerald-700","Pre-opening":"bg-teal-100 text-teal-700",
  "Opened":"bg-green-100 text-green-700","Lost":"bg-red-100 text-red-600",
}
const RISK_COLOR: Record<string, string> = { Green:"bg-green-100 text-green-700", Amber:"bg-amber-100 text-amber-700", Red:"bg-red-100 text-red-600" }
const GATE_COLOR: Record<string, string> = { Green:"bg-green-100 text-green-700", Amber:"bg-amber-100 text-amber-700", Red:"bg-red-100 text-red-600" }
const STATUS_COLOR: Record<string, string> = { Open:"bg-blue-100 text-blue-700","In Progress":"bg-amber-100 text-amber-700",Blocked:"bg-red-100 text-red-600",Done:"bg-green-100 text-green-700" }

function Badge({ label, map }: { label?: string | null; map: Record<string, string> }) {
  if (!label) return null
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[label] ?? `bg-gray-100 text-gray-600`}`}>{label}</span>
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-muted/40 border p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-base font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

function DealWorkspace() {
  const { dealId } = Route.useParams()

  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal", dealId],
    queryFn: () => DealsService.getDeal({ id: dealId }),
  })

  const { data: audit } = useQuery({
    queryKey: ["deal-audit", dealId],
    queryFn: () => DealsService.getDealAudit({ id: dealId }),
    enabled: !!deal,
  })

  const { data: tasksData } = useQuery({
    queryKey: ["deal-tasks", dealId],
    queryFn: () => TasksService.listTasks({ dealId: dealId, limit: 50 }),
    enabled: !!deal,
  })

  const { data: docsData } = useQuery({
    queryKey: ["deal-docs", dealId],
    queryFn: () => DocumentsService.listDocuments({ dealId: dealId, limit: 50 }),
    enabled: !!deal,
  })

  const { data: milestonesData } = useQuery({
    queryKey: ["deal-milestones", dealId],
    queryFn: () => MilestonesService.listMilestones({ dealId: dealId, limit: 50 }),
    enabled: !!deal,
  })

  const { data: activitiesData } = useQuery({
    queryKey: ["deal-activities", dealId],
    queryFn: () => ActivitiesService.listActivities({ dealId: dealId, limit: 30 }),
    enabled: !!deal,
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-48 text-muted-foreground">Loading deal...</div>
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <p className="text-muted-foreground">Deal not found.</p>
        <Link to="/deals"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back to Pipeline</Button></Link>
      </div>
    )
  }

  const tasks: TaskPublic[] = tasksData?.data ?? []
  const docs: DocumentPublic[] = docsData?.data ?? []
  const milestones: MilestonePublic[] = milestonesData?.data ?? []
  const activities: ActivityPublic[] = activitiesData?.data ?? []
  const auditLogs: DealAuditLogPublic[] = audit ?? []

  return (
    <div className="flex flex-col gap-5 max-w-[1200px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/deals" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3 w-3" />Back to Pipeline
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{deal.name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {deal.city}, {deal.country} · {deal.owner_name ?? "No owner"} · {deal.bd_owner_name ?? "Unassigned"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StageChange deal={deal} size="full" />
          <EditDeal deal={deal} />
        </div>
      </div>

      {/* Stage + Risk badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge label={deal.stage} map={STAGE_COLOR} />
        <Badge label={deal.risk} map={RISK_COLOR} />
        {deal.feasibility && deal.feasibility !== "TBD" && (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-sky-100 text-sky-700">
            Feasibility: {deal.feasibility}
          </span>
        )}
        {deal.days_in_stage != null && deal.days_in_stage > 0 && (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            deal.days_in_stage > 60 ? "bg-red-100 text-red-600" :
            deal.days_in_stage > 30 ? "bg-amber-100 text-amber-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            {deal.days_in_stage}d in stage
          </span>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-6 gap-3">
        <Mini label="Stage" value={deal.stage ?? "—"} />
        <Mini label="Days in Stage" value={`${deal.days_in_stage ?? 0}d`} />
        <Mini label="Keys" value={deal.keys != null ? String(deal.keys) : "—"} />
        <Mini label="Probability" value={deal.probability != null ? `${deal.probability}%` : "—"} />
        <Mini label="Pipeline Value" value={fmtM(deal.pipeline_value)} />
        <Mini label="Fee Forecast" value={fmtMoney(deal.fee_forecast)} sub="annual" />
      </div>

      {/* Next Action */}
      {deal.next_action && (
        <div className="rounded-lg border bg-card px-4 py-3 text-sm">
          <span className="font-semibold">Next Action: </span>{deal.next_action}
        </div>
      )}

      {/* 3-column: Tasks, Documents, Pre-opening */}
      <div className="grid grid-cols-3 gap-4">
        {/* Tasks */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Tasks</h3>
            <span className="text-xs text-muted-foreground ml-auto">{tasks.length}</span>
          </div>
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tasks linked to this deal.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {tasks.map(t => (
                <div key={t.id} className="rounded-md bg-muted/40 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-medium ${t.status === `Done` ? `line-through text-muted-foreground` : ``}`}>{t.title}</p>
                    <Badge label={t.status} map={STATUS_COLOR} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {t.task_owner ?? "—"} · due {t.due_date ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Documents</h3>
            <span className="text-xs text-muted-foreground ml-auto">{docs.length}</span>
          </div>
          {docs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No documents linked to this deal.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {docs.map(d => (
                <div key={d.id} className="rounded-md bg-muted/40 p-2.5 cursor-pointer hover:bg-muted/60"
                  onClick={() => d.download_url && window.open(d.download_url, "_blank")}
                >
                  <div className="flex items-center gap-1.5">
                    {d.is_confidential && <Shield className="h-3 w-3 text-amber-500" />}
                    <p className="text-xs font-medium">{d.name}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {d.doc_type} · {d.version} · {d.permission}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pre-opening Gates */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Pre-opening Gates</h3>
            <span className="text-xs text-muted-foreground ml-auto">{milestones.length}</span>
          </div>
          {milestones.length === 0 ? (
            <p className="text-xs text-muted-foreground">No milestones yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {milestones.map(m => (
                <div key={m.id} className="rounded-md bg-muted/40 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium">{m.name}</p>
                    <Badge label={m.status} map={GATE_COLOR} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {m.department} · {m.milestone_owner ?? "—"} · due {m.due_date ?? "—"}
                  </p>
                  {m.blocker && (
                    <p className="text-[10px] text-red-500 mt-0.5">Blocker: {m.blocker}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2-column: Activity Timeline + Audit Log */}
      <div className="grid grid-cols-2 gap-4">
        {/* Activity Timeline */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Activity Timeline</h3>
          </div>
          {activities.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activities recorded.</p>
          ) : (
            <div className="relative pl-4 border-l-2 border-muted flex flex-col gap-3">
              {activities.map(a => (
                <div key={a.id} className="relative">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                  <p className="text-xs">
                    <span className="font-semibold">{a.activity_type}</span>
                    <span className="text-muted-foreground ml-2">{a.date}</span>
                  </p>
                  {a.note && <p className="text-xs text-muted-foreground mt-0.5">{a.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Log */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Audit Log</h3>
            <span className="text-xs text-muted-foreground">Governance trail for IT / Legal</span>
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No audit entries yet.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {auditLogs.slice(0, 20).map(a => (
                <div key={a.id} className="grid grid-cols-[110px_1fr] gap-2 py-1.5 border-b last:border-0 text-xs">
                  <span className="text-muted-foreground whitespace-nowrap">
                    {a.created_at ? new Date(a.created_at).toLocaleString("en-GB", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : "—"}
                  </span>
                  <span>
                    <span className="font-semibold">{a.field}</span>
                    {a.old_value && <span className="text-muted-foreground"> from "{a.old_value}"</span>}
                    <span> → </span>
                    <span className="font-semibold">"{a.new_value}"</span>
                    {a.note && <span className="text-muted-foreground block mt-0.5 italic">{a.note}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
