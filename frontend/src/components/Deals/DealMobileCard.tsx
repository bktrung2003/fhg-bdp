import { useNavigate } from "@tanstack/react-router"
import { ChevronRight, MapPin } from "lucide-react"

import type { DealPublic } from "@/client"

const STAGE_COLOR: Record<string, string> = {
  Lead: "bg-gray-100 text-gray-700",
  "NDA / Qualified": "bg-slate-100 text-slate-700",
  Feasibility: "bg-teal-100 text-teal-700",
  Proposal: "bg-blue-100 text-blue-700",
  Negotiation: "bg-indigo-100 text-indigo-700",
  "LOI Signed": "bg-violet-100 text-violet-700",
  "HMA Signed": "bg-emerald-100 text-emerald-700",
  "Pre-opening": "bg-amber-100 text-amber-700",
  Opened: "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-600",
}

function fmtMoney(v?: number | null): string | null {
  if (v == null) return null
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}

export function DealMobileCard({ deal }: { deal: DealPublic }) {
  const navigate = useNavigate()
  const stage = (deal as any).stage as string | undefined
  const dealType = (deal as any).deal_type as string | undefined
  const value = fmtMoney((deal as any).pipeline_value)
  const prob = (deal as any).probability as number | null
  const city = (deal as any).city as string | undefined
  const country = (deal as any).country as string | undefined

  return (
    <button
      type="button"
      onClick={() => navigate({ to: "/deals/$dealId" as any, params: { dealId: deal.id } })}
      className="w-full text-left rounded-lg border bg-card p-3 active:bg-muted/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-tight truncate">{deal.name}</p>
          {(city || country) && (
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {[city, country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mt-2">
        {stage && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STAGE_COLOR[stage] ?? "bg-gray-100 text-gray-600"}`}>
            {stage}
          </span>
        )}
        {dealType && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {dealType}
          </span>
        )}
      </div>

      {(value || prob != null) && (
        <div className="flex items-center gap-4 mt-2 text-xs">
          {value && (
            <div>
              <span className="text-muted-foreground">Value </span>
              <span className="font-semibold tabular-nums">{value}</span>
            </div>
          )}
          {prob != null && (
            <div>
              <span className="text-muted-foreground">Prob </span>
              <span className="font-semibold tabular-nums">{prob}%</span>
            </div>
          )}
        </div>
      )}
    </button>
  )
}
