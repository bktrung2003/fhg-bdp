import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Plus } from "lucide-react"
import { useState } from "react"

import { ProjectsService, OwnersService, type ProjectCreate } from "@/client"
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

const STATUSES = ["Prospect","Active","On Hold","Operating","Lost","Closed"]

interface Props { defaultOwnerId?: string; trigger?: React.ReactNode }

export function AddProject({ defaultOwnerId, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const COUNTRIES = useMasterData(MD.COUNTRY)
  const REGIONS = useMasterData(MD.REGION)
  const PROJECT_TYPES = useMasterData(MD.PROJECT_TYPE)
  const OPENING_TARGETS = useMasterData(MD.OPENING_TARGET)

  const { data: ownersData } = useQuery({
    queryKey: ["owners-picker"],
    queryFn: () => OwnersService.listOwners({ limit: 500 }),
    enabled: open,
  })
  const owners = ownersData?.data ?? []
  const [ownerId, setOwnerId] = useState(defaultOwnerId ?? "")

  const { register, handleSubmit, reset, setValue, formState: { errors } } =
    useForm<any>({ defaultValues: { status_s: "Active" } })

  const mut = useMutation({
    mutationFn: (d: ProjectCreate) => ProjectsService.createProject({ requestBody: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] })
      qc.invalidateQueries({ queryKey: ["owner-projects"] })
      qc.invalidateQueries({ queryKey: ["owners"] })
      showSuccessToast("Project created.")
      reset({ status_s: "Active" })
      setOwnerId(defaultOwnerId ?? "")
      setOpen(false)
    },
  })

  const onSubmit = (d: any) => mut.mutate({
    name: d.name,
    owner_id: ownerId || undefined,
    country: d.country,
    region: d.region_s || undefined,
    city: d.city || undefined,
    project_type: d.project_type_s || undefined,
    keys: d.keys ? Number(d.keys) : undefined,
    opening_target: d.opening_target_s || undefined,
    status: d.status_s,
    description: d.description || undefined,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Project</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Project Name *</Label>
              <Input {...register("name", { required: "Required" })} placeholder="e.g. Fusion Resort Da Nang" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message as string}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={ownerId || "__none__"} onValueChange={v => setOwnerId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select owner..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {owners.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.company} · {o.country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Project Type</Label>
              <Select onValueChange={v => setValue("project_type_s", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
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
              <Label>Region</Label>
              <Select onValueChange={v => setValue("region_s", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input {...register("city")} placeholder="e.g. Da Nang" />
            </div>
            <div className="space-y-1.5">
              <Label>Keys</Label>
              <Input {...register("keys")} type="number" min={0} placeholder="220" />
            </div>
            <div className="space-y-1.5">
              <Label>Opening Target</Label>
              <Select onValueChange={v => setValue("opening_target_s", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{OPENING_TARGETS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue="Active" onValueChange={v => setValue("status_s", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description / Notes</Label>
              <Input {...register("description")} placeholder="Any notes about this asset..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Creating..." : "Create Project"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
