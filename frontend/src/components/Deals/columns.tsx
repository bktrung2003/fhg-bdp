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
  const projectName = (deal as any).project_name as string | undefined
  // Only show the project line if deal name doesn't already contain it
  // Normalize Unicode (NFC) + trim + lowercase to handle Vietnamese diacritics
  const norm = (s: string) => s.normalize("NFC").trim().toLowerCase()
  const showProjectLine =
    projectName &&
    !norm(deal.name).includes(norm(projectName))

  return (
    <div
      className="min-w-[200px] cursor-pointer group"
      onClick={() => navigate({ to: "/deals/$dealId" as any, params: { dealId: deal.id } })}
    >
      <p className="font-semibold text-sm leading-tight text-primary group-hover:underline">{deal.name}</p>
      {showProjectLine && (
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">📁 {projectName}</p>
      )}
      {deal.project_type && (
        <p className="text-[10px] text-muted-foreground">{deal.project_type}</p>
      )}
    </div>
  )
}

function projectIdFmt(n?: number | null) {
  return n != null ? `FUS-P-${String(n).padStart(5, "0")}` : "—"
}

// Project ID cell → click → /projects/{id}
function ProjectIdCell({ deal }: { deal: DealPublic }) {
  const navigate = useNavigate()
  const projectId = (deal as any).project_id
  const projectNumber = (deal as any).project_number
  if (!projectId) {
    return <span className="font-mono text-xs text-muted-foreground">—</span>
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigate({ to: "/projects/$projectId" as any, params: { projectId } }) }}
      className="font-mono text-xs text-primary hover:underline cursor-pointer"
      title="Open project"
    >
      {projectIdFmt(projectNumber)}
    </button>
  )
}

// Owner name cell → click → /owners/{ownerId}
function OwnerNameCell({ deal }: { deal: DealPublic }) {
  const navigate = useNavigate()
  const ownerId = (deal as any).owner_id
  if (!deal.owner_name) {
    return <span className="text-muted-foreground text-sm">—</span>
  }
  if (!ownerId) {
    return <span className="font-medium text-sm">{deal.owner_name}</span>
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigate({ to: "/owners/$ownerId" as any, params: { ownerId } }) }}
      className="font-medium text-sm text-primary hover:underline cursor-pointer text-left"
      title="Open owner profile"
    >
      {deal.owner_name}
    </button>
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
    cell: ({ row }) => <OwnerNameCell deal={row.original} />,
  },
  {
    id: "project_id",
    header: "Project ID",
    cell: ({ row }) => <ProjectIdCell deal={row.original} />,
  },
  {
    id: "name",
    header: "Deal",
    cell: ({ row }) => <DealNameCell deal={row.original} />,
  },
  {
    id: "deal_type",
    header: "Type",
    cell: ({ row }) => {
      const t = (row.original as any).deal_type ?? "HMA"
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold bg-purple-100 text-purple-700 whitespace-nowrap">
          {t}
        </span>
      )
    },
  },
  {
    id: "probability",
    header: "Prob.",
    cell: ({ row }) => {
      const p = row.original.probability
      const source = (row.original as any).probability_source
      if (p == null) return <span className="text-muted-foreground">—</span>
      return (
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium tabular-nums">{p}%</span>
          {source === "manual" && (
            <span title="Manually overridden" className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1 rounded">M</span>
          )}
        </div>
      )
    },
  },
  {
    id: "feasibility_score",
    header: "Feasibility",
    cell: ({ row }) => {
      const s = (row.original as any).feasibility_score as number | null
      const rec = (row.original as any).feasibility_recommendation as string | null
      const reviewed = (row.original as any).feasibility_reviewed as boolean
      if (s == null) return <span className="text-muted-foreground text-xs">Not assessed</span>
      const cls =
        s >= 80 ? "bg-emerald-100 text-emerald-700" :
        s >= 65 ? "bg-green-100 text-green-700" :
        s >= 50 ? "bg-amber-100 text-amber-700" :
        s >= 35 ? "bg-yellow-100 text-yellow-800" :
        "bg-red-100 text-red-600"
      return (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${cls} whitespace-nowrap`} title={rec ?? undefined}>
              {s}/100
            </span>
            {reviewed && <span title="Reviewed (2-eyes)" className="text-emerald-600 text-xs">✓</span>}
          </div>
          {rec && <span className="text-[9px] text-muted-foreground truncate max-w-[110px]">{rec}</span>}
        </div>
      )
    },
  },
  {
    id: "country",
    header: "Country",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.country}</span>
    ),
  },
  {
    id: "region",
    header: "Region",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {row.original.region ?? "—"}
      </span>
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
    header: () => <span className="text-[10.5px] font-semibold uppercase tracking-wider">Actions</span>,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-0.5">
        <StageChange deal={row.original} />
        <EditDeal deal={row.original} />
        <DeleteDeal deal={row.original} />
      </div>
    ),
  },
]
