import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Controller, type SubmitHandler, useForm } from "react-hook-form"
import { Pencil, Briefcase } from "lucide-react"
import { useEffect, useState } from "react"

import { DealsService, ProjectsService, UsersService, type DealPublic, type DealUpdate } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/ui/money-input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { MD, useMasterData, useStageProbabilities } from "@/hooks/useMasterData"
import { getDealTypeConfig } from "./dealTypeConfig"

interface Props { deal: DealPublic }

export function EditDeal({ deal }: Props) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const RISKS = useMasterData(MD.DEAL_RISK)
  const DEAL_TYPES = useMasterData("deal_type")
  const BRANDS = useMasterData(MD.BRAND)
  const FEASIBILITY = useMasterData(MD.FEASIBILITY_STATUS)
  const { probabilityForStage } = useStageProbabilities()

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
  const [currentDealType, setCurrentDealType] = useState<string>((deal as any).deal_type ?? "HMA")

  const { register, handleSubmit, reset, setValue, control, formState: { isSubmitting } } =
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
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Deal — {deal.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* ── Section 1: Linked Project ── */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
              <Briefcase className="h-4 w-4" />
              Linked Project
            </h3>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select project..." /></SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name} · {p.city ?? p.country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Location, keys, project type come from the linked project. Changing this rarely needed.
            </p>
          </div>

          {/* ── Section 2: Deal Details ── */}
          <div className="rounded-lg border bg-card p-4 space-y-5">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
              Deal Details
            </h3>

            {/* Row A — Identity */}
            <div className="space-y-1.5">
              <Label>Deal Name</Label>
              <Input {...register("name")} />
            </div>

            {/* Row B — Classification: Type · Stage (read-only) · Brand · Dev Lead */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Classification</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label>Deal Type</Label>
                  <Select value={currentDealType} onValueChange={(v) => {
                    setCurrentDealType(v)
                    setValue("deal_type", v as DealUpdate["deal_type"])
                  }}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    Stage
                    <span className="text-[9px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">READ-ONLY</span>
                  </Label>
                  <Input value={deal.stage ?? ""} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                  <p className="text-[10px] text-muted-foreground">Use "Move Stage" button to change.</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Brand</Label>
                  <Select defaultValue={deal.brand ?? ""} onValueChange={(v) => setValue("brand", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Development Lead</Label>
                  <Select value={bdOwnerId || "__none__"} onValueChange={(v) => setBdOwnerId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger>
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
            </div>

            {/* Row C — Governance: Risk · Feasibility · Probability */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Governance</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Risk</Label>
                  <Select defaultValue={deal.risk ?? "Green"} onValueChange={(v) => setValue("risk", v as DealUpdate["risk"])}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RISKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Feasibility</Label>
                  <Select defaultValue={deal.feasibility ?? "TBD"} onValueChange={(v) => setValue("feasibility", v as DealUpdate["feasibility"])}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FEASIBILITY.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      Probability %
                      {(deal as any).probability_source === "manual" ? (
                        <span className="text-[9px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">MANUAL</span>
                      ) : (
                        <span className="text-[9px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">AUTO</span>
                      )}
                    </Label>
                    {(deal as any).probability_source === "manual" && (
                      <button type="button"
                        className="text-[10px] text-blue-600 hover:underline"
                        onClick={() => {
                          const auto = probabilityForStage(deal.stage ?? "")
                          if (auto !== undefined) {
                            setValue("probability", auto)
                            setValue("probability_source" as any, "auto")
                          }
                        }}>
                        Reset to auto ({probabilityForStage(deal.stage ?? "") ?? "—"}%)
                      </button>
                    )}
                  </div>
                  <Input {...register("probability")} type="number" min={0} max={100} />
                  <p className="text-[10px] text-muted-foreground">Changing this marks as manual.</p>
                </div>
              </div>
            </div>

            {/* Row D — Financial: Pipeline Value + Fee Forecast adapt to deal type */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Financial</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(() => {
                  const cfg = getDealTypeConfig(currentDealType)
                  return (
                    <>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                          {cfg.pipelineValueLabel}
                          <span className="text-[9px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase">
                            {cfg.pipelineValueBadge}
                          </span>
                        </Label>
                        <Controller name="pipeline_value" control={control} render={({ field }) =>
                          <MoneyInput value={field.value as number | undefined} onChange={field.onChange} />
                        } />
                        <p className="text-[10px] text-muted-foreground">{cfg.pipelineValueHint}</p>
                      </div>
                      {cfg.feeForecastVisible ? (
                        <div className="space-y-1.5">
                          <Label>{cfg.feeForecastLabel}</Label>
                          <Controller name="fee_forecast" control={control} render={({ field }) =>
                            <MoneyInput value={field.value as number | undefined} onChange={field.onChange} />
                          } />
                          <p className="text-[10px] text-muted-foreground">{cfg.feeForecastHint}</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <Label className="text-muted-foreground">Fee Forecast</Label>
                          <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground h-[58px] flex items-start">
                            ⓘ {cfg.feeForecastHint}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Row E — Next Action */}
            <div className="space-y-1.5">
              <Label>Next Action</Label>
              <Input {...register("next_action")} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
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
