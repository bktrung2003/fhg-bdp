import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Building2, Search, X } from "lucide-react"
import { useState } from "react"

import { DealsService, type DealPublic, type DealRisk, type DealStage } from "@/client"
import { AddDeal } from "@/components/Deals/AddDeal"
import { dealColumns } from "@/components/Deals/columns"
import { DataTable } from "@/components/Common/DataTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_layout/deals")({
  component: DealsPage,
  head: () => ({
    meta: [{ title: "Deal Pipeline — Fusion BD CORE OS" }],
  }),
})

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES: DealStage[] = [
  "Lead", "NDA / Qualified", "Feasibility", "Proposal", "Negotiation",
  "LOI Signed", "HMA Signed", "Pre-opening", "Opened", "Lost",
]

const RISKS: DealRisk[] = ["Green", "Amber", "Red"]

// ── Main Page ─────────────────────────────────────────────────────────────────

function DealsPage() {
  const [search, setSearch] = useState("")
  const [stage, setStage] = useState<string>("")
  const [risk, setRisk] = useState<string>("")

  const { data, isLoading } = useQuery({
    queryKey: ["deals", { search, stage, risk }],
    queryFn: () =>
      DealsService.listDeals({
        search: search || undefined,
        stage: (stage as DealStage) || undefined,
        risk: (risk as DealRisk) || undefined,
        limit: 200,
      }),
  })

  const deals: DealPublic[] = data?.data ?? []
  const total = data?.count ?? 0

  const hasFilters = search || stage || risk

  function clearFilters() {
    setSearch("")
    setStage("")
    setRisk("")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deal Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? "Loading..." : `${total} deal${total !== 1 ? "s" : ""} found`}
          </p>
        </div>
        <AddDeal />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search project, owner, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={risk} onValueChange={setRisk}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All risks" />
          </SelectTrigger>
          <SelectContent>
            {RISKS.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Loading deals...
        </div>
      ) : deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
          <div className="rounded-full bg-muted p-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No deals found</p>
            <p className="text-sm text-muted-foreground">
              {hasFilters ? "Try adjusting your filters." : "Create your first deal to get started."}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto w-full">
          <DataTable columns={dealColumns} data={deals} />
        </div>
      )}
    </div>
  )
}
