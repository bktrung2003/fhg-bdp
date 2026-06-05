import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ClipboardCheck, Sparkles, History, ShieldCheck, AlertCircle, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { OpenAPI } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import { AssessFeasibilityModal } from "./AssessFeasibilityModal"
import { ReviewFeasibilityModal } from "./ReviewFeasibilityModal"
import { EditNotesModal } from "./EditNotesModal"

// ── Types (kept local since they may not be in generated client yet) ─────────

export interface FeasibilityAssessmentPublic {
  id: string
  deal_id: string
  location_score: number
  market_score: number
  owner_readiness_score: number
  brand_fit_score: number
  financial_score: number
  technical_score: number
  total_score: number
  recommendation: string
  strengths: string | null
  concerns: string | null
  competitive_landscape: string | null
  deal_killers: string | null
  conditions_to_proceed: string | null
  version: number
  is_current: boolean
  assessed_by_id: string
  assessed_by_name: string | null
  assessed_at: string | null
  reviewed_by_id: string | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  review_note: string | null
}

const REC_STYLE: Record<string, { bg: string; text: string; ring: string; icon: string }> = {
  "Strong Proceed":          { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-300", icon: "🚀" },
  "Proceed":                 { bg: "bg-green-50",   text: "text-green-700",   ring: "ring-green-300",   icon: "✅" },
  "Proceed with Conditions": { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-300",   icon: "⚠️" },
  "Nurture / Reassess":      { bg: "bg-yellow-50",  text: "text-yellow-800",  ring: "ring-yellow-300",  icon: "🌱" },
  "Reject":                  { bg: "bg-red-50",     text: "text-red-700",     ring: "ring-red-300",     icon: "🚫" },
}

const DIMENSIONS = [
  { key: "location_score" as const,         label: "Location" },
  { key: "market_score" as const,           label: "Market" },
  { key: "owner_readiness_score" as const,  label: "Owner Readiness" },
  { key: "brand_fit_score" as const,        label: "Brand Fit" },
  { key: "financial_score" as const,        label: "Financial" },
  { key: "technical_score" as const,        label: "Technical" },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchCurrent(dealId: string): Promise<FeasibilityAssessmentPublic | null> {
  const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN({} as any) : OpenAPI.TOKEN
  const res = await fetch(`${OpenAPI.BASE}/api/v1/deals/${dealId}/feasibility`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function fetchHistory(dealId: string): Promise<{ data: FeasibilityAssessmentPublic[]; count: number }> {
  const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN({} as any) : OpenAPI.TOKEN
  const res = await fetch(`${OpenAPI.BASE}/api/v1/deals/${dealId}/feasibility/history`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── Radar Chart (pure SVG, no extra dep) ─────────────────────────────────────

function RadarChart({ scores }: { scores: number[] }) {
  // scores: 6 values 1-5
  const size = 260
  const cx = size / 2
  const cy = size / 2
  const radius = 95
  const labels = DIMENSIONS.map(d => d.label)

  // 6 axes evenly spaced; start from top (-90°)
  const axisPoints = (val: number, idx: number) => {
    const angle = (Math.PI * 2 * idx) / 6 - Math.PI / 2
    const r = (val / 5) * radius
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const
  }

  const gridLevels = [1, 2, 3, 4, 5]
  const polygon = scores.map((s, i) => axisPoints(s, i).join(",")).join(" ")

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-[280px]">
      {/* Concentric grid */}
      {gridLevels.map(level => {
        const pts = Array.from({ length: 6 }, (_, i) => axisPoints(level, i).join(",")).join(" ")
        return <polygon key={level} points={pts} fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
      })}
      {/* Axes */}
      {labels.map((_, i) => {
        const [x, y] = axisPoints(5, i)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
      })}
      {/* Data polygon */}
      <polygon points={polygon} fill="rgb(59,130,246)" fillOpacity="0.25" stroke="rgb(37,99,235)" strokeWidth="1.5" />
      {/* Data points */}
      {scores.map((s, i) => {
        const [x, y] = axisPoints(s, i)
        return <circle key={i} cx={x} cy={y} r="3" fill="rgb(37,99,235)" />
      })}
      {/* Labels */}
      {labels.map((lbl, i) => {
        const [x, y] = axisPoints(5.9, i)
        const score = scores[i]
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-foreground font-medium">
            <tspan x={x} dy={0}>{lbl}</tspan>
            <tspan x={x} dy={10} className="fill-muted-foreground font-bold">{score}/5</tspan>
          </text>
        )
      })}
    </svg>
  )
}

// ── Recommendation Badge ─────────────────────────────────────────────────────

export function RecommendationBadge({ recommendation, score }: { recommendation: string; score: number }) {
  const style = REC_STYLE[recommendation] ?? { bg: "bg-gray-100", text: "text-gray-700", ring: "ring-gray-300", icon: "—" }
  return (
    <div className={`inline-flex items-center gap-2 rounded-lg ${style.bg} ${style.text} ring-1 ${style.ring} px-3 py-1.5`}>
      <span className="text-lg leading-none">{style.icon}</span>
      <div className="leading-tight">
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Recommendation</div>
        <div className="text-sm font-bold">{recommendation} · {score}/100</div>
      </div>
    </div>
  )
}

// ── Main Panel ───────────────────────────────────────────────────────────────

interface Props { dealId: string; currentUserId: string }

export function FeasibilityPanel({ dealId, currentUserId }: Props) {
  const qc = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [assessOpen, setAssessOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [editNotesOpen, setEditNotesOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const { data: current, isLoading } = useQuery({
    queryKey: ["feasibility-current", dealId],
    queryFn: () => fetchCurrent(dealId),
  })

  const { data: history } = useQuery({
    queryKey: ["feasibility-history", dealId],
    queryFn: () => fetchHistory(dealId),
    enabled: historyOpen,
  })

  const submitMut = useMutation({
    mutationFn: async (body: any) => {
      const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN({} as any) : OpenAPI.TOKEN
      const res = await fetch(`${OpenAPI.BASE}/api/v1/deals/${dealId}/feasibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feasibility-current", dealId] })
      qc.invalidateQueries({ queryKey: ["feasibility-history", dealId] })
      qc.invalidateQueries({ queryKey: ["deal", dealId] })
      qc.invalidateQueries({ queryKey: ["deal-audit", dealId] })
      qc.invalidateQueries({ queryKey: ["deals"] })
      showSuccessToast("Feasibility assessment saved.")
      setAssessOpen(false)
    },
    onError: () => showErrorToast("Failed to save assessment."),
  })

  const reviewMut = useMutation({
    mutationFn: async ({ assessmentId, note }: { assessmentId: string; note: string }) => {
      const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN({} as any) : OpenAPI.TOKEN
      const res = await fetch(`${OpenAPI.BASE}/api/v1/deals/${dealId}/feasibility/${assessmentId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ review_note: note }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feasibility-current", dealId] })
      qc.invalidateQueries({ queryKey: ["feasibility-history", dealId] })
      qc.invalidateQueries({ queryKey: ["deal-audit", dealId] })
      showSuccessToast("Review recorded.")
      setReviewOpen(false)
    },
    onError: (e: any) => showErrorToast(e?.message ?? "Failed to review."),
  })

  const editNotesMut = useMutation({
    mutationFn: async (notes: any) => {
      const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN({} as any) : OpenAPI.TOKEN
      const res = await fetch(`${OpenAPI.BASE}/api/v1/deals/${dealId}/feasibility/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(notes),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feasibility-current", dealId] })
      qc.invalidateQueries({ queryKey: ["deal-audit", dealId] })
      showSuccessToast("Notes updated (no version bump).")
      setEditNotesOpen(false)
    },
    onError: () => showErrorToast("Failed to update notes."),
  })

  const scores = useMemo(() => current ? DIMENSIONS.map(d => (current as any)[d.key] as number) : [], [current])
  const canReview = !!current && !current.reviewed_by_id && current.assessed_by_id !== currentUserId

  if (isLoading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading feasibility...</div>
  }

  // Empty state
  if (!current) {
    return (
      <div className="rounded-lg border-2 border-dashed bg-card p-8 text-center">
        <ClipboardCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-base">No Feasibility Assessment yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Score 6 dimensions (Location, Market, Owner, Brand, Financial, Technical) to get an
          industry-standard go / no-go recommendation.
        </p>
        <Button className="mt-4" onClick={() => setAssessOpen(true)}>
          <Sparkles className="h-4 w-4 mr-1.5" />Run First Assessment
        </Button>
        <AssessFeasibilityModal
          open={assessOpen}
          onOpenChange={setAssessOpen}
          onSubmit={(d) => submitMut.mutate(d)}
          isSubmitting={submitMut.isPending}
          initial={null}
        />
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base">Feasibility Assessment</h3>
          <RecommendationBadge recommendation={current.recommendation} score={current.total_score} />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setHistoryOpen(o => !o)}>
            <History className="h-3.5 w-3.5 mr-1" />History ({history?.count ?? "..."})
          </Button>
          {canReview && (
            <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              onClick={() => setReviewOpen(true)}>
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />Review &amp; Sign-off
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setEditNotesOpen(true)}
            title="Edit text notes only — no new version">
            <Pencil className="h-3.5 w-3.5 mr-1" />Edit Notes
          </Button>
          <Button size="sm" onClick={() => setAssessOpen(true)}>
            <Sparkles className="h-3.5 w-3.5 mr-1" />Reassess
          </Button>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mb-4">
        <span>v{current.version}</span>
        <span>·</span>
        <span>Assessed by <b className="text-foreground">{current.assessed_by_name ?? "—"}</b></span>
        <span>{current.assessed_at ? new Date(current.assessed_at).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : ""}</span>
        {current.reviewed_by_id ? (
          <>
            <span>·</span>
            <span className="text-emerald-700 font-medium">✓ Reviewed by {current.reviewed_by_name}</span>
          </>
        ) : (
          <span className="text-amber-700 font-medium">⚠ Awaiting review (2-eyes)</span>
        )}
      </div>

      {/* Body: radar + scores */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
        <div className="flex justify-center">
          <RadarChart scores={scores} />
        </div>
        <div className="space-y-2">
          {DIMENSIONS.map((d, i) => {
            const v = scores[i]
            const pct = (v / 5) * 100
            return (
              <div key={d.key} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{d.label}</span>
                  <span className="tabular-nums text-muted-foreground">{v}/5</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      v >= 4 ? "bg-emerald-500" : v >= 3 ? "bg-blue-500" : v >= 2 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* BD Strategic Notes — 5 blocks */}
      <div className="mt-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          BD Strategic Notes
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <NoteBlock title="Strengths" tone="emerald" icon="✓" text={current.strengths} />
          <NoteBlock title="Concerns"  tone="amber"   icon="⚠" text={current.concerns} />
          <NoteBlock title="Competitive Landscape" tone="purple" icon="🥊" text={current.competitive_landscape} />
          <NoteBlock title="Deal Killers / Red Flags" tone="red" icon="🚫" text={current.deal_killers} />
        </div>
        <div className="mt-3">
          <NoteBlock title="Conditions to Proceed" tone="blue" icon="📋" text={current.conditions_to_proceed} />
        </div>
      </div>

      {/* History drawer */}
      {historyOpen && history && history.data.length > 1 && (
        <div className="mt-5 border-t pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Version History</h4>
          <div className="space-y-1">
            {history.data.map(h => (
              <div key={h.id} className="grid grid-cols-[60px_100px_1fr_140px] gap-3 text-xs py-1.5 border-b last:border-0">
                <span className="font-mono">v{h.version}</span>
                <span className="font-medium">{h.total_score}/100</span>
                <span>{h.recommendation}</span>
                <span className="text-muted-foreground text-right">
                  {h.assessed_by_name} · {h.assessed_at ? new Date(h.assessed_at).toLocaleDateString("en-GB", { day:"2-digit", month:"short" }) : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AssessFeasibilityModal
        open={assessOpen}
        onOpenChange={setAssessOpen}
        onSubmit={(d) => submitMut.mutate(d)}
        isSubmitting={submitMut.isPending}
        initial={current}
      />
      {current && (
        <ReviewFeasibilityModal
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          onSubmit={(note) => reviewMut.mutate({ assessmentId: current.id, note })}
          isSubmitting={reviewMut.isPending}
        />
      )}
      {current && (
        <EditNotesModal
          open={editNotesOpen}
          onOpenChange={setEditNotesOpen}
          initial={current}
          onSubmit={(notes) => editNotesMut.mutate(notes)}
          isSubmitting={editNotesMut.isPending}
        />
      )}
    </div>
  )
}

function NoteBlock({
  title, tone, icon, text,
}: {
  title: string
  tone: "emerald" | "amber" | "blue" | "purple" | "red"
  icon: string
  text: string | null
}) {
  const styles = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
    amber:   "bg-amber-50   border-amber-200   text-amber-900",
    blue:    "bg-blue-50    border-blue-200    text-blue-900",
    purple:  "bg-purple-50  border-purple-200  text-purple-900",
    red:     "bg-red-50     border-red-200     text-red-900",
  }[tone]
  return (
    <div className={`rounded-lg border ${styles} p-3`}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
        <span>{icon}</span>{title}
      </div>
      {text ? (
        <p className="text-xs whitespace-pre-wrap leading-relaxed">{text}</p>
      ) : (
        <p className="text-xs italic opacity-60 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Not provided</p>
      )}
    </div>
  )
}
