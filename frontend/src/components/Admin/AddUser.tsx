import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, UserPlus, ShieldCheck, MapPin } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { type UserCreate, UsersService } from "@/client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
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

// Role list mirrors backend UserRole enum + the seeded "Fusion roles" used elsewhere
const ROLES = [
  { value: "CEO",         label: "CEO",           tone: "purple" },
  { value: "COO",         label: "COO",           tone: "purple" },
  { value: "BD Director", label: "BD Director",   tone: "blue" },
  { value: "BD Manager",  label: "BD Manager",    tone: "sky" },
  { value: "Legal",       label: "Legal",         tone: "amber" },
  { value: "Finance",     label: "Finance",       tone: "emerald" },
  { value: "IT Admin",    label: "IT Admin",      tone: "slate" },
] as const

const formSchema = z
  .object({
    email: z.email({ message: "Invalid email address" }),
    full_name: z.string().min(1, "Full name is required"),
    title: z.string().optional(),
    role: z.string().min(1, "Role is required"),
    country: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
    is_active: z.boolean(),
    is_superuser: z.boolean(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "The passwords don't match",
    path: ["confirm_password"],
  })

type FormData = z.infer<typeof formSchema>

const AddUser = () => {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const COUNTRIES = useMasterData(MD.COUNTRY)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      email: "", full_name: "", title: "", role: "BD Manager", country: "",
      password: "", confirm_password: "",
      is_active: true, is_superuser: false,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: UserCreate) => UsersService.createUser({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("User created.")
      form.reset()
      setOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => qc.invalidateQueries({ queryKey: ["users"] }),
  })

  const onSubmit = (data: FormData) => {
    const { confirm_password: _cp, ...payload } = data
    mutation.mutate(payload as UserCreate)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add User</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add User
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* ── Section 1 — Identity ── */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
                <UserPlus className="h-4 w-4" />
                Identity
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField name="full_name" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl><Input placeholder="e.g. Nguyễn Văn A" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="email" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl><Input type="email" placeholder="firstname.lastname@fusionhotelgroup.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField name="title" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. VP Hospitality APAC · Head of Development VN · Senior BD Manager" {...field} />
                  </FormControl>
                  <p className="text-[10px] text-muted-foreground">Free text — appears on user cards + audit logs. Independent from system role.</p>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* ── Section 2 — Org & Scope ── */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
                <MapPin className="h-4 w-4" />
                Organisation &amp; Scope
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField name="role" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Role *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select role..." /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Determines current rules + future RBAC enforcement.</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="country" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country Scope</FormLabel>
                    <Select value={field.value || "__none__"} onValueChange={v => field.onChange(v === "__none__" ? "" : v)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Global / no scope..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Global (no country scope) —</SelectItem>
                        {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Where this user operates. Phase 2 RBAC will use this for read scoping.</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* ── Section 3 — Access ── */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">3</span>
                <ShieldCheck className="h-4 w-4" />
                Access
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField name="password" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Password *</FormLabel>
                    <FormControl><Input type="password" placeholder="Min 8 chars" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="confirm_password" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password *</FormLabel>
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
              <LoadingButton type="submit" loading={mutation.isPending}>Create User</LoadingButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AddUser
