import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Pencil } from "lucide-react"
import { useEffect, useState } from "react"

import { OwnersService, type OwnerPublic, type OwnerUpdate } from "@/client"
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

const PRIORITIES = ["Strategic","High","Medium","Low"]
const HEALTH = ["Strong","Moderate","Unknown"]

interface Props { owner: OwnerPublic; trigger?: React.ReactNode }

export function EditOwner({ owner, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const TYPES = useMasterData(MD.OWNER_TYPE)
  const RELATIONSHIPS = useMasterData(MD.OWNER_RELATIONSHIP)
  const CATCHUPS = useMasterData(MD.CATCHUP_STATUS)
  const COUNTRIES = useMasterData(MD.COUNTRY)

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } =
    useForm<OwnerUpdate>()

  useEffect(() => {
    if (open) reset({
      company: owner.company,
      country: owner.country,
      next_catchup: owner.next_catchup ?? undefined,
      assets: owner.assets ?? undefined,
      strategic_value: owner.strategic_value ?? undefined,
    })
  }, [open, owner, reset])

  const mutation = useMutation({
    mutationFn: (d: OwnerUpdate) => OwnersService.updateOwner({ id: owner.id, requestBody: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owners"] })
      showSuccessToast("Owner updated.")
      setOpen(false)
    },
  })

  const onSubmit = (d: OwnerUpdate) => mutation.mutate(d)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit — {owner.company}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Company Name</Label>
              <Input {...register("company")} />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select defaultValue={owner.country ?? ""} onValueChange={v => setValue("country", v)}>
                <SelectTrigger><SelectValue placeholder="Select country..." /></SelectTrigger>
                <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner Type</Label>
              <Select defaultValue={owner.owner_type ?? "Developer"} onValueChange={v => setValue("owner_type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select defaultValue={owner.priority ?? "Medium"} onValueChange={v => setValue("priority", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Relationship</Label>
              <Select defaultValue={owner.relationship ?? "New"} onValueChange={v => setValue("relationship", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Catch-up Status</Label>
              <Select defaultValue={owner.catchup_status ?? "No cadence"} onValueChange={v => setValue("catchup_status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATCHUPS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Next Catch-up</Label>
              <Input {...register("next_catchup")} placeholder="2026-06-15" />
            </div>
            <div className="space-y-1.5">
              <Label>Financial Health</Label>
              <Select defaultValue={owner.financial_health ?? "Unknown"} onValueChange={v => setValue("financial_health", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{HEALTH.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Portfolio Assets</Label>
              <Input {...register("assets")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Strategic Value</Label>
              <Input {...register("strategic_value")} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
