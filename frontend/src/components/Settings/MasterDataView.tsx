import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Plus, Trash2, ToggleLeft, ToggleRight, Pencil, Check, X,
  Briefcase, Users as UsersIcon, Building2, Wrench, ListChecks, Rocket,
} from "lucide-react"
import { useState } from "react"

import { MasterDataService, type MasterDataPublic } from "@/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import useCustomToast from "@/hooks/useCustomToast"

// ── Category groups (organized by domain) ────────────────────────────────────

interface CategoryGroup {
  key: string
  label: string
  icon: React.ElementType
  categories: { key: string; label: string }[]
}

const GROUPS: CategoryGroup[] = [
  {
    key: "deal",
    label: "Deal Pipeline",
    icon: Briefcase,
    categories: [
      { key: "deal_stage", label: "Deal Stages" },
      { key: "deal_type", label: "Deal Types" },
      { key: "deal_risk", label: "Deal Risk" },
      { key: "feasibility_status", label: "Feasibility Status" },
      { key: "opening_target", label: "Opening Targets" },
      { key: "stage_probability", label: "Stage → Probability (Stage:Prob format)" },
    ],
  },
  {
    key: "owner",
    label: "Owner CRM",
    icon: UsersIcon,
    categories: [
      { key: "owner_type", label: "Owner Types" },
      { key: "owner_relationship", label: "Owner Relationships" },
      { key: "catchup_status", label: "Catch-up Status" },
      { key: "contact_strength", label: "Contact Strength" },
      { key: "seniority", label: "Contact Seniority" },
      { key: "interaction_type", label: "Interaction Types" },
    ],
  },
  {
    key: "asset",
    label: "Projects & Assets",
    icon: Building2,
    categories: [
      { key: "project_type", label: "Project Types" },
      { key: "project_status", label: "Project Status" },
      { key: "brand", label: "Brands" },
      { key: "segment", label: "Hotel Segments" },
      { key: "country", label: "Countries" },
      { key: "region", label: "Regions" },
    ],
  },
  {
    key: "dev",
    label: "Development Status",
    icon: Wrench,
    categories: [
      { key: "construction_status", label: "Construction Status" },
      { key: "design_status", label: "Design Status" },
      { key: "legal_status", label: "Legal Status" },
      { key: "funding_status", label: "Funding Status" },
    ],
  },
  {
    key: "ops",
    label: "Operations",
    icon: ListChecks,
    categories: [
      { key: "task_status", label: "Task Status" },
      { key: "task_priority", label: "Task Priority" },
      { key: "activity_type", label: "Activity Types" },
      { key: "doc_type", label: "Document Types" },
      { key: "doc_permission", label: "Document Permissions" },
    ],
  },
  {
    key: "preopen",
    label: "Pre-opening",
    icon: Rocket,
    categories: [
      { key: "milestone_dept", label: "Departments" },
      { key: "milestone_gate", label: "Milestone Gates" },
    ],
  },
]

const CATEGORY_LABEL: Record<string, string> = {}
GROUPS.forEach(g => g.categories.forEach(c => { CATEGORY_LABEL[c.key] = c.label }))

// ── Add Entry ─────────────────────────────────────────────────────────────────

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
        <Button variant="outline" size="sm" className="h-7 px-2">
          <Plus className="h-3.5 w-3.5 mr-1" />Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>Add to {CATEGORY_LABEL[category] ?? category}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Value</Label>
            <Input value={value} onChange={e => setValue(e.target.value)}
              placeholder="New value..."
              onKeyDown={e => e.key === "Enter" && value && mut.mutate()} autoFocus />
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

// ── Inline Edit Row ───────────────────────────────────────────────────────────

