import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Calculator, Save, Trash2, ClipboardCheck, ShieldCheck, ChevronRight, BarChart3 } from "lucide-react"
import { useState, useMemo } from "react"

import { FeasibilityService, DealsService, OpenAPI, type FeasibilitySnapshotPublic } from "@/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MoneyInput } from "@/components/ui/money-input"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/feasibility")({
  component: FeasibilityPage,
  head: () => ({ meta: [{ title: "Feasibility — Fusion BD CORE OS" }] }),
})

// ── Wrapper with tabs ────────────────────────────────────────────────────────

function FeasibilityPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feasibility Hub</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pipeline-wide scorecard for go/no-go decisions + financial modelling per deal.
        </p>
      </div>
      <Tabs defaultValue="scorecard" className="w-full">
        <TabsList>
          <TabsTrigger value="scorecard">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />Pipeline Scorecard
          </TabsTrigger>
          <TabsTrigger value="financial">
            <Calculator className="h-3.5 w-3.5 mr-1.5" />Financial Model
          </TabsTrigger>
        </TabsList>
        <TabsContent value="scorecard" className="mt-4">
          <PipelineScorecardTab />
        </TabsContent>
        <TabsContent value="financial" className="mt-4">
          <FinancialModelTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Calculation engine ────────────────────────────────────────────────────────

interface Inputs {
  rooms: number
  adr: number
  occupancy: number    // %
  otherRevPct: number  // %
  gopPct: number       // %
  ffePct: number       // %
  feePct: number       // %
  projectCost: number
}

interface Outputs {
  revpar: number
  roomRevenue: number
  totalRevenue: number
  gop: number
  ffeReserve: number
  ownerNOI: number
  mgmtFee: number
  paybackYears: number
  noiYield: number
}

function calculate(i: Inputs): Outputs {
  const revpar = i.adr * (i.occupancy / 100)
  const roomRevenue = revpar * i.rooms * 365
  const totalRevenue = roomRevenue * (1 + i.otherRevPct / 100)
  const gop = totalRevenue * (i.gopPct / 100)
  const ffeReserve = totalRevenue * (i.ffePct / 100)
  const ownerNOI = gop - ffeReserve
  const mgmtFee = totalRevenue * (i.feePct / 100)
  const paybackYears = ownerNOI > 0 ? i.projectCost / ownerNOI : 0
  const noiYield = i.projectCost > 0 ? (ownerNOI / i.projectCost) * 100 : 0
  return { revpar, roomRevenue, totalRevenue, gop, ffeReserve, ownerNOI, mgmtFee, paybackYears, noiYield }
}

// ── Format helpers ────────────────────────────────────────────────────────────

