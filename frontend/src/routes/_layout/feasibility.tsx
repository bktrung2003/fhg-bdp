import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Calculator, Save, Trash2 } from "lucide-react"
import { useState, useMemo } from "react"

import { FeasibilityService, DealsService, type FeasibilitySnapshotPublic } from "@/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/feasibility")({
  component: FeasibilityPage,
  head: () => ({ meta: [{ title: "Feasibility — Fusion BD CORE OS" }] }),
})

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

function FeasibilityPage() {
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
    if (d) { setSelectedDealId(d.id); setSelectedDealName(d.name) }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Feasibility Calculator</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Excel logic moved into the system — fast, consistent, versioned per deal.
          </p>
        </div>
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
                <div className="relative">
                  <Input
                    type="number"
                    value={inputs.projectCost}
                    onChange={e => set("projectCost")(parseFloat(e.target.value) || 0)}
                    className="pr-10"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">USD</span>
                </div>
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
