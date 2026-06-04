import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Building2, MapPin, Bed } from "lucide-react"

import { ProjectsService, type DealPublic } from "@/client"
import { AddDeal } from "@/components/Deals/AddDeal"
import { EditProject } from "@/components/Projects/EditProject"
import { Button } from "@/components/ui/button"
import { Plus, ExternalLink } from "lucide-react"

export const Route = createFileRoute("/_layout/projects_/$projectId")({
  component: ProjectWorkspace,
  head: () => ({ meta: [{ title: "Project — Fusion BD CORE OS" }] }),
})

const STATUS_COLOR: Record<string, string> = {
  "Prospect":"bg-gray-100 text-gray-700","Active":"bg-blue-100 text-blue-700",
  "On Hold":"bg-amber-100 text-amber-700","Operating":"bg-green-100 text-green-700",
  "Lost":"bg-red-100 text-red-600","Closed":"bg-gray-200 text-gray-500",
}
const STAGE_COLOR: Record<string, string> = {
  "Lead":"bg-gray-100 text-gray-700","NDA / Qualified":"bg-blue-100 text-blue-700",
  "Feasibility":"bg-sky-100 text-sky-700","Proposal":"bg-violet-100 text-violet-700",
  "Negotiation":"bg-orange-100 text-orange-700","LOI Signed":"bg-yellow-100 text-yellow-800",
  "HMA Signed":"bg-emerald-100 text-emerald-700","Pre-opening":"bg-teal-100 text-teal-700",
  "Opened":"bg-green-100 text-green-700","Lost":"bg-red-100 text-red-600",
}

const fmtM = (n?: number | null) => n != null ? `$${(n / 1_000_000).toFixed(1)}M` : "—"
const fmtMoney = (n?: number | null) => n != null ? `$${Math.round(n).toLocaleString("en-US")}` : "—"
const projNum = (n?: number | null) => n != null ? `FUS-P-${String(n).padStart(5, "0")}` : "—"

function ProjectWorkspace() {
  const { projectId } = Route.useParams()
  const navigate = useNavigate()

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => ProjectsService.getProject({ id: projectId }),
  })

  const { data: dealsData } = useQuery({
    queryKey: ["project-deals", projectId],
    queryFn: () => ProjectsService.listProjectDeals({ id: projectId }),
    enabled: !!project,
  })

  const deals = (dealsData ?? []) as DealPublic[]

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>
  if (!project) return (
    <div className="flex flex-col items-center gap-3 py-12">
      <p className="text-muted-foreground">Project not found.</p>
      <Link to="/projects"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back to Projects</Button></Link>
    </div>
  )

  return (
    <div className="flex flex-col gap-5 max-w-[1200px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/projects" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3 w-3" />Back to Projects
          </Link>
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs text-muted-foreground">{projNum(project.project_number)}</p>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[project.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
              {project.status}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">{project.name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5 flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{project.city ?? "—"}, {project.country}</span>
            {project.keys != null && <span className="inline-flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{project.keys} keys</span>}
            {project.project_type && <span>· {project.project_type}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EditProject project={project} />
        </div>
      </div>

      {/* Owner card */}
      {project.owner_name && (
        <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Owner</p>
              <p className="font-semibold">{project.owner_name}</p>
            </div>
          </div>
          {project.owner_name && (
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/owners" })}>
              View Owner Profile →
            </Button>
          )}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Status", value: project.status ?? "—" },
          { label: "Total Deals", value: String(project.deal_count) },
          { label: "Pipeline (Active)", value: fmtM(project.active_pipeline_value) },
          { label: "Opening Target", value: project.opening_target ?? "—" },
        ].map(k => (
          <div key={k.label} className="rounded-lg border bg-card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className="text-base font-bold mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Location card */}
      {(project.location_detail || project.google_maps_url || project.region) && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3">Location</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {project.region && (
              <div>
                <p className="text-xs text-muted-foreground">Region</p>
                <p className="font-medium">{project.region}</p>
              </div>
            )}
            {project.location_detail && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Address</p>
                <p>{project.location_detail}</p>
              </div>
            )}
            {project.google_maps_url && (
              <div className="col-span-2">
                <a href={project.google_maps_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm">
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on Google Maps
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Property details */}
      {(project.segment || project.room_mix || project.facilities) && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3">Property Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {project.segment && (
              <div>
                <p className="text-xs text-muted-foreground">Segment</p>
                <p className="font-medium">{project.segment}</p>
              </div>
            )}
            {project.room_mix && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Room Mix</p>
                <p>{project.room_mix}</p>
              </div>
            )}
            {project.facilities && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Facilities</p>
                <p>{project.facilities}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status pillars */}
      {(project.construction_status || project.design_status || project.legal_status || project.funding_status) && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3">Development Status</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Construction", value: project.construction_status },
              { label: "Design", value: project.design_status },
              { label: "Legal", value: project.legal_status },
              { label: "Funding", value: project.funding_status },
            ].map(s => (
              <div key={s.label} className="rounded-md bg-muted/40 border p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-sm font-semibold mt-1">{s.value ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {project.description && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <span className="font-semibold">Notes: </span>{project.description}
        </div>
      )}

      {/* Deals under this project */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm">Deals on this Project</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              All commercial opportunities (HMA, TSA, consulting...) linked to this asset
            </p>
          </div>
          <AddDeal
            defaultProjectId={project.id}
            trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Deal</Button>}
          />
        </div>
        {deals.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">No deals on this project yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Deal","Type","Stage","Probability","Pipeline","Fee Forecast","Risk",""].map(h => (
                  <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5 pr-3 pl-3 first:pl-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.map(d => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                  onClick={() => navigate({ to: "/deals/$dealId" as any, params: { dealId: d.id } })}
                >
                  <td className="py-2.5 pr-3 pl-3 text-sm font-medium">{d.name}</td>
                  <td className="py-2.5 pr-3 text-xs">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-purple-100 text-purple-700 font-medium">
                      {(d as any).deal_type ?? "HMA"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLOR[d.stage ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
                      {d.stage}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-sm tabular-nums">{d.probability != null ? `${d.probability}%` : "—"}</td>
                  <td className="py-2.5 pr-3 text-sm tabular-nums font-medium">{fmtM(d.pipeline_value)}</td>
                  <td className="py-2.5 pr-3 text-sm tabular-nums">{fmtMoney(d.fee_forecast)}</td>
                  <td className="py-2.5 pr-3 text-xs">
                    <span className={`inline-flex items-center gap-1.5 ${
                      d.risk === "Red" ? "text-red-600" : d.risk === "Amber" ? "text-amber-600" : "text-green-600"
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${
                        d.risk === "Red" ? "bg-red-500" : d.risk === "Amber" ? "bg-amber-400" : "bg-green-500"
                      }`} />
                      {d.risk}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                    → View
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
