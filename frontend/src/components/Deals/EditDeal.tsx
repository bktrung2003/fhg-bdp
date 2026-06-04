import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm } from "react-hook-form"
import { Pencil } from "lucide-react"
import { useEffect, useState } from "react"

import { DealsService, OwnersService, UsersService, type DealPublic, type DealUpdate } from "@/client"
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

  // Master data
  const RISKS = useMasterData(MD.DEAL_RISK)
  const PROJECT_TYPES = useMasterData(MD.PROJECT_TYPE)
  const REGIONS = useMasterData(MD.REGION)
  const OPENING_TARGETS = useMasterData(MD.OPENING_TARGET)
  const BRANDS = useMasterData(MD.BRAND)
  const FEASIBILITY = useMasterData(MD.FEASIBILITY_STATUS)
  const { showSuccessToast } = useCustomToast()

  // Owners + Users for dropdowns
  const { data: ownersData } = useQuery({
    queryKey: ["owners-picker"],
    queryFn: () => OwnersService.listOwners({ limit: 500 }),
    enabled: open,
  })
  const owners = ownersData?.data ?? []
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
        country: deal.country,
        city: deal.city ?? undefined,
        owner_name: deal.owner_name ?? undefined,
        brand: deal.brand ?? undefined,
        keys: deal.keys ?? undefined,
        probability: deal.probability ?? undefined,
        pipeline_value: deal.pipeline_value ?? undefined,
        fee_forecast: deal.fee_forecast ?? undefined,
        next_action: deal.next_action ?? undefined,
      })
      setBdOwnerId(deal.bd_owner_id ?? "")
    }
  }, [open, deal, reset])

  const mutation = useMutation({
    mutationFn: (data: DealUpdate) =>
      DealsService.updateDeal({ id: deal.id, requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] })
      showSuccessToast("Deal updated.")
      setOpen(false)
    },
  })

  const onSubmit: SubmitHandler<DealUpdate> = (data) =>
    mutation.mutate({ ...data, bd_owner_id: bdOwnerId || undefined })

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
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Project Name</Label>
              <Input {...register("name")} />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select defaultValue={deal.country ?? ""} onValueChange={(v) => setValue("country", v)}>
                <SelectTrigger><SelectValue placeholder="Select country / region..." /></SelectTrigger>
                <SelectContent>
                  {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input {...register("city")} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Developer / Owner</Label>
              <Select defaultValue={deal.owner_name ?? ""} onValueChange={(v) => setValue("owner_name", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select owner..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {owners.map(o => (
                    <SelectItem key={o.id} value={o.company}>{o.company}</SelectItem>
                  ))}
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
              <Label>Risk</Label>
              <Select defaultValue={deal.risk ?? "Green"} onValueChange={(v) => setValue("risk", v as DealUpdate["risk"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RISKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Select defaultValue={deal.region ?? ""} onValueChange={(v) => setValue("region", v as DealUpdate["region"])}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Project Type</Label>
              <Select defaultValue={deal.project_type ?? ""} onValueChange={(v) => setValue("project_type", v as DealUpdate["project_type"])}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Opening Target</Label>
              <Select defaultValue={deal.opening_target ?? ""} onValueChange={(v) => setValue("opening_target", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{OPENING_TARGETS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
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
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Keys</Label>
              <Input {...register("keys")} type="number" min={0} />
            </div>
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
