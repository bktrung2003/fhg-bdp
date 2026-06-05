// Shared financial model logic — used by /feasibility tab and Deal workspace.

export interface FinancialInputs {
  rooms: number
  adr: number
  occupancy: number    // %
  otherRevPct: number  // %
  gopPct: number       // %
  ffePct: number       // %
  feePct: number       // % of total revenue → annual base management fee (FHG side)
  projectCost: number  // USD
}

export interface FinancialOutputs {
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

export const DEFAULT_INPUTS: FinancialInputs = {
  rooms: 220, adr: 185, occupancy: 72,
  otherRevPct: 38, gopPct: 36, ffePct: 4, feePct: 3,
  projectCost: 52_000_000,
}

export function calculate(i: FinancialInputs): FinancialOutputs {
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

// ── Formatters ──────────────────────────────────────────────────────────────

export const fmtUSD = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`
export const fmtM = (n: number) => `$${(n / 1_000_000).toFixed(2)}M`
export const fmtPct = (n: number) => `${n.toFixed(1)}%`

// ── F3: Tornado / Sensitivity ───────────────────────────────────────────────

export interface TornadoBar {
  variable: string
  label: string
  baseValue: number
  downValue: number    // NOI when this variable -20%
  upValue: number      // NOI when this variable +20%
  swing: number        // |upValue - downValue|
  unit: string
}

/** For each input variable, compute Owner NOI at ±20% — sorted by absolute swing. */
export function computeTornado(base: FinancialInputs): TornadoBar[] {
  const baseOut = calculate(base)
  const variables: { key: keyof FinancialInputs; label: string; unit: string }[] = [
    { key: "adr",         label: "ADR",            unit: "$" },
    { key: "occupancy",   label: "Occupancy",      unit: "%" },
    { key: "rooms",       label: "Room count",     unit: "" },
    { key: "gopPct",      label: "GOP %",          unit: "%" },
    { key: "ffePct",      label: "FFE Reserve %",  unit: "%" },
    { key: "otherRevPct", label: "Other Rev %",    unit: "%" },
    { key: "projectCost", label: "Project Cost",   unit: "$" },
  ]
  const bars: TornadoBar[] = variables.map(v => {
    const baseVal = base[v.key]
    const downInputs = { ...base, [v.key]: baseVal * 0.8 }
    const upInputs   = { ...base, [v.key]: baseVal * 1.2 }
    const downOut = calculate(downInputs).ownerNOI
    const upOut   = calculate(upInputs).ownerNOI
    return {
      variable: v.key,
      label: v.label,
      baseValue: baseOut.ownerNOI,
      downValue: downOut,
      upValue: upOut,
      swing: Math.abs(upOut - downOut),
      unit: v.unit,
    }
  })
  return bars.sort((a, b) => b.swing - a.swing)
}

// ── F2: Auto-suggest Financial Feasibility Score from Financial Model ───────
//
// Map computed NOI Yield to a 1-5 score based on hospitality industry norms.
// NOI Yield benchmark (after FFE, for upscale full-service hotels):
//   ≥10%  → Excellent  → 5  (Tier-1 financial deal)
//   8–10% → Strong     → 4
//   6–8%  → Acceptable → 3
//   4–6%  → Weak       → 2
//   <4%   → Reject     → 1

export interface FinancialScoreSuggestion {
  suggestedScore: 1 | 2 | 3 | 4 | 5
  rationale: string
  noiYield: number
  mgmtFeeAnnual: number
  paybackYears: number
}

export function suggestFinancialScore(inputs: FinancialInputs): FinancialScoreSuggestion {
  const out = calculate(inputs)
  let score: 1 | 2 | 3 | 4 | 5
  let band: string
  if (out.noiYield >= 10)     { score = 5; band = "Excellent (Tier-1)" }
  else if (out.noiYield >= 8) { score = 4; band = "Strong" }
  else if (out.noiYield >= 6) { score = 3; band = "Acceptable" }
  else if (out.noiYield >= 4) { score = 2; band = "Weak" }
  else                        { score = 1; band = "Below threshold" }

  return {
    suggestedScore: score,
    rationale: `NOI Yield ${fmtPct(out.noiYield)} (${band}) · Mgmt fee ${fmtM(out.mgmtFee)}/yr · Payback ${out.paybackYears.toFixed(1)}yr`,
    noiYield: out.noiYield,
    mgmtFeeAnnual: out.mgmtFee,
    paybackYears: out.paybackYears,
  }
}

// ── Industry benchmark thresholds (for UI badges) ───────────────────────────

export const BENCHMARKS = {
  paybackGood: 12,    // years — under this is attractive
  paybackPoor: 18,    // years — above this raises concern
  noiYieldGood: 8,    // %
  noiYieldPoor: 4,    // %
  occupancyGood: 65,  // %
  occupancyPoor: 50,  // %
}

// ── Scenario presets (label + sample multipliers) ───────────────────────────

export type ScenarioPreset = "Base" | "Worst" | "Upside" | "Custom"

export const SCENARIO_LABELS: ScenarioPreset[] = ["Base", "Worst", "Upside", "Custom"]
