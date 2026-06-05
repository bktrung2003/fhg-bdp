import { useEffect, useState } from "react"
import { Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { NotesField } from "./AssessFeasibilityModal"
import type { FeasibilityAssessmentPublic } from "./FeasibilityPanel"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: FeasibilityAssessmentPublic
  onSubmit: (notes: {
    strengths: string | null
    concerns: string | null
    competitive_landscape: string | null
    deal_killers: string | null
    conditions_to_proceed: string | null
  }) => void
  isSubmitting: boolean
}

export function EditNotesModal({ open, onOpenChange, initial, onSubmit, isSubmitting }: Props) {
  const [strengths, setStrengths] = useState("")
  const [concerns, setConcerns] = useState("")
  const [competitive, setCompetitive] = useState("")
  const [dealKillers, setDealKillers] = useState("")
  const [conditions, setConditions] = useState("")

  useEffect(() => {
    if (open) {
      setStrengths(initial.strengths ?? "")
      setConcerns(initial.concerns ?? "")
      setCompetitive(initial.competitive_landscape ?? "")
      setDealKillers(initial.deal_killers ?? "")
      setConditions(initial.conditions_to_proceed ?? "")
    }
  }, [open, initial])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit Strategic Notes
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
          ✏️ Editing text only — scores stay the same, <b>no new version</b> created.
          Use <b>"Reassess"</b> instead if you need to change scores.
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <NotesField icon="✓" tone="emerald" label="Strengths"
              placeholder="Internal advantages..." value={strengths} onChange={setStrengths} />
            <NotesField icon="⚠" tone="amber" label="Concerns"
              placeholder="Internal weaknesses, gaps..." value={concerns} onChange={setConcerns} />
            <NotesField icon="🥊" tone="purple" label="Competitive Landscape"
              placeholder="Who else is bidding? Our position..." value={competitive} onChange={setCompetitive} />
            <NotesField icon="🚫" tone="red" label="Deal Killers / Red Flags"
              placeholder="Specific showstoppers..." value={dealKillers} onChange={setDealKillers} />
          </div>
          <NotesField icon="📋" tone="blue" label="Conditions to Proceed"
            placeholder="Required milestones / owner commitments..." value={conditions} onChange={setConditions} />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={isSubmitting}
            onClick={() => onSubmit({
              strengths: strengths.trim() || null,
              concerns: concerns.trim() || null,
              competitive_landscape: competitive.trim() || null,
              deal_killers: dealKillers.trim() || null,
              conditions_to_proceed: conditions.trim() || null,
            })}>
            {isSubmitting ? "Saving..." : "Save Notes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
