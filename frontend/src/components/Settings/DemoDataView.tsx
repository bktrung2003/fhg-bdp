import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Sparkles, Trash2, RefreshCw, AlertTriangle,
  Users, Briefcase, Building2, ClipboardCheck, Calculator,
  CheckSquare, Clock, Rocket,
} from "lucide-react"

import { OpenAPI } from "@/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import useCustomToast from "@/hooks/useCustomToast"

interface DemoInfo {
  summary: Record<string, number>
  loaded: Record<string, number>
  is_loaded: boolean
}

const ENTITIES = [
  { key: "owners",      label: "Owners",                icon: Users,          desc: "6 hospitality developers (Sun Group, BRG, Vingroup, FLC, NovaLand, Bangkok Capital) with realistic priorities, contacts, financial health." },
  { key: "projects",    label: "Projects (Hotel Assets)", icon: Briefcase,    desc: "8 properties across Vietnam (Phú Quốc, Hà Nội, Đà Nẵng, Phan Thiết, Đà Lạt, Sầm Sơn) + 1 Thailand (Phuket)." },
  { key: "deals",       label: "Deals",                 icon: Building2,      desc: "12 deals spanning every pipeline stage (Lead → HMA Signed → Pre-opening → Opened → Lost) + 4 deal types (HMA / Franchise / TSA / Pre-opening)." },
  { key: "assessments", label: "Feasibility Assessments", icon: ClipboardCheck, desc: "5 scored assessments — Strong Proceed (Phú Quốc) to Reject (FLC Sầm Sơn). Includes strategic notes, deal killers, competitive landscape." },
  { key: "snapshots",   label: "Financial Snapshots",    icon: Calculator,    desc: "6 scenarios — Base / Worst / Upside for top deals. Try the Sensitivity (Tornado) and Print/PDF features on Phú Quốc." },
  { key: "tasks",       label: "Tasks",                 icon: CheckSquare,    desc: "20 tasks across deals, mix of Open / In Progress / Done, with some intentionally overdue for demo." },
  { key: "activities",  label: "Activity Timeline",     icon: Clock,          desc: "26 activities (Meetings, Calls, Site Visits, Proposal Sent, LOI / HMA Signed) over the last 60 days." },
  { key: "milestones",  label: "Pre-opening Milestones", icon: Rocket,        desc: "13 milestones for Đà Lạt (opening 60d) and Phú Quốc (opening Q4 2026), Green / Amber / Red mix." },
]

