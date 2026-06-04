import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { useState } from "react"
import { ArrowRight, EyeOff, Eye } from "lucide-react"

import { DealsService, type DealPublic, type StageChangeRequest } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import useCustomToast from "@/hooks/useCustomToast"

interface Props {
  deals: DealPublic[]
  stages: string[]
}

// ── Color helpers ─────────────────────────────────────────────────────────────

const STAGE_BG: Record<string, string> = {
  "Lead": "bg-gray-50/70 border-gray-200",
  "NDA / Qualified": "bg-blue-50/70 border-blue-200",
  "Feasibility": "bg-sky-50/70 border-sky-200",
  "Proposal": "bg-violet-50/70 border-violet-200",
  "Negotiation": "bg-orange-50/70 border-orange-200",
  "LOI Signed": "bg-yellow-50/70 border-yellow-200",
  "HMA Signed": "bg-emerald-50/70 border-emerald-200",
  "Pre-opening": "bg-teal-50/70 border-teal-200",
  "Opened": "bg-green-50/70 border-green-200",
  "Lost": "bg-red-50/70 border-red-200",
}

const STAGE_HEADER: Record<string, string> = {
  "Lead": "text-gray-700",
  "NDA / Qualified": "text-blue-700",
  "Feasibility": "text-sky-700",
  "Proposal": "text-violet-700",
  "Negotiation": "text-orange-700",
  "LOI Signed": "text-yellow-800",
  "HMA Signed": "text-emerald-700",
  "Pre-opening": "text-teal-700",
  "Opened": "text-green-700",
  "Lost": "text-red-600",
}

const RISK_DOT: Record<string, string> = {
  Green: "bg-green-500", Amber: "bg-amber-400", Red: "bg-red-500",
}

const TERMINAL_STAGES = ["Lost", "Opened"]

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtM = (n?: number | null) => n != null ? `$${(n / 1_000_000).toFixed(1)}M` : "—"
const dealNum = (n?: number | null) => n != null ? `FUS-${String(n).padStart(5, "0")}` : ""

// ── Stage Change Dialog ──────────────────────────────────────────────────────

interface ChangeDialogProps {
  deal: DealPublic | null
  newStage: string
  onClose: () => void
}

