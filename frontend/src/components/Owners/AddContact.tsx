import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Plus } from "lucide-react"
import { useState } from "react"

import { OwnersService, type OwnerContactCreate } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import useCustomToast from "@/hooks/useCustomToast"

const FUSION_ROLES = ["CEO","COO","BD Director","BD Director VN","BD Director TH","BD Director APAC","BD Manager","Legal","Finance","IT Admin"]
const STRENGTHS = ["New","Warm","Strong"]

interface Props { ownerId: string }

export function AddContact({ ownerId }: Props) {
  const [open, setOpen] = useState(false)
  const [senior, setSenior] = useState(false)
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const { register, handleSubmit, reset, setValue } = useForm<any>({
    defaultValues: { strength_s: "New" },
  })

  const mutation = useMutation({
    mutationFn: (d: OwnerContactCreate) =>
      OwnersService.addContact({ id: ownerId, requestBody: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-contacts", ownerId] })
      showSuccessToast("Contact added.")
      reset({ strength_s: "New" })
      setSenior(false)
      setOpen(false)
    },
  })

  const onSubmit = (d: any) => mutation.mutate({
    owner_id: ownerId,
    fusion_role: d.fusion_role,
    owner_contact: d.owner_contact,
    strength: d.strength_s,
    last_met: d.last_met || undefined,
    senior_flag: senior,
    note: d.note || undefined,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5 mr-1" />Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fusion Role *</Label>
              <Select onValueChange={v => setValue("fusion_role", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {FUSION_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner Contact *</Label>
              <Input {...register("owner_contact", { required: true })} placeholder="e.g. Owner Chairman" />
            </div>
            <div className="space-y-1.5">
              <Label>Strength</Label>
              <Select defaultValue="New" onValueChange={v => setValue("strength_s", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STRENGTHS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Last Met</Label>
              <Input {...register("last_met")} type="date" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input {...register("note")} placeholder="e.g. Quarterly strategic catch-up" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="senior"
              checked={senior}
              onCheckedChange={v => setSenior(v === true)}
            />
            <label htmlFor="senior" className="text-sm cursor-pointer">
              C-Suite involvement <span className="text-muted-foreground">(mark as senior contact)</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
