import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  ArrowLeft, Building2, Briefcase, Users as UsersIcon,
  MessageSquare, Activity, Trash2,
} from "lucide-react"

import {
  OwnersService,
  type OwnerContactPublic,
  type OwnerInteractionPublic,
  type ProjectPublic,
} from "@/client"
import { AddContact, ContactDialog } from "@/components/Owners/AddContact"
import { AddProject } from "@/components/Projects/AddProject"
import { EditOwner } from "@/components/Owners/EditOwner"
import { DeleteOwner } from "@/components/Owners/DeleteOwner"
import { LogInteraction } from "@/components/Owners/LogInteraction"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/owners_/$ownerId")({
  component: OwnerWorkspace,
  head: () => ({ meta: [{ title: "Owner — Fusion BD CORE OS" }] }),
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
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorMap[label] ?? "bg-gray-100 text-gray-600"}`}>
      {label}
    </span>
  )
}

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

function DeleteInteractionBtn({ interactionId, ownerId }: { interactionId: string; ownerId: string }) {
  const qc = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const del = useMutation({
    mutationFn: async () => {
      const { OpenAPI } = await import("@/client")
      const token = typeof OpenAPI.TOKEN === "function" ? await (OpenAPI.TOKEN as any)({}) : OpenAPI.TOKEN
      const res = await fetch(`${OpenAPI.BASE}/api/v1/owners/interactions/${interactionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(await res.text())
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-interactions", ownerId] })
      qc.invalidateQueries({ queryKey: ["owner", ownerId] })
      showSuccessToast("Interaction deleted.")
    },
    onError: (e: any) => showErrorToast(e?.message ?? "Failed to delete"),
  })
  return (
    <Button
      variant="ghost" size="sm"
      className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
      onClick={() => { if (confirm("Delete this interaction?")) del.mutate() }}
      disabled={del.isPending}
      title="Delete interaction"
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

function OwnerWorkspace() {
  const { ownerId } = Route.useParams()
  const navigate = useNavigate()

  const { data: owner, isLoading } = useQuery({
    queryKey: ["owner", ownerId],
    queryFn: async () => {
      const list = await OwnersService.listOwners({ limit: 500 })
      return list.data.find((o: any) => o.id === ownerId) ?? null
    },
  })

  const { data: contacts } = useQuery({
    queryKey: ["owner-contacts", ownerId],
    queryFn: () => OwnersService.listContacts({ id: ownerId }),
    enabled: !!owner,
  })

  const { data: interactions } = useQuery({
    queryKey: ["owner-interactions", ownerId],
    queryFn: () => OwnersService.listInteractions({ id: ownerId }),
    enabled: !!owner,
  })

  const { data: projects } = useQuery({
    queryKey: ["owner-projects", ownerId],
    queryFn: () => OwnersService.listOwnerProjects({ id: ownerId }),
    enabled: !!owner,
  })

  const { data: ownerDeals } = useQuery({
    queryKey: ["owner-deals", ownerId],
    queryFn: () => OwnersService.listOwnerDeals({ id: ownerId }),
    enabled: !!owner,
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-48 text-muted-foreground">Loading owner...</div>
  }

  if (!owner) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-muted-foreground">Owner not found.</p>
        <Link to="/owners"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back to Owners</Button></Link>
      </div>
    )
  }

  const projectsList = (projects ?? []) as ProjectPublic[]
  const dealsList = (ownerDeals ?? []) as any[]
  const projectCount = (owner as any).project_count ?? projectsList.length
  const contactCount = contacts?.length ?? 0
  const interactionCount = interactions?.length ?? 0

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto w-full">
      {/* Back link */}
      <Link to="/owners" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground self-start">
        <ArrowLeft className="h-3 w-3" />Back to Owners
      </Link>

      {/* Pinned Header */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="h-16 w-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl flex-shrink-0">
              {owner.company.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight">{owner.company}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {owner.owner_type} · {owner.country} · Priority: <span className="font-semibold">{owner.priority}</span>
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge label={owner.relationship} colorMap={REL_COLOR} />
                <Badge label={owner.financial_health ? `Financial: ${owner.financial_health}` : null} colorMap={FH_COLOR} />
                <Badge label={owner.catchup_status} colorMap={CATCHUP_COLOR} />
                {owner.next_catchup && (
                  <span className="text-xs text-muted-foreground">Next catch-up: <span className="font-medium">{owner.next_catchup}</span></span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <EditOwner owner={owner} />
            <DeleteOwner owner={owner} onDeleted={() => navigate({ to: "/owners" })} />
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {[
            { icon: Building2, label: "Projects", value: String(projectCount), sub: "Hotel assets" },
            { icon: Briefcase, label: "Deals", value: String(owner.deal_count), sub: "Active + closed" },
            { icon: UsersIcon, label: "Contacts", value: String(contactCount), sub: "Relationship map" },
            { icon: MessageSquare, label: "Last Met", value: owner.last_interaction ?? "—", sub: "Latest interaction" },
          ].map(s => (
            <div key={s.label} className="rounded-lg bg-muted/40 border p-3 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold truncate">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects {projectCount > 0 && <span className="ml-1 text-[10px] text-muted-foreground">({projectCount})</span>}</TabsTrigger>
          <TabsTrigger value="deals">Deals {owner.deal_count > 0 && <span className="ml-1 text-[10px] text-muted-foreground">({owner.deal_count})</span>}</TabsTrigger>
          <TabsTrigger value="activity">Activity {interactionCount > 0 && <span className="ml-1 text-[10px] text-muted-foreground">({interactionCount})</span>}</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="flex flex-col gap-4 mt-4">
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

          {owner.assets && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold text-sm mb-2">Portfolio</h3>
              <p className="text-sm">{owner.assets}</p>
            </div>
          )}

          {/* Contacts / Relationship Map */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Relationship Map · Fusion ↔ {owner.company}</h3>
              <AddContact ownerId={owner.id} />
            </div>
            {contacts && contacts.length > 0 ? (
              <>
              {/* Mobile cards */}
              <div className="md:hidden flex flex-col gap-2">
                {contacts.map((c: OwnerContactPublic) => (
                  <div key={c.id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">
                          {c.senior_flag && <span className="inline-block bg-amber-100 text-amber-700 text-[9px] font-bold px-1 rounded mr-1">C</span>}
                          {c.owner_contact}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {c.fusion_role}{(c as any).contact_title ? ` · ${(c as any).contact_title}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <ContactDialog ownerId={owner.id} contact={c} />
                        <DeleteContactBtn contactId={c.id} ownerId={owner.id} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <Badge label={c.strength} colorMap={{ Strong: "bg-green-100 text-green-700", Warm: "bg-amber-100 text-amber-700", New: "bg-gray-100 text-gray-600" }} />
                      {c.last_met && <span className="text-[10px] text-muted-foreground">Met {c.last_met}</span>}
                    </div>
                    {((c as any).email || (c as any).phone) && (
                      <div className="flex items-center gap-3 mt-2 text-[11px]">
                        {(c as any).email && <a href={`mailto:${(c as any).email}`} className="text-primary hover:underline truncate">{(c as any).email}</a>}
                        {(c as any).phone && <a href={`tel:${(c as any).phone}`} className="text-primary hover:underline">{(c as any).phone}</a>}
                      </div>
                    )}
                    {c.note && <p className="text-[11px] text-muted-foreground mt-1.5">{c.note}</p>}
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {["Fusion","Owner Contact","Title","Email","Phone","Strength","Last Met","Note",""].map(h => (
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
                        <td className="py-2 pr-3 text-muted-foreground text-xs">{(c as any).contact_title || "—"}</td>
                        <td className="py-2 pr-3 text-muted-foreground text-xs">
                          {(c as any).email ? <a href={`mailto:${(c as any).email}`} className="hover:underline">{(c as any).email}</a> : "—"}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground text-xs">
                          {(c as any).phone ? <a href={`tel:${(c as any).phone}`} className="hover:underline">{(c as any).phone}</a> : "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge label={c.strength} colorMap={{ Strong: "bg-green-100 text-green-700", Warm: "bg-amber-100 text-amber-700", New: "bg-gray-100 text-gray-600" }} />
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{c.last_met || "—"}</td>
                        <td className="py-2 pr-2 text-muted-foreground text-xs">{c.note || "—"}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-0.5">
                            <ContactDialog ownerId={owner.id} contact={c} />
                            <DeleteContactBtn contactId={c.id} ownerId={owner.id} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No contacts yet. Click <span className="font-medium">Add Contact</span> to map the relationship.
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Projects Tab ── */}
        <TabsContent value="projects" className="mt-4">
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
              <div className="grid grid-cols-2 gap-3">
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
        <TabsContent value="deals" className="mt-4">
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
        <TabsContent value="activity" className="mt-4">
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
                    <div className="rounded-md bg-muted/40 p-2.5 group/intr">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{i.interaction_type}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">{i.date}</span>
                          <span className="opacity-0 group-hover/intr:opacity-100 transition-opacity">
                            <DeleteInteractionBtn interactionId={i.id} ownerId={owner.id} />
                          </span>
                        </div>
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
      </Tabs>
    </div>
  )
}
