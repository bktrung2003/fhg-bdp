import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { ArrowRight } from "lucide-react"
import { useState } from "react"

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

interface FormData { new_stage: string; note: string; next_action: string }
interface Props { deal: DealPublic }

export function StageChange({ deal }: Props) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const STAGES = useMasterData(MD.DEAL_STAGE)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } =
    useForm<FormData>({ defaultValues: { new_stage: deal.stage ?? "Lead" } })

  const selectedStage = watch("new_stage")

  const mutation = useMutation({
    mutationFn: (data: StageChangeRequest) =>
      DealsService.changeStage({ id: deal.id, requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] })
      showSuccessToast(`Stage moved to "${selectedStage}".`)
      reset()
      setOpen(false)
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      new_stage: data.new_stage as StageChangeRequest["new_stage"],
      note: data.note,
      next_action: data.next_action || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
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
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLOR[selectedStage] ?? "bg-gray-100 text-gray-600"}`}>
            {selectedStage}
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>New Stage</Label>
            <Select
              defaultValue={deal.stage ?? "Lead"}
              onValueChange={(v) => setValue("new_stage", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.filter(s => s !== deal.stage).map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Reason / Note <span className="text-red-500">*</span>
            </Label>
            <Input
              {...register("note", { required: "A note is required for stage changes." })}
              placeholder="Why is this deal moving stage?"
            />
            {errors.note && (
              <p className="text-xs text-red-500">{errors.note.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Next Action</Label>
            <Input
              {...register("next_action")}
              placeholder="What happens next?"
            />
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
