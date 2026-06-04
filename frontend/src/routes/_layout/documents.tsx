import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { FileText, Trash2, Upload, Eye, EyeOff, Lock, Search, X } from "lucide-react"
import { useRef, useState } from "react"

import { DocumentsService, DealsService, type DocumentPublic } from "@/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import useCustomToast from "@/hooks/useCustomToast"
import { MD, useMasterData } from "@/hooks/useMasterData"
import { usePagination, PaginationControls } from "@/components/Common/Pagination"

// ── Preview helper — fetch with auth then open blob ───────────────────────────
async function previewDocument(url: string, filename: string) {
  const { OpenAPI } = await import("@/client")
  const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN() : OpenAPI.TOKEN

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) { alert("Cannot open file — access denied or file not found."); return }

  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  window.open(blobUrl, "_blank")
  // Revoke after 30s
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000)
}

export const Route = createFileRoute("/_layout/documents")({
  component: DocumentsPage,
  head: () => ({ meta: [{ title: "Documents — Fusion BD CORE OS" }] }),
})


// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSize(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`
  return `${bytes} B`
}

const PERM_COLOR: Record<string, string> = {
  "Internal Only":     "bg-gray-100 text-gray-600",
  "Shared with Owner": "bg-blue-100 text-blue-700",
  "Restricted":        "bg-red-100 text-red-600",
}

const TYPE_COLOR: Record<string, string> = {
  "NDA":             "bg-purple-100 text-purple-700",
  "Proposal":        "bg-blue-100 text-blue-700",
  "Feasibility":     "bg-teal-100 text-teal-700",
  "HMA Draft":       "bg-amber-100 text-amber-700",
  "Contract":        "bg-green-100 text-green-700",
}

// ── Upload Dialog ─────────────────────────────────────────────────────────────

