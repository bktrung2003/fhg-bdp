import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { QRCodeSVG } from "qrcode.react"
import { Shield, ShieldCheck, Clock, Smartphone, Check } from "lucide-react"

import { OpenAPI } from "@/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { getIdleTimeout, setIdleTimeout } from "@/hooks/useIdleTimeout"

async function authFetch(path: string, init?: RequestInit) {
  const token = typeof OpenAPI.TOKEN === "function" ? await (OpenAPI.TOKEN as any)({}) : OpenAPI.TOKEN
  const res = await fetch(`${OpenAPI.BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.detail ?? "Request failed")
  return res.json()
}

const IDLE_OPTIONS = [
  { v: 0, label: "Off" },
  { v: 5, label: "5 minutes" },
  { v: 15, label: "15 minutes" },
  { v: 30, label: "30 minutes" },
  { v: 60, label: "1 hour" },
]

export function SecurityView() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  // ── Idle auto-logout ──
  const [idle, setIdle] = useState<number>(getIdleTimeout())
  const changeIdle = (v: string) => { const n = Number(v); setIdle(n); setIdleTimeout(n) }

  // ── 2FA ──
  const enabled = !!(user as any)?.totp_enabled
  const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => { setSetup(null); setCode("") }, [enabled])

  const startSetup = async () => {
    setBusy(true)
    try { setSetup(await authFetch("/api/v1/2fa/setup", { method: "POST" })) }
    catch (e: any) { showErrorToast(e.message) } finally { setBusy(false) }
  }
  const confirmEnable = async () => {
    setBusy(true)
    try {
      await authFetch("/api/v1/2fa/enable", { method: "POST", body: JSON.stringify({ code }) })
      showSuccessToast("Two-factor authentication enabled.")
      setSetup(null); setCode("")
      qc.invalidateQueries({ queryKey: ["currentUser"] }); qc.invalidateQueries({ queryKey: ["users", "me"] })
    } catch (e: any) { showErrorToast(e.message) } finally { setBusy(false) }
  }
  const disable = async () => {
    setBusy(true)
    try {
      await authFetch("/api/v1/2fa/disable", { method: "POST", body: JSON.stringify({ code }) })
      showSuccessToast("Two-factor authentication disabled.")
      setCode("")
      qc.invalidateQueries({ queryKey: ["currentUser"] }); qc.invalidateQueries({ queryKey: ["users", "me"] })
    } catch (e: any) { showErrorToast(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Security</h2>
        <p className="text-sm text-muted-foreground mt-1">Protect your account and this device.</p>
      </div>

      {/* Auto sign-out */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Auto sign-out when idle</p>
            <p className="text-xs text-muted-foreground mt-1">Sign out of this device automatically after a period of inactivity.</p>
          </div>
          <Select value={String(idle)} onValueChange={changeIdle}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {IDLE_OPTIONS.map(o => <SelectItem key={o.v} value={String(o.v)}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Saved on this device only. {idle > 0 ? `Currently: sign out after ${idle} min idle.` : "Currently off."}</p>
      </div>

      {/* 2FA */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm flex items-center gap-2">
              {enabled ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <Shield className="h-4 w-4 text-muted-foreground" />}
              Two-factor authentication (2FA)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {enabled ? "Enabled — you'll enter a 6-digit code from your authenticator app at sign-in."
                : "Add a second step at sign-in using an authenticator app (Google / Microsoft Authenticator)."}
            </p>
          </div>
          {enabled ? (
            <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-1 rounded">On</span>
          ) : (
            <span className="text-[10px] font-bold uppercase bg-muted text-muted-foreground px-2 py-1 rounded">Off</span>
          )}
        </div>

        {/* Not enabled → setup flow */}
        {!enabled && !setup && (
          <Button size="sm" className="mt-3" onClick={startSetup} disabled={busy}>
            <Shield className="h-3.5 w-3.5 mr-1.5" />Enable 2FA
          </Button>
        )}

        {!enabled && setup && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm font-medium flex items-center gap-1.5"><Smartphone className="h-4 w-4" />1 · Scan with your authenticator app</p>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="bg-white p-2 rounded-lg border"><QRCodeSVG value={setup.otpauth_uri} size={150} /></div>
              <div className="text-xs text-muted-foreground">
                <p>Or enter this key manually:</p>
                <code className="block mt-1 bg-muted px-2 py-1 rounded text-[11px] break-all max-w-[220px]">{setup.secret}</code>
              </div>
            </div>
            <p className="text-sm font-medium mt-1">2 · Enter the 6-digit code to confirm</p>
            <div className="flex items-center gap-2">
              <Input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" inputMode="numeric" className="w-32 tracking-widest text-center font-mono" />
              <Button size="sm" onClick={confirmEnable} disabled={busy || code.length !== 6}>
                <Check className="h-3.5 w-3.5 mr-1" />Verify & enable
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setSetup(null); setCode("") }}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Enabled → disable flow */}
        {enabled && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Code to disable" inputMode="numeric" className="w-40 tracking-widest text-center font-mono" />
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={disable} disabled={busy || code.length !== 6}>
              Disable 2FA
            </Button>
            <span className="text-[11px] text-muted-foreground">Enter a current code to turn it off.</span>
          </div>
        )}
      </div>
    </div>
  )
}
