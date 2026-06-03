import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm } from "react-hook-form"
import { Plus } from "lucide-react"
import { useState } from "react"

import { DealsService, type DealCreate } from "@/client"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCustomToast } from "@/hooks/useCustomToast"

const STAGES = [
  "Lead", "NDA / Qualified", "Feasibility", "Proposal", "Negotiation",
  "LOI Signed", "HMA Signed", "Pre-opening", "Opened", "Lost",
]

const RISKS = ["Green", "Amber", "Red"]

const PROJECT_TYPES = [
  "Hotel New Build (Greenfield)",
  "Hotel Re-Brand",
  "Hotel Conversion (Takeover)",
  "Hotel Adaptive Re-Use",
  "Serviced Apartment New Build",
  "Wellness / Spa Resort",
  "Branded Residences",
]

const REGIONS = [
  "Vietnam", "Thailand", "Southeast Asia", "Greater China",
  "North Asia", "South Asia", "Australia / Pacific",
  "Europe", "Americas", "Middle East & Africa",
]

const OPENING_TARGETS = [
  "Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026",
  "Q1 2027", "Q2 2027", "Q3 2027", "Q4 2027",
  "Q1 2028", "TBD",
]

type FormData = DealCreate & {
  stage_str: string
  risk_str: string
  region_str: string
  project_type_str: string
  opening_target_str: string
}

export function AddDeal() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      defaultValues: {
        stage_str: "Lead",
        risk_str: "Green",
      },
    })

  const mutation = useMutation({
    mutationFn: (data: DealCreate) =>
      DealsService.createDeal({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] })
      showSuccessToast("Deal created successfully.")
      reset()
      setOpen(false)
    },
  })

  const onSubmit: SubmitHandler<FormData> = (data) => {
    const payload: DealCreate = {
      name: data.name,
      country: data.country,
      city: data.city || undefined,
      owner_name: data.owner_name || undefined,
      brand: data.brand || undefined,
      keys: data.keys ? Number(data.keys) : undefined,
      probability: data.probability ? Number(data.probability) : undefined,
      pipeline_value: data.pipeline_value ? Number(data.pipeline_value) : undefined,
      fee_forecast: data.fee_forecast ? Number(data.fee_forecast) : undefined,
      next_action: data.next_action || undefined,
      stage: data.stage_str as DealCreate["stage"],
      risk: data.risk_str as DealCreate["risk"],
      region: (data.region_str as DealCreate["region"]) || undefined,
      project_type: (data.project_type_str as DealCreate["project_type"]) || undefined,
      opening_target: data.opening_target_str || undefined,
    }
    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Deal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Deal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Project Name *</Label>
              <Input
                {...register("name", { required: "Required" })}
                placeholder="e.g. Fusion Resort Da Nang"
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Country *</Label>
              <Input
                {...register("country", { required: "Required" })}
                placeholder="e.g. Vietnam"
              />
              {errors.country && <p className="text-xs text-red-500">{errors.country.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>City</Label>
              <Input {...register("city")} placeholder="e.g. Da Nang" />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Developer / Owner</Label>
              <Input {...register("owner_name")} placeholder="e.g. Sun Group" />
            </div>
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Input {...register("brand")} placeholder="e.g. Fusion Resort" />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select defaultValue="Lead" onValueChange={(v) => setValue("stage_str", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Risk</Label>
              <Select defaultValue="Green" onValueChange={(v) => setValue("risk_str", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RISKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Select onValueChange={(v) => setValue("region_str", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Project Type</Label>
              <Select onValueChange={(v) => setValue("project_type_str", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Opening Target</Label>
              <Select onValueChange={(v) => setValue("opening_target_str", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {OPENING_TARGETS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 5 — Numbers */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Keys</Label>
              <Input {...register("keys")} type="number" min={0} placeholder="220" />
            </div>
            <div className="space-y-1.5">
              <Label>Probability %</Label>
              <Input {...register("probability")} type="number" min={0} max={100} placeholder="50" />
            </div>
            <div className="space-y-1.5">
              <Label>Pipeline Value (USD)</Label>
              <Input {...register("pipeline_value")} type="number" min={0} placeholder="45000000" />
            </div>
            <div className="space-y-1.5">
              <Label>Fee Forecast (USD)</Label>
              <Input {...register("fee_forecast")} type="number" min={0} placeholder="1200000" />
            </div>
          </div>

          {/* Next Action */}
          <div className="space-y-1.5">
            <Label>Next Action</Label>
            <Input {...register("next_action")} placeholder="e.g. Follow up with owner on revised terms" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Create Deal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
