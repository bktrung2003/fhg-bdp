import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Plus, Pencil } from "lucide-react"
import { useState } from "react"

import { OpenAPI, OwnersService, type OwnerContactCreate, type OwnerContactPublic } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import useCustomToast from "@/hooks/useCustomToast"
import { MD, useMasterData } from "@/hooks/useMasterData"

const FUSION_ROLES = ["CEO","COO","BD Director","BD Director VN","BD Director TH","BD Director APAC","BD Manager","Legal","Finance","IT Admin"]

async function patchContact(contactId: string, body: any) {
  const token = typeof OpenAPI.TOKEN === "function" ? await (OpenAPI.TOKEN as any)({}) : OpenAPI.TOKEN
  const res = await fetch(`${OpenAPI.BASE}/api/v1/owners/contacts/${contactId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

interface Props {
  ownerId: string
  contact?: OwnerContactPublic   // when present → edit mode
}

export function ContactDialog({ ownerId, contact }: Props) {
  const isEdit = !!contact
  const [open, setOpen] = useState(false)
  const [senior, setSenior] = useState(contact?.senior_flag ?? false)
  const qc = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const STRENGTHS = useMasterData(MD.CONTACT_STRENGTH)

  const { register, handleSubmit, reset, setValue } = useForm<any>({
    defaultValues: {
      fusion_role: contact?.fusion_role ?? "",
      owner_contact: contact?.owner_contact ?? "",
      contact_title: contact?.contact_title ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      strength_s: contact?.strength ?? "New",
      last_met: contact?.last_met ?? "",
      note: contact?.note ?? "",
    },
  })

  const mutation = useMutation({
    mutationFn: (d: any) => {
      const body = {
        fusion_role: d.fusion_role,
        owner_contact: d.owner_contact,
        contact_title: d.contact_title || null,
        email: d.email || null,
        phone: d.phone || null,
        strength: d.strength_s,
        last_met: d.last_met || null,
        senior_flag: senior,
        note: d.note || null,
      }
      return isEdit
        ? patchContact(contact!.id, body)
        : OwnersService.addContact({ id: ownerId, requestBody: { owner_id: ownerId, ...body } as OwnerContactCreate })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-contacts", ownerId] })
      showSuccessToast(isEdit ? "Contact updated." : "Contact added.")
      if (!isEdit) { reset(); setSenior(false) }
      setOpen(false)
    },
    onError: (e: any) => showErrorToast(e?.message ?? "Failed to save contact"),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit contact">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" />Add Contact
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Contact" : "Add Contact"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fusion Role *</Label>
              <Select defaultValue={contact?.fusion_role} onValueChange={v => setValue("fusion_role", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {FUSION_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner Contact *</Label>
              <Input {...register("owner_contact", { required: true })} placeholder="e.g. Mr. Đặng Minh Tuấn" />
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input {...register("contact_title")} placeholder="e.g. Group CEO" />
            </div>
            <div className="space-y-1.5">
              <Label>Strength</Label>
              <Select defaultValue={contact?.strength ?? "New"} onValueChange={v => setValue("strength_s", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STRENGTHS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input {...register("email")} type="email" placeholder="name@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input {...register("phone")} placeholder="+84 ..." />
            </div>
            <div className="space-y-1.5">
              <Label>Last Met</Label>
              <Input {...register("last_met")} type="date" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input {...register("note")} placeholder="e.g. Quarterly strategic catch-up" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id={`senior-${contact?.id ?? "new"}`} checked={senior} onCheckedChange={v => setSenior(v === true)} />
            <label htmlFor={`senior-${contact?.id ?? "new"}`} className="text-sm cursor-pointer">
              C-Suite involvement <span className="text-muted-foreground">(mark as senior contact)</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Back-compat: AddContact is ContactDialog without a contact (add mode).
export function AddContact({ ownerId }: { ownerId: string }) {
  return <ContactDialog ownerId={ownerId} />
}