async function authFetch(path: string, init?: RequestInit): Promise<any> {
  const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN({} as any) : OpenAPI.TOKEN
  const res = await fetch(`${OpenAPI.BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function DemoDataView() {
  const qc = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [confirmOpen, setConfirmOpen] = useState<"load" | "clear" | null>(null)

  const { data: info, isLoading } = useQuery<DemoInfo>({
    queryKey: ["demo-info"],
    queryFn: () => authFetch("/api/v1/seed/demo/info"),
  })

  const refreshAll = () => {
    // Invalidate all major queries so the user sees the new data without manual refresh
    qc.invalidateQueries({ queryKey: ["demo-info"] })
    qc.invalidateQueries({ queryKey: ["dashboard-deals"] })
    qc.invalidateQueries({ queryKey: ["dashboard-owners"] })
    qc.invalidateQueries({ queryKey: ["dashboard-tasks"] })
    qc.invalidateQueries({ queryKey: ["dashboard-milestones"] })
    qc.invalidateQueries({ queryKey: ["dashboard-activities"] })
    qc.invalidateQueries({ queryKey: ["deals"] })
    qc.invalidateQueries({ queryKey: ["owners"] })
    qc.invalidateQueries({ queryKey: ["projects"] })
    qc.invalidateQueries({ queryKey: ["projects-picker"] })
    qc.invalidateQueries({ queryKey: ["tasks"] })
    qc.invalidateQueries({ queryKey: ["activities"] })
    qc.invalidateQueries({ queryKey: ["milestones"] })
    qc.invalidateQueries({ queryKey: ["feasibility-scorecard"] })
    qc.invalidateQueries({ queryKey: ["feasibility-snapshots"] })
  }

  const loadMut = useMutation({
    mutationFn: () => authFetch("/api/v1/seed/demo/load", { method: "POST" }),
    onSuccess: (data) => { showSuccessToast(data.message); setConfirmOpen(null); refreshAll() },
    onError: (e: any) => showErrorToast(e?.message ?? "Failed to load demo data"),
  })

  const clearMut = useMutation({
    mutationFn: () => authFetch("/api/v1/seed/demo", { method: "DELETE" }),
    onSuccess: (data) => { showSuccessToast(data.message); setConfirmOpen(null); refreshAll() },
    onError: (e: any) => showErrorToast(e?.message ?? "Failed to clear demo data"),
  })

  return (
    <div className="flex flex-col gap-5 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />Demo Data
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Populate the system with realistic sample data — Vietnamese hotel projects, deals across every stage,
            feasibility assessments, scenarios, tasks, activities, and milestones. Use this to{" "}
            <b>learn the system</b>, <b>onboard new BD team members</b>, or <b>prepare a demo</b>. Real user
            data is never touched — demo records are matched by name and can be cleared anytime.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={isLoading || !info?.is_loaded}
            onClick={() => setConfirmOpen("clear")}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />Clear Demo Data
          </Button>
          <Button size="sm" disabled={isLoading || loadMut.isPending}
            onClick={() => setConfirmOpen("load")}>
            {info?.is_loaded
              ? <><RefreshCw className="h-3.5 w-3.5 mr-1" />Reload Demo Data</>
              : <><Sparkles className="h-3.5 w-3.5 mr-1" />Load Demo Data</>}
          </Button>
        </div>
      </div>

      {/* Status banner */}
      {info && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          info.is_loaded
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          {info.is_loaded ? (
            <>
              ✅ <b>Demo data is loaded</b> — {info.loaded.deals} deals, {info.loaded.projects} projects,{" "}
              {info.loaded.owners} owners currently in your database. Open the Dashboard or Pipeline to explore.
            </>
          ) : (
            <>
              ⚠ <b>No demo data loaded yet.</b> Click "Load Demo Data" to populate with sample records.
            </>
          )}
        </div>
      )}

      {/* What's included */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">What's included</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ENTITIES.map(e => {
            const Icon = e.icon
            const count = info?.summary[e.key] ?? 0
            const loaded = info?.loaded[e.key] ?? null  // not all entities reported, that's OK
            return (
              <div key={e.key} className="rounded-lg border bg-card p-3 flex items-start gap-3">
                <div className="rounded-md bg-muted p-2 flex-shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm">{e.label}</h4>
                    <span className="text-[10px] font-bold tabular-nums bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {count}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{e.desc}</p>
                  {loaded != null && info?.is_loaded && (
                    <p className="text-[10px] text-emerald-700 font-semibold mt-1">✓ {loaded} currently loaded</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Demo guide */}
      <div className="rounded-lg border bg-blue-50 border-blue-200 p-4">
        <h3 className="font-semibold text-sm text-blue-900 mb-2">💡 Suggested demo flow</h3>
        <ol className="text-xs text-blue-800 space-y-1.5 list-decimal list-inside">
          <li><b>Dashboard</b> — see Funnel, Hot Deals, KPIs, Recent Activity</li>
          <li><b>Pipeline → Deals</b> — sort/filter, click "Fusion Phú Quốc HMA"</li>
          <li><b>Deal Workspace</b> — explore Feasibility radar (Strong Proceed), Financial Model scenarios, try Print/PDF</li>
          <li><b>Pipeline Scorecard (/feasibility)</b> — sort by score, see distribution of Recommendation bands</li>
          <li><b>Owner CRM 360</b> — open Sun Group, see contacts + interactions + linked deals</li>
          <li><b>Activities & Tasks</b> — try bulk reassign with checkbox + dropdown</li>
          <li><b>Pre-opening</b> — Đà Lạt project (60d to opening), Red milestone for COO escalation</li>
        </ol>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen !== null} onOpenChange={(o) => !o && setConfirmOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmOpen === "load" ? (
                <><Sparkles className="h-5 w-5 text-primary" />{info?.is_loaded ? "Reload" : "Load"} Demo Data?</>
              ) : (
                <><AlertTriangle className="h-5 w-5 text-red-500" />Clear Demo Data?</>
              )}
            </DialogTitle>
          </DialogHeader>

          {confirmOpen === "load" ? (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>This will {info?.is_loaded ? "clear existing demo records and re-create them with fresh timestamps" : "add"}:</p>
              <ul className="text-xs grid grid-cols-2 gap-x-3 gap-y-0.5 pl-3">
                {ENTITIES.map(e => (
                  <li key={e.key}>• {info?.summary[e.key] ?? 0} {e.label.toLowerCase()}</li>
                ))}
              </ul>
              <p className="text-[11px] italic pt-1">
                Real user-created records are not affected. Demo records are tagged and matched by name for safe removal.
              </p>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>This will <b>permanently remove all demo records</b> from your database:</p>
              <ul className="text-xs space-y-0.5 pl-3">
                <li>• {info?.loaded.owners ?? 0} demo owners (and their contacts/interactions)</li>
                <li>• {info?.loaded.projects ?? 0} demo projects</li>
                <li>• {info?.loaded.deals ?? 0} demo deals (with all linked assessments, snapshots, tasks, activities)</li>
                <li>• Related milestones</li>
              </ul>
              <p className="text-[11px] italic text-red-700 pt-1">
                ⚠ Real user-created records (those not matching demo names) are NOT removed.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setConfirmOpen(null)}>Cancel</Button>
            {confirmOpen === "load" ? (
              <Button onClick={() => loadMut.mutate()} disabled={loadMut.isPending}>
                {loadMut.isPending ? "Loading..." : info?.is_loaded ? "Reload" : "Load"}
              </Button>
            ) : (
              <Button onClick={() => clearMut.mutate()} disabled={clearMut.isPending}
                className="bg-red-600 hover:bg-red-700 text-white">
                {clearMut.isPending ? "Clearing..." : "Clear Demo Data"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
