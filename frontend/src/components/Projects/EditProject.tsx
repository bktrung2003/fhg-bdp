import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Pencil, MapPin, Building, Wrench, Scale, DollarSign } from "lucide-react"
import { useEffect, useState } from "react"

import { ProjectsService, OwnersService, type ProjectPublic, type ProjectUpdate } from "@/client"
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

interface Props { project: ProjectPublic; trigger?: React.ReactNode }

export function EditProject({ project, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const COUNTRIES = useMasterData(MD.COUNTRY)
  const REGIONS = useMasterData(MD.REGION)
  const PROJECT_TYPES = useMasterData(MD.PROJECT_TYPE)
  const OPENING_TARGETS = useMasterData(MD.OPENING_TARGET)
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
  const [ownerId, setOwnerId] = useState(project.owner_id ?? "")

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } =
    useForm<ProjectUpdate>()

  useEffect(() => {
    if (open) {
      reset({
        name: project.name,
        country: project.country,
        city: project.city ?? undefined,
        location_detail: project.location_detail ?? undefined,
        google_maps_url: project.google_maps_url ?? undefined,
        keys: project.keys ?? undefined,
        room_mix: project.room_mix ?? undefined,
        facilities: project.facilities ?? undefined,
        description: project.description ?? undefined,
      })
      setOwnerId(project.owner_id ?? "")
    }
  }, [open, project, reset])

  const mut = useMutation({
    mutationFn: (d: ProjectUpdate) =>
      ProjectsService.updateProject({ id: project.id, requestBody: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] })
      qc.invalidateQueries({ queryKey: ["project", project.id] })
      qc.invalidateQueries({ queryKey: ["owner-projects"] })
      showSuccessToast("Project updated.")
      setOpen(false)
    },
  })

  const onSubmit = (d: ProjectUpdate) => mut.mutate({
    ...d,
    owner_id: ownerId || undefined,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Project — {project.name}</DialogTitle></DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* ── Basics ── */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Building className="h-4 w-4" />
              Basics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Project Name *</Label>
                <Input {...register("name", { required: "Required" })} />
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
                <Select defaultValue={project.project_type ?? ""} onValueChange={v => setValue("project_type", v as any)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select defaultValue={project.status ?? "Active"} onValueChange={v => setValue("status", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Target Opening</Label>
                <Select defaultValue={project.opening_target ?? ""} onValueChange={v => setValue("opening_target", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{OPENING_TARGETS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Location ── */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Country *</Label>
                <Select defaultValue={project.country ?? ""} onValueChange={v => setValue("country", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Region</Label>
                <Select defaultValue={project.region ?? ""} onValueChange={v => setValue("region", v as any)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input {...register("city")} />
              </div>
              <div className="col-span-3 space-y-1.5">
                <Label>Location Detail / Address</Label>
                <Input {...register("location_detail")} placeholder="Beachfront plot 12, My Khe Beach..." />
              </div>
              <div className="col-span-3 space-y-1.5">
                <Label>Google Maps Link</Label>
                <Input {...register("google_maps_url")} placeholder="https://maps.app.goo.gl/..." />
              </div>
            </div>
          </div>

          {/* ── Property Details ── */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Building className="h-4 w-4" />
              Property Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Segment</Label>
                <Select defaultValue={project.segment ?? ""} onValueChange={v => setValue("segment", v)}>
                  <SelectTrigger><SelectValue placeholder="Select segment..." /></SelectTrigger>
                  <SelectContent>{SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Number of Keys</Label>
                <Input {...register("keys")} type="number" min={0} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Room Mix</Label>
                <Input {...register("room_mix")} placeholder="180 rooms + 30 suites + 10 villas" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Facilities</Label>
                <Input {...register("facilities")} placeholder="Spa, 3 F&B outlets, 500m² ballroom..." />
              </div>
            </div>
          </div>

          {/* ── Status Pillars ── */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Development Status
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Construction Status</Label>
                <Select defaultValue={project.construction_status ?? ""} onValueChange={v => setValue("construction_status", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{CONSTRUCTION.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Design Status</Label>
                <Select defaultValue={project.design_status ?? ""} onValueChange={v => setValue("design_status", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{DESIGN.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Scale className="h-3 w-3" />Legal Status</Label>
                <Select defaultValue={project.legal_status ?? ""} onValueChange={v => setValue("legal_status", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{LEGAL.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><DollarSign className="h-3 w-3" />Funding Status</Label>
                <Select defaultValue={project.funding_status ?? ""} onValueChange={v => setValue("funding_status", v)}>
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
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || mut.isPending}>
              {mut.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
