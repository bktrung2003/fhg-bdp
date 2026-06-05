import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { AlertCircle, Building2, FileText, Rocket, TrendingUp, Users } from "lucide-react"

import {
  DealsService, OwnersService, TasksService, MilestonesService,
  type DealPublic, type TaskPublic, type MilestonePublic,
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

      {/* ── Pipeline by Stage — full width bar ── */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold text-sm mb-4">Pipeline by Stage</h3>
        <div className="flex flex-col gap-2.5">
          {Object.entries(stageCounts)
            .sort(([a], [b]) => {
              const order = ["Lead","NDA / Qualified","Feasibility","Proposal","Negotiation","LOI Signed","HMA Signed","Pre-opening"]
              return order.indexOf(a) - order.indexOf(b)
            })
            .map(([stage, count]) => {
              const stageDeals = activeDeals.filter(d => d.stage === stage)
              const stageKeys = stageDeals.reduce((s, d) => s + (d.keys ?? 0), 0)
              const stageValue = stageDeals.reduce((s, d) => s + (d.pipeline_value ?? 0), 0)
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className="w-[120px] flex-shrink-0">
                    <Badge label={stage} map={STAGE_COLOR} />
                  </div>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, (count / Math.max(1, activeDeals.length)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs tabular-nums w-[200px] flex-shrink-0 justify-end">
                    <span className="font-semibold">{count} deal{count !== 1 ? "s" : ""}</span>
                    <span className="text-muted-foreground">{stageKeys.toLocaleString()} keys</span>
                    <span className="font-medium text-primary">{fmtM(stageValue)}</span>
                  </div>
                </div>
              )
            })}
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
