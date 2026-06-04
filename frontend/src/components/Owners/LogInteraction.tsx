import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Plus } from "lucide-react"
import { useState } from "react"

import { OwnersService, type OwnerInteractionCreate } from "@/client"
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

interface Props { ownerId: string }

export function LogInteraction({ ownerId }: Props) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const today = new Date().toISOString().split("T")[0]
  const TYPES = useMasterData(MD.INTERACTION_TYPE)

  const { register, handleSubmit, reset, setValue } = useForm<{ type_s: string; date: string; note: string }>({
    defaultValues: { type_s: "Meeting", date: today },
  })

  const mutation = useMutation({
    mutationFn: (d: OwnerInteractionCreate) =>
      OwnersService.addInteraction({ id: ownerId, requestBody: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-interactions", ownerId] })
      qc.invalidateQueries({ queryKey: ["owners"] })
      showSuccessToast("Interaction logged.")
      reset({ type_s: "Meeting", date: today }); setOpen(false)
    },
  })

  const onSubmit = (d: any) => mutation.mutate({
    owner_id: ownerId,
    interaction_type: d.type_s,
    date: d.date,
    note: d.note || undefined,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5 mr-1" />Log Interaction
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Log Interaction</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select defaultValue="Meeting" onValueChange={v => setValue("type_s", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input {...register("date", { required: true })} type="date" />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input {...register("note")} placeholder="Summary of the interaction..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
