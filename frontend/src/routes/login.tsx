import { zodResolver } from "@hookform/resolvers/zod"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { OpenAPI, type Body_login_login_access_token as AccessToken } from "@/client"
import { AuthLayout } from "@/components/Common/AuthLayout"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import { PasswordInput } from "@/components/ui/password-input"
import { isLoggedIn } from "@/hooks/useAuth"

const formSchema = z.object({
  username: z.email(),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters" }),
}) satisfies z.ZodType<AccessToken>

type FormData = z.infer<typeof formSchema>

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Log In - Fusion BD CORE OS",
      },
    ],
  }),
})

function Login() {
  const navigate = useNavigate()
  const [needs2fa, setNeeds2fa] = useState(false)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { username: "", password: "" },
  })

  async function authenticate(username: string, password: string, totp?: string) {
    const body = new URLSearchParams({ username, password, grant_type: "password" })
    if (totp) body.set("code", totp)
    const res = await fetch(`${OpenAPI.BASE}/api/v1/login/access-token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
    if (res.ok) {
      const data = await res.json()
      localStorage.setItem("access_token", data.access_token)
      navigate({ to: "/" })
      return
    }
    const detail = (await res.json().catch(() => ({})))?.detail
    if (res.status === 401 && detail === "TOTP_REQUIRED") { setNeeds2fa(true); setError(null); return }
    if (res.status === 401) { setError("Invalid authentication code."); return }
    setError("Incorrect email or password.")
  }

  const onSubmit = async (data: FormData) => {
    if (loading) return
    setLoading(true); setError(null)
    try { await authenticate(data.username, data.password) }
    finally { setLoading(false) }
  }

  const onVerify = async () => {
    if (loading || code.length !== 6) return
    setLoading(true); setError(null)
    try { await authenticate(form.getValues("username"), form.getValues("password"), code) }
    finally { setLoading(false) }
  }

  // ── 2FA step ──
  if (needs2fa) {
    return (
      <AuthLayout>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">Two-factor authentication</h1>
            <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
          </div>
          <div className="grid gap-4">
            <Input
              autoFocus inputMode="numeric" placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => { if (e.key === "Enter") onVerify() }}
              className="text-center text-lg tracking-[0.5em] font-mono h-12"
            />
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
            <LoadingButton onClick={onVerify} loading={loading} disabled={code.length !== 6}>
              Verify &amp; sign in
            </LoadingButton>
            <button type="button" onClick={() => { setNeeds2fa(false); setCode(""); setError(null) }}
              className="text-sm text-muted-foreground hover:underline">
              ← Back
            </button>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">Login to your account</h1>
          </div>

          <div className="grid gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="email-input"
                      placeholder="user@example.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center">
                    <FormLabel>Password</FormLabel>
                    <RouterLink
                      to="/recover-password"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </RouterLink>
                  </div>
                  <FormControl>
                    <PasswordInput
                      data-testid="password-input"
                      placeholder="Password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {error && <p className="text-xs text-destructive text-center">{error}</p>}
            <LoadingButton type="submit" loading={loading}>
              Log In
            </LoadingButton>
          </div>

          <div className="text-center text-sm">
            Don't have an account yet?{" "}
            <RouterLink to="/signup" className="underline underline-offset-4">
              Sign up
            </RouterLink>
          </div>
        </form>
      </Form>
    </AuthLayout>
  )
}
