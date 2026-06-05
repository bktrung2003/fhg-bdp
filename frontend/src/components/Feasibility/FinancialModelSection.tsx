import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Calculator, Save, Trash2, BarChart3, Printer, ChevronDown, ChevronRight } from "lucide-react"

import { FeasibilityService, type FeasibilitySnapshotPublic } from "@/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import {
  type FinancialInputs, type FinancialOutputs, type TornadoBar,
  DEFAULT_INPUTS, calculate, computeTornado, fmtM, fmtPct, fmtUSD,
  BENCHMARKS, SCENARIO_LABELS,
} from "./financialModel"

interface Props {
  dealId: string
  dealName: string
}

interface DealSnapshot extends FeasibilitySnapshotPublic {
  parsedInputs?: FinancialInputs
  parsedOutputs?: FinancialOutputs
}

export function FinancialModelSection({ dealId, dealName }: Props) {
  const qc = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [inputs, setInputs] = useState<FinancialInputs>(DEFAULT_INPUTS)
  const [scenarioLabel, setScenarioLabel] = useState<string>("Base")
  const [customLabel, setCustomLabel] = useState("")
  const [collapsedInputs, setCollapsedInputs] = useState(false)
  const [showTornado, setShowTornado] = useState(false)

  const outputs = useMemo(() => calculate(inputs), [inputs])
  const tornado = useMemo(() => computeTornado(inputs), [inputs])
  const set = (k: keyof FinancialInputs) => (v: number) => setInputs(p => ({ ...p, [k]: v }))

  // Deal-scoped snapshots
  const { data: snapshots } = useQuery({
    queryKey: ["feasibility-snapshots", dealId],
    queryFn: () => FeasibilityService.listSnapshots({ dealId }),
  })

  const parsedSnapshots: DealSnapshot[] = useMemo(() => {
    if (!snapshots) return []
    return snapshots.map((s: FeasibilitySnapshotPublic) => {
      try {
        return { ...s, parsedInputs: JSON.parse(s.assumptions), parsedOutputs: JSON.parse(s.outputs) }
      } catch { return s as DealSnapshot }
    })
  }, [snapshots])

  // Group by scenario label for comparison table
  const byScenario = useMemo(() => {
    const out: Record<string, DealSnapshot> = {}
    for (const s of parsedSnapshots) {
      const k = s.label ?? "Custom"
      // Keep most recent per label
      if (!out[k] || (out[k].created_at && s.created_at && s.created_at > out[k].created_at)) {
        out[k] = s
      }
    }
    return out
  }, [parsedSnapshots])

  const saveSnap = useMutation({
    mutationFn: () => FeasibilityService.saveSnapshot({
      requestBody: {
        deal_id: dealId,
        deal_name: dealName,
        label: scenarioLabel === "Custom" ? (customLabel || "Custom") : scenarioLabel,
        assumptions: JSON.stringify(inputs),
        outputs: JSON.stringify(outputs),
      },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feasibility-snapshots", dealId] })
      showSuccessToast(`Saved "${scenarioLabel === "Custom" ? customLabel : scenarioLabel}".`)
    },
    onError: () => showErrorToast("Failed to save snapshot."),
  })

  const delSnap = useMutation({
    mutationFn: (id: string) => FeasibilityService.deleteSnapshot({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feasibility-snapshots", dealId] }),
  })

  const loadSnapshot = (snap: DealSnapshot) => {
    if (snap.parsedInputs) {
      setInputs(snap.parsedInputs)
      setScenarioLabel(snap.label ?? "Custom")
      showSuccessToast(`Loaded "${snap.label}".`)
    }
  }

  // F4: Print
  const handlePrint = () => {
    document.body.classList.add("printing-financial")
    window.print()
    setTimeout(() => document.body.classList.remove("printing-financial"), 500)
  }

  const paybackTone = outputs.paybackYears > 0 && outputs.paybackYears < BENCHMARKS.paybackGood
    ? "text-emerald-600"
    : outputs.paybackYears > BENCHMARKS.paybackPoor
    ? "text-red-600"
    : "text-amber-600"
  const noiTone = outputs.noiYield >= BENCHMARKS.noiYieldGood
    ? "text-emerald-600"
    : outputs.noiYield < BENCHMARKS.noiYieldPoor
    ? "text-red-600"
    : "text-amber-600"

  return (
    <div className="rounded-lg border bg-card p-5 print-section" id="financial-model-section">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 no-print">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base">Financial Model</h3>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{parsedSnapshots.length} scenario(s) saved</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowTornado(o => !o)}>
            <BarChart3 className="h-3.5 w-3.5 mr-1" />Sensitivity
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5 mr-1" />Print / PDF
          </Button>
        </div>
      </div>

      {/* Inputs (collapsible) */}
      <div className="rounded-lg border bg-muted/20 mb-4 no-print">
        <button type="button" className="w-full px-4 py-2 flex items-center gap-2"
          onClick={() => setCollapsedInputs(c => !c)}>
          {collapsedInputs ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span className="font-semibold text-xs uppercase tracking-wider">Assumptions</span>
          <span className="text-[10px] text-muted-foreground ml-2">
            {inputs.rooms} keys · ADR ${inputs.adr} · Occ {inputs.occupancy}% · Cost {fmtM(inputs.projectCost)}
          </span>
        </button>
        {!collapsedInputs && (
          <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-t pt-3">
            <NumInput label="Rooms (keys)" value={inputs.rooms} onChange={set("rooms")} />
            <NumInput label="ADR" value={inputs.adr} onChange={set("adr")} suffix="$" />
            <NumInput label="Occupancy" value={inputs.occupancy} onChange={set("occupancy")} suffix="%" />
            <NumInput label="Other Rev" value={inputs.otherRevPct} onChange={set("otherRevPct")} suffix="%" />
            <NumInput label="GOP" value={inputs.gopPct} onChange={set("gopPct")} suffix="%" />
            <NumInput label="FFE Reserve" value={inputs.ffePct} onChange={set("ffePct")} suffix="%" />
            <NumInput label="Base Mgmt Fee" value={inputs.feePct} onChange={set("feePct")} suffix="%" />
            <NumInput label="Project Cost" value={inputs.projectCost} onChange={set("projectCost")} suffix="$" />
          </div>
        )}
      </div>

      {/* Current calc KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Kpi label="RevPAR"        value={fmtUSD(outputs.revpar)} />
        <Kpi label="Total Revenue" value={fmtM(outputs.totalRevenue)} />
        <Kpi label="Owner NOI"     value={fmtM(outputs.ownerNOI)} sub="after FFE" />
        <Kpi label="Mgmt Fee"      value={fmtM(outputs.mgmtFee)} sub="annual · FHG" highlight />
        <Kpi label="Payback / NOI Yield"
          value={`${outputs.paybackYears.toFixed(1)}y / ${fmtPct(outputs.noiYield)}`}
          tone={`${paybackTone} ${noiTone}`} />
      </div>

      {/* Save scenario bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap no-print">
        <Label className="text-xs text-muted-foreground">Save current as:</Label>
        <Select value={scenarioLabel} onValueChange={setScenarioLabel}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SCENARIO_LABELS.map(s => <SelectItem key={s} value={s}>{s} Case</SelectItem>)}
          </SelectContent>
        </Select>
        {scenarioLabel === "Custom" && (
          <Input value={customLabel} onChange={e => setCustomLabel(e.target.value)}
            placeholder="Label..." className="h-8 w-[160px] text-xs" />
        )}
        <Button size="sm" onClick={() => saveSnap.mutate()} disabled={saveSnap.isPending}>
          <Save className="h-3.5 w-3.5 mr-1" />Save
        </Button>
        <span className="text-[10.5px] text-muted-foreground italic ml-auto">
          💡 Save Base/Worst/Upside to build a scenario comparison below.
        </span>
      </div>

      {/* Scenario comparison */}
      <ScenarioComparison byScenario={byScenario} onLoad={loadSnapshot} onDelete={(id) => delSnap.mutate(id)} />

      {/* F3: Tornado */}
      {showTornado && (
        <div className="mt-5 border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />Sensitivity (Owner NOI · ±20%)
            </h4>
            <p className="text-[10.5px] text-muted-foreground">Sorted by impact — focus due diligence on top variables</p>
          </div>
          <TornadoChart data={tornado} />
        </div>
      )}
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function Kpi({ label, value, sub, highlight, tone }: { label: string; value: string; sub?: string; highlight?: boolean; tone?: string }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-primary bg-primary/5" : "bg-card"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold mt-1 tabular-nums ${highlight ? "text-primary" : tone ?? ""}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function NumInput({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} className="pr-7 h-8 text-sm" />
        {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  )
}

// ── F1: Scenario comparison table ────────────────────────────────────────────

function ScenarioComparison({
  byScenario, onLoad, onDelete,
}: {
  byScenario: Record<string, DealSnapshot>
  onLoad: (s: DealSnapshot) => void
  onDelete: (id: string) => void
}) {
  const scenarios = ["Base", "Worst", "Upside"].filter(s => byScenario[s])
  const extras = Object.keys(byScenario).filter(k => !["Base","Worst","Upside"].includes(k))
  const all = [...scenarios, ...extras]

  if (all.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed bg-card p-6 text-center text-xs text-muted-foreground">
        No scenarios saved yet for this deal. Save a Base case, then adjust assumptions and save Worst / Upside to build a comparison.
      </div>
    )
  }

  const ROWS: { label: string; get: (s: DealSnapshot) => string; tone?: (s: DealSnapshot) => string }[] = [
    { label: "Rooms",        get: s => s.parsedInputs ? `${s.parsedInputs.rooms}` : "—" },
    { label: "ADR",          get: s => s.parsedInputs ? `$${s.parsedInputs.adr}` : "—" },
    { label: "Occupancy",    get: s => s.parsedInputs ? `${s.parsedInputs.occupancy}%` : "—" },
    { label: "RevPAR",       get: s => s.parsedOutputs ? fmtUSD(s.parsedOutputs.revpar) : "—" },
    { label: "Total Revenue",get: s => s.parsedOutputs ? fmtM(s.parsedOutputs.totalRevenue) : "—" },
    { label: "GOP",          get: s => s.parsedOutputs ? fmtM(s.parsedOutputs.gop) : "—" },
    { label: "Owner NOI",    get: s => s.parsedOutputs ? fmtM(s.parsedOutputs.ownerNOI) : "—" },
    { label: "Mgmt Fee (annual · FHG)", get: s => s.parsedOutputs ? fmtM(s.parsedOutputs.mgmtFee) : "—" },
    { label: "Payback (years)", get: s => s.parsedOutputs ? s.parsedOutputs.paybackYears.toFixed(1) : "—",
      tone: s => {
        if (!s.parsedOutputs) return ""
        const p = s.parsedOutputs.paybackYears
        if (p < BENCHMARKS.paybackGood) return "text-emerald-600 font-semibold"
        if (p > BENCHMARKS.paybackPoor) return "text-red-600 font-semibold"
        return "text-amber-600"
      } },
    { label: "NOI Yield",    get: s => s.parsedOutputs ? fmtPct(s.parsedOutputs.noiYield) : "—",
      tone: s => {
        if (!s.parsedOutputs) return ""
        const y = s.parsedOutputs.noiYield
        if (y >= BENCHMARKS.noiYieldGood) return "text-emerald-600 font-semibold"
        if (y < BENCHMARKS.noiYieldPoor) return "text-red-600 font-semibold"
        return "text-amber-600"
      } },
  ]

  const COLOR: Record<string, string> = {
    Worst:  "bg-red-50 text-red-700 border-red-200",
    Base:   "bg-blue-50 text-blue-700 border-blue-200",
    Upside: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="px-3 py-2 bg-muted/30 border-b">
        <h4 className="text-xs font-semibold uppercase tracking-wider">Scenario Comparison</h4>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-muted/20">
          <tr>
            <th className="text-left px-3 py-2 font-semibold">Metric</th>
            {all.map(k => (
              <th key={k} className="px-3 py-2 text-center">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold border ${COLOR[k] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
                  {k}
                </span>
                <div className="mt-1">
                  <Button size="sm" variant="ghost" className="h-6 px-1 text-[10px]" onClick={() => onLoad(byScenario[k])}>Load</Button>
                  <Button size="sm" variant="ghost" className="h-6 px-1 text-[10px] text-red-600 no-print"
                    onClick={() => { if (confirm(`Delete "${k}" scenario?`)) onDelete(byScenario[k].id) }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(row => (
            <tr key={row.label} className="border-t">
              <td className="px-3 py-1.5 text-muted-foreground font-medium">{row.label}</td>
              {all.map(k => (
                <td key={k} className={`px-3 py-1.5 text-center tabular-nums ${row.tone ? row.tone(byScenario[k]) : ""}`}>
                  {row.get(byScenario[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground px-3 py-2 bg-muted/10 border-t">
        Benchmarks: Payback &lt;{BENCHMARKS.paybackGood}y attractive · &gt;{BENCHMARKS.paybackPoor}y concerning · NOI Yield &gt;{BENCHMARKS.noiYieldGood}% strong · &lt;{BENCHMARKS.noiYieldPoor}% reject
      </p>
    </div>
  )
}

// ── F3: Tornado chart (pure SVG, no dep) ─────────────────────────────────────

function TornadoChart({ data }: { data: TornadoBar[] }) {
  if (!data || data.length === 0) return null
  // Find max absolute deviation from base across all bars
  const base = data[0]?.baseValue ?? 0
  const maxDev = Math.max(...data.map(b => Math.max(Math.abs(b.upValue - base), Math.abs(b.downValue - base))))
  if (maxDev === 0) return <p className="text-xs text-muted-foreground">No sensitivity — outputs flat.</p>

  const barH = 22
  const gap = 6
  const labelW = 110
  const chartW = 360
  const totalH = data.length * (barH + gap)

  const xScale = (v: number) => (v / maxDev) * (chartW / 2)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${labelW + chartW + 80} ${totalH + 30}`} className="w-full max-w-[700px]">
        {/* Center line */}
        <line x1={labelW + chartW / 2} y1={0} x2={labelW + chartW / 2} y2={totalH + 20} stroke="#9ca3af" strokeDasharray="2,2" />
        <text x={labelW + chartW / 2} y={totalH + 28} textAnchor="middle" className="text-[9px] fill-muted-foreground">
          Base NOI: {fmtM(base)}
        </text>
        {data.map((b, i) => {
          const y = i * (barH + gap)
          const downDev = b.downValue - base   // negative
          const upDev   = b.upValue - base     // positive
          const downX = labelW + chartW / 2 + xScale(Math.min(downDev, 0))
          const downW = Math.abs(xScale(downDev))
          const upX   = labelW + chartW / 2
          const upW   = xScale(Math.max(upDev, 0))
          return (
            <g key={b.variable}>
              <text x={labelW - 5} y={y + barH / 2 + 3} textAnchor="end" className="text-[10px] fill-foreground font-medium">
                {b.label}
              </text>
              {/* Down (red) */}
              <rect x={downX} y={y} width={downW} height={barH} fill="rgb(248,113,113)" rx="2" />
              <text x={downX - 3} y={y + barH / 2 + 3} textAnchor="end" className="text-[9px] fill-red-700 font-semibold">
                {fmtM(b.downValue)}
              </text>
              {/* Up (green) */}
              <rect x={upX} y={y} width={upW} height={barH} fill="rgb(74,222,128)" rx="2" />
              <text x={upX + upW + 3} y={y + barH / 2 + 3} className="text-[9px] fill-emerald-700 font-semibold">
                {fmtM(b.upValue)}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="text-[10px] text-muted-foreground italic mt-2">
        💡 Top variable = biggest impact on Owner NOI. Focus due diligence + Owner negotiations there.
      </p>
    </div>
  )
}
