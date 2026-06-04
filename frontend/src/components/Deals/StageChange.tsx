import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { ArrowRight, GitBranch } from "lucide-react"
// ArrowRight used in stage progression display below
import { useState, useEffect } from "react"

import { DealsService, type DealPublic, type StageChangeRequest } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { MD, useMasterData } from "@/hooks/useMasterData"

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

interface FormFields { note: string; next_action: string }
interface Props { deal: DealPublic; size?: "icon" | "full" }

export function StageChange({ deal, size = "icon" }: Props) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const STAGES = useMasterData(MD.DEAL_STAGE)

  // Track new_stage as local state — cleaner than form integration
  const [newStage, setNewStage] = useState<string>("")

  // Reset ONLY when dialog opens (not on every STAGES array re-creation)
  useEffect(() => {
    if (open) {
      // pick first non-current stage as default — read STAGES at time of open
      const firstOther = STAGES.find(s => s !== deal.stage) ?? STAGES[0] ?? "Lead"
      setNewStage(firstOther)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deal.stage])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormFields>()

  const mutation = useMutation({
    mutationFn: (data: StageChangeRequest) =>
      DealsService.changeStage({ id: deal.id, requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] })
      queryClient.invalidateQueries({ queryKey: ["deal", deal.id] })
      queryClient.invalidateQueries({ queryKey: ["deal-audit", deal.id] })
      showSuccessToast(`Stage moved to "${newStage}".`)
      reset()
      setOpen(false)
    },
    onError: (err: any) => {
      const detail =
        err?.body?.detail ??
        err?.message ??
        "Failed to change stage."
      showErrorToast(typeof detail === "string" ? detail : "Failed to change stage.")
    },
  })

  const onSubmit = (data: FormFields) => {
    if (!newStage) {
      showErrorToast("Please select a new stage.")
      return
    }
    if (newStage === deal.stage) {
      showErrorToast("Deal is already in this stage.")
      return
    }
    mutation.mutate({
      new_stage: newStage as StageChangeRequest["new_stage"],
      note: data.note,
      next_action: data.next_action || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {size === "full" ? (
          <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary">
            <GitBranch className="h-3.5 w-3.5 mr-1.5" />
            Move Stage
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-primary hover:bg-primary/10 hover:text-primary"
            title="Move stage"
          >
            <GitBranch className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Stage</DialogTitle>
        </DialogHeader>

        {/* Current → New */}
        <div className="flex items-center gap-3 py-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLOR[deal.stage ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
            {deal.stage}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLOR[newStage] ?? "bg-gray-100 text-gray-600"}`}>
            {newStage}
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>New Stage</Label>
            <Select value={newStage} onValueChange={setNewStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.filter(s => s !== deal.stage).map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Moving..." : "Confirm Move"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