function EntryRow({ entry, index }: { entry: MasterDataPublic; index: number }) {
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(entry.value)

  const updateMut = useMutation({
    mutationFn: () => MasterDataService.updateEntry({ id: entry.id, value: editValue }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master-data"] })
      showSuccessToast("Updated.")
      setEditing(false)
    },
  })

  const toggleMut = useMutation({
    mutationFn: () => MasterDataService.updateEntry({ id: entry.id, isActive: !entry.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-data"] }),
  })

  const delMut = useMutation({
    mutationFn: () => MasterDataService.deleteEntry({ id: entry.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-data"] }); showSuccessToast("Deleted.") },
  })

  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 group ${entry.is_active ? "bg-muted/30 hover:bg-muted/50" : "bg-muted/10 opacity-50"} transition-colors`}>
      <span className="text-xs text-muted-foreground w-6 tabular-nums">{index + 1}</span>

      {editing ? (
        <div className="flex-1 flex items-center gap-1">
          <Input
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            className="h-7 text-sm"
            onKeyDown={e => {
              if (e.key === "Enter" && editValue) updateMut.mutate()
              if (e.key === "Escape") { setEditing(false); setEditValue(entry.value) }
            }}
            autoFocus
          />
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600" onClick={() => updateMut.mutate()} disabled={!editValue || updateMut.isPending}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => { setEditing(false); setEditValue(entry.value) }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <span className={`flex-1 text-sm ${entry.is_active ? "font-medium" : "line-through text-muted-foreground"}`}>
            {entry.value}
          </span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit" onClick={() => { setEditValue(entry.value); setEditing(true) }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
              title={entry.is_active ? "Disable (hide from dropdowns)" : "Enable"}
              onClick={() => toggleMut.mutate()}>
              {entry.is_active
                ? <ToggleRight className="h-4 w-4 text-green-600" />
                : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
              title="Delete" onClick={() => delMut.mutate()} disabled={delMut.isPending}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main View ─────────────────────────────────────────────────────────────────

export function MasterDataView() {
  const [activeGroup, setActiveGroup] = useState("deal")
  const [activeCategory, setActiveCategory] = useState("deal_stage")
  const qc = useQueryClient()

  const { data: allData, isLoading } = useQuery({
    queryKey: ["master-data"],
    queryFn: () => MasterDataService.listAll(),
  })

  const entries: MasterDataPublic[] = allData ?? []
  const grouped: Record<string, MasterDataPublic[]> = {}
  entries.forEach(e => {
    if (!grouped[e.category]) grouped[e.category] = []
    grouped[e.category].push(e)
  })

  const currentGroup = GROUPS.find(g => g.key === activeGroup)
  const categoryEntries = (grouped[activeCategory] ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Configure lookup values used across all modules. Changes apply immediately.
          {" "}<span className="text-foreground">Hover a row to reveal Edit / Disable / Delete actions.</span>
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <div className="grid grid-cols-[220px_1fr] gap-4">
          {/* Grouped category sidebar */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-280px)]">
            {GROUPS.map(group => (
              <div key={group.key} className="rounded-lg border bg-card overflow-hidden">
                <button
                  onClick={() => setActiveGroup(activeGroup === group.key ? "" : group.key)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <group.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider flex-1 text-left">{group.label}</span>
                  <span className="text-[10px] text-muted-foreground">{group.categories.length}</span>
                </button>
                {activeGroup === group.key && (
                  <div className="flex flex-col py-1">
                    {group.categories.map(c => {
                      const count = (grouped[c.key] ?? []).length
                      const active = activeCategory === c.key
                      return (
                        <button
                          key={c.key}
                          onClick={() => setActiveCategory(c.key)}
                          className={`text-left px-3 py-1.5 transition-colors text-xs ${
                            active
                              ? "bg-primary/10 text-primary font-semibold"
                              : "hover:bg-muted/50 text-foreground/80"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{c.label}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Values panel */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {currentGroup?.label}
                </p>
                <h2 className="font-semibold text-base">{CATEGORY_LABEL[activeCategory] ?? activeCategory}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {categoryEntries.length} values · disabled values are hidden from dropdowns
                </p>
              </div>
              <AddEntry category={activeCategory} onAdded={() => qc.invalidateQueries({ queryKey: ["master-data"] })} />
            </div>

            <div className="flex flex-col gap-1">
              {categoryEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No values yet. Click <span className="font-medium">Add</span> to create.</p>
              ) : (
                categoryEntries.map((entry, idx) => (
                  <EntryRow key={entry.id} entry={entry} index={idx} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
