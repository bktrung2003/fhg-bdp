import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { FileBarChart, Printer, Building2, TrendingUp, Layers, Globe, UserCheck, Star, Activity } from "lucide-react"

import {
  DealsService, OwnersService, FeasibilityService, ActivitiesService,
  type DealPublic,
} from "@/client"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports — Fusion BD CORE OS" }] }),
})

const STAGE_ORDER = [
  "Lead", "NDA / Qualified", "Feasibility", "Proposal", "Negotiation",
  "LOI Signed", "HMA Signed", "Pre-opening", "Opened", "Lost",
]
const CLOSED = new Set(["Opened", "Lost"])

const fmtM = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}K` : `$${v}`
const weighted = (d: DealPublic) => ((d.pipeline_value ?? 0) * (d.probability ?? 0)) / 100

// ── Aggregations ──────────────────────────────────────────────────────────────
function aggregate(deals: DealPublic[]) {
  const active = deals.filter(d => !CLOSED.has(d.stage ?? ""))
  const totalPipeline = active.reduce((s, d) => s + (d.pipeline_value ?? 0), 0)
  const totalWeighted = active.reduce((s, d) => s + weighted(d), 0)
  const won = deals.filter(d => d.stage === "Opened" || d.stage === "HMA Signed").length

  const byStage = STAGE_ORDER.map(stage => {
    const ds = deals.filter(d => d.stage === stage)
    return { stage, count: ds.length, value: ds.reduce((s, d) => s + (d.pipeline_value ?? 0), 0), weighted: ds.reduce((s, d) => s + weighted(d), 0) }
  }).filter(r => r.count > 0)

  const group = (key: (d: DealPublic) => string) => {
    const m: Record<string, { count: number; value: number }> = {}
    deals.forEach(d => { const k = key(d) || "—"; (m[k] ??= { count: 0, value: 0 }); m[k].count++; m[k].value += d.pipeline_value ?? 0 })
    return Object.entries(m).sort((a, b) => b[1].value - a[1].value)
  }
  return {
    active, totalPipeline, totalWeighted, won,
    byStage,
    byType: group(d => (d as any).deal_type ?? "—"),
    byCountry: group(d => d.country ?? "—"),
  }
}

// ── Print (clean A4 HTML in a popup) ─────────────────────────────────────────
function printPipelineReport(deals: DealPublic[], by: ReturnType<typeof aggregate>, who: string) {
  const w = window.open("", "_blank", "width=1000,height=1300")
  if (!w) { alert("Popup blocked — please allow popups and try again."); return }
  const now = new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })
  const O = "#E8913A", INK = "#2A2E37", MUTE = "#8A8F98", LINE = "#E4E0D8"
  const m = (v: number) => fmtM(v)
  const rows = STAGE_ORDER.flatMap(stage => deals.filter(d => d.stage === stage))
    .concat(deals.filter(d => !STAGE_ORDER.includes(d.stage ?? "")))

  const stageRows = by.byStage.map(r => `<tr>
    <td>${r.stage}</td><td class=n>${r.count}</td><td class=n>${m(r.value)}</td><td class=n>${m(r.weighted)}</td></tr>`).join("")
  const typeRows = by.byType.map(([k, v]) => `<tr><td>${k}</td><td class=n>${v.count}</td><td class=n>${m(v.value)}</td></tr>`).join("")
  const ctryRows = by.byCountry.map(([k, v]) => `<tr><td>${k}</td><td class=n>${v.count}</td><td class=n>${m(v.value)}</td></tr>`).join("")
  const dealRows = rows.map(d => `<tr>
    <td>${esc(d.name)}</td>
    <td>${esc(d.owner_name ?? "—")}</td>
    <td><span class="chip">${esc(d.stage ?? "—")}</span></td>
    <td class=n>${d.probability ?? 0}%</td>
    <td class=n>${m(d.pipeline_value ?? 0)}</td>
    <td class=n>${m(weighted(d))}</td>
    <td>${esc(d.risk ?? "—")}</td>
    <td class="next">${esc(d.next_action ?? "")}</td></tr>`).join("")

  w.document.write(`<!doctype html><html><head><meta charset=utf-8><title>Pipeline Report</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Calibri, Arial, sans-serif; color: ${INK}; margin: 0; font-size: 11px; }
    .hd { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid ${O}; padding-bottom: 8px; margin-bottom: 14px; }
    .hd h1 { margin:0; font-family: Georgia, serif; font-size: 20px; }
    .hd .sub { color:${MUTE}; font-size: 10px; margin-top: 2px; }
    .hd .meta { text-align:right; color:${MUTE}; font-size: 10px; }
    h2 { font-family: Georgia, serif; font-size: 13px; margin: 16px 0 6px; color:${INK}; }
    .kpis { display:flex; gap:8px; margin-bottom: 6px; }
    .kpi { flex:1; border:1px solid ${LINE}; border-radius:6px; padding:8px 10px; }
    .kpi .l { color:${MUTE}; font-size:9px; text-transform:uppercase; letter-spacing:.04em; }
    .kpi .v { font-size:18px; font-weight:bold; margin-top:2px; }
    table { width:100%; border-collapse:collapse; }
    th { text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:.03em; color:${MUTE}; border-bottom:1.5px solid ${LINE}; padding:5px 6px; }
    td { padding:5px 6px; border-bottom:1px solid #F0EDE7; vertical-align:top; }
    td.n { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
    td.next { color:${MUTE}; font-size:10px; }
    .chip { background:#F4EFE9; border-radius:10px; padding:1px 7px; font-size:9px; }
    .two { display:flex; gap:16px; } .two > div { flex:1; }
    tfoot td { font-weight:bold; border-top:1.5px solid ${LINE}; }
    .ft { margin-top:16px; color:${MUTE}; font-size:9px; border-top:1px solid ${LINE}; padding-top:6px; }
  </style></head><body>
  <div class=hd>
    <div><h1>Pipeline Report</h1><div class=sub>Fusion BD CORE OS · Business Development</div></div>
    <div class=meta>Generated ${now}<br>by ${esc(who)}</div>
  </div>

  <div class=kpis>
    <div class=kpi><div class=l>Active deals</div><div class=v>${by.active.length}</div></div>
    <div class=kpi><div class=l>Total deals</div><div class=v>${deals.length}</div></div>
    <div class=kpi><div class=l>Active pipeline</div><div class=v>${m(by.totalPipeline)}</div></div>
    <div class=kpi><div class=l>Weighted pipeline</div><div class=v>${m(by.totalWeighted)}</div></div>
  </div>

  <h2>By stage</h2>
  <table><thead><tr><th>Stage</th><th style="text-align:right">Deals</th><th style="text-align:right">Pipeline</th><th style="text-align:right">Weighted</th></tr></thead>
  <tbody>${stageRows}</tbody>
  <tfoot><tr><td>Total</td><td class=n>${deals.length}</td><td class=n>${m(by.byStage.reduce((s,r)=>s+r.value,0))}</td><td class=n>${m(by.byStage.reduce((s,r)=>s+r.weighted,0))}</td></tr></tfoot>
  </table>

  <div class=two>
    <div><h2>By deal type</h2><table><thead><tr><th>Type</th><th style="text-align:right">Deals</th><th style="text-align:right">Pipeline</th></tr></thead><tbody>${typeRows}</tbody></table></div>
    <div><h2>By country</h2><table><thead><tr><th>Country</th><th style="text-align:right">Deals</th><th style="text-align:right">Pipeline</th></tr></thead><tbody>${ctryRows}</tbody></table></div>
  </div>

  <h2>All deals (${deals.length})</h2>
  <table><thead><tr><th>Deal</th><th>Owner</th><th>Stage</th><th style="text-align:right">Prob</th><th style="text-align:right">Pipeline</th><th style="text-align:right">Weighted</th><th>Risk</th><th>Next action</th></tr></thead>
  <tbody>${dealRows}</tbody></table>

  <div class=ft>Confidential — Fusion Hotel Group. Pipeline figures are forecasts; weighted = pipeline × stage probability.</div>
  </body></html>`)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 350)
}
function esc(s: string) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)) }

// Shared A4 print shell — header + styles + footer. body = inner HTML.
function printShell(title: string, body: string, who: string) {
  const w = window.open("", "_blank", "width=1000,height=1300")
  if (!w) { alert("Popup blocked — please allow popups and try again."); return }
  const now = new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })
  const O = "#E8913A", INK = "#2A2E37", MUTE = "#8A8F98", LINE = "#E4E0D8"
  w.document.write(`<!doctype html><html><head><meta charset=utf-8><title>${esc(title)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Calibri, Arial, sans-serif; color: ${INK}; margin: 0; font-size: 11px; }
    .hd { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid ${O}; padding-bottom: 8px; margin-bottom: 14px; }
    .hd h1 { margin:0; font-family: Georgia, serif; font-size: 20px; }
    .hd .sub { color:${MUTE}; font-size: 10px; margin-top: 2px; }
    .hd .meta { text-align:right; color:${MUTE}; font-size: 10px; }
    h2 { font-family: Georgia, serif; font-size: 13px; margin: 16px 0 6px; color:${INK}; }
    .kpis { display:flex; gap:8px; margin-bottom: 6px; }
    .kpi { flex:1; border:1px solid ${LINE}; border-radius:6px; padding:8px 10px; }
    .kpi .l { color:${MUTE}; font-size:9px; text-transform:uppercase; letter-spacing:.04em; }
    .kpi .v { font-size:18px; font-weight:bold; margin-top:2px; }
    table { width:100%; border-collapse:collapse; }
    th { text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:.03em; color:${MUTE}; border-bottom:1.5px solid ${LINE}; padding:5px 6px; }
    td { padding:5px 6px; border-bottom:1px solid #F0EDE7; vertical-align:top; }
    td.n { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
    td.muted { color:${MUTE}; font-size:10px; }
    .chip { background:#F4EFE9; border-radius:10px; padding:1px 7px; font-size:9px; }
    .two { display:flex; gap:16px; } .two > div { flex:1; }
    tfoot td { font-weight:bold; border-top:1.5px solid ${LINE}; }
    .ft { margin-top:16px; color:${MUTE}; font-size:9px; border-top:1px solid ${LINE}; padding-top:6px; }
  </style></head><body>
  <div class=hd>
    <div><h1>${esc(title)}</h1><div class=sub>Fusion BD CORE OS · Business Development</div></div>
    <div class=meta>Generated ${now}<br>by ${esc(who)}</div>
  </div>
  ${body}
  <div class=ft>Confidential — Fusion Hotel Group.</div>
  </body></html>`)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 350)
}

// ── Owner Relationship Report ────────────────────────────────────────────────
function printOwnerReport(owners: any[], who: string) {
  const grp = (key: (o: any) => string) => {
    const m: Record<string, number> = {}
    owners.forEach(o => { const k = key(o) || "—"; m[k] = (m[k] ?? 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }
  const prio = grp(o => o.priority), rel = grp(o => o.relationship)
  const sorted = [...owners].sort((a, b) => (b.deal_count ?? 0) - (a.deal_count ?? 0))
  const rows = sorted.map(o => `<tr>
    <td>${esc(o.company)}</td><td>${esc(o.country ?? "—")}</td>
    <td><span class=chip>${esc(o.priority ?? "—")}</span></td>
    <td>${esc(o.relationship ?? "—")}</td><td>${esc(o.catchup_status ?? "—")}</td>
    <td class=n>${o.project_count ?? 0}</td><td class=n>${o.deal_count ?? 0}</td>
    <td class=muted>${esc(o.last_interaction ?? "—")}</td></tr>`).join("")
  const body = `
  <div class=kpis>
    <div class=kpi><div class=l>Owners</div><div class=v>${owners.length}</div></div>
    <div class=kpi><div class=l>Strategic / High</div><div class=v>${owners.filter(o => ["Strategic","High"].includes(o.priority)).length}</div></div>
    <div class=kpi><div class=l>Strong relationships</div><div class=v>${owners.filter(o => o.relationship === "Strong" || o.relationship === "Strategic Partner").length}</div></div>
    <div class=kpi><div class=l>Overdue catch-up</div><div class=v>${owners.filter(o => o.catchup_status === "Overdue").length}</div></div>
  </div>
  <div class=two>
    <div><h2>By priority</h2><table><thead><tr><th>Priority</th><th style="text-align:right">Owners</th></tr></thead><tbody>${prio.map(([k,v])=>`<tr><td>${esc(k)}</td><td class=n>${v}</td></tr>`).join("")}</tbody></table></div>
    <div><h2>By relationship</h2><table><thead><tr><th>Relationship</th><th style="text-align:right">Owners</th></tr></thead><tbody>${rel.map(([k,v])=>`<tr><td>${esc(k)}</td><td class=n>${v}</td></tr>`).join("")}</tbody></table></div>
  </div>
  <h2>All owners (${owners.length})</h2>
  <table><thead><tr><th>Owner</th><th>Country</th><th>Priority</th><th>Relationship</th><th>Catch-up</th><th style="text-align:right">Projects</th><th style="text-align:right">Deals</th><th>Last met</th></tr></thead>
  <tbody>${rows}</tbody></table>`
  printShell("Owner Relationship Report", body, who)
}

// ── Feasibility Scorecard Report ─────────────────────────────────────────────
function printFeasibilityReport(rows: any[], avg: number, who: string) {
  const sorted = [...rows].sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
  const recGrp: Record<string, number> = {}
  rows.forEach(r => { recGrp[r.recommendation] = (recGrp[r.recommendation] ?? 0) + 1 })
  const recRows = Object.entries(recGrp).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(k)}</td><td class=n>${v}</td></tr>`).join("")
  const dealRows = sorted.map(r => `<tr>
    <td>${esc(r.deal_name)}</td><td>${esc(r.country ?? "—")}</td><td><span class=chip>${esc(r.stage ?? "—")}</span></td>
    <td class=n><b>${r.total_score}</b>/100</td><td>${esc(r.recommendation)}</td>
    <td class=n>${r.location_score}</td><td class=n>${r.market_score}</td><td class=n>${r.owner_readiness_score}</td>
    <td class=n>${r.brand_fit_score}</td><td class=n>${r.financial_score}</td><td class=n>${r.technical_score}</td></tr>`).join("")
  const body = `
  <div class=kpis>
    <div class=kpi><div class=l>Assessed deals</div><div class=v>${rows.length}</div></div>
    <div class=kpi><div class=l>Average score</div><div class=v>${avg.toFixed(0)}/100</div></div>
    <div class=kpi><div class=l>Strong Proceed</div><div class=v>${rows.filter(r => r.recommendation === "Strong Proceed").length}</div></div>
    <div class=kpi><div class=l>Reject / Hold</div><div class=v>${rows.filter(r => ["Reject","Hold"].includes(r.recommendation)).length}</div></div>
  </div>
  <h2>By recommendation</h2>
  <table style="max-width:340px"><thead><tr><th>Recommendation</th><th style="text-align:right">Deals</th></tr></thead><tbody>${recRows}</tbody></table>
  <h2>Scorecard — all assessed deals (${rows.length})</h2>
  <table><thead><tr><th>Deal</th><th>Country</th><th>Stage</th><th style="text-align:right">Score</th><th>Recommendation</th>
  <th style="text-align:right">Loc</th><th style="text-align:right">Mkt</th><th style="text-align:right">Own</th><th style="text-align:right">Brnd</th><th style="text-align:right">Fin</th><th style="text-align:right">Tech</th></tr></thead>
  <tbody>${dealRows}</tbody></table>
  <p style="color:#8A8F98;font-size:9px;margin-top:6px">Dimensions: Loc=Location · Mkt=Market · Own=Owner readiness · Brnd=Brand fit · Fin=Financial · Tech=Technical (each /5).</p>`
  printShell("Feasibility Scorecard Report", body, who)
}

// ── Activity Summary Report ──────────────────────────────────────────────────
function printActivityReport(acts: any[], who: string) {
  const grp = (key: (a: any) => string) => {
    const m: Record<string, number> = {}
    acts.forEach(a => { const k = key(a) || "—"; m[k] = (m[k] ?? 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }
  const byType = grp(a => a.activity_type ?? a.interaction_type)
  const byDeal = grp(a => a.deal_name).slice(0, 15)
  const recent = [...acts].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 40)
  const recentRows = recent.map(a => `<tr>
    <td class=muted style="white-space:nowrap">${esc(a.date ?? "—")}</td>
    <td><span class=chip>${esc(a.activity_type ?? a.interaction_type ?? "—")}</span></td>
    <td>${esc(a.deal_name ?? "—")}</td><td class=muted>${esc(a.note ?? "")}</td></tr>`).join("")
  const body = `
  <div class=kpis>
    <div class=kpi><div class=l>Activities logged</div><div class=v>${acts.length}</div></div>
    <div class=kpi><div class=l>Activity types</div><div class=v>${byType.length}</div></div>
    <div class=kpi><div class=l>Deals touched</div><div class=v>${grp(a => a.deal_name).length}</div></div>
  </div>
  <div class=two>
    <div><h2>By type</h2><table><thead><tr><th>Type</th><th style="text-align:right">Count</th></tr></thead><tbody>${byType.map(([k,v])=>`<tr><td>${esc(k)}</td><td class=n>${v}</td></tr>`).join("")}</tbody></table></div>
    <div><h2>Most active deals</h2><table><thead><tr><th>Deal</th><th style="text-align:right">Activities</th></tr></thead><tbody>${byDeal.map(([k,v])=>`<tr><td>${esc(k)}</td><td class=n>${v}</td></tr>`).join("")}</tbody></table></div>
  </div>
  <h2>Recent activity (latest ${recent.length})</h2>
  <table><thead><tr><th>Date</th><th>Type</th><th>Deal</th><th>Note</th></tr></thead><tbody>${recentRows}</tbody></table>`
  printShell("Activity Summary Report", body, who)
}

// ── Page ──────────────────────────────────────────────────────────────────────
function ReportsPage() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ["reports-deals"],
    queryFn: () => DealsService.listDeals({ limit: 500 }),
  })
  const { data: ownersData } = useQuery({
    queryKey: ["reports-owners"],
    queryFn: () => OwnersService.listOwners({ limit: 500 }),
  })
  const { data: scorecard } = useQuery({
    queryKey: ["reports-scorecard"],
    queryFn: () => FeasibilityService.pipelineScorecard({}),
  })
  const { data: actData } = useQuery({
    queryKey: ["reports-activities"],
    queryFn: () => ActivitiesService.listActivities({ limit: 500 }),
  })

  const deals = (data?.data ?? []) as DealPublic[]
  const owners = (ownersData?.data ?? []) as any[]
  const scoreRows = ((scorecard as any)?.data ?? []) as any[]
  const scoreAvg = ((scorecard as any)?.avg_score ?? 0) as number
  const activities = (actData?.data ?? []) as any[]
  const by = useMemo(() => aggregate(deals), [deals])
  const who = user?.full_name || user?.email || "—"

  const [showPreview, setShowPreview] = useState(false)

  // Reports grouped by category — scales to many reports without clutter.
  const categories = [
    {
      title: "Pipeline & Deals",
      reports: [
        {
          icon: TrendingUp, title: "Pipeline Report",
          desc: "Executive summary — KPIs, breakdown by stage/type/country, full deal list.",
          stat: `${by.active.length} active · ${fmtM(by.totalWeighted)} weighted`,
          disabled: deals.length === 0,
          onPrint: () => printPipelineReport(deals, by, who),
          onPreview: () => setShowPreview(s => !s),
        },
      ],
    },
    {
      title: "Relationships",
      reports: [
        {
          icon: UserCheck, title: "Owner Relationship Report",
          desc: "Owners by priority & relationship, catch-up status, projects/deals per owner.",
          stat: `${owners.length} owners`,
          disabled: owners.length === 0,
          onPrint: () => printOwnerReport(owners, who),
        },
      ],
    },
    {
      title: "Governance",
      reports: [
        {
          icon: Star, title: "Feasibility Scorecard Report",
          desc: "Assessed deals ranked by score, recommendation bands, 6-dimension breakdown.",
          stat: `${scoreRows.length} assessed · avg ${scoreAvg ? scoreAvg.toFixed(0) : 0}/100`,
          disabled: scoreRows.length === 0,
          onPrint: () => printFeasibilityReport(scoreRows, scoreAvg, who),
        },
      ],
    },
    {
      title: "Activity",
      reports: [
        {
          icon: Activity, title: "Activity Summary Report",
          desc: "Interactions by type, most active deals, recent activity log.",
          stat: `${activities.length} activities`,
          disabled: activities.length === 0,
          onPrint: () => printActivityReport(activities, who),
        },
      ],
    },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-[1100px] mx-auto w-full pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <FileBarChart className="h-6 w-6 text-primary" />Reports
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generated live from your data. Print or save as PDF for board / committee.
        </p>
      </div>

      {categories.map(cat => (
        <div key={cat.title}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat.title}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cat.reports.map(r => <ReportCard key={r.title} {...r} />)}
          </div>
        </div>
      ))}

      {/* Pipeline preview (toggled from the Pipeline card) */}
      {showPreview && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-3 p-4 border-b">
            <h2 className="font-semibold text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Pipeline preview</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>Hide</Button>
          </div>
          <div className="p-4 flex flex-col gap-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { l: "Active deals", v: String(by.active.length), icon: Building2 },
                { l: "Total deals", v: String(deals.length), icon: Layers },
                { l: "Active pipeline", v: fmtM(by.totalPipeline), icon: TrendingUp },
                { l: "Weighted pipeline", v: fmtM(by.totalWeighted), icon: TrendingUp },
              ].map(k => (
                <div key={k.l} className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><k.icon className="h-3 w-3" />{k.l}</p>
                  <p className="text-xl font-bold mt-1 tabular-nums">{k.v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">By stage</p>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/40 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-2 px-3">Stage</th><th className="text-right py-2 px-3">Deals</th>
                    <th className="text-right py-2 px-3">Pipeline</th><th className="text-right py-2 px-3">Weighted</th>
                  </tr></thead>
                  <tbody>
                    {by.byStage.map(r => (
                      <tr key={r.stage} className="border-t">
                        <td className="py-2 px-3">{r.stage}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{r.count}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{fmtM(r.value)}</td>
                        <td className="py-2 px-3 text-right tabular-nums font-medium text-primary">{fmtM(r.weighted)}</td>
                      </tr>
                    ))}
                    {by.byStage.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-sm">No deals yet. Load demo data or add deals.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MiniBreak title="By deal type" icon={Layers} rows={by.byType} />
              <MiniBreak title="By country" icon={Globe} rows={by.byCountry} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReportCard({ icon: Icon, title, desc, stat, disabled, onPrint, onPreview }: {
  icon: any; title: string; desc: string; stat: string; disabled?: boolean; onPrint: () => void; onPreview?: () => void
}) {
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <div className="rounded-md bg-primary/10 p-1.5"><Icon className="h-4 w-4 text-primary" /></div>
        <h3 className="font-semibold text-sm leading-tight">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground mt-1 flex-1">{desc}</p>
      <p className="text-[11px] font-medium text-muted-foreground mt-2">{stat}</p>
      <div className="flex gap-2 mt-3">
        <Button variant="outline" size="sm" className="flex-1" onClick={onPrint} disabled={disabled}>
          <Printer className="h-3.5 w-3.5 mr-1.5" />Print / PDF
        </Button>
        {onPreview && (
          <Button variant="ghost" size="sm" onClick={onPreview} disabled={disabled}>Preview</Button>
        )}
      </div>
    </div>
  )
}

function MiniBreak({ title, icon: Icon, rows }: { title: string; icon: any; rows: [string, { count: number; value: number }][] }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/40 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" />{title}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t">
              <td className="py-1.5 px-3">{k}</td>
              <td className="py-1.5 px-3 text-right tabular-nums text-muted-foreground">{v.count}</td>
              <td className="py-1.5 px-3 text-right tabular-nums font-medium">{fmtM(v.value)}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td className="py-4 px-3 text-center text-muted-foreground text-xs">—</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
