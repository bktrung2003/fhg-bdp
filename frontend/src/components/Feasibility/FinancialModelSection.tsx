import { useMemo, useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Calculator, Save, Trash2, BarChart3, Printer, ChevronDown, ChevronRight, HelpCircle } from "lucide-react"

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
import { FinancialModelHelp } from "./FinancialModelHelp"
import { MoneyInput } from "@/components/ui/money-input"

interface Props {
  dealId: string
  dealName: string
  /** Number of keys (rooms) declared on the Deal record — auto-fills the
   *  Rooms assumption so BD doesn't re-enter it (and can't get it wrong). */
  dealKeys?: number
}

interface DealSnapshot extends FeasibilitySnapshotPublic {
  parsedInputs?: FinancialInputs
  parsedOutputs?: FinancialOutputs
}

export function FinancialModelSection({ dealId, dealName, dealKeys }: Props) {
  const qc = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  // Auto-prefill Rooms from the deal record if available, so BD doesn't
  // have to re-enter (and can't accidentally type a wrong number).
  const [inputs, setInputs] = useState<FinancialInputs>(() =>
    dealKeys && dealKeys > 0 ? { ...DEFAULT_INPUTS, rooms: dealKeys } : DEFAULT_INPUTS
  )
  const [scenarioLabel, setScenarioLabel] = useState<string>("Base")
  const [customLabel, setCustomLabel] = useState("")
  const [collapsedInputs, setCollapsedInputs] = useState(false)
  const [showTornado, setShowTornado] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  // Keep rooms in sync if deal.keys changes later (e.g. user updates Deal record
  // in another tab and we re-render). Only override when current rooms still
  // equals the default — don't overwrite a value the user has explicitly typed.
  useEffect(() => {
    if (dealKeys && dealKeys > 0 && inputs.rooms === DEFAULT_INPUTS.rooms) {
      setInputs(p => ({ ...p, rooms: dealKeys }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealKeys])

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

  // F4: Print via popup window — copies section HTML + stylesheets into new
  // window then prints there. Avoids SPA layout conflicts and produces a
  // clean A4 PDF when user picks "Save as PDF" in browser print dialog.
  const handlePrint = () => {
    const section = document.getElementById("financial-model-section")
    if (!section) return
    const w = window.open("", "_blank", "width=900,height=1200")
    if (!w) {
      alert("Popup blocked — please allow popups for this site and try again.")
      return
    }
    // Capture all stylesheets currently applied (Vite injects <style> tags in dev)
    const styleNodes = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
    const styles = styleNodes.map(n => n.outerHTML).join("\n")
    const now = new Date()
    const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    const sectionHtml = section.innerHTML

    w.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Financial Model — ${escapeHtml(dealName)}</title>
${styles}
<style>
  @page { size: A4 portrait; margin: 12mm; }
  html, body {
    margin: 0; padding: 0;
    background: white;
    color: #111;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  body { padding: 16px 14px; }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .no-print { display: none !important; }
  .print-header {
    border-bottom: 2px solid #111;
    padding-bottom: 10px;
    margin-bottom: 14px;
  }
  .print-header h1 {
    font-size: 18px; font-weight: 700; margin: 0 0 4px;
  }
  .print-header .meta {
    font-size: 11px; color: #666;
  }
  .print-footer {
    margin-top: 20px;
    padding-top: 8px;
    border-top: 1px solid #ddd;
    font-size: 9px; color: #999;
    text-align: center;
  }
  /* Avoid breaking tables and cards mid-page */
  table, .rounded-lg { page-break-inside: avoid; }
  svg { max-width: 100%; height: auto; page-break-inside: avoid; }
  /* Ensure backgrounds and borders survive print */
  .border, [class*="bg-"], [class*="border-"] { border-color: currentColor; }
</style>
</head>
<body>
  <div class="print-header">
    <h1>Financial Model — ${escapeHtml(dealName)}</h1>
    <div class="meta">Generated ${dateStr} at ${timeStr} · Fusion BD CORE OS</div>
  </div>
  ${sectionHtml}
  <div class="print-footer">Confidential — Fusion Hotel Group · Business Development</div>
</body>
</html>`)
    w.document.close()

    // Give stylesheets a moment to load, then print
    const triggerPrint = () => {
      try { w.focus() } catch {}
      w.print()
      // Don't auto-close — user may want to print again. They can close manually.
    }
    if (w.document.readyState === "complete") {
      setTimeout(triggerPrint, 300)
    } else {
      w.addEventListener("load", () => setTimeout(triggerPrint, 300))
    }
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
          <Button size="sm" variant="outline" onClick={() => setHelpOpen(true)}
            title="How the model works — formulas, benchmarks, glossary">
            <HelpCircle className="h-3.5 w-3.5 mr-1" />Help
          </Button>
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
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">Rooms (keys)</Label>
                {dealKeys && dealKeys > 0 && inputs.rooms === dealKeys && (
                  <span title={`Auto-filled from deal record (${dealKeys} keys). Override if modelling a different scenario.`}
                    className="text-[9px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                    FROM DEAL
                  </span>
                )}
                {dealKeys && dealKeys > 0 && inputs.rooms !== dealKeys && (
                  <button type="button" title="Reset to deal's key count"
                    onClick={() => set("rooms")(dealKeys)}
                    className="text-[9px] font-semibold text-blue-600 hover:underline">
                    ↺ Reset to {dealKeys}
                  </button>
                )}
              </div>
              <div className="relative">
                <Input type="number" value={inputs.rooms} onChange={e => set("rooms")(parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm" />
              </div>
            </div>
            <NumInput label="ADR" value={inputs.adr} onChange={set("adr")} suffix="$" />
            <NumInput label="Occupancy" value={inputs.occupancy} onChange={set("occupancy")} suffix="%" />
            <NumInput label="Other Rev" value={inputs.otherRevPct} onChange={set("otherRevPct")} suffix="%" />
            <NumInput label="GOP" value={inputs.gopPct} onChange={set("gopPct")} suffix="%" />
            <NumInput label="FFE Reserve" value={inputs.ffePct} onChange={set("ffePct")} suffix="%" />
            <NumInput label="Base Mgmt Fee" value={inputs.feePct} onChange={set("feePct")} suffix="%" />
            <div className="space-y-1">
              <Label className="text-xs">Project Cost</Label>
              <MoneyInput
                value={inputs.projectCost}
                onChange={(v) => set("projectCost")(v ?? 0)}
                placeholder="50,000,000"
              />
            </div>
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

      {/* Help modal — self-service reference for Legal/Finance/COO */}
      <FinancialModelHelp open={helpOpen} onOpenChange={setHelpOpen} />
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] as string))
}

function TornadoChart({ data }: { data: TornadoBar[] }) {
  if (!data || data.length === 0) return null
  const base = data[0]?.baseValue ?? 0
  const maxDev = Math.max(...data.map(b => Math.max(Math.abs(b.upValue - base), Math.abs(b.downValue - base))))
  if (maxDev === 0) return <p className="text-xs text-muted-foreground">No sensitivity — outputs flat.</p>

  // Layout zones (fixed widths so nothing collides):
  //  [ varLabel | downVal | leftHalf | rightHalf | upVal ]
  //    120px      60px       180px     180px        60px
  const varLabelW = 120
  const downValW = 60
  const halfW = 180
  const upValW = 60
  const padX = 8
  const totalW = padX + varLabelW + downValW + halfW + halfW + upValW + padX
  const centerX = padX + varLabelW + downValW + halfW

  const barH = 22
  const gap = 8
  const totalH = data.length * (barH + gap) + 36

  const xScale = (v: number) => (v / maxDev) * halfW

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full max-w-[760px]">
        {/* Center line */}
        <line x1={centerX} y1={4} x2={centerX} y2={totalH - 28} stroke="#9ca3af" strokeDasharray="3,3" />
        <text x={centerX} y={totalH - 14} textAnchor="middle" className="text-[10px] fill-muted-foreground font-medium">
          Base NOI: {fmtM(base)}
        </text>
        {/* Zone separators (subtle) */}
        <line x1={padX + varLabelW} y1={4} x2={padX + varLabelW} y2={totalH - 28} stroke="#e5e7eb" />
        <line x1={totalW - padX - upValW} y1={4} x2={totalW - padX - upValW} y2={totalH - 28} stroke="#e5e7eb" />

        {data.map((b, i) => {
          const y = i * (barH + gap) + 4
          const ty = y + barH / 2 + 3.5
          const downDev = b.downValue - base
          const upDev   = b.upValue - base
          const downBarStart = centerX + xScale(Math.min(downDev, 0))
          const downBarW = Math.abs(xScale(downDev))
          const upBarStart = centerX
          const upBarW = xScale(Math.max(upDev, 0))
          return (
            <g key={b.variable}>
              {/* Variable name — own zone, never overlaps */}
              <text x={padX + varLabelW - 6} y={ty} textAnchor="end"
                    className="text-[11px] fill-foreground font-semibold">
                {b.label}
              </text>
              {/* Down value — own zone, right-aligned */}
              <text x={padX + varLabelW + downValW - 4} y={ty} textAnchor="end"
                    className="text-[10px] fill-red-700 font-semibold tabular-nums">
                {fmtM(b.downValue)}
              </text>
              {/* Down bar */}
              {downBarW > 0 && (
                <rect x={downBarStart} y={y} width={downBarW} height={barH} fill="rgb(248,113,113)" rx="3" />
              )}
              {/* Up bar */}
              {upBarW > 0 && (
                <rect x={upBarStart} y={y} width={upBarW} height={barH} fill="rgb(74,222,128)" rx="3" />
              )}
              {/* Up value — own zone, left-aligned */}
              <text x={totalW - padX - upValW + 4} y={ty} textAnchor="start"
                    className="text-[10px] fill-emerald-700 font-semibold tabular-nums">
                {fmtM(b.upValue)}
              </text>
            </g>
          )
        })}

        {/* Header strip */}
        <text x={padX + varLabelW + downValW - 4} y={totalH - 2} textAnchor="end" className="text-[9px] fill-muted-foreground">
          −20%
        </text>
        <text x={totalW - padX - upValW + 4} y={totalH - 2} className="text-[9px] fill-muted-foreground">
          +20%
        </text>
      </svg>
      <p className="text-[10px] text-muted-foreground italic mt-2">
        💡 Top variable = biggest impact on Owner NOI. Focus due diligence + Owner negotiations there.
      </p>
    </div>
  )
}
