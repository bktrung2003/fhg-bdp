import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Users, Search, X } from "lucide-react"
import { useState } from "react"

import {
  OwnersService,
  type OwnerPublic,
  type OwnerContactPublic,
  type OwnerInteractionPublic,
  type ProjectPublic,
} from "@/client"
import { useNavigate } from "@tanstack/react-router"
import { AddProject } from "@/components/Projects/AddProject"
import { Building2, Briefcase, Users as UsersIcon, MessageSquare, Activity } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddOwner } from "@/components/Owners/AddOwner"
import { AddContact } from "@/components/Owners/AddContact"
import { EditOwner } from "@/components/Owners/EditOwner"
import { DeleteOwner } from "@/components/Owners/DeleteOwner"
import { LogInteraction } from "@/components/Owners/LogInteraction"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import useCustomToast from "@/hooks/useCustomToast"
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

// ── Delete Contact Button ─────────────────────────────────────────────────────

function DeleteContactBtn({ contactId, ownerId }: { contactId: string; ownerId: string }) {
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const del = useMutation({
    mutationFn: () => OwnersService.deleteContact({ contactId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-contacts", ownerId] })
      showSuccessToast("Contact removed.")
    },
  })
  return (
    <Button
      variant="ghost" size="sm"
      className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
      onClick={() => del.mutate()}
      disabled={del.isPending}
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  )
}

// ── Owner Detail Panel ────────────────────────────────────────────────────────

function OwnerDetail({ owner }: { owner: OwnerPublic }) {
  const navigate = useNavigate()

  const { data: contacts } = useQuery({
    queryKey: ["owner-contacts", owner.id],
    queryFn: () => OwnersService.listContacts({ id: owner.id }),
  })

  const { data: interactions } = useQuery({
    queryKey: ["owner-interactions", owner.id],
    queryFn: () => OwnersService.listInteractions({ id: owner.id }),
  })

  const { data: projects } = useQuery({
    queryKey: ["owner-projects", owner.id],
    queryFn: () => OwnersService.listOwnerProjects({ id: owner.id }),
  })

  const { data: ownerDeals } = useQuery({
    queryKey: ["owner-deals", owner.id],
    queryFn: () => OwnersService.listOwnerDeals({ id: owner.id }),
  })

  const projectsList = (projects ?? []) as ProjectPublic[]
  const dealsList = (ownerDeals ?? []) as any[]

  const projectCount = (owner as any).project_count ?? 0
  const contactCount = contacts?.length ?? 0
  const interactionCount = interactions?.length ?? 0

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      {/* ── Pinned Header (always visible) ── */}
      <div className="rounded-lg border bg-card p-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Company avatar */}
            <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
              {owner.company.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold leading-tight truncate">{owner.company}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {owner.owner_type} · {owner.country} · Priority: {owner.priority}
              </p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Badge label={owner.relationship} colorMap={REL_COLOR} />
                <Badge label={owner.financial_health ? `Financial: ${owner.financial_health}` : null} colorMap={FH_COLOR} />
                <Badge label={owner.catchup_status} colorMap={CATCHUP_COLOR} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <EditOwner owner={owner} />
            <DeleteOwner owner={owner} />
          </div>
        </div>

        {/* Compact mini stats — 4 boxes */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { icon: Building2, label: "Projects", value: String(projectCount) },
            { icon: Briefcase, label: "Deals", value: String(owner.deal_count) },
            { icon: UsersIcon, label: "Contacts", value: String(contactCount) },
            { icon: MessageSquare, label: "Last Met", value: owner.last_interaction ?? "—" },
          ].map(s => (
            <div key={s.label} className="rounded-md bg-muted/40 px-3 py-2 flex items-center gap-2">
              <s.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-sm font-bold truncate">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="overview" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="grid grid-cols-4 w-full flex-shrink-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects {projectCount > 0 && <span className="ml-1 text-[10px] text-muted-foreground">({projectCount})</span>}</TabsTrigger>
          <TabsTrigger value="deals">Deals {owner.deal_count > 0 && <span className="ml-1 text-[10px] text-muted-foreground">({owner.deal_count})</span>}</TabsTrigger>
          <TabsTrigger value="activity">Activity {interactionCount > 0 && <span className="ml-1 text-[10px] text-muted-foreground">({interactionCount})</span>}</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-y-auto mt-3">
          {/* ── Overview Tab ── */}
          <TabsContent value="overview" className="flex flex-col gap-4 m-0">
            {/* Strategic value */}
            {owner.strategic_value ? (
              <div className="rounded-lg border-l-4 border-l-primary bg-primary/5 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">Strategic Value</p>
                <p className="text-sm">{owner.strategic_value}</p>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground italic">
                No strategic value notes. Add via Edit.
              </div>
            )}

            {/* Portfolio overview */}
            {owner.assets && (
              <div className="rounded-lg border bg-card p-4">
                <h3 className="font-semibold text-sm mb-2">Portfolio</h3>
                <p className="text-sm">{owner.assets}</p>
              </div>
            )}

            {/* Catch-up details */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold text-sm mb-3">Catch-up Cadence</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
                  <Badge label={owner.catchup_status} colorMap={CATCHUP_COLOR} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Next Catch-up</p>
                  <p className="text-sm font-medium mt-1">{owner.next_catchup ?? "Not scheduled"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last Interaction</p>
                  <p className="text-sm font-medium mt-1">{owner.last_interaction ?? "—"}</p>
                </div>
              </div>
            </div>

            {/* Contacts / Relationship Map */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Relationship Map · Fusion ↔ {owner.company}</h3>
                <AddContact ownerId={owner.id} />
              </div>
              {contacts && contacts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {["Fusion","Owner Contact","Strength","Last Met","Note",""].map(h => (
                          <th key={h} className="text-left text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground pb-2 pr-3">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((c: OwnerContactPublic) => (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
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
                          <td className="py-2 pr-2 text-muted-foreground text-xs">{c.note || "—"}</td>
                          <td className="py-2">
                            <DeleteContactBtn contactId={c.id} ownerId={owner.id} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No contacts yet. Click <span className="font-medium">Add Contact</span> to map the relationship.
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Projects Tab ── */}
          <TabsContent value="projects" className="m-0">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Hotel Assets ({projectsList.length})
                </h3>
                <AddProject
                  defaultOwnerId={owner.id}
                  trigger={<Button size="sm"><Building2 className="h-3.5 w-3.5 mr-1" />Add Project</Button>}
                />
              </div>
              {projectsList.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No projects yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add the first hotel asset for this owner.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {projectsList.map(p => (
                    <div key={p.id}
                      className="rounded-md border bg-muted/20 hover:bg-muted/40 p-3 cursor-pointer transition-colors"
                      onClick={() => navigate({ to: "/projects/$projectId" as any, params: { projectId: p.id } })}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm">{p.name}</p>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap">{p.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.city ?? p.country} · {p.keys ?? "—"} keys
                      </p>
                      {p.project_type && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{p.project_type}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Deals Tab ── */}
          <TabsContent value="deals" className="m-0">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold text-sm mb-3">All Deals across {owner.company}'s Projects ({dealsList.length})</h3>
              {dealsList.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No deals yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a project first, then add deals from there.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {dealsList.map(d => (
                    <div key={d.id}
                      className="rounded-md border bg-muted/20 hover:bg-muted/40 p-3 cursor-pointer transition-colors flex items-center gap-3"
                      onClick={() => navigate({ to: "/deals/$dealId" as any, params: { dealId: d.id } })}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{d.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {d.deal_type ?? "HMA"} · {d.stage} · {d.probability ?? 0}% prob
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums">
                          {d.pipeline_value ? `$${(d.pipeline_value / 1_000_000).toFixed(1)}M` : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">pipeline</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Activity Tab ── */}
          <TabsContent value="activity" className="m-0">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Interactions Timeline
                </h3>
                <LogInteraction ownerId={owner.id} />
              </div>
              {interactions && interactions.length > 0 ? (
                <div className="relative pl-5 border-l-2 border-muted flex flex-col gap-3">
                  {interactions.map((i: OwnerInteractionPublic) => (
                    <div key={i.id} className="relative">
                      <div className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                      <div className="rounded-md bg-muted/40 p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{i.interaction_type}</span>
                          <span className="text-xs text-muted-foreground">{i.date}</span>
                        </div>
                        {i.note && <p className="text-xs text-muted-foreground mt-1">{i.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No interactions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Log meetings, calls, dinners, site visits...</p>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
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
        <div className="grid grid-cols-[340px_1fr] gap-4 min-h-0 flex-1">
          {/* Owner list */}
          <div className="flex flex-col gap-1.5 overflow-y-auto">
            {owners.map(o => (
              <div
                key={o.id}
                className={`relative rounded-lg border p-3 transition-colors cursor-pointer ${
                  (selected?.id === o.id)
                    ? "border-primary bg-primary/5"
                    : "bg-card hover:border-foreground/20"
                }`}
                onClick={() => setSelectedId(o.id)}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate">{o.company}</p>
                      {o.deal_count > 0 && (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 flex-shrink-0">
                          {o.deal_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{o.owner_type} · {o.country}</p>
                    <div className="mt-1.5">
                      <Badge label={o.catchup_status} colorMap={CATCHUP_COLOR} />
                    </div>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <EditOwner owner={o} />
                    <DeleteOwner owner={o} onDeleted={() => setSelectedId(null)} />
                  </div>
                </div>
              </div>
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
