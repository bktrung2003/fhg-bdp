import { HelpCircle, BookOpen, Calculator, TrendingUp, Target } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ── Content data ────────────────────────────────────────────────────────────

const GLOSSARY = [
  { term: "ADR",      full: "Average Daily Rate",            def: "Average room price per night across all booked rooms. Excludes service charges and taxes. Industry primary pricing KPI." },
  { term: "Occupancy",full: "Occupancy Rate",                def: "% of available rooms actually sold. 70% = 7 out of 10 rooms occupied per night on average." },
  { term: "RevPAR",   full: "Revenue per Available Room",    def: "Combines pricing × demand into one number: ADR × Occupancy. Industry's #1 hotel benchmarking metric." },
  { term: "GOP",      full: "Gross Operating Profit",        def: "Revenue minus all department + undistributed operating costs (payroll, F&B costs, utilities, marketing). Before owner costs (property tax, insurance, debt, FFE)." },
  { term: "FFE",      full: "Furniture, Fixtures & Equipment", def: "Reserve set aside annually to replace soft goods, case goods, and equipment. Industry norm 3–5% of revenue." },
  { term: "NOI",      full: "Net Operating Income",          def: "Owner's bottom line BEFORE debt service and tax: GOP minus FFE reserve. What the owner can use to service debt and equity returns." },
  { term: "TSA",      full: "Technical Services Agreement",  def: "Separate fee for design oversight, pre-opening services. Typically a one-time fee paid during construction." },
  { term: "Payback",  full: "Payback Period",                def: "Years for cumulative Owner NOI to recover the initial Project Cost. Lower = faster return. Industry attractive < 12 years." },
  { term: "NOI Yield",full: "Yield on Cost",                 def: "Annual Owner NOI / Project Cost. Like a cap rate but on cost basis, not market value. Industry strong > 8%." },
  { term: "HMA",      full: "Hotel Management Agreement",    def: "Long-term contract where operator (FHG) runs the hotel for the owner in exchange for base + incentive fees. Typical term 15–25 years." },
]

const INPUTS = [
  { label: "Rooms (keys)",  range: "80–500",         note: "Total guest rooms. Auto-filled from deal record when available." },
  { label: "ADR",           range: "$50–$400 (resort)", note: "Set based on competitor set + brand positioning. Source: STR data, comp studies." },
  { label: "Occupancy %",   range: "55–80%",         note: "Year-1 ramp-up typically 50–60%, stabilized 65–75%." },
  { label: "Other Rev %",   range: "20–60%",         note: "F&B, spa, retail, parking, etc. as % of room revenue. Resorts higher (40–60%), urban lower (20–30%)." },
  { label: "GOP %",         range: "25–45%",         note: "Of total revenue. Upscale full-service ~30–35%, luxury 35–45%, limited-service 40%+." },
  { label: "FFE Reserve %", range: "3–5%",           note: "Of total revenue. Industry standard 4%." },
  { label: "Base Mgmt Fee %",range: "1.5–3.5%",      note: "Of total revenue. FHG's income line. Includes base fee only — incentive fee separate." },
  { label: "Project Cost",  range: "$80K–$1M per key", note: "Total dev cost (land + hard + soft + FFE + working capital). Upscale resort $300–500K/key typical." },
]

const FORMULAS = [
  { step: 1, label: "RevPAR",         formula: "ADR × Occupancy", example: "$185 × 72% = $133.20" },
  { step: 2, label: "Room Revenue",   formula: "RevPAR × Rooms × 365", example: "$133.20 × 220 × 365 = $10.7M" },
  { step: 3, label: "Total Revenue",  formula: "Room Revenue × (1 + Other Rev %)", example: "$10.7M × 1.38 = $14.8M" },
  { step: 4, label: "GOP",            formula: "Total Revenue × GOP %", example: "$14.8M × 36% = $5.32M" },
  { step: 5, label: "FFE Reserve",    formula: "Total Revenue × FFE %", example: "$14.8M × 4% = $592K" },
  { step: 6, label: "Owner NOI",      formula: "GOP − FFE Reserve", example: "$5.32M − $592K = $4.73M" },
  { step: 7, label: "Mgmt Fee (FHG)", formula: "Total Revenue × Base Fee %", example: "$14.8M × 3% = $443K/yr" },
  { step: 8, label: "Payback (years)",formula: "Project Cost / Owner NOI", example: "$52M / $4.73M = 11.0 years" },
  { step: 9, label: "NOI Yield %",    formula: "(Owner NOI / Project Cost) × 100", example: "($4.73M / $52M) × 100 = 9.1%" },
]

const BENCHMARKS = [
  { metric: "Payback (years)",      good: "< 12",    avg: "12–18",   poor: "> 18" },
  { metric: "NOI Yield",            good: "> 8%",    avg: "4–8%",    poor: "< 4%" },
  { metric: "Occupancy (stabilized)",good: "> 70%",  avg: "55–70%",  poor: "< 55%" },
  { metric: "GOP Margin",           good: "> 35%",   avg: "28–35%",  poor: "< 28%" },
  { metric: "ADR vs comp set",      good: "+10%",    avg: "±5%",     poor: "−10%" },
  { metric: "Mgmt Fee (Tier-1)",    good: "$1.5M+",  avg: "$0.8–1.5M", poor: "< $0.8M" },
]

// ── Component ───────────────────────────────────────────────────────────────

