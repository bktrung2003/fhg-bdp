import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil, UserPlus, ShieldCheck, MapPin } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { type UserPublic, UsersService } from "@/client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import { MD, useMasterData } from "@/hooks/useMasterData"

const ROLES = [
  "CEO", "COO", "BD Director", "BD Manager", "Legal", "Finance", "IT Admin",
] as const

const formSchema = z
  .object({
    email: z.email({ message: "Invalid email address" }),
    full_name: z.string().optional(),
    title: z.string().optional(),
    role: z.string().optional(),
    country: z.string().optional(),
    password: z.string().min(8).optional().or(z.literal("")),
    confirm_password: z.string().optional(),
    is_superuser: z.boolean().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => !data.password || data.password === data.confirm_password, {
    message: "The passwords don't match",
    path: ["confirm_password"],
  })

type FormData = z.infer<typeof formSchema>

interface EditUserProps {
  user: UserPublic
  onSuccess: () => void
}

const EditUser = ({ user, onSuccess }: EditUserProps) => {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const COUNTRIES = useMasterData(MD.COUNTRY)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      email: user.email,
      full_name: user.full_name ?? "",
      title: (user as any).title ?? "",
      role: (user as any).role ?? "BD Manager",
      country: (user as any).country ?? "",
      is_superuser: user.is_superuser,
      is_active: user.is_active,
      password: "",
      confirm_password: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      // Don't send empty password
      const { confirm_password: _cp, password, ...rest } = data
      const payload: any = { ...rest }
      if (password) payload.password = password
      return UsersService.updateUser({ userId: user.id, requestBody: payload })
    },
    onSuccess: () => {
      showSuccessToast("User updated.")
      setOpen(false)
      onSuccess()
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => qc.invalidateQueries({ queryKey: ["users"] }),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true) }}>
          <Pencil className="h-4 w-4 mr-2" />Edit
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit User — {user.full_name || user.email}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
            {/* Section 1 — Identity */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
                <UserPlus className="h-4 w-4" />
                Identity
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField name="full_name" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="email" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField name="title" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl><Input placeholder="e.g. VP Hospitality APAC" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Section 2 — Org */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
                <MapPin className="h-4 w-4" />
                Organisation &amp; Scope
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField name="role" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="country" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country Scope</FormLabel>
                    <Select value={field.value || "__none__"} onValueChange={v => field.onChange(v === "__none__" ? "" : v)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Global / no scope..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Global —</SelectItem>
                        {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Section 3 — Access */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">3</span>
                <ShieldCheck className="h-4 w-4" />
                Access
              </h3>
              <p className="text-[11px] text-muted-foreground">Leave password blank to keep current password.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField name="password" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl><Input type="password" placeholder="(unchanged)" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="confirm_password" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="flex items-center gap-6 pt-1">
                <FormField name="is_active" control={form.control} render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-normal cursor-pointer text-xs">Active (can log in)</FormLabel>
                  </FormItem>
                )} />
                <FormField name="is_superuser" control={form.control} render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-normal cursor-pointer text-xs flex items-center gap-1">
                      Superuser <span className="text-[9px] text-red-600 bg-red-50 px-1 rounded">full admin</span>
                    </FormLabel>
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Cancel</Button>
              <LoadingButton type="submit" loading={mutation.isPending}>Save Changes</LoadingButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default EditUser
