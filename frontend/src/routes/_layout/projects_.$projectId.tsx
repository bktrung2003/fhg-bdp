import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Building2, MapPin, Bed } from "lucide-react"

import { ProjectsService, type DealPublic, type MilestonePublic, type DocumentPublic } from "@/client"
import { AddDeal } from "@/components/Deals/AddDeal"
import { EditProject } from "@/components/Projects/EditProject"
import { AddMilestone } from "@/routes/_layout/preopening"
import { UploadDocument } from "@/routes/_layout/documents"
import { Button } from "@/components/ui/button"
import { Plus, ExternalLink, Rocket, AlertCircle, FileText, Lock } from "lucide-react"

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

  const { data: milestonesData } = useQuery({
    queryKey: ["project-milestones", projectId],
    queryFn: () => ProjectsService.listProjectMilestones({ id: projectId }),
    enabled: !!project,
  })

  const { data: documentsData } = useQuery({
    queryKey: ["project-documents", projectId],
    queryFn: () => ProjectsService.listProjectDocuments({ id: projectId }),
    enabled: !!project,
  })

  const deals = (dealsData ?? []) as DealPublic[]
  const milestones = (milestonesData ?? []) as MilestonePublic[]
  const documents = (documentsData ?? []) as DocumentPublic[]
  const redCount = milestones.filter(m => m.status === "Red").length
  const amberCount = milestones.filter(m => m.status === "Amber").length

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

      {/* Pre-opening Gates (asset-level governance) */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Rocket className="h-4 w-4 text-muted-foreground" />
              Pre-opening Gates
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Asset-level execution milestones across departments (COO governance)
            </p>
          </div>
          <AddMilestone
            defaultProjectId={project.id}
            trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Milestone</Button>}
          />
        </div>

        {/* Red alert */}
        {redCount > 0 && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span><span className="font-semibold">{redCount} milestone{redCount > 1 ? "s" : ""}</span> at Red gate — escalation required</span>
          </div>
        )}

        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">No pre-opening milestones yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Milestone","Department","Owner","Due Date","Gate","Blocker"].map(h => (
                  <th key={h} className="text-left text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 pr-3 pl-3 first:pl-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {milestones.map(m => (
                <tr key={m.id} className={`border-b last:border-0 hover:bg-muted/20 ${
                  m.status === "Red" ? "bg-red-50/40" : m.status === "Amber" ? "bg-amber-50/30" : ""
                }`}>
                  <td className="py-2.5 pr-3 pl-3 text-sm font-medium">{m.name}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">{m.department}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">{m.milestone_owner ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">{m.due_date ?? "—"}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.status === "Red" ? "bg-red-100 text-red-600" :
                      m.status === "Amber" ? "bg-amber-100 text-amber-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${
                        m.status === "Red" ? "bg-red-500" :
                        m.status === "Amber" ? "bg-amber-400" :
                        "bg-green-500"
                      }`} />
                      {m.status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground max-w-[300px] truncate">{m.blocker ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Summary footer */}
        {milestones.length > 0 && (
          <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground flex items-center gap-4">
            <span>Total: {milestones.length}</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />{milestones.length - redCount - amberCount} on track</span>
            {amberCount > 0 && <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{amberCount} attention</span>}
            {redCount > 0 && <span className="flex items-center gap-1 text-red-600 font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />{redCount} escalate</span>}
          </div>
        )}
      </div>

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

      {/* Documents linked to project + its deals */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Documents ({documents.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Asset-level docs (Feasibility, Drawings) + Deal-specific docs (NDA, Proposal, HMA)
            </p>
          </div>
          <UploadDocument
            defaultProjectId={project.id}
            trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Upload Document</Button>}
          />
        </div>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">
            No documents yet. Upload Feasibility Reports, Technical Drawings or any deal-specific docs.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Document","Type","Linked To","Version","Permission","Size",""].map(h => (
                  <th key={h} className="text-left text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground py-2.5 pr-3 pl-3 first:pl-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="py-2.5 pr-3 pl-3">
                    <div className="flex items-center gap-2">
                      {doc.is_confidential
                        ? <Lock className="h-3.5 w-3.5 text-amber-500" />
                        : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground">{doc.original_filename}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-xs">{doc.doc_type}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                    {doc.deal_name ? <span>📋 {doc.deal_name}</span> : <span>📁 Project-level</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-xs font-mono text-muted-foreground">{doc.version}</td>
                  <td className="py-2.5 pr-3 text-xs">{doc.permission}</td>
                  <td className="py-2.5 pr-3 text-[10px] text-muted-foreground">
                    {doc.file_size >= 1_000_000 ? `${(doc.file_size / 1_000_000).toFixed(1)} MB` : `${(doc.file_size / 1_000).toFixed(0)} KB`}
                  </td>
                  <td className="py-2.5 pr-3">
                    {doc.can_view && doc.download_url && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs"
                        onClick={() => window.open(doc.download_url!, "_blank")}>
                        Open
                      </Button>
                    )}
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
