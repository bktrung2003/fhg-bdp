import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { AlertCircle, Building2, FileText, Rocket, TrendingUp, Users, Flame, Clock, Calculator } from "lucide-react"

import {
  DealsService, OwnersService, TasksService, MilestonesService, ActivitiesService,
  type DealPublic, type TaskPublic, type MilestonePublic, type ActivityPublic,
} from "@/client"
import useAuth from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard - Fusion BD CORE OS" }] }),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtM = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`
const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n)

const STAGE_COLOR: Record<string, string> = {
  "Lead":"bg-gray-100 text-gray-700","NDA / Qualified":"bg-blue-100 text-blue-700",
  "Feasibility":"bg-sky-100 text-sky-700","Proposal":"bg-violet-100 text-violet-700",
  "Negotiation":"bg-orange-100 text-orange-700","LOI Signed":"bg-yellow-100 text-yellow-800",
  "HMA Signed":"bg-emerald-100 text-emerald-700","Pre-opening":"bg-teal-100 text-teal-700",
  "Opened":"bg-green-100 text-green-700","Lost":"bg-red-100 text-red-600",
}

function Badge({ label, map }: { label: string; map: Record<string, string> }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[label] ?? "bg-gray-100 text-gray-600"}`}>{label}</span>
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function Kpi({ label, value, sub, icon: Icon, onClick }: {
  label: string; value: string | number; sub?: string
  icon?: React.ElementType; onClick?: () => void
}) {
  return (
    <div
      className={`rounded-xl border bg-card p-5 transition-all ${onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="text-3xl font-bold mt-2 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

function Dashboard() {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()

  const { data: dealsData } = useQuery({
    queryKey: ["dashboard-deals"],
    queryFn: () => DealsService.listDeals({ limit: 500 }),
  })
  const { data: ownersData } = useQuery({
    queryKey: ["dashboard-owners"],
    queryFn: () => OwnersService.listOwners({ limit: 500 }),
  })
  const { data: tasksData } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: () => TasksService.listTasks({ limit: 500 }),
  })
  const { data: milestonesData } = useQuery({
    queryKey: ["dashboard-milestones"],
    queryFn: () => MilestonesService.listMilestones({ limit: 500 }),
  })
  const { data: activitiesData } = useQuery({
    queryKey: ["dashboard-activities"],
    queryFn: () => ActivitiesService.listActivities({ limit: 15 }),
  })
  const activities: ActivityPublic[] = activitiesData?.data ?? []

  const deals: DealPublic[] = dealsData?.data ?? []
  const tasks: TaskPublic[] = tasksData?.data ?? []
  const milestones: MilestonePublic[] = milestonesData?.data ?? []
  const ownerCount = ownersData?.count ?? 0

  // ── Computed KPIs ─────────────────────────────────────────────────────────
  const activeDeals = deals.filter(d => !["Lost", "Opened"].includes(d.stage ?? ""))
  const signedDeals = deals.filter(d => ["HMA Signed", "Pre-opening", "Opened"].includes(d.stage ?? ""))
  const totalKeys = activeDeals.reduce((s, d) => s + (d.keys ?? 0), 0)
  // Split pipeline value by deal-type semantics: recurring/annual vs one-time/asset.
  // Summing them together would be misleading (annual fee × N years ≠ TSA one-time).
  const annualPipelineTypes = new Set(["HMA", "Franchise", "Manchise"])
  const annualPipelineValue = activeDeals
    .filter(d => annualPipelineTypes.has((d as any).deal_type ?? "HMA"))
    .reduce((s, d) => s + (d.pipeline_value ?? 0), 0)
  const oneTimePipelineValue = activeDeals
    .filter(d => !annualPipelineTypes.has((d as any).deal_type ?? "HMA"))
    .reduce((s, d) => s + (d.pipeline_value ?? 0), 0)
  const pipelineValue = annualPipelineValue + oneTimePipelineValue  // back-compat for downstream code
  const weightedPipeline = activeDeals.reduce((s, d) => s + (d.pipeline_value ?? 0) * (d.probability ?? 0) / 100, 0)
  const feeForecasted = activeDeals.reduce((s, d) => s + (d.fee_forecast ?? 0), 0)

  const redDeals = activeDeals.filter(d => d.risk === "Red")
  const amberDeals = activeDeals.filter(d => d.risk === "Amber")
  const overdueTasks = tasks.filter(t => t.is_overdue)
  const redMilestones = milestones.filter(m => m.status === "Red")
  const amberMilestones = milestones.filter(m => m.status === "Amber")

  // Stage distribution
  const stageCounts: Record<string, number> = {}
  activeDeals.forEach(d => { const s = d.stage ?? "Lead"; stageCounts[s] = (stageCounts[s] ?? 0) + 1 })

  // Country distribution
  const countryCounts: Record<string, { count: number; keys: number; value: number; weighted: number }> = {}
  activeDeals.forEach(d => {
    const c = d.country ?? "Unknown"
    if (!countryCounts[c]) countryCounts[c] = { count: 0, keys: 0, value: 0, weighted: 0 }
    countryCounts[c].count++
    countryCounts[c].keys += d.keys ?? 0
    countryCounts[c].value += d.pipeline_value ?? 0
    countryCounts[c].weighted += (d.pipeline_value ?? 0) * (d.probability ?? 0) / 100
  })

  const totalAlerts = redDeals.length + overdueTasks.length + redMilestones.length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {currentUser?.full_name || currentUser?.email}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Fusion BD CORE OS — Executive Dashboard
        </p>
      </div>

      {/* Alerts */}
      {totalAlerts > 0 && (
        <div className="flex flex-wrap gap-3">
          {redDeals.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 cursor-pointer hover:bg-red-100"
              onClick={() => navigate({ to: "/deals" })}>
              <AlertCircle className="h-4 w-4" />
              <span><span className="font-semibold">{redDeals.length} deal{redDeals.length > 1 ? "s" : ""}</span> at Red risk</span>
            </div>
          )}
          {overdueTasks.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 cursor-pointer hover:bg-amber-100"
              onClick={() => navigate({ to: "/activities" })}>
              <AlertCircle className="h-4 w-4" />
              <span><span className="font-semibold">{overdueTasks.length} task{overdueTasks.length > 1 ? "s" : ""}</span> overdue</span>
            </div>
          )}
          {redMilestones.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 cursor-pointer hover:bg-red-100"
              onClick={() => navigate({ to: "/preopening" })}>
              <Rocket className="h-4 w-4" />
              <span><span className="font-semibold">{redMilestones.length} milestone{redMilestones.length > 1 ? "s" : ""}</span> at Red gate</span>
            </div>
          )}
        </div>
      )}

      {/* Growth KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Kpi label="Active Deals" value={activeDeals.length} sub={`${deals.length} total`} icon={Building2}
          onClick={() => navigate({ to: "/deals" })} />
        <Kpi label="Signed / Opening" value={signedDeals.length} sub="HMA + Pre-opening + Opened" icon={TrendingUp} />
        <Kpi label="Rooms in Pipeline" value={fmtK(totalKeys)} sub="active deals" />
        <Kpi
          label="Pipeline Value"
          value={fmtM(annualPipelineValue)}
          sub={oneTimePipelineValue > 0
            ? `Annual · ${fmtM(oneTimePipelineValue)} one-time separately`
            : `Annual · Weighted ${fmtM(weightedPipeline)}`}
        />
        <Kpi label="Fee Forecast" value={fmtM(feeForecasted)} sub="annual management fee" />
        <Kpi label="Owners" value={ownerCount} icon={Users}
          onClick={() => navigate({ to: "/owners" })} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Country Performance ── */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold text-sm mb-4">Country Performance</h3>
          {Object.keys(countryCounts).length === 0 ? (
            <p className="text-sm text-muted-foreground">No active deals.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {["Country","Deals","Keys","Value","Wt. Value"].map(h => (
                      <th key={h} className={`text-xs font-semibold text-muted-foreground pb-2 ${h === "Country" ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(countryCounts)
                    .sort(([, a], [, b]) => b.value - a.value)
                    .map(([country, d]) => (
                      <tr key={country} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate({ to: "/deals" })}>
                        <td className="py-2 font-medium">{country}</td>
                        <td className="py-2 text-right tabular-nums">{d.count}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">{d.keys.toLocaleString()}</td>
                        <td className="py-2 text-right tabular-nums">{fmtM(d.value)}</td>
                        <td className="py-2 text-right tabular-nums text-primary font-medium">{fmtM(d.weighted)}</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right">{activeDeals.length}</td>
                    <td className="py-2 text-right tabular-nums">{totalKeys.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums">{fmtM(pipelineValue)}</td>
                    <td className="py-2 text-right tabular-nums text-primary">{fmtM(weightedPipeline)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ── Strategic KPIs ── */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold text-sm mb-4">Strategic KPIs</h3>
          <div className="flex flex-col gap-3">
            {(() => {
              // Brand mix
              const brandCounts: Record<string, number> = {}
              activeDeals.forEach(d => { const b = d.brand ?? "Unbranded"; brandCounts[b] = (brandCounts[b] ?? 0) + 1 })
              // Owner concentration
              const ownerDealCounts: Record<string, number> = {}
              activeDeals.forEach(d => { const o = d.owner_name ?? "Unknown"; ownerDealCounts[o] = (ownerDealCounts[o] ?? 0) + 1 })
              const topOwner = Object.entries(ownerDealCounts).sort(([,a],[,b]) => b - a)[0]
              const concentrationRisk = topOwner && activeDeals.length > 0 ? Math.round((topOwner[1] / activeDeals.length) * 100) : 0
              // Geographic diversification
              const countryCount = Object.keys(countryCounts).length
              // Weak feasibility
              const weakFeas = activeDeals.filter(d => d.feasibility === "Weak" || d.feasibility === "TBD").length
              // Stuck deals (>30d in stage)
              const stuckDeals = activeDeals.filter(d => (d.days_in_stage ?? 0) > 30).length

              return (
                <>
                  {/* Brand Mix */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Brand Mix</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(brandCounts).sort(([,a],[,b]) => b - a).map(([brand, count]) => (
                        <span key={brand} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                          {brand} <span className="ml-1 font-bold text-primary">{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Owner Concentration */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Owner Concentration</p>
                      <p className="text-xs mt-0.5">
                        Top: <span className="font-semibold">{topOwner?.[0] ?? "—"}</span>
                        <span className="text-muted-foreground"> ({topOwner?.[1] ?? 0} deals)</span>
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      concentrationRisk > 40 ? "bg-red-100 text-red-600" :
                      concentrationRisk > 25 ? "bg-amber-100 text-amber-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {concentrationRisk}% risk
                    </span>
                  </div>

                  {/* Geographic Diversification */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Geographic Spread</p>
                      <p className="text-xs mt-0.5">{countryCount} {countryCount === 1 ? "country" : "countries"} in pipeline</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      countryCount >= 4 ? "bg-green-100 text-green-700" :
                      countryCount >= 2 ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-600"
                    }`}>
                      {countryCount >= 4 ? "Diversified" : countryCount >= 2 ? "Moderate" : "Concentrated"}
                    </span>
                  </div>

                  {/* Weak feasibility */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Weak / TBD Feasibility</p>
                      <p className="text-xs mt-0.5">{weakFeas} deal{weakFeas !== 1 ? "s" : ""} need assessment</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      weakFeas === 0 ? "bg-green-100 text-green-700" :
                      weakFeas <= 2 ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-600"
                    }`}>
                      {weakFeas}
                    </span>
                  </div>

                  {/* Stuck deals */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stuck Deals (&gt;30d)</p>
                      <p className="text-xs mt-0.5">{stuckDeals} deal{stuckDeals !== 1 ? "s" : ""} not progressing</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      stuckDeals === 0 ? "bg-green-100 text-green-700" :
                      stuckDeals <= 2 ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-600"
                    }`}>
                      {stuckDeals}
                    </span>
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* ── Risk Watchlist ── */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Risk Watchlist</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />{redDeals.length + redMilestones.length}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />{amberDeals.length + amberMilestones.length}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 max-h-[340px] overflow-y-auto pr-1">
            {/* Red deals */}
            {redDeals.map(d => (
              <div key={`d-${d.id}`} className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 cursor-pointer hover:bg-red-100"
                onClick={() => navigate({ to: "/deals/$dealId" as any, params: { dealId: d.id } })}>
                <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{d.name}</p>
                  <p className="text-[10px] text-red-600">{d.stage} · {d.days_in_stage}d · {d.country}</p>
                </div>
              </div>
            ))}
            {/* Red milestones */}
            {redMilestones.map(m => (
              <div key={`m-${m.id}`} className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 cursor-pointer hover:bg-red-100"
                onClick={() => navigate({ to: "/preopening" })}>
                <Rocket className="h-3 w-3 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{m.name}</p>
                  <p className="text-[10px] text-red-600">{m.deal_name} · {m.department} · due {m.due_date}</p>
                </div>
              </div>
            ))}
            {/* Overdue tasks */}
            {overdueTasks.slice(0, 5).map(t => (
              <div key={`t-${t.id}`} className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 cursor-pointer hover:bg-amber-100"
                onClick={() => navigate({ to: "/activities" })}>
                <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{t.title}</p>
                  <p className="text-[10px] text-amber-600">Overdue · {t.task_owner} · due {t.due_date}</p>
                </div>
              </div>
            ))}
            {/* Amber deals */}
            {amberDeals.slice(0, 5).map(d => (
              <div key={`a-${d.id}`} className="flex items-center gap-2 rounded-lg bg-amber-50/60 border border-amber-100 px-3 py-2 cursor-pointer hover:bg-amber-100"
                onClick={() => navigate({ to: "/deals/$dealId" as any, params: { dealId: d.id } })}>
                <span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{d.name}</p>
                  <p className="text-[10px] text-amber-600">{d.stage} · {d.days_in_stage}d · {d.country}</p>
                </div>
              </div>
            ))}
            {totalAlerts === 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <p className="text-xs font-medium text-green-700">All clear — no items need attention.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Pipeline Funnel — visual conversion drop-off ── */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-sm">Pipeline Funnel</h3>
            <p className="text-[11px] text-muted-foreground">Conversion shape — wider top = more leads, narrower bottom = closer to signed</p>
          </div>
        </div>
        <PipelineFunnel activeDeals={activeDeals} onClickStage={() => navigate({ to: "/deals" })} />
      </div>

      {/* ── 2-column: Hot Deals + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hot Deals widget — high-score + high-prob, ranked */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Hot Deals
            </h3>
            <span className="text-[10px] text-muted-foreground">Top-scored assessments × probability</span>
          </div>
          <HotDealsWidget deals={activeDeals} onOpen={(id) => navigate({ to: "/deals/$dealId" as any, params: { dealId: id } })} />
        </div>

        {/* Recent Activity Feed */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </h3>
            <span className="text-[10px] text-muted-foreground">Last {Math.min(activities.length, 10)} interactions</span>
          </div>
          <ActivityFeed activities={activities.slice(0, 10)} onOpen={(id) => navigate({ to: "/deals/$dealId" as any, params: { dealId: id } })} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Deal Pipeline", icon: Building2, path: "/deals" },
          { label: "Owner CRM 360", icon: Users, path: "/owners" },
          { label: "Documents", icon: FileText, path: "/documents" },
          { label: "Pre-opening", icon: Rocket, path: "/preopening" },
        ].map(item => (
          <Button
            key={item.path}
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate({ to: item.path as any })}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}

// ── Pipeline Funnel (SVG trapezoid stack) ────────────────────────────────────

const FUNNEL_STAGES = ["Lead","NDA / Qualified","Feasibility","Proposal","Negotiation","LOI Signed","HMA Signed","Pre-opening"]

function PipelineFunnel({ activeDeals, onClickStage }: { activeDeals: DealPublic[]; onClickStage: (stage: string) => void }) {
  const counts: Record<string, { count: number; keys: number; value: number }> = {}
  for (const s of FUNNEL_STAGES) counts[s] = { count: 0, keys: 0, value: 0 }
  for (const d of activeDeals) {
    const s = d.stage ?? ""
    if (counts[s]) {
      counts[s].count += 1
      counts[s].keys += d.keys ?? 0
      counts[s].value += d.pipeline_value ?? 0
    }
  }

  const maxCount = Math.max(...FUNNEL_STAGES.map(s => counts[s].count), 1)
  const FUNNEL_COLOR: Record<string, string> = {
    "Lead": "#9ca3af",
    "NDA / Qualified": "#60a5fa",
    "Feasibility": "#38bdf8",
    "Proposal": "#a78bfa",
    "Negotiation": "#fb923c",
    "LOI Signed": "#eab308",
    "HMA Signed": "#10b981",
    "Pre-opening": "#14b8a6",
  }

  return (
    <div className="flex flex-col gap-1.5">
      {FUNNEL_STAGES.map((stage, idx) => {
        const data = counts[stage]
        const pct = (data.count / maxCount) * 100
        const minPct = 12   // always show at least a slim sliver
        const widthPct = Math.max(minPct, pct)
        const next = idx < FUNNEL_STAGES.length - 1 ? counts[FUNNEL_STAGES[idx + 1]].count : null
        const conversion = data.count > 0 && next != null ? Math.round((next / data.count) * 100) : null
        return (
          <div key={stage}>
            <button onClick={() => onClickStage(stage)}
              className="w-full flex items-center gap-3 group">
              <div className="w-[130px] flex-shrink-0">
                <Badge label={stage} map={STAGE_COLOR} />
              </div>
              <div className="flex-1 flex items-center">
                <div className="h-7 rounded-md transition-all group-hover:opacity-80"
                  style={{ width: `${widthPct}%`, backgroundColor: FUNNEL_COLOR[stage] }}>
                  <div className="h-full flex items-center justify-between px-3 text-[10.5px] font-semibold text-white">
                    <span>{data.count} deal{data.count !== 1 ? "s" : ""}</span>
                    <span className="opacity-80">{data.keys.toLocaleString()} keys · {fmtM(data.value)}</span>
                  </div>
                </div>
                {conversion != null && data.count > 0 && (
                  <span className={`ml-2 text-[9px] font-bold tabular-nums ${
                    conversion >= 60 ? "text-emerald-600" :
                    conversion >= 30 ? "text-amber-600" :
                    "text-red-600"
                  }`} title="Conversion to next stage">
                    ↓ {conversion}%
                  </span>
                )}
              </div>
            </button>
          </div>
        )
      })}
      <p className="text-[10px] text-muted-foreground italic mt-2">
        💡 ↓% = conversion to next stage (Green ≥60% · Amber 30-60% · Red &lt;30%). Click any bar to view deals.
      </p>
    </div>
  )
}

// ── Hot Deals Widget ─────────────────────────────────────────────────────────

function HotDealsWidget({ deals, onOpen }: { deals: DealPublic[]; onOpen: (dealId: string) => void }) {
  // Hot = high feasibility score × probability, weighted toward score
  const hot = deals
    .filter(d => (d as any).feasibility_score != null && (d.probability ?? 0) >= 20)
    .map(d => {
      const score = (d as any).feasibility_score as number
      const prob = d.probability ?? 0
      const heat = score * 0.6 + prob * 0.4
      return { deal: d, heat, score, prob }
    })
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 5)

  if (hot.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-6 text-center">
        No deals with feasibility assessments yet. Run an assessment to see Hot Deals here.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {hot.map(({ deal, heat, score, prob }) => {
        const scoreColor = score >= 80 ? "bg-emerald-100 text-emerald-700"
                         : score >= 65 ? "bg-green-100 text-green-700"
                         : score >= 50 ? "bg-amber-100 text-amber-700"
                         :               "bg-red-100 text-red-700"
        return (
          <button key={deal.id} onClick={() => onOpen(deal.id)}
            className="w-full flex items-center gap-3 rounded-lg border bg-card hover:bg-muted/40 px-3 py-2 text-left transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{deal.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {deal.stage} · {deal.country} · {(deal as any).feasibility_recommendation ?? "—"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${scoreColor}`} title="Feasibility score">
                {score}/100
              </span>
              <span className="text-[10px] font-bold text-muted-foreground tabular-nums" title="Probability">
                {prob}%
              </span>
              <Flame className={`h-3.5 w-3.5 ${heat >= 70 ? "text-red-500" : heat >= 50 ? "text-orange-500" : "text-amber-400"}`} />
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Activity Feed ────────────────────────────────────────────────────────────

const ACTIVITY_ICON: Record<string, { icon: string; tone: string }> = {
  Meeting:    { icon: "🤝", tone: "bg-blue-100 text-blue-700" },
  Call:       { icon: "📞", tone: "bg-emerald-100 text-emerald-700" },
  Email:      { icon: "✉️", tone: "bg-violet-100 text-violet-700" },
  "Site Visit": { icon: "📍", tone: "bg-orange-100 text-orange-700" },
  Document:   { icon: "📄", tone: "bg-amber-100 text-amber-700" },
  Note:       { icon: "📝", tone: "bg-gray-100 text-gray-700" },
}

function ActivityFeed({ activities, onOpen }: { activities: ActivityPublic[]; onOpen: (dealId: string) => void }) {
  if (activities.length === 0) {
    return <div className="text-xs text-muted-foreground py-6 text-center">No activities logged yet.</div>
  }
  return (
    <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto">
      {activities.map(a => {
        const meta = ACTIVITY_ICON[a.activity_type ?? "Note"] ?? ACTIVITY_ICON.Note
        const dealId = (a as any).deal_id as string | undefined
        return (
          <button key={a.id}
            onClick={() => dealId && onOpen(dealId)}
            className="w-full flex items-start gap-2 rounded-md border-l-2 border-muted hover:border-primary hover:bg-muted/30 px-2.5 py-1.5 text-left transition-all">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${meta.tone}`}>
              {meta.icon} {a.activity_type}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium truncate">{(a as any).deal_name ?? "—"}</p>
              {a.note && <p className="text-[10.5px] text-muted-foreground line-clamp-2 leading-snug">{a.note}</p>}
            </div>
            <span className="text-[9px] text-muted-foreground whitespace-nowrap flex-shrink-0">
              {a.date}
            </span>
          </button>
        )
      })}
    </div>
  )
}
