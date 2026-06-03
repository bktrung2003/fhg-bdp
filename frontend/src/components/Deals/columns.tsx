import type { ColumnDef } from "@tanstack/react-table"
import { useNavigate } from "@tanstack/react-router"
import type { DealPublic } from "@/client"
import { EditDeal } from "./EditDeal"
import { DeleteDeal } from "./DeleteDeal"
import { StageChange } from "./StageChange"

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function fmtMoney(v: number | null | undefined) {
  if (v == null) return "—"
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}

function dealNumber(n: number | null | undefined) {
  if (n == null) return "—"
  return `FUS-${String(n).padStart(5, "0")}`
}

// ── Stage badge ───────────────────────────────────────────────────────────────

const STAGE_COLOR: Record<string, string> = {
  "Lead":           "bg-gray-100 text-gray-700",
  "NDA / Qualified":"bg-blue-100 text-blue-700",
  "Feasibility":    "bg-sky-100 text-sky-700",
  "Proposal":       "bg-violet-100 text-violet-700",
  "Negotiation":    "bg-orange-100 text-orange-700",
  "LOI Signed":     "bg-yellow-100 text-yellow-800",
  "HMA Signed":     "bg-emerald-100 text-emerald-700",
  "Pre-opening":    "bg-teal-100 text-teal-700",
  "Opened":         "bg-green-100 text-green-700",
  "Lost":           "bg-red-100 text-red-600",
}

function StageBadge({ stage }: { stage?: string }) {
  const cls = STAGE_COLOR[stage ?? ""] ?? "bg-gray-100 text-gray-600"
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {stage ?? "—"}
    </span>
  )
}

// ── Risk dot ──────────────────────────────────────────────────────────────────

const RISK_COLOR: Record<string, string> = {
  Green: "bg-green-500",
  Amber: "bg-amber-400",
  Red:   "bg-red-500",
}

function RiskDot({ risk }: { risk?: string }) {
  const cls = RISK_COLOR[risk ?? ""] ?? "bg-gray-300"
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cls}`} />
      <span className="text-sm text-muted-foreground">{risk ?? "—"}</span>
    </span>
  )
}

// ── Deal name cell (clickable → workspace) ────────────────────────────────────

function DealNameCell({ deal }: { deal: DealPublic }) {
  const navigate = useNavigate()
  return (
    <div
      className="min-w-[180px] cursor-pointer group"
      onClick={() => navigate({ to: "/deals/$dealId" as any, params: { dealId: deal.id } })}
    >
      <p className="font-semibold text-sm leading-tight text-primary group-hover:underline">{deal.name}</p>
      {deal.project_type && (
        <p className="text-xs text-muted-foreground mt-0.5">{deal.project_type}</p>
      )}
    </div>
  )
}

// ── Column definitions ────────────────────────────────────────────────────────

export const dealColumns: ColumnDef<DealPublic>[] = [
  {
    id: "deal_number",
    header: "Record #",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {dealNumber(row.original.deal_number)}
      </span>
    ),
  },
  {
    id: "updated_at",
    header: "Modified",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {fmtDate(row.original.updated_at)}
      </span>
    ),
  },
  {
    id: "owner_name",
    header: "Developer / Owner",
    cell: ({ row }) => (
      <span className="font-medium text-sm">
        {row.original.owner_name ?? <span className="text-muted-foreground">—</span>}
      </span>
    ),
  },
  {
    id: "name",
    header: "Project Name",
    cell: ({ row }) => <DealNameCell deal={row.original} />,
  },
  {
    id: "probability",
    header: "Prob.",
    cell: ({ row }) => {
      const p = row.original.probability
      return (
        <span className="text-sm font-medium tabular-nums">
          {p != null ? `${p}%` : "—"}
        </span>
      )
    },
  },
  {
    id: "country",
    header: "Country",
    cell: ({ row }) => (
      <div>
        <p className="text-sm">{row.original.country}</p>
        {row.original.region && (
          <p className="text-xs text-muted-foreground">{row.original.region}</p>
        )}
      </div>
    ),
  },
  {
    id: "keys",
    header: "Keys",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {row.original.keys ?? "—"}
      </span>
    ),
  },
  {
    id: "stage",
    header: "Deal Status",
    cell: ({ row }) => <StageBadge stage={row.original.stage} />,
  },
  {
    id: "risk",
    header: "Risk",
    cell: ({ row }) => <RiskDot risk={row.original.risk} />,
  },
  {
    id: "bd_owner",
    header: "Dev. Lead",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.bd_owner_name ?? <span className="text-muted-foreground">—</span>}
      </span>
    ),
  },
  {
    id: "pipeline_value",
    header: "Pipeline Value",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums font-medium">
        {fmtMoney(row.original.pipeline_value)}
      </span>
    ),
  },
  {
    id: "opening_target",
    header: "Opening",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {row.original.opening_target ?? "—"}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex items-center gap-0.5">
        <StageChange deal={row.original} />
        <EditDeal deal={row.original} />
        <DeleteDeal deal={row.original} />
      </div>
    ),
  },
]
