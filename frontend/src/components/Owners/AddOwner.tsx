import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Plus } from "lucide-react"
import { useState } from "react"

import { OwnersService, type OwnerCreate } from "@/client"
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

const PRIORITIES = ["Strategic","High","Medium","Low"]   // not a configurable category
const HEALTH = ["Strong","Moderate","Unknown"]            // not configurable

export function AddOwner() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const TYPES = useMasterData(MD.OWNER_TYPE)
  const RELATIONSHIPS = useMasterData(MD.OWNER_RELATIONSHIP)
  const CATCHUPS = useMasterData(MD.CATCHUP_STATUS)
  const COUNTRIES = useMasterData(MD.COUNTRY)

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } =
    useForm<OwnerCreate & { owner_type_s: string; priority_s: string; relationship_s: string; catchup_s: string; fh_s: string }>({
      defaultValues: { owner_type_s: "Developer", priority_s: "Medium", relationship_s: "New", catchup_s: "No cadence", fh_s: "Unknown" }
    })

  const mutation = useMutation({
    mutationFn: (d: OwnerCreate) => OwnersService.createOwner({ requestBody: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owners"] })
      showSuccessToast("Owner added.")
      reset(); setOpen(false)
    },
  })

  const onSubmit = (d: any) => mutation.mutate({
    company: d.company,
    country: d.country,
    owner_type: d.owner_type_s,
    priority: d.priority_s,
    relationship: d.relationship_s,
    catchup_status: d.catchup_s,
    next_catchup: d.next_catchup || undefined,
    assets: d.assets || undefined,
    financial_health: d.fh_s,
    strategic_value: d.strategic_value || undefined,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Owner</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Owner Profile</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Company Name *</Label>
              <Input {...register("company", { required: true })} placeholder="e.g. Sun Group" />
            </div>
            <div className="space-y-1.5">
              <Label>Country *</Label>
              <Select onValueChange={v => setValue("country", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select country..." /></SelectTrigger>
                <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <input type="hidden" {...register("country", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Owner Type</Label>
              <Select defaultValue="Developer" onValueChange={v => setValue("owner_type_s" as any, v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select defaultValue="Medium" onValueChange={v => setValue("priority_s" as any, v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Relationship</Label>
              <Select defaultValue="New" onValueChange={v => setValue("relationship_s" as any, v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Catch-up Status</Label>
              <Select defaultValue="No cadence" onValueChange={v => setValue("catchup_s" as any, v)}>
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
              <Select defaultValue="Unknown" onValueChange={v => setValue("fh_s" as any, v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{HEALTH.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Portfolio Assets</Label>
              <Input {...register("assets")} placeholder="e.g. 6 assets in Da Nang, Phu Quoc" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Strategic Value / Expansion Notes</Label>
              <Input {...register("strategic_value")} placeholder="e.g. High expansion potential in APAC" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Create Owner"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
