// Scoring Rubric — Layer 1 anti-subjectivity
// Each dimension has 5 levels with behavioral, evidence-based descriptions.
// Goal: 2 BDMs scoring the same deal converge within ±1 point.

export interface RubricLevel {
  score: 1 | 2 | 3 | 4 | 5
  headline: string
  detail: string  // What objective evidence supports this score
}

export interface DimensionRubric {
  key: string
  levels: RubricLevel[]
}

export const RUBRIC: Record<string, RubricLevel[]> = {
  location_score: [
    {
      score: 5,
      headline: "Premium destination, frictionless access",
      detail: "Tier-1 destination (Phú Quốc, Đà Nẵng, Hanoi, HCMC core). Direct international airport within 30 min drive or sea/lake-front prime site. Year-round demand: tourism + corporate + MICE. Walking distance to ≥5 demand generators.",
    },
    {
      score: 4,
      headline: "Strong location with minor friction",
      detail: "Tier-2 city or premium resort area (Nha Trang, Hội An, Đà Lạt). Airport 30–60 min drive, decent highway. 2+ demand segments active. Some seasonality but >7 months strong demand.",
    },
    {
      score: 3,
      headline: "Acceptable location, limited demand drivers",
      detail: "Tier-3 city or secondary resort. Airport 60–120 min. Single dominant demand segment (e.g. domestic leisure only). Seasonal: 4–6 strong months. Walkability limited.",
    },
    {
      score: 2,
      headline: "Weak location, structural challenges",
      detail: "Remote or declining destination. Airport >120 min or poor roads. One narrow demand segment with negative trend. Highly seasonal: ≤3 strong months. Few demand generators.",
    },
    {
      score: 1,
      headline: "Reject — fundamental location risk",
      detail: "Inaccessible, no real demand base, declining tourism arrivals, political/security concerns, or environmental risk (flooding, erosion).",
    },
  ],

  market_score: [
    {
      score: 5,
      headline: "Undersupplied, premium pricing power",
      detail: "Market ADR ≥$120, occupancy >70%, RevPAR YoY +10% (3-yr CAGR). Supply pipeline <10% of existing inventory. Strong & diverse demand generators. STR data available & supportive.",
    },
    {
      score: 4,
      headline: "Healthy market with pricing room",
      detail: "ADR $80–120, occupancy 60–70%, RevPAR YoY +3 to +10%. Supply pipeline 10–25%. Competitor set well-defined, our positioning has clear white space.",
    },
    {
      score: 3,
      headline: "Average market, neutral indicators",
      detail: "ADR $50–80, occupancy 55–65%, RevPAR flat or +/-3%. Supply pipeline 25–40% — meaningful new entry expected. Demand stable but not growing.",
    },
    {
      score: 2,
      headline: "Soft market, pricing pressure",
      detail: "ADR <$50 or occupancy <55%. RevPAR declining. Supply pipeline >40% — oversupply risk. Demand concentrated in 1–2 segments with downside risk.",
    },
    {
      score: 1,
      headline: "Saturated or collapsing market",
      detail: "Severe oversupply, ADR in race-to-bottom, occupancy <40%, no clear recovery path. Major demand driver disappearing (factory closing, route discontinued).",
    },
  ],

  owner_readiness_score: [
    {
      score: 5,
      headline: "Sophisticated, fully funded, decisive",
      detail: "Funding 100% committed (equity + bank LOI). Land title clean, no encumbrance. Owner has 3+ operating hotels or equivalent track record. Single decision-maker engaged. Timeline realistic & owner-driven.",
    },
    {
      score: 4,
      headline: "Capable owner, minor gaps",
      detail: "Funding 70%+ secured, gap clearly identified with credible plan. Land title clean. Owner has prior hospitality or large real estate experience. Decision chain 2–3 people, all engaged.",
    },
    {
      score: 3,
      headline: "Workable but needs hand-holding",
      detail: "Funding 50% secured, balance dependent on construction loan. Land title resolvable. First-time hotel owner but other business success. Decision needs board approval. Information patchy but obtainable.",
    },
    {
      score: 2,
      headline: "Risky — multiple structural issues",
      detail: "Funding <50%, equity partners not yet committed. Title issues exist (dispute, partial ownership). First-time owner with no real estate track record. Decision involves family politics. Slow responses, vague answers.",
    },
    {
      score: 1,
      headline: "Walk away",
      detail: "Funding speculative or fraudulent indicators. Title problems unfixable. Owner uncooperative, hostile, or making unrealistic demands. Communication breakdown.",
    },
  ],

  brand_fit_score: [
    {
      score: 5,
      headline: "Perfect brand match, fills white space",
      detail: "Proposed segment matches our brand pillar exactly. Key count within optimal range (150–250 for upscale). Room sizes meet/exceed brand standards. Facilities mix aligned. Market currently underserved by this brand tier.",
    },
    {
      score: 4,
      headline: "Strong fit, minor adjustments needed",
      detail: "Segment aligned. Key count slightly above/below sweet spot (acceptable). Room size meets minimums. 1–2 brand standards need design adjustments. Market accepts brand or sister brands present.",
    },
    {
      score: 3,
      headline: "Acceptable fit with conditions",
      detail: "Segment workable but not first-choice brand. Key count outside ideal (too small <100 or too large >400). Room sizes at minimum threshold. Multiple brand standards require negotiation or waivers.",
    },
    {
      score: 2,
      headline: "Stretched fit, major brand standard gaps",
      detail: "Segment misaligned (luxury site but upscale brand or vice versa). Significant brand standard non-compliance requires capex from owner. Market awareness of brand low or competitors entrenched.",
    },
    {
      score: 1,
      headline: "Brand mismatch — risks reputation",
      detail: "Wrong brand for site (would dilute brand positioning). Owner unwilling to meet brand standards. Existing brand presence already failing in that market.",
    },
  ],

  financial_score: [
    {
      score: 5,
      headline: "Tier-1 financial deal",
      detail: "Base fee 3%+ of revenue, incentive fee structure with achievable thresholds. Estimated annual fee >$1.5M at stabilization. Contract term ≥20 years. Ramp-up ≤24 months. Owner expectation aligned. TSA/centralized services fees in scope.",
    },
    {
      score: 4,
      headline: "Solid financial deal",
      detail: "Base fee 2.5–3%, incentive fee included. Estimated fee $800K–$1.5M. Term 15–20 years. Ramp-up 24–36 months. Owner pushback on 1–2 fee elements but negotiable.",
    },
    {
      score: 3,
      headline: "Average — meets minimum thresholds",
      detail: "Base fee 2–2.5%, incentive fee partial or below industry. Fee $400K–$800K. Term 10–15 years. Ramp-up 36 months. Owner expectations require active management.",
    },
    {
      score: 2,
      headline: "Below threshold — needs justification",
      detail: "Base fee <2%, no incentive fee. Estimated fee <$400K. Term <10 years. Long ramp-up >36 months. Strategic value only (brand presence in key market).",
    },
    {
      score: 1,
      headline: "Financially unviable",
      detail: "Owner expectation impossible (e.g. 1% base, no incentive, 5-year term). Project cost out of line with revenue potential. Fee won't cover overhead allocation.",
    },
  ],

  technical_score: [
    {
      score: 5,
      headline: "Design-ready, no rework",
      detail: "Detailed design 100% complete, signed off by all consultants. BOH, MEP, IT infrastructure conform to brand standards on first review. Room layouts optimal. All facilities planned and sized correctly.",
    },
    {
      score: 4,
      headline: "Minor design adjustments",
      detail: "Concept design 80%+ done. 2–3 brand standard items need refinement. BOH and MEP design needs minor tweaks. Room layouts mostly aligned. Conversion site: structural feasibility confirmed.",
    },
    {
      score: 3,
      headline: "Moderate redesign needed",
      detail: "Schematic design only. Multiple brand standards need addressing. BOH undersized, MEP needs upgrade. Some room types need re-planning. Conversion: significant capex on building shell.",
    },
    {
      score: 2,
      headline: "Major design overhaul required",
      detail: "Early concept, fundamental layout issues. BOH inadequate, MEP non-compliant. Room sizes below minimum. Conversion: structural changes needed (load-bearing walls, slab penetrations).",
    },
    {
      score: 1,
      headline: "Technically not viable",
      detail: "Site/building cannot meet brand standards without complete rebuild. Structural, fire, or MEP problems unfixable. Conversion shell unsuitable.",
    },
  ],
}
