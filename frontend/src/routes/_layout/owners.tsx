import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Users, Search, X } from "lucide-react"
import { useState } from "react"

import {
  OwnersService,
  type OwnerPublic,
  type OwnerContactPublic,
  type OwnerInteractionPublic,
} from "@/client"
import { AddOwner } from "@/components/Owners/AddOwner"
import { LogInteraction } from "@/components/Owners/LogInteraction"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

export const Route = createFileRoute("/_layout/owners")({
  component: OwnersPage,
  head: () => ({ meta: [{ title: "Owner CRM 360 — Fusion BD CORE OS" }] }),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATCHUP_COLOR: Record<string, string> = {
  "Overdue":       "bg-red-100 text-red-700",
  "Due this week": "bg-amber-100 text-amber-700",
  "On track":      "bg-green-100 text-green-700",
  "No cadence":    "bg-gray-100 text-gray-600",
}

const REL_COLOR: Record<string, string> = {
  "Strategic Partner": "bg-green-100 text-green-700",
  "Strong":            "bg-blue-100 text-blue-700",
  "Warm":              "bg-orange-100 text-orange-700",
  "New":               "bg-gray-100 text-gray-600",
  "Risk / Unstable":   "bg-red-100 text-red-600",
}

const FH_COLOR: Record<string, string> = {
  "Strong":   "bg-green-100 text-green-700",
  "Moderate": "bg-amber-100 text-amber-700",
  "Unknown":  "bg-gray-100 text-gray-500",
}

function Badge({ label, colorMap }: { label?: string | null; colorMap: Record<string, string> }) {
  if (!label) return null
  const cls = colorMap[label] ?? "bg-gray-100 text-gray-600"
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

// ── Owner Detail Panel ────────────────────────────────────────────────────────

function OwnerDetail({ owner }: { owner: OwnerPublic }) {
  const { data: contacts } = useQuery({
    queryKey: ["owner-contacts", owner.id],
    queryFn: () => OwnersService.listContacts({ id: owner.id }),
  })

  const { data: interactions } = useQuery({
    queryKey: ["owner-interactions", owner.id],
    queryFn: () => OwnersService.listInteractions({ id: owner.id }),
  })

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pr-1">
      {/* Header card */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-xl font-semibold">{owner.company}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {owner.owner_type} · {owner.country} · Priority: {owner.priority}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            <Badge label={owner.relationship} colorMap={REL_COLOR} />
            <Badge label={owner.financial_health ? `Financial: ${owner.financial_health}` : null} colorMap={FH_COLOR} />
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: "Catch-up", value: owner.catchup_status, sub: owner.next_catchup ? `Next: ${owner.next_catchup}` : "" },
            { label: "Last Met", value: owner.last_interaction ?? "—", sub: "Latest interaction" },
            { label: "Portfolio", value: owner.assets ?? "—", sub: "" },
            { label: "Linked Deals", value: String(owner.deal_count), sub: "" },
          ].map(s => (
            <div key={s.label} className="rounded-md bg-muted/50 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="text-sm font-semibold mt-0.5 truncate">{s.value}</p>
              {s.sub && <p className="text-[10px] text-muted-foreground">{s.sub}</p>}
            </div>
          ))}
        </div>

        {owner.strategic_value && (
          <div className="rounded-md bg-muted/30 border px-3 py-2 text-sm">
            <span className="font-semibold">Strategic value: </span>{owner.strategic_value}
          </div>
        )}
      </div>

      {/* Contacts table */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold text-sm mb-3">
          Relationship Map · Fusion ↔ {owner.company}
        </h3>
        {contacts && contacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {["Fusion","Owner Contact","Strength","Last Met","Note"].map(h => (
                    <th key={h} className="text-left text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground pb-2 pr-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map((c: OwnerContactPublic) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      {c.senior_flag && (
                        <span className="inline-block bg-amber-100 text-amber-700 text-[9px] font-bold px-1 rounded mr-1">C</span>
                      )}
                      {c.fusion_role}
                    </td>
                    <td className="py-2 pr-3 font-medium">{c.owner_contact}</td>
                    <td className="py-2 pr-3">
                      <Badge label={c.strength} colorMap={{ Strong: "bg-green-100 text-green-700", Warm: "bg-amber-100 text-amber-700", New: "bg-gray-100 text-gray-600" }} />
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.last_met || "—"}</td>
                    <td className="py-2 text-muted-foreground text-xs">{c.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No contacts yet.</p>
        )}
      </div>

      {/* Interactions */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Interactions</h3>
          <LogInteraction ownerId={owner.id} />
        </div>
        {interactions && interactions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {interactions.map((i: OwnerInteractionPublic) => (
              <div key={i.id} className="rounded-md bg-muted/40 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{i.interaction_type}</span>
                  <span className="text-xs text-muted-foreground">{i.date}</span>
                </div>
                {i.note && <p className="text-xs text-muted-foreground mt-1">{i.note}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No interactions recorded yet.</p>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function OwnersPage() {
  const [search, setSearch] = useState("")
  const [catchup, setCatchup] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["owners", { search, catchup }],
    queryFn: () => OwnersService.listOwners({
      search: search || undefined,
      catchupStatus: (catchup as any) || undefined,
      limit: 200,
    }),
  })

  const owners: OwnerPublic[] = data?.data ?? []
  const selected = owners.find(o => o.id === selectedId) ?? owners[0] ?? null

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Owner CRM 360</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Owners as strategic assets · relationship map, catch-up cadence, linked deals
          </p>
        </div>
        <AddOwner />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search owner, country..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={catchup} onValueChange={setCatchup}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All catch-ups" /></SelectTrigger>
          <SelectContent>
            {["On track","Due this week","Overdue","No cadence"].map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || catchup) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCatchup("") }}>
            <X className="h-4 w-4 mr-1" />Clear
          </Button>
        )}
      </div>

      {/* Split layout */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading owners...</p>
      ) : owners.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <div className="rounded-full bg-muted p-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium">No owners found</p>
          <p className="text-sm text-muted-foreground">Add your first owner to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[300px_1fr] gap-4 min-h-0 flex-1">
          {/* Owner list */}
          <div className="flex flex-col gap-1.5 overflow-y-auto">
            {owners.map(o => (
              <button
                key={o.id}
                onClick={() => setSelectedId(o.id)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  (selected?.id === o.id)
                    ? "border-primary bg-primary/5"
                    : "bg-card hover:border-foreground/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{o.company}</p>
                  {o.deal_count > 0 && (
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">
                      {o.deal_count} deal{o.deal_count > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{o.owner_type} · {o.country}</p>
                <div className="mt-1.5">
                  <Badge label={o.catchup_status} colorMap={CATCHUP_COLOR} />
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <div className="min-h-0 overflow-y-auto">
            {selected ? (
              <OwnerDetail owner={selected} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select an owner to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
