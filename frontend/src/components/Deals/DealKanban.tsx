import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { useState } from "react"
import { ArrowRight, GripVertical } from "lucide-react"

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
  "Lead": "bg-gray-50 border-gray-200",
  "NDA / Qualified": "bg-blue-50 border-blue-200",
  "Feasibility": "bg-sky-50 border-sky-200",
  "Proposal": "bg-violet-50 border-violet-200",
  "Negotiation": "bg-orange-50 border-orange-200",
  "LOI Signed": "bg-yellow-50 border-yellow-200",
  "HMA Signed": "bg-emerald-50 border-emerald-200",
  "Pre-opening": "bg-teal-50 border-teal-200",
  "Opened": "bg-green-50 border-green-200",
  "Lost": "bg-red-50 border-red-200",
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtM = (n?: number | null) => n != null ? `$${(n / 1_000_000).toFixed(1)}M` : "—"
const dealNum = (n?: number | null) => n != null ? `FUS-${String(n).padStart(5, "0")}` : ""

function getAgeBadge(days?: number | null) {
  if (!days) return null
  if (days > 60) return { label: `${days}d`, class: "bg-red-100 text-red-600 font-bold" }
  if (days > 30) return { label: `${days}d`, class: "bg-amber-100 text-amber-700 font-semibold" }
  return { label: `${days}d`, class: "bg-muted text-muted-foreground" }
}

// ── Stage Change Dialog (with mandatory note) ────────────────────────────────

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

// ── Deal Card ─────────────────────────────────────────────────────────────────

function DealCard({ deal, onDragStart }: { deal: DealPublic; onDragStart: (deal: DealPublic) => void }) {
  const navigate = useNavigate()
  const ageBadge = getAgeBadge(deal.days_in_stage)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("dealId", deal.id)
        e.dataTransfer.effectAllowed = "move"
        onDragStart(deal)
      }}
      onClick={() => navigate({ to: "/deals/$dealId" as any, params: { dealId: deal.id } })}
      className={`group bg-card border rounded-lg p-3 cursor-pointer hover:shadow-md transition-all relative ${
        (deal.days_in_stage ?? 0) > 60 ? "border-red-300" :
        (deal.days_in_stage ?? 0) > 30 ? "border-amber-300" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="font-mono text-[10px] text-muted-foreground">{dealNum(deal.deal_number)}</p>
        {ageBadge && (
          <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${ageBadge.class}`}>
            {ageBadge.label}
          </span>
        )}
      </div>

      <p className="font-semibold text-sm leading-tight mb-1">{deal.name}</p>

      <div className="text-xs text-muted-foreground mb-2 truncate">
        {deal.city ?? deal.country} · {deal.owner_name ?? "—"}
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${RISK_DOT[deal.risk ?? "Green"]}`} />
          <span className="text-muted-foreground">{deal.keys ?? 0} keys</span>
        </div>
        <span className="font-semibold tabular-nums">{fmtM(deal.pipeline_value)}</span>
      </div>

      {deal.probability != null && (
        <div className="mt-1.5 flex items-center gap-1">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${deal.probability}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">
            {deal.probability}%
          </span>
        </div>
      )}

      <GripVertical className="absolute top-1.5 right-1.5 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

// ── Main Kanban ───────────────────────────────────────────────────────────────

export function DealKanban({ deals, stages }: Props) {
  const [draggedDeal, setDraggedDeal] = useState<DealPublic | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<{ deal: DealPublic; newStage: string } | null>(null)

  // Group deals by stage
  const dealsByStage: Record<string, DealPublic[]> = {}
  stages.forEach(s => { dealsByStage[s] = [] })
  deals.forEach(d => {
    const s = d.stage ?? "Lead"
    if (!dealsByStage[s]) dealsByStage[s] = []
    dealsByStage[s].push(d)
  })

  // Stats per column
  const colStats = (stageDeals: DealPublic[]) => {
    const count = stageDeals.length
    const value = stageDeals.reduce((s, d) => s + (d.pipeline_value ?? 0), 0)
    return { count, value }
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {stages.map((stage) => {
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
              className={`flex-shrink-0 w-[260px] rounded-xl border-2 ${STAGE_BG[stage] ?? "bg-gray-50 border-gray-200"} p-3 transition-all ${
                isOver ? "ring-2 ring-primary ring-offset-2" : ""
              }`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h3 className={`font-semibold text-xs uppercase tracking-wider ${STAGE_HEADER[stage] ?? "text-gray-700"}`}>
                    {stage}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                    {fmtM(value)}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold border tabular-nums">
                  {count}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 min-h-[60px]">
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

      {/* Stage change confirmation */}
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
