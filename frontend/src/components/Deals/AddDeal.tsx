import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Controller, type SubmitHandler, useForm } from "react-hook-form"
import { Plus, Briefcase, AlertCircle } from "lucide-react"
import { useState } from "react"

import {
  DealsService, ProjectsService, UsersService,
  type DealCreate, type ProjectPublic,
} from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoneyInput } from "@/components/ui/money-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { MD, useMasterData, useStageProbabilities } from "@/hooks/useMasterData"
import { AddProject } from "@/components/Projects/AddProject"
import { getDealTypeConfig } from "./dealTypeConfig"

type FormData = {
  name: string
  stage_str: string
  risk_str: string
  deal_type_str: string
  feasibility_str: string
  brand?: string
  probability?: number
  pipeline_value?: number
  fee_forecast?: number
  next_action?: string
}

interface Props { defaultProjectId?: string; trigger?: React.ReactNode }

export function AddDeal({ defaultProjectId, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  // Master data
  const STAGES = useMasterData(MD.DEAL_STAGE)
  const { probabilityForStage } = useStageProbabilities()
  const RISKS = useMasterData(MD.DEAL_RISK)
  const DEAL_TYPES = useMasterData("deal_type")
  const FEASIBILITY = useMasterData(MD.FEASIBILITY_STATUS)
  const BRANDS = useMasterData(MD.BRAND)

  // Project picker
  const { data: projectsData } = useQuery({
    queryKey: ["projects-picker"],
    queryFn: () => ProjectsService.listProjects({ limit: 500 }),
    enabled: open,
  })
  const projects = projectsData?.data ?? []
  const [projectId, setProjectId] = useState(defaultProjectId ?? "")
  const selectedProject = projects.find(p => p.id === projectId)

  // Users for BD Lead
  const { data: usersData } = useQuery({
    queryKey: ["users-team"],
    queryFn: () => UsersService.listTeam(),
    enabled: open,
  })
  const users = usersData?.data ?? []
  const [bdOwnerId, setBdOwnerId] = useState("")

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      defaultValues: {
        stage_str: "Lead",
        risk_str: "Green",
        deal_type_str: "HMA",
        feasibility_str: "TBD",
      },
    })

  // Auto-fill deal name from project + deal_type
  const dealType = watch("deal_type_str")
  const dealName = watch("name")
  const suggestedName = selectedProject ? `${selectedProject.name} — ${dealType}` : ""

  const mutation = useMutation({
    mutationFn: (data: DealCreate) => DealsService.createDeal({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["project-deals"] })
      showSuccessToast("Deal created.")
      reset()
      setProjectId(defaultProjectId ?? "")
      setBdOwnerId("")
      setOpen(false)
    },
  })

  const onSubmit: SubmitHandler<FormData> = (data) => {
    if (!projectId) {
      alert("Please select a Project first.")
      return
    }
    if (!selectedProject) return

    const finalName = data.name?.trim() || suggestedName

    const payload: DealCreate = {
      name: finalName,
      project_id: projectId,
      deal_type: data.deal_type_str as DealCreate["deal_type"],
      // These are auto-filled from project on the backend, but pass for safety
      country: selectedProject.country,
      region: (selectedProject.region as DealCreate["region"]) ?? undefined,
      city: selectedProject.city ?? undefined,
      project_type: (selectedProject.project_type as DealCreate["project_type"]) ?? undefined,
      keys: selectedProject.keys ?? undefined,
      opening_target: selectedProject.opening_target ?? undefined,
      owner_name: selectedProject.owner_name ?? undefined,
      // Deal-specific
      brand: data.brand || undefined,
      stage: data.stage_str as DealCreate["stage"],
      risk: data.risk_str as DealCreate["risk"],
      feasibility: data.feasibility_str as DealCreate["feasibility"],
      probability: data.probability ? Number(data.probability) : undefined,
      pipeline_value: data.pipeline_value ? Number(data.pipeline_value) : undefined,
      fee_forecast: data.fee_forecast ? Number(data.fee_forecast) : undefined,
      next_action: data.next_action || undefined,
      bd_owner_id: bdOwnerId || undefined,
    }
    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />New Deal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Deal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* ── Section 1: Project Selection ── */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
                <Briefcase className="h-4 w-4" />
                Select Project
              </h3>
              <AddProject
                trigger={
                  <Button type="button" variant="outline" size="sm">
                    <Plus className="h-3.5 w-3.5 mr-1" />New Project
                  </Button>
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Project *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Select an existing project..." /></SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <SelectItem disabled value="__empty__">
                      No projects yet — create one above
                    </SelectItem>
                  ) : projects.map((p: ProjectPublic) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      <span className="text-muted-foreground text-xs ml-2">
                        · {p.city ?? p.country} · {p.owner_name ?? "no owner"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project info card */}
            {selectedProject && (
              <div className="rounded-md bg-card border p-3 grid grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Owner</p>
                  <p className="font-medium">{selectedProject.owner_name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedProject.city ?? selectedProject.country}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Keys</p>
                  <p className="font-medium tabular-nums">{selectedProject.keys ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{selectedProject.project_type ?? "—"}</p>
                </div>
              </div>
            )}

            {!projectId && (
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                Project is required. Deal info will be linked to the selected project.
              </div>
            )}
          </div>

          {/* ── Section 2: Deal-specific fields ── */}
          <div className="rounded-lg border bg-card p-4 space-y-5">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
              Deal Details
            </h3>

            {/* Row A — Identity (full width name) */}
            <div className="space-y-1.5">
              <Label>Deal Name</Label>
              <Input
                {...register("name")}
                placeholder={suggestedName || "e.g. Sun Group HMA — Da Nang Resort"}
              />
              <p className="text-[10px] text-muted-foreground">
                Auto-suggested: <span className="font-medium">{suggestedName || "(select project first)"}</span> — or override
              </p>
            </div>

            {/* Row B — Classification: Type · Stage · Brand · Dev Lead (4 equal cols) */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Classification</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label>Deal Type *</Label>
                  <Select defaultValue="HMA" onValueChange={(v) => setValue("deal_type_str", v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Stage *</Label>
                  <Select defaultValue="Lead" onValueChange={(v) => {
                    setValue("stage_str", v)
                    const prob = probabilityForStage(v)
                    if (prob !== undefined) setValue("probability", prob)
                  }}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Brand</Label>
                  <Select onValueChange={(v) => setValue("brand", v === "__none__" ? "" : v)}>
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

            {/* Row C — Governance: Risk · Feasibility · Probability (3 equal cols) */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Governance</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Risk</Label>
                  <Select defaultValue="Green" onValueChange={(v) => setValue("risk_str", v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RISKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Feasibility</Label>
                  <Select defaultValue="TBD" onValueChange={(v) => setValue("feasibility_str", v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FEASIBILITY.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    Probability %
                    <span className="text-[9px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">AUTO</span>
                  </Label>
                  <Input {...register("probability")} type="number" min={0} max={100} placeholder="50" />
                  <p className="text-[10px] text-muted-foreground">Auto-set from stage · override to mark manual.</p>
                </div>
              </div>
            </div>

            {/* Row D — Financial: 2 equal cols (Pipeline Value + Fee Forecast adapt to deal_type) */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Financial</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(() => {
                  const cfg = getDealTypeConfig(dealType)
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
                          <MoneyInput value={field.value as number | undefined} onChange={field.onChange} placeholder="45,000,000" />
                        } />
                        <p className="text-[10px] text-muted-foreground">{cfg.pipelineValueHint}</p>
                      </div>
                      {cfg.feeForecastVisible ? (
                        <div className="space-y-1.5">
                          <Label>{cfg.feeForecastLabel}</Label>
                          <Controller name="fee_forecast" control={control} render={({ field }) =>
                            <MoneyInput value={field.value as number | undefined} onChange={field.onChange} placeholder="1,200,000" />
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

            {/* Row E — Next Action (full width) */}
            <div className="space-y-1.5">
              <Label>Next Action</Label>
              <Input {...register("next_action")} placeholder="e.g. Send revised proposal by 15 June" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending || !projectId}>
              {mutation.isPending ? "Creating..." : "Create Deal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