function UploadDocument() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState("Other")
  const [permission, setPermission] = useState("Internal Only")
  const DOC_TYPES = useMasterData(MD.DOC_TYPE)
  const PERMISSIONS = useMasterData(MD.DOC_PERMISSION)
  const [name, setName] = useState("")
  const [selectedDealId, setSelectedDealId] = useState("")
  const [selectedDealName, setSelectedDealName] = useState("")
  const [version, setVersion] = useState("v1.0")
  const [isConfidential, setIsConfidential] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [uploading, setUploading] = useState(false)

  // Fetch all active deals for dropdown
  const { data: dealsData } = useQuery({
    queryKey: ["deals-picker"],
    queryFn: () => DealsService.listDeals({ limit: 500 }),
    enabled: open,
  })
  const deals = dealsData?.data ?? []

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); if (!name) setName(f.name.replace(/\.[^.]+$/, "")) }
  }

  const handleDealSelect = (value: string) => {
    if (value === "__none__") {
      setSelectedDealId("")
      setSelectedDealName("")
      return
    }
    const deal = deals.find(d => d.id === value)
    if (deal) {
      setSelectedDealId(deal.id)
      setSelectedDealName(deal.name)
    }
  }

  const handleUpload = async () => {
    if (!file || !name) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("name", name)
      fd.append("doc_type", docType)
      fd.append("permission", permission)
      fd.append("deal_id", selectedDealId)
      fd.append("deal_name", selectedDealName)
      fd.append("version", version)
      fd.append("is_confidential", String(isConfidential))

      const { OpenAPI } = await import("@/client")
      const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN() : OpenAPI.TOKEN
      const res = await fetch(`${OpenAPI.BASE}/api/v1/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) throw new Error(await res.text())

      qc.invalidateQueries({ queryKey: ["documents"] })
      showSuccessToast("Document uploaded.")
      setOpen(false)
      setFile(null); setName(""); setSelectedDealId(""); setSelectedDealName("")
      setVersion("v1.0"); setDocType("Other"); setPermission("Internal Only"); setIsConfidential(false)
    } catch {
      showErrorToast("Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-1" />Upload Document
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
              {file ? (
                <div>
                  <FileText className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{fmtSize(file.size)}</p>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select file</p>
                  <p className="text-xs text-muted-foreground">PDF, Word, Excel, Images — max 50MB</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Document Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. NDA Fusion Da Nang" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Permission</Label>
                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PERMISSIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Deal dropdown — fetched from API */}
              <div className="col-span-2 space-y-1.5">
                <Label>Related Deal</Label>
                <Select value={selectedDealId || "__none__"} onValueChange={handleDealSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a deal (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— No deal —</SelectItem>
                    {deals.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="font-medium">{d.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{d.country} · {d.stage}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Version</Label>
                <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="v1.0" />
              </div>
            </div>

            {/* Confidential toggle */}
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <Checkbox
                id="confidential"
                checked={isConfidential}
                onCheckedChange={v => setIsConfidential(v === true)}
              />
              <label htmlFor="confidential" className="text-sm cursor-pointer flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                <span className="font-medium text-amber-800">Confidential</span>
                <span className="text-amber-600 text-xs">— only you + BDD / COO / CEO can view</span>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleUpload} disabled={!file || !name || uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Document Row ──────────────────────────────────────────────────────────────

function DocRow({ doc }: { doc: DocumentPublic }) {
  const qc = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const del = useMutation({
    mutationFn: () => DocumentsService.deleteDocument({ id: doc.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); showSuccessToast("Deleted.") },
  })

  const toggleConf = useMutation({
    mutationFn: () => DocumentsService.toggleConfidential({ id: doc.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); showSuccessToast(doc.is_confidential ? "Confidential removed." : "Marked confidential.") },
  })

  const typeColor = TYPE_COLOR[doc.doc_type ?? ""] ?? "bg-gray-100 text-gray-600"
  const permColor = PERM_COLOR[doc.permission ?? ""] ?? "bg-gray-100 text-gray-600"

  return (
    <tr className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${doc.is_confidential ? "bg-amber-50/40" : ""}`}>
      <td className="py-3 pr-3 pl-3">
        <div className="flex items-center gap-2">
          {doc.is_confidential
            ? <Lock className="h-4 w-4 text-amber-500 flex-shrink-0" />
            : <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          }
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium">{doc.name}</p>
              {doc.is_confidential && (
                <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1 rounded">CONFIDENTIAL</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{doc.original_filename}</p>
          </div>
        </div>
      </td>
      <td className="py-3 pr-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeColor}`}>
          {doc.doc_type}
        </span>
      </td>
      <td className="py-3 pr-3 text-sm text-muted-foreground">{doc.deal_name || "—"}</td>
      <td className="py-3 pr-3 text-sm font-mono text-muted-foreground">{doc.version}</td>
      <td className="py-3 pr-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${permColor}`}>
          {doc.permission}
        </span>
      </td>
      <td className="py-3 pr-3 text-xs text-muted-foreground">{fmtSize(doc.file_size)}</td>
      <td className="py-3 pr-3 text-xs text-muted-foreground whitespace-nowrap">
        {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString("en-GB") : "—"}
      </td>
      <td className="py-3 pr-2">
        <div className="flex items-center gap-0.5">
          {/* Preview — blob URL approach (works with auth) */}
          {doc.can_view && doc.download_url ? (
            <Button
              variant="ghost" size="sm" className="h-7 w-7 p-0"
              onClick={() => previewDocument(doc.download_url!, doc.original_filename)}
              title="Preview"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          ) : !doc.can_view ? (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-amber-400 cursor-not-allowed" title="Confidential — no access" disabled>
              <EyeOff className="h-3.5 w-3.5" />
            </Button>
          ) : null}

          {/* Toggle confidential */}
          <Button
            variant="ghost" size="sm"
            className={`h-7 w-7 p-0 ${doc.is_confidential ? "text-amber-500 hover:text-amber-700" : "text-muted-foreground hover:text-amber-500"}`}
            onClick={() => toggleConf.mutate()}
            disabled={toggleConf.isPending}
            title={doc.is_confidential ? "Remove confidential" : "Mark as confidential"}
          >
            <Lock className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost" size="sm"
            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
            onClick={() => del.mutate()}
            disabled={del.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function DocumentsPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [permFilter, setPermFilter] = useState("")
  const DOC_TYPES = useMasterData(MD.DOC_TYPE)
  const PERMISSIONS = useMasterData(MD.DOC_PERMISSION)

  const { data, isLoading } = useQuery({
    queryKey: ["documents", { search, typeFilter, permFilter }],
    queryFn: () => DocumentsService.listDocuments({
      search: search || undefined,
      docType: (typeFilter as any) || undefined,
      permission: (permFilter as any) || undefined,
      limit: 200,
    }),
  })

  const docs = data?.data ?? []
  const total = data?.count ?? 0
  const { page, setPage, pageSize, setPageSize, totalPages, paginated } = usePagination(docs, 10)
  const hasFilters = search || typeFilter || permFilter

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? "Loading..." : `${total} document${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <UploadDocument />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search document name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={permFilter} onValueChange={setPermFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All permissions" /></SelectTrigger>
          <SelectContent>{PERMISSIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setTypeFilter(""); setPermFilter("") }}>
            <X className="h-4 w-4 mr-1" />Clear
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Loading...</div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {hasFilters ? "No documents match your filters." : "No documents yet. Upload your first document."}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Document","Type","Related Deal","Version","Permission","Size","Uploaded",""].map(h => (
                  <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5 pr-3 pl-3 first:pl-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(d => <DocRow key={d.id} doc={d} />)}
            </tbody>
          </table>
        )}
        {docs.length > 0 && (
          <PaginationControls
            page={page} totalPages={totalPages} pageSize={pageSize} total={total}
            onPageChange={setPage} onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </div>
  )
}
