// UI-only mapping of deal_type → financial field labels + visibility.
// No backend changes — we derive these per-render from deal.deal_type.
//
// Why: Probability is universal (every deal has a close likelihood) but
// Pipeline Value and Fee Forecast have different meanings per deal type:
// an HMA's $500K/yr ≠ a TSA's $200K one-time ≠ an Acquisition's $50M asset cost.

export type DealValueType = "annual" | "one-time" | "asset" | "equity" | "rent"

export interface DealTypeConfig {
  pipelineValueLabel: string
  pipelineValueHint: string
  pipelineValueBadge: DealValueType
  feeForecastVisible: boolean
  feeForecastLabel: string
  feeForecastHint: string
}

const DEFAULT: DealTypeConfig = {
  pipelineValueLabel: "Pipeline Value",
  pipelineValueHint: "Forecast value (annual revenue at stabilization)",
  pipelineValueBadge: "annual",
  feeForecastVisible: true,
  feeForecastLabel: "Annual Fee Forecast",
  feeForecastHint: "Annual base management fee to FHG at stabilization",
}

const MAP: Record<string, DealTypeConfig> = {
  HMA: {
    pipelineValueLabel: "Annual Revenue at Stabilization",
    pipelineValueHint: "Hotel-level top-line revenue once stabilized (Year 3–5 typically)",
    pipelineValueBadge: "annual",
    feeForecastVisible: true,
    feeForecastLabel: "Annual Base Fee (FHG)",
    feeForecastHint: "Base management fee at stabilization. Incentive fee not modelled here — capture separately in Financial Model.",
  },
  Franchise: {
    pipelineValueLabel: "Annual Revenue at Stabilization",
    pipelineValueHint: "Hotel-level top-line — basis for royalty + marketing fees",
    pipelineValueBadge: "annual",
    feeForecastVisible: true,
    feeForecastLabel: "Annual Royalty + Marketing Fee (FHG)",
    feeForecastHint: "Sum of royalty fee + marketing/system fee at stabilization",
  },
  TSA: {
    pipelineValueLabel: "Total Contract Value",
    pipelineValueHint: "Total Technical Services fee (one-time + monthly during construction)",
    pipelineValueBadge: "one-time",
    feeForecastVisible: false,
    feeForecastLabel: "",
    feeForecastHint: "TSA is one-time/project-based — no recurring annual fee. Total in Pipeline Value above.",
  },
  Consulting: {
    pipelineValueLabel: "Total Engagement Value",
    pipelineValueHint: "Sum of consulting fees across the engagement",
    pipelineValueBadge: "one-time",
    feeForecastVisible: false,
    feeForecastLabel: "",
    feeForecastHint: "Consulting is engagement-based — no recurring annual fee.",
  },
  "Pre-opening": {
    pipelineValueLabel: "Pre-opening Budget",
    pipelineValueHint: "Total pre-opening services value (typically 6–18 months)",
    pipelineValueBadge: "one-time",
    feeForecastVisible: false,
    feeForecastLabel: "",
    feeForecastHint: "Pre-opening services are time-boxed, not annual recurring.",
  },
  Other: DEFAULT,
}

export function getDealTypeConfig(dealType?: string | null): DealTypeConfig {
  if (!dealType) return DEFAULT
  return MAP[dealType] ?? DEFAULT
}

// ── Badge color per value type ───────────────────────────────────────────────

export const VALUE_TYPE_BADGE: Record<DealValueType, { bg: string; text: string; label: string }> = {
  annual:    { bg: "bg-emerald-100", text: "text-emerald-700", label: "annual" },
  "one-time":{ bg: "bg-blue-100",    text: "text-blue-700",    label: "one-time" },
  asset:     { bg: "bg-purple-100",  text: "text-purple-700",  label: "asset" },
  equity:    { bg: "bg-amber-100",   text: "text-amber-700",   label: "equity" },
  rent:      { bg: "bg-sky-100",     text: "text-sky-700",     label: "rent" },
}
