import { useEffect, useState } from "react"
import { ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (note: string) => void
  isSubmitting: boolean
}

export function ReviewFeasibilityModal({ open, onOpenChange, onSubmit, isSubmitting }: Props) {
  const [note, setNote] = useState("")

  useEffect(() => {
    if (open) setNote("")
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Review &amp; Sign-off
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          By signing off, you confirm you've reviewed the scores, strengths, concerns, and conditions.
          This is a <b>2-eyes governance step</b> — you cannot review your own assessment.
        </p>

        <div>
          <Label className="text-xs">Review Note (optional)</Label>
          <textarea
            value={note} onChange={e => setNote(e.target.value)}
            rows={4} maxLength={2000}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Comments, escalations, or approval conditions..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={() => onSubmit(note)} disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isSubmitting ? "Recording..." : "Sign-off"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
