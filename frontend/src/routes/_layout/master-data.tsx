import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Plus, Trash2, ToggleLeft, ToggleRight, Settings } from "lucide-react"
import { useState } from "react"

import { MasterDataService, type MasterDataPublic } from "@/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/master-data")({
  component: MasterDataPage,
  head: () => ({ meta: [{ title: "Master Data — Fusion BD CORE OS" }] }),
})

const CATEGORY_LABELS: Record<string, string> = {
  country: "Countries",
  deal_stage: "Deal Stages",
  deal_risk: "Deal Risk Levels",
  feasibility_status: "Feasibility Status",
  project_type: "Project Types",
  region: "Regions",
  brand: "Brands",
  owner_type: "Owner Types",
  owner_relationship: "Owner Relationships",
  catchup_status: "Catch-up Status",
  contact_strength: "Contact Strength",
  interaction_type: "Interaction Types",
  task_status: "Task Status",
  task_priority: "Task Priority",
  activity_type: "Activity Types",
  doc_type: "Document Types",
  doc_permission: "Document Permissions",
  milestone_dept: "Departments",
  milestone_gate: "Milestone Gates",
  opening_target: "Opening Targets",
}

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS)

function AddEntry({ category, onAdded }: { category: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const { showSuccessToast } = useCustomToast()

  const mut = useMutation({
    mutationFn: () => MasterDataService.createEntry({
      requestBody: { category, value, sort_order: 99 },
    }),
    onSuccess: () => { onAdded(); showSuccessToast("Added."); setValue(""); setOpen(false) },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>Add to {CATEGORY_LABELS[category] ?? category}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Value</Label>
            <Input value={value} onChange={e => setValue(e.target.value)} placeholder="New value..." onKeyDown={e => e.key === "Enter" && value && mut.mutate()} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => mut.mutate()} disabled={!value || mut.isPending}>
              {mut.isPending ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MasterDataPage() {
  const [activeCategory, setActiveCategory] = useState("brand")
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const { data: allData, isLoading } = useQuery({
    queryKey: ["master-data"],
    queryFn: () => MasterDataService.listAll(),
  })

  const entries: MasterDataPublic[] = allData ?? []

  // Group by category
  const grouped: Record<string, MasterDataPublic[]> = {}
  entries.forEach(e => {
    if (!grouped[e.category]) grouped[e.category] = []
    grouped[e.category].push(e)
  })

  const categoryEntries = grouped[activeCategory] ?? []
  const categoriesWithCounts = CATEGORY_ORDER.map(c => ({
    key: c, label: CATEGORY_LABELS[c] ?? c, count: (grouped[c] ?? []).length,
  }))

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      MasterDataService.updateEntry({ id, isActive: !is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-data"] }) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => MasterDataService.deleteEntry({ id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-data"] }); showSuccessToast("Deleted.") },
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Master Data Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure lookup values used across all modules. Changes apply immediately.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <div className="grid grid-cols-[260px_1fr] gap-6">
          {/* Category list */}
          <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-200px)]">
            {categoriesWithCounts.map(c => (
              <button
                key={c.key}
                onClick={() => setActiveCategory(c.key)}
                className={`text-left rounded-lg px-3 py-2.5 transition-colors text-sm ${
                  activeCategory === c.key
                    ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{c.label}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{c.count}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Values for selected category */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-base">{CATEGORY_LABELS[activeCategory] ?? activeCategory}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{categoryEntries.length} values · disabled values are hidden from dropdowns</p>
              </div>
              <AddEntry category={activeCategory} onAdded={() => qc.invalidateQueries({ queryKey: ["master-data"] })} />
            </div>

            <div className="flex flex-col gap-1">
              {categoryEntries
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((entry, idx) => (
                  <div key={entry.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${entry.is_active ? "bg-muted/30" : "bg-muted/10 opacity-50"}`}>
                    <span className="text-xs text-muted-foreground w-6 tabular-nums">{idx + 1}</span>
                    <span className={`flex-1 text-sm ${entry.is_active ? "font-medium" : "line-through text-muted-foreground"}`}>
                      {entry.value}
                    </span>
                    <div className="flex items-center gap-1">
                      {/* Toggle active */}
                      <Button
                        variant="ghost" size="sm" className="h-7 w-7 p-0"
                        onClick={() => toggleMut.mutate({ id: entry.id, is_active: entry.is_active })}
                        title={entry.is_active ? "Disable" : "Enable"}
                      >
                        {entry.is_active
                          ? <ToggleRight className="h-4 w-4 text-green-600" />
                          : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        }
                      </Button>
                      {/* Delete */}
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => deleteMut.mutate(entry.id)}
                        disabled={deleteMut.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              {categoryEntries.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No values yet. Click + to add.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
