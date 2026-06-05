import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, BookOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RecommendationBadge, type FeasibilityAssessmentPublic } from "./FeasibilityPanel"
import { RUBRIC } from "./rubric"

// ── Criteria definitions (Spec 14.2) ─────────────────────────────────────────

const PANELS = [
  {
    key: "location_score" as const,
    label: "Location",
    icon: "📍",
    criteria: [
      "Site location quality",
      "Accessibility",
      "Transportation links",
      "Distance to airport",
      "Tourism demand",
      "Corporate demand",
      "MICE demand",
      "Destination potential",
    ],
  },
  {
    key: "market_score" as const,
    label: "Market",
    icon: "📊",
    criteria: [
      "Market size",
      "Competitor set",
      "ADR potential",
      "Occupancy potential",
      "RevPAR potential",
      "Seasonality",
      "Supply pipeline",
      "Demand generators",
    ],
  },
  {
    key: "owner_readiness_score" as const,
    label: "Owner Readiness",
    icon: "🤝",
    criteria: [
      "Funding status",
      "Land legal status",
      "Owner track record",
      "Decision-making capability",
      "Timeline confidence",
      "Commitment level",
      "Quality of information",
      "Cooperation ability",
    ],
  },
  {
    key: "brand_fit_score" as const,
    label: "Brand Fit",
    icon: "🏷️",
    criteria: [
      "Proposed segment",
      "Key count",
      "Room size",
      "Facilities",
      "Brand positioning",
      "Market acceptance",
      "Brand white-space",
      "Ability to meet brand standards",
    ],
  },
  {
    key: "financial_score" as const,
    label: "Financial Attractiveness",
    icon: "💰",
    criteria: [
      "Estimated base fee",
      "Revenue projection",
      "GOP projection",
      "Contract term",
      "Ramp-up period",
      "Owner fee expectation",
      "Incentive fee potential",
      "TSA fee potential",
    ],
  },
  {
    key: "technical_score" as const,
    label: "Technical Readiness",
    icon: "🔧",
    criteria: [
      "Design status",
      "Construction status",
      "BOH layout",
      "MEP readiness",
      "IT infrastructure readiness",
      "Room layout",
      "Facility planning",
      "Conversion feasibility",
    ],
  },
]

const SCORE_LABELS = ["", "Very Weak", "Weak", "Average", "Good", "Very Good"]
const SCORE_COLORS = ["", "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"]

function computeTotal(scores: Record<string, number>): number {
  const vals = PANELS.map(p => scores[p.key]).filter(v => v >= 1 && v <= 5)
  if (vals.length === 0) return 0
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 20)
}

function computeRecommendation(total: number): string {
  if (total >= 80) return "Strong Proceed"
  if (total >= 65) return "Proceed"
  if (total >= 50) return "Proceed with Conditions"
  if (total >= 35) return "Nurture / Reassess"
  return "Reject"
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
  isSubmitting: boolean
  initial: FeasibilityAssessmentPublic | null
}

