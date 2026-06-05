import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Plus, MapPin, Building, Wrench, Scale, DollarSign } from "lucide-react"
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
import { QuarterPicker } from "@/components/ui/quarter-picker"

const STATUSES = ["Prospect","Active","On Hold","Operating","Lost","Closed"]

interface Props { defaultOwnerId?: string; trigger?: React.ReactNode }

export function AddProject({ defaultOwnerId, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const COUNTRIES = useMasterData(MD.COUNTRY)
  const REGIONS = useMasterData(MD.REGION)
  const PROJECT_TYPES = useMasterData(MD.PROJECT_TYPE)
  const SEGMENTS = useMasterData(MD.SEGMENT)
  const CONSTRUCTION = useMasterData(MD.CONSTRUCTION_STATUS)
  const DESIGN = useMasterData(MD.DESIGN_STATUS)
  const LEGAL = useMasterData(MD.LEGAL_STATUS)
  const FUNDING = useMasterData(MD.FUNDING_STATUS)

  const { data: ownersData } = useQuery({
    queryKey: ["owners-picker"],
    queryFn: () => OwnersService.listOwners({ limit: 500 }),
    enabled: open,
  })
  const owners = ownersData?.data ?? []
  const [ownerId, setOwnerId] = useState(defaultOwnerId ?? "")

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
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
    location_detail: d.location_detail || undefined,
    google_maps_url: d.google_maps_url || undefined,
    project_type: d.project_type_s || undefined,
    segment: d.segment_s || undefined,
    keys: d.keys ? Number(d.keys) : undefined,
    room_mix: d.room_mix || undefined,
    facilities: d.facilities || undefined,
    opening_target: d.opening_target_s || undefined,
    status: d.status_s,
    construction_status: d.construction_s || undefined,
    design_status: d.design_s || undefined,
    legal_status: d.legal_s || undefined,
    funding_status: d.funding_s || undefined,
    description: d.description || undefined,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Project</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* ── Section 1: Basics ── */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Building className="h-4 w-4" />
              Basics
            </h3>
            <div className="grid grid-cols-2 gap-3">
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
                <Label>Status</Label>
                <Select defaultValue="Active" onValueChange={v => setValue("status_s", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Target Opening</Label>
                <QuarterPicker
                  value={watch("opening_target_s") as string | undefined}
                  onChange={(v) => setValue("opening_target_s", v)}
                />
                <p className="text-[10px] text-muted-foreground">Industry standard quarter precision (e.g. Q4 2026).</p>
              </div>
            </div>
          </div>

          {/* ── Section 2: Location ── */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </h3>
            <div className="grid grid-cols-3 gap-3">
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
              <div className="col-span-3 space-y-1.5">
                <Label>Location Detail / Address</Label>
                <Input {...register("location_detail")} placeholder="e.g. Beachfront plot 12, My Khe Beach, Son Tra District" />
              </div>
              <div className="col-span-3 space-y-1.5">
                <Label>Google Maps Link</Label>
                <Input {...register("google_maps_url")} placeholder="https://maps.app.goo.gl/..." />
              </div>
            </div>
          </div>

          {/* ── Section 3: Physical ── */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Building className="h-4 w-4" />
              Property Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Segment</Label>
                <Select onValueChange={v => setValue("segment_s", v)}>
                  <SelectTrigger><SelectValue placeholder="Select segment..." /></SelectTrigger>
                  <SelectContent>{SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Number of Keys</Label>
                <Input {...register("keys")} type="number" min={0} placeholder="220" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Room Mix</Label>
                <Input {...register("room_mix")} placeholder="e.g. 180 standard rooms + 30 suites + 10 villas" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Facilities</Label>
                <Input {...register("facilities")} placeholder="e.g. Spa, 3 F&B outlets, 500m² ballroom, infinity pool" />
              </div>
            </div>
          </div>

          {/* ── Section 4: Status Pillars ── */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Development Status
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Construction Status</Label>
                <Select onValueChange={v => setValue("construction_s", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{CONSTRUCTION.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Design Status</Label>
                <Select onValueChange={v => setValue("design_s", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{DESIGN.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Scale className="h-3 w-3" />Legal Status</Label>
                <Select onValueChange={v => setValue("legal_s", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{LEGAL.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><DollarSign className="h-3 w-3" />Funding Status</Label>
                <Select onValueChange={v => setValue("funding_s", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{FUNDING.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Notes ── */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Any internal notes about this asset..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Creating..." : "Create Project"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