function StageChangeDialog({ deal, newStage, onClose }: ChangeDialogProps) {
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ note: string; next_action: string }>()

  const mut = useMutation({
    mutationFn: (data: StageChangeRequest) =>
      DealsService.changeStage({ id: deal!.id, requestBody: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] })
      showSuccessToast(`Moved to "${newStage}".`)
      reset()
      onClose()
    },
  })

  if (!deal) return null

  return (
    <Dialog open={!!deal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move Stage</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-semibold">{deal.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{deal.country} · {deal.owner_name ?? "—"}</p>
        </div>

        <div className="flex items-center gap-3 py-1">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_HEADER[deal.stage ?? ""] ?? "text-gray-600"} bg-muted`}>
            {deal.stage}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_HEADER[newStage] ?? "text-gray-600"} bg-muted`}>
            {newStage}
          </span>
        </div>

        <form onSubmit={handleSubmit((d) => mut.mutate({
          new_stage: newStage as StageChangeRequest["new_stage"],
          note: d.note, next_action: d.next_action || undefined,
        }))} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Reason / Note <span className="text-red-500">*</span></Label>
            <Input
              {...register("note", { required: "A note is required for stage changes." })}
              placeholder="Why is this deal moving stage?"
              autoFocus
            />
            {errors.note && <p className="text-xs text-red-500">{errors.note.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Next Action</Label>
            <Input {...register("next_action")} placeholder="What happens next?" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Moving..." : "Confirm Move"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Compact Deal Card ─────────────────────────────────────────────────────────

function DealCard({ deal, onDragStart }: { deal: DealPublic; onDragStart: (deal: DealPublic) => void }) {
  const navigate = useNavigate()
  const days = deal.days_in_stage ?? 0
  const stuck = days > 60 ? "border-l-red-500 border-l-4" : days > 30 ? "border-l-amber-400 border-l-4" : ""

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("dealId", deal.id)
        e.dataTransfer.effectAllowed = "move"
        onDragStart(deal)
      }}
      onClick={() => navigate({ to: "/deals/$dealId" as any, params: { dealId: deal.id } })}
      className={`group bg-card border rounded-md p-2 cursor-pointer hover:shadow-sm transition-all ${stuck}`}
    >
      <div className="flex items-start gap-1.5 mb-1">
        <span className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${RISK_DOT[deal.risk ?? "Green"]}`} />
        <p className="font-semibold text-xs leading-tight line-clamp-2 flex-1">{deal.name}</p>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-1">
        <span className="font-mono truncate">{dealNum(deal.deal_number)}</span>
        <span className="font-semibold text-foreground tabular-nums">{fmtM(deal.pipeline_value)}</span>
      </div>

      {(deal.probability != null || days > 0) && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
          {deal.probability != null && (
            <span className="tabular-nums">{deal.probability}%</span>
          )}
          {days > 0 && (
            <span className={`tabular-nums ${days > 60 ? "text-red-600 font-semibold" : days > 30 ? "text-amber-600 font-semibold" : ""}`}>
              {days}d
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Kanban ───────────────────────────────────────────────────────────────

export function DealKanban({ deals, stages }: Props) {
  const [draggedDeal, setDraggedDeal] = useState<DealPublic | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<{ deal: DealPublic; newStage: string } | null>(null)

  // Show terminal stages (Lost/Opened) toggle — persisted
  const [showTerminal, setShowTerminal] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kanban:show-terminal") === "true"
    }
    return false
  })
  const toggleTerminal = () => {
    const next = !showTerminal
    setShowTerminal(next)
    localStorage.setItem("kanban:show-terminal", String(next))
  }

  // Group by stage
  const dealsByStage: Record<string, DealPublic[]> = {}
  stages.forEach(s => { dealsByStage[s] = [] })
  deals.forEach(d => {
    const s = d.stage ?? "Lead"
    if (!dealsByStage[s]) dealsByStage[s] = []
    dealsByStage[s].push(d)
  })

  // Filter stages — hide terminal if no deals AND not toggled on
  const visibleStages = stages.filter(s => {
    if (!TERMINAL_STAGES.includes(s)) return true
    if (showTerminal) return true
    return (dealsByStage[s] ?? []).length > 0
  })

  const hiddenTerminalCount = TERMINAL_STAGES.filter(
    s => !visibleStages.includes(s)
  ).length

  const colStats = (stageDeals: DealPublic[]) => {
    const count = stageDeals.length
    const value = stageDeals.reduce((sum, d) => sum + (d.pipeline_value ?? 0), 0)
    return { count, value }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">
          Drag cards between columns · {visibleStages.length} stages shown
        </p>
        {hiddenTerminalCount > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleTerminal}>
            {showTerminal
              ? <><EyeOff className="h-3 w-3 mr-1" />Hide terminal stages</>
              : <><Eye className="h-3 w-3 mr-1" />Show {hiddenTerminalCount} terminal stage{hiddenTerminalCount > 1 ? "s" : ""}</>}
          </Button>
        )}
      </div>

      {/* Kanban columns */}
      <div className="flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: "thin" }}>
        {visibleStages.map((stage) => {
          const stageDeals = dealsByStage[stage] ?? []
          const { count, value } = colStats(stageDeals)
          const isOver = dragOverStage === stage

          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
                setDragOverStage(stage)
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverStage(null)
                if (draggedDeal && draggedDeal.stage !== stage) {
                  setPendingMove({ deal: draggedDeal, newStage: stage })
                }
                setDraggedDeal(null)
              }}
              className={`flex-shrink-0 w-[230px] rounded-lg border ${STAGE_BG[stage] ?? "bg-gray-50/70 border-gray-200"} transition-all flex flex-col ${
                isOver ? "ring-2 ring-primary ring-offset-1" : ""
              }`}
              style={{ maxHeight: "calc(100vh - 280px)" }}
            >
              {/* Sticky column header */}
              <div className="sticky top-0 flex items-center justify-between px-2.5 py-2 border-b border-current/10 backdrop-blur bg-inherit rounded-t-lg z-10">
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold text-[11px] uppercase tracking-wider truncate ${STAGE_HEADER[stage] ?? "text-gray-700"}`}>
                    {stage}
                  </h3>
                  <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                    {fmtM(value)}
                  </p>
                </div>
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold border tabular-nums flex-shrink-0 ml-1">
                  {count}
                </span>
              </div>

              {/* Cards — own scroll */}
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 min-h-[80px]" style={{ scrollbarWidth: "thin" }}>
                {stageDeals.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-4 italic">
                    Drop deals here
                  </p>
                ) : (
                  stageDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onDragStart={setDraggedDeal}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {pendingMove && (
        <StageChangeDialog
          deal={pendingMove.deal}
          newStage={pendingMove.newStage}
          onClose={() => setPendingMove(null)}
        />
      )}
    </>
  )
}