export function FinancialModelHelp({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Financial Model — How it works
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Self-service reference for everyone reviewing a deal's financial model — BD, Finance, Legal,
          Asset Management, COO. Explains every input, every formula, every output, plus the industry
          benchmarks used to color-code results.
        </p>

        {/* Section 1: Calculation chain */}
        <Section icon={<Calculator className="h-4 w-4" />} title="1 · How the numbers connect (calculation chain)">
          <p className="text-[11px] text-muted-foreground mb-2">
            Each row's output becomes the next row's input. Worked example uses a 220-key upscale resort,
            ADR $185, Occupancy 72%, Other Rev 38%, GOP 36%, FFE 4%, Fee 3%, Project Cost $52M.
          </p>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left w-10">#</th>
                  <th className="px-3 py-2 text-left">Metric</th>
                  <th className="px-3 py-2 text-left">Formula</th>
                  <th className="px-3 py-2 text-left">Worked example</th>
                </tr>
              </thead>
              <tbody>
                {FORMULAS.map(f => (
                  <tr key={f.step} className="border-t">
                    <td className="px-3 py-2 font-mono text-muted-foreground">{f.step}</td>
                    <td className="px-3 py-2 font-semibold">{f.label}</td>
                    <td className="px-3 py-2 font-mono text-blue-700">{f.formula}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">{f.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1.5 mt-2">
            📐 <b>Mgmt Fee</b> is FHG's revenue — calculated parallel to NOI, not subtracted from owner side
            in this simplified model. Real HMAs typically deduct fee before NOI; this calc shows fee as
            a separate line for clarity in fee forecasting.
          </p>
        </Section>

        {/* Section 2: Inputs */}
        <Section icon={<BookOpen className="h-4 w-4" />} title="2 · What each input means">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Input</th>
                  <th className="px-3 py-2 text-left">Typical range</th>
                  <th className="px-3 py-2 text-left">Notes / source of truth</th>
                </tr>
              </thead>
              <tbody>
                {INPUTS.map(i => (
                  <tr key={i.label} className="border-t">
                    <td className="px-3 py-2 font-semibold">{i.label}</td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">{i.range}</td>
                    <td className="px-3 py-2 text-muted-foreground">{i.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Section 3: Benchmarks */}
        <Section icon={<TrendingUp className="h-4 w-4" />} title="3 · Industry benchmarks — how we color-code results">
          <p className="text-[11px] text-muted-foreground mb-2">
            Why a 9% NOI Yield shows green and 3% shows red. Based on industry norms for upscale full-service
            hotels in APAC. Adjust mentally for limited-service (lower payback expected) or luxury (longer payback acceptable).
          </p>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Metric</th>
                  <th className="px-3 py-2 text-center bg-emerald-50 text-emerald-700">Good 🟢</th>
                  <th className="px-3 py-2 text-center bg-amber-50 text-amber-700">Average 🟡</th>
                  <th className="px-3 py-2 text-center bg-red-50 text-red-700">Concerning 🔴</th>
                </tr>
              </thead>
              <tbody>
                {BENCHMARKS.map(b => (
                  <tr key={b.metric} className="border-t">
                    <td className="px-3 py-2 font-semibold">{b.metric}</td>
                    <td className="px-3 py-2 text-center text-emerald-700 font-mono tabular-nums">{b.good}</td>
                    <td className="px-3 py-2 text-center text-amber-700 font-mono tabular-nums">{b.avg}</td>
                    <td className="px-3 py-2 text-center text-red-700 font-mono tabular-nums">{b.poor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Section 4: Sensitivity */}
        <Section icon={<Target className="h-4 w-4" />} title="4 · Sensitivity (Tornado) — what it tells you">
          <ul className="text-xs space-y-1.5 text-muted-foreground">
            <li>• Each variable is varied <b>±20%</b> from base, holding others constant.</li>
            <li>• Bars show the resulting Owner NOI at the low and high case.</li>
            <li>• Sorted by <b>absolute swing</b> — top variable has the biggest impact.</li>
            <li>• <b>Use it for</b>: focusing due diligence (verify the top driver's assumption first),
                negotiation prep (push owner to commit on the variables that matter most),
                risk management (flag the biggest swing in your COO summary).</li>
            <li>• <b>Note</b>: Project Cost has 0 NOI impact (it affects Payback and NOI Yield only,
                not NOI itself which is operations-driven).</li>
          </ul>
        </Section>

        {/* Section 5: Glossary */}
        <Section icon={<BookOpen className="h-4 w-4" />} title="5 · Glossary">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {GLOSSARY.map(g => (
              <div key={g.term} className="rounded border bg-card px-3 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-xs">{g.term}</span>
                  <span className="text-[10px] text-muted-foreground">{g.full}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{g.def}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Section 6: Limitations */}
        <Section icon={<HelpCircle className="h-4 w-4" />} title="6 · What this model does NOT include">
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• <b>No ramp-up curve</b> — assumes stabilized year. Actual Year-1 NOI typically 30–50% of stabilized.</li>
            <li>• <b>No inflation / discounting</b> — Payback is undiscounted (simple). For NPV analysis use Finance team's DCF model.</li>
            <li>• <b>No incentive fee</b> — only base management fee on revenue. Real HMAs add IMF (10–20% of NOI above threshold).</li>
            <li>• <b>No tax / debt service</b> — Owner NOI is pre-tax, pre-debt. Owner's actual return depends on financing.</li>
            <li>• <b>No CapEx after stabilization</b> — only FFE reserve. Major renovations every 7–10 years not modelled.</li>
            <li>• <b>Single year</b> — not a 10-year P&L projection. For long-form, use Finance's full DCF model.</li>
          </ul>
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-2">
            ⚠ Use this model for <b>screening and scenario discussion</b>. Final HMA economics require Finance team's
            full DCF with ramp-up, IMF tiers, debt assumptions, and tax modelling.
          </p>
        </Section>
      </DialogContent>
    </Dialog>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="border-t pt-4 mt-2">
      <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">{icon}{title}</h3>
      {children}
    </div>
  )
}
