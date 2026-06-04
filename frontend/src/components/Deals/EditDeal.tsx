import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm } from "react-hook-form"
import { Pencil, Briefcase } from "lucide-react"
import { useEffect, useState } from "react"

import { DealsService, ProjectsService, UsersService, type DealPublic, type DealUpdate } from "@/client"
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

interface Props { deal: DealPublic }

export function EditDeal({ deal }: Props) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const RISKS = useMasterData(MD.DEAL_RISK)
  const DEAL_TYPES = useMasterData("deal_type")
  const BRANDS = useMasterData(MD.BRAND)
  const FEASIBILITY = useMasterData(MD.FEASIBILITY_STATUS)

  // Project info (read-only, can change link)
  const { data: projectsData } = useQuery({
    queryKey: ["projects-picker"],
    queryFn: () => ProjectsService.listProjects({ limit: 500 }),
    enabled: open,
  })
  const projects = projectsData?.data ?? []
  const [projectId, setProjectId] = useState(deal.project_id ?? "")

  const { data: usersData } = useQuery({
    queryKey: ["users-team"],
    queryFn: () => UsersService.listTeam(),
    enabled: open,
  })
  const users = usersData?.data ?? []
  const [bdOwnerId, setBdOwnerId] = useState(deal.bd_owner_id ?? "")

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } =
    useForm<DealUpdate>()

  useEffect(() => {
    if (open) {
      reset({
        name: deal.name,
        brand: deal.brand ?? undefined,
        probability: deal.probability ?? undefined,
        pipeline_value: deal.pipeline_value ?? undefined,
        fee_forecast: deal.fee_forecast ?? undefined,
        next_action: deal.next_action ?? undefined,
      })
      setProjectId(deal.project_id ?? "")
      setBdOwnerId(deal.bd_owner_id ?? "")
    }
  }, [open, deal, reset])

  const mutation = useMutation({
    mutationFn: (data: DealUpdate) =>
      DealsService.updateDeal({ id: deal.id, requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] })
      queryClient.invalidateQueries({ queryKey: ["deal", deal.id] })
      showSuccessToast("Deal updated.")
      setOpen(false)
    },
  })

  const onSubmit: SubmitHandler<DealUpdate> = (data) =>
    mutation.mutate({
      ...data,
      project_id: projectId || undefined,
      bd_owner_id: bdOwnerId || undefined,
    })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Deal — {deal.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Project (rare to change) */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <Label className="flex items-center gap-1.5 text-xs">
              <Briefcase className="h-3.5 w-3.5" />
              Linked Project
            </Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name} · {p.city ?? p.country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Location, keys, project type come from the linked project.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Deal Name</Label>
              <Input {...register("name")} />
            </div>

            <div className="space-y-1.5">
              <Label>Deal Type</Label>
              <Select defaultValue={(deal as any).deal_type ?? "HMA"} onValueChange={(v) => setValue("deal_type", v as DealUpdate["deal_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Select defaultValue={deal.brand ?? ""} onValueChange={(v) => setValue("brand", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select brand..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Risk</Label>
              <Select defaultValue={deal.risk ?? "Green"} onValueChange={(v) => setValue("risk", v as DealUpdate["risk"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RISKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Feasibility</Label>
              <Select defaultValue={deal.feasibility ?? "TBD"} onValueChange={(v) => setValue("feasibility", v as DealUpdate["feasibility"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FEASIBILITY.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Development Lead</Label>
              <Select value={bdOwnerId || "__none__"} onValueChange={(v) => setBdOwnerId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Assign BD lead..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Unassigned —</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                      <span className="text-muted-foreground text-xs ml-1">· {u.role}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Probability %</Label>
              <Input {...register("probability")} type="number" min={0} max={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Pipeline Value</Label>
              <Input {...register("pipeline_value")} type="number" min={0} />
            </div>
            <div className="space-y-1.5">
              <Label>Fee Forecast</Label>
              <Input {...register("fee_forecast")} type="number" min={0} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Next Action</Label>
            <Input {...register("next_action")} />
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