export function AssessFeasibilityModal({ open, onOpenChange, onSubmit, isSubmitting, initial }: Props) {
  const [scores, setScores] = useState<Record<string, number>>({})
  const [strengths, setStrengths] = useState("")
  const [concerns, setConcerns] = useState("")
  const [conditions, setConditions] = useState("")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (open) {
      // Pre-fill from current assessment if exists
      if (initial) {
        setScores({
          location_score: initial.location_score,
          market_score: initial.market_score,
          owner_readiness_score: initial.owner_readiness_score,
          brand_fit_score: initial.brand_fit_score,
          financial_score: initial.financial_score,
          technical_score: initial.technical_score,
        })
        setStrengths(initial.strengths ?? "")
        setConcerns(initial.concerns ?? "")
        setConditions(initial.conditions_to_proceed ?? "")
      } else {
        setScores({})
        setStrengths("")
        setConcerns("")
        setConditions("")
      }
      // Expand first panel by default
      setExpanded({ location_score: true })
    }
  }, [open, initial])

  const total = useMemo(() => computeTotal(scores), [scores])
  const recommendation = useMemo(() => computeRecommendation(total), [total])
  const allFilled = PANELS.every(p => scores[p.key] >= 1 && scores[p.key] <= 5)

  const handleSubmit = () => {
    if (!allFilled) return
    onSubmit({
      location_score: scores.location_score,
      market_score: scores.market_score,
      owner_readiness_score: scores.owner_readiness_score,
      brand_fit_score: scores.brand_fit_score,
      financial_score: scores.financial_score,
      technical_score: scores.technical_score,
      strengths: strengths.trim() || null,
      concerns: concerns.trim() || null,
      conditions_to_proceed: conditions.trim() || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {initial ? "Reassess Feasibility" : "Run Feasibility Assessment"}
          </DialogTitle>
        </DialogHeader>

        {/* Live total */}
        <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-card border-b flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-muted-foreground">
            Score each dimension <b className="text-foreground">1–5</b>. Total = average × 20.
          </div>
          {allFilled ? (
            <RecommendationBadge recommendation={recommendation} score={total} />
          ) : (
            <div className="text-xs text-amber-600 font-medium">
              {6 - Object.values(scores).filter(v => v >= 1).length} dimension(s) remaining
            </div>
          )}
        </div>

        {/* Panels */}
        <div className="space-y-2">
          {PANELS.map(panel => {
            const value = scores[panel.key] ?? 0
            const isExpanded = expanded[panel.key]
            return (
              <div key={panel.key} className="rounded-lg border bg-card">
                <button type="button"
                  onClick={() => setExpanded(e => ({ ...e, [panel.key]: !e[panel.key] }))}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="text-lg">{panel.icon}</span>
                  <span className="font-semibold text-sm flex-1 text-left">{panel.label}</span>
                  {value > 0 ? (
                    <span className={`text-xs font-bold text-white px-2 py-0.5 rounded ${SCORE_COLORS[value]}`}>
                      {value}/5 · {SCORE_LABELS[value]}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">Required</span>
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t space-y-3">
                    {/* Criteria to consider */}
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1.5">Criteria to consider:</p>
                      <ul className="text-xs grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                        {panel.criteria.map(c => <li key={c}>• {c}</li>)}
                      </ul>
                    </div>

                    {/* Scoring Guide / Rubric */}
                    <RubricGuide dimensionKey={panel.key} currentScore={value} />

                    {/* Score buttons */}
                    <div>
                      <Label className="text-xs">Score</Label>
                      <div className="flex gap-1.5 mt-1">
                        {[1, 2, 3, 4, 5].map(v => (
                          <button key={v} type="button"
                            onClick={() => setScores(s => ({ ...s, [panel.key]: v }))}
                            className={`flex-1 py-2 rounded text-xs font-semibold transition-all ${
                              value === v
                                ? `${SCORE_COLORS[v]} text-white ring-2 ring-offset-1 ring-current`
                                : "bg-muted/50 hover:bg-muted text-muted-foreground"
                            }`}>
                            <div>{v}</div>
                            <div className="text-[9px] font-medium opacity-90">{SCORE_LABELS[v]}</div>
                          </button>
                        ))}
                      </div>
                      {/* Show rubric for selected score */}
                      {value > 0 && RUBRIC[panel.key] && (
                        <div className={`mt-2 rounded-md ${SCORE_COLORS[value].replace("bg-", "border-").replace("500", "200")} border-l-4 bg-muted/30 px-3 py-2`}>
                          <p className="text-xs font-semibold">
                            {value}/5 · {RUBRIC[panel.key].find(r => r.score === value)?.headline}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                            {RUBRIC[panel.key].find(r => r.score === value)?.detail}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Governance text */}
        <div className="space-y-3 mt-4">
          <div>
            <Label className="text-xs flex items-center gap-1">✓ Strengths</Label>
            <textarea
              value={strengths} onChange={e => setStrengths(e.target.value)}
              rows={3} maxLength={4000}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="What makes this deal attractive? Standout factors..."
            />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">⚠ Concerns</Label>
            <textarea
              value={concerns} onChange={e => setConcerns(e.target.value)}
              rows={3} maxLength={4000}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Risks, red flags, weaknesses..."
            />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">📋 Conditions to Proceed</Label>
            <textarea
              value={conditions} onChange={e => setConditions(e.target.value)}
              rows={3} maxLength={4000}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Required milestones, owner commitments, structural changes before we move ahead..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={!allFilled || isSubmitting}
            title={!allFilled ? "Score all 6 dimensions first" : ""}>
            {isSubmitting ? "Saving..." : initial ? "Save New Version" : "Submit Assessment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Rubric Guide (collapsible) ───────────────────────────────────────────────

function RubricGuide({ dimensionKey, currentScore }: { dimensionKey: string; currentScore: number }) {
  const [open, setOpen] = useState(false)
  const levels = RUBRIC[dimensionKey]
  if (!levels) return null

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50/40">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 flex items-center gap-2 text-left">
        <BookOpen className="h-3.5 w-3.5 text-blue-700" />
        <span className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider">
          Scoring Guide — what each level means
        </span>
        <span className="ml-auto text-[10px] text-blue-700">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {[5, 4, 3, 2, 1].map(score => {
            const lvl = levels.find(l => l.score === score)
            if (!lvl) return null
            const isCurrent = currentScore === score
            return (
              <div key={score} className={`rounded p-2 text-[11px] ${isCurrent ? "bg-white border-2 border-blue-400" : "bg-white/60 border border-blue-100"}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${SCORE_COLORS[score]}`}>{score}/5</span>
                  <span className="font-semibold">{lvl.headline}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{lvl.detail}</p>
              </div>
            )
          })}
          <p className="text-[10px] text-blue-700 italic pt-1">
            💡 Pick the level whose criteria the deal most closely matches. If between two levels, pick the lower one (conservative principle).
          </p>
        </div>
      )}
    </div>
  )
}