const fmtUSD = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`
const fmtM = (n: number) => `$${(n / 1_000_000).toFixed(2)}M`
const fmtPct = (n: number) => `${n.toFixed(1)}%`

// ── Number input ──────────────────────────────────────────────────────────────

function NumInput({ label, value, onChange, suffix }: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="pr-8"
        />
        {suffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-primary bg-primary/5" : "bg-card"}`}>
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold mt-1 ${highlight ? "text-primary" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Sensitivity table ─────────────────────────────────────────────────────────

function SensitivityTable({ base }: { base: Inputs }) {
  const adrs = [-20, -10, 0, 10, 20].map(d => Math.round(base.adr * (1 + d / 100)))
  const occs = [60, 65, 70, 75, 80, 85]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 text-muted-foreground font-semibold border border-muted bg-muted/30">
              ADR / Occ
            </th>
            {occs.map(o => (
              <th key={o} className={`p-2 text-center border border-muted font-semibold ${o === base.occupancy ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground"}`}>
                {o}%
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {adrs.map(adr => (
            <tr key={adr}>
              <td className={`p-2 font-semibold border border-muted ${adr === base.adr ? "bg-primary/10 text-primary" : "bg-muted/20 text-muted-foreground"}`}>
                ${adr}
              </td>
              {occs.map(occ => {
                const out = calculate({ ...base, adr, occupancy: occ })
                const isBase = adr === base.adr && occ === base.occupancy
                return (
                  <td key={occ} className={`p-2 text-center border border-muted tabular-nums ${isBase ? "font-bold bg-primary/10 text-primary" : ""}`}>
                    {fmtM(out.mgmtFee)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground mt-2">Annual Base Management Fee sensitivity by ADR and Occupancy. Base case highlighted.</p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const DEFAULT_INPUTS: Inputs = {
  rooms: 220, adr: 185, occupancy: 72,
  otherRevPct: 38, gopPct: 36, ffePct: 4, feePct: 3,
  projectCost: 52_000_000,
}

function FinancialModelTab() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS)
  const [snapshotLabel, setSnapshotLabel] = useState("Base Case")
  const [selectedDealId, setSelectedDealId] = useState("")
  const [selectedDealName, setSelectedDealName] = useState("")
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const outputs = useMemo(() => calculate(inputs), [inputs])
  const set = (k: keyof Inputs) => (v: number) => setInputs(p => ({ ...p, [k]: v }))

  // Deals for snapshot dropdown
  const { data: dealsData } = useQuery({
    queryKey: ["deals-picker"],
    queryFn: () => DealsService.listDeals({ limit: 500 }),
  })
  const deals = dealsData?.data ?? []

  // Saved snapshots
  const { data: snapshots } = useQuery({
    queryKey: ["feasibility-snapshots"],
    queryFn: () => FeasibilityService.listSnapshots({}),
  })

  const saveSnap = useMutation({
    mutationFn: () => FeasibilityService.saveSnapshot({
      requestBody: {
        deal_id: selectedDealId || undefined,
        deal_name: selectedDealName || undefined,
        label: snapshotLabel || "Snapshot",
        assumptions: JSON.stringify(inputs),
        outputs: JSON.stringify(outputs),
      },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feasibility-snapshots"] })
      showSuccessToast("Snapshot saved.")
    },
  })

  const delSnap = useMutation({
    mutationFn: (id: string) => FeasibilityService.deleteSnapshot({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feasibility-snapshots"] }),
  })

  const loadSnapshot = (snap: FeasibilitySnapshotPublic) => {
    try {
      setInputs(JSON.parse(snap.assumptions))
      showSuccessToast(`Loaded: ${snap.label ?? "Snapshot"}`)
    } catch { /* ignore */ }
  }

  const handleDealSelect = (value: string) => {
    if (value === "__none__") { setSelectedDealId(""); setSelectedDealName(""); return }
    const d = deals.find(x => x.id === value)
    if (d) {
      setSelectedDealId(d.id)
      setSelectedDealName(d.name)
      // Auto-map deal.keys → Rooms assumption (UX: don't make BD re-type)
      if (d.keys && d.keys > 0) {
        setInputs(p => ({ ...p, rooms: d.keys as number }))
        showSuccessToast(`Loaded ${d.keys} keys from "${d.name}".`)
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-900">
        💡 <b>Standalone playground</b> — for proper deal scenarios (Base / Worst / Upside comparison,
        sensitivity analysis, print-friendly export), open the deal workspace and use the
        Financial Model section there.
      </div>
      {/* Subheader (parent already has page title) */}
      <div className="flex items-start justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Quick what-if calculator. Save snapshots tied to a deal here, or use the deal workspace for full scenario analysis.
        </p>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Live calculation</span>
        </div>
      </div>

      <div className="grid grid-cols-[320px_1fr] gap-6">
        {/* ── Inputs ── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="font-semibold text-sm mb-4">Input Assumptions</h2>
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="Rooms" value={inputs.rooms} onChange={set("rooms")} />
              <NumInput label="ADR" value={inputs.adr} onChange={set("adr")} suffix="USD" />
              <NumInput label="Occupancy" value={inputs.occupancy} onChange={set("occupancy")} suffix="%" />
              <NumInput label="Other Revenue" value={inputs.otherRevPct} onChange={set("otherRevPct")} suffix="%" />
              <NumInput label="GOP" value={inputs.gopPct} onChange={set("gopPct")} suffix="%" />
              <NumInput label="FF&E Reserve" value={inputs.ffePct} onChange={set("ffePct")} suffix="%" />
              <NumInput label="Base Mgmt Fee" value={inputs.feePct} onChange={set("feePct")} suffix="%" />
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Project Cost</Label>
                <MoneyInput
                  value={inputs.projectCost}
                  onChange={(v) => set("projectCost")(v ?? 0)}
                  placeholder="50,000,000"
                />
                <p className="text-xs text-muted-foreground">{fmtM(inputs.projectCost)}</p>
              </div>
            </div>
          </div>

          {/* Save Snapshot */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="font-semibold text-sm">Save Snapshot to Deal</h2>
            <div className="space-y-1.5">
              <Label className="text-xs">Label</Label>
              <Input value={snapshotLabel} onChange={e => setSnapshotLabel(e.target.value)} placeholder="e.g. Base Case, Optimistic" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Related Deal (optional)</Label>
              <Select value={selectedDealId || "__none__"} onValueChange={handleDealSelect}>
                <SelectTrigger><SelectValue placeholder="Select deal..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No deal —</SelectItem>
                  {deals.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} · {d.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => saveSnap.mutate()} disabled={saveSnap.isPending}>
              <Save className="h-4 w-4 mr-1.5" />
              {saveSnap.isPending ? "Saving..." : "Save Snapshot"}
            </Button>
          </div>
        </div>

        {/* ── Outputs ── */}
        <div className="flex flex-col gap-4">
          {/* KPI grid */}
          <div className="rounded-lg border bg-card p-4">
            <h2 className="font-semibold text-sm mb-4">Calculated Output</h2>
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="RevPAR" value={fmtUSD(outputs.revpar)} sub="per room per night" />
              <KpiCard label="Room Revenue" value={fmtM(outputs.roomRevenue)} sub="annual" />
              <KpiCard label="Total Revenue" value={fmtM(outputs.totalRevenue)} sub="incl. F&B, spa, other" />
              <KpiCard label="GOP" value={fmtM(outputs.gop)} sub={`${fmtPct(inputs.gopPct)} of total revenue`} />
              <KpiCard label="FF&E Reserve" value={fmtM(outputs.ffeReserve)} sub="annual reserve" />
              <KpiCard label="Owner NOI" value={fmtM(outputs.ownerNOI)} sub="GOP minus FF&E" />
              <KpiCard label="Management Fee" value={fmtM(outputs.mgmtFee)} sub={`${fmtPct(inputs.feePct)} of total revenue`} highlight />
              <KpiCard label="Payback Period" value={`${outputs.paybackYears.toFixed(1)} yrs`} sub="project cost / NOI" highlight />
              <KpiCard label="NOI Yield" value={fmtPct(outputs.noiYield)} sub="NOI / project cost" highlight />
            </div>
          </div>

          {/* Sensitivity table */}
          <div className="rounded-lg border bg-card p-4">
            <h2 className="font-semibold text-sm mb-4">Sensitivity — Annual Base Management Fee</h2>
            <SensitivityTable base={inputs} />
          </div>
        </div>
      </div>

      {/* Saved snapshots */}
      {snapshots && snapshots.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold text-sm mb-3">Saved Snapshots</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {["Label","Deal","Rooms","ADR","Occ%","Mgmt Fee","NOI Yield","Payback","Saved",""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s: FeasibilitySnapshotPublic) => {
                  const a: Inputs = JSON.parse(s.assumptions)
                  const o: Outputs = JSON.parse(s.outputs)
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 cursor-pointer" onClick={() => loadSnapshot(s)}>
                      <td className="py-2.5 pr-3 font-medium">{s.label ?? "Snapshot"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground text-xs">{s.deal_name ?? "—"}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{a.rooms}</td>
                      <td className="py-2.5 pr-3 tabular-nums">${a.adr}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{a.occupancy}%</td>
                      <td className="py-2.5 pr-3 tabular-nums font-medium text-primary">{fmtM(o.mgmtFee)}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{fmtPct(o.noiYield)}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{o.paybackYears.toFixed(1)}y</td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="py-2.5" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                          onClick={() => delSnap.mutate(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-2">Click any row to load that snapshot into the calculator.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Pipeline Scorecard Tab ───────────────────────────────────────────────────

interface ScorecardRow {
  assessment_id: string
  deal_id: string
  deal_number: number | null
  deal_name: string
  stage: string | null
  country: string | null
  bd_owner_name: string | null
  total_score: number
  recommendation: string
  location_score: number
  market_score: number
  owner_readiness_score: number
  brand_fit_score: number
  financial_score: number
  technical_score: number
  assessed_by_name: string | null
  assessed_at: string | null
  reviewed: boolean
  days_since_assessed: number
}

interface ScorecardResponse {
  data: ScorecardRow[]
  count: number
  avg_score: number
  distribution: Record<string, number>
}

const REC_COLORS: Record<string, { bg: string; text: string; ring: string; icon: string }> = {
  "Strong Proceed":          { bg: "bg-emerald-50", text: "text-emerald-700", ring: "border-emerald-300", icon: "🚀" },
  "Proceed":                 { bg: "bg-green-50",   text: "text-green-700",   ring: "border-green-300",   icon: "✅" },
  "Proceed with Conditions": { bg: "bg-amber-50",   text: "text-amber-700",   ring: "border-amber-300",   icon: "⚠️" },
  "Nurture / Reassess":      { bg: "bg-yellow-50",  text: "text-yellow-800",  ring: "border-yellow-300",  icon: "🌱" },
  "Reject":                  { bg: "bg-red-50",     text: "text-red-700",     ring: "border-red-300",     icon: "🚫" },
}

function PipelineScorecardTab() {
  const navigate = useNavigate()
  const [recFilter, setRecFilter] = useState<string>("")
  const [reviewedOnly, setReviewedOnly] = useState(false)

  const { data, isLoading } = useQuery<ScorecardResponse>({
    queryKey: ["feasibility-scorecard", recFilter, reviewedOnly],
    queryFn: async () => {
      const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN({} as any) : OpenAPI.TOKEN
      const params = new URLSearchParams()
      if (recFilter) params.set("recommendation", recFilter)
      if (reviewedOnly) params.set("reviewed_only", "true")
      const res = await fetch(`${OpenAPI.BASE}/api/v1/feasibility/scorecard?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
  })

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading scorecard...</div>
  }

  if (!data || data.count === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed bg-card p-10 text-center">
        <ClipboardCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-base">No assessments yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Run a Feasibility Assessment from any deal workspace to see it appear here.
          Once your team scores deals, this view becomes a pipeline-wide go/no-go scorecard.
        </p>
      </div>
    )
  }

  const RECS = ["Strong Proceed","Proceed","Proceed with Conditions","Nurture / Reassess","Reject"]

  return (
    <div className="flex flex-col gap-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assessed</p>
          <p className="text-2xl font-bold mt-1">{data.count}</p>
          <p className="text-[10px] text-muted-foreground">deals scored</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg Score</p>
          <p className="text-2xl font-bold mt-1">{data.avg_score}</p>
          <p className="text-[10px] text-muted-foreground">/ 100</p>
        </div>
        {RECS.map(rec => {
          const count = data.distribution[rec] ?? 0
          const style = REC_COLORS[rec]
          return (
            <button key={rec}
              onClick={() => setRecFilter(recFilter === rec ? "" : rec)}
              className={`rounded-lg border p-3 text-left transition-all ${style.bg} ${style.ring} ${recFilter === rec ? "ring-2 ring-offset-1" : ""}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${style.text} flex items-center gap-1`}>
                <span>{style.icon}</span>{rec.replace(" / Reassess","")}
              </p>
              <p className={`text-xl font-bold mt-1 ${style.text}`}>{count}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 text-xs">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={reviewedOnly} onChange={e => setReviewedOnly(e.target.checked)} />
          <ShieldCheck className="h-3 w-3" />Reviewed only (2-eyes)
        </label>
        {recFilter && (
          <Button size="sm" variant="ghost" onClick={() => setRecFilter("")}>
            Clear recommendation filter
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Deal</th>
              <th className="px-3 py-2 text-left">Stage</th>
              <th className="px-3 py-2 text-left">Country</th>
              <th className="px-3 py-2 text-left">BD Lead</th>
              <th className="px-3 py-2 text-center">Score</th>
              <th className="px-3 py-2 text-left">Recommendation</th>
              <th className="px-3 py-2 text-center" title="Location · Market · Owner · Brand · Financial · Technical">Dimensions</th>
              <th className="px-3 py-2 text-left">Assessed</th>
              <th className="px-3 py-2 text-center">Review</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data.data.map(row => {
              const style = REC_COLORS[row.recommendation] ?? REC_COLORS["Proceed"]
              const stale = row.days_since_assessed > 90
              return (
                <tr key={row.assessment_id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">
                    {row.deal_number && <span className="font-mono text-[10px] text-muted-foreground mr-1">FHG-{String(row.deal_number).padStart(5,"0")}</span>}
                    {row.deal_name}
                  </td>
                  <td className="px-3 py-2">{row.stage ?? "—"}</td>
                  <td className="px-3 py-2">{row.country ?? "—"}</td>
                  <td className="px-3 py-2">{row.bd_owner_name ?? <span className="text-muted-foreground">Unassigned</span>}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="font-bold tabular-nums">{row.total_score}</span>
                    <span className="text-muted-foreground">/100</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold border ${style.bg} ${style.text} ${style.ring}`}>
                      {style.icon} {row.recommendation}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="font-mono text-[10px]" title="Location · Market · Owner · Brand · Financial · Technical">
                      {row.location_score}·{row.market_score}·{row.owner_readiness_score}·{row.brand_fit_score}·{row.financial_score}·{row.technical_score}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="leading-tight">
                      <div>{row.assessed_by_name}</div>
                      <div className={`text-[10px] ${stale ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                        {row.days_since_assessed === 0 ? "today" : `${row.days_since_assessed}d ago`}
                        {stale && " ⚠ stale"}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {row.reviewed
                      ? <span className="text-emerald-600 font-bold" title="Reviewed (2-eyes)">✓</span>
                      : <span className="text-amber-600" title="Awaiting review">⏳</span>}
                  </td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="ghost" className="h-7"
                      onClick={() => navigate({ to: "/deals/$dealId" as any, params: { dealId: row.deal_id } })}>
                      Open<ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer hints */}
      <p className="text-[10.5px] text-muted-foreground italic">
        💡 Click a recommendation card above to filter. Stale (&gt;90 days) entries marked ⚠ — reassessment recommended.
        Industry-standard bands: 80+ Strong Proceed · 65+ Proceed · 50+ Conditions · 35+ Nurture · &lt;35 Reject.
      </p>
    </div>
  )
}
