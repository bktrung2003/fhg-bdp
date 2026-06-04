import { useQuery } from "@tanstack/react-query"
import { MasterDataService } from "@/client"

/**
 * Fetch master data values for a category.
 * Returns string[] of active values sorted by sort_order.
 * Cached aggressively — master data rarely changes.
 */
export function useMasterData(category: string): string[] {
  const { data } = useQuery({
    queryKey: ["master-data", category],
    queryFn: () => MasterDataService.listByCategory({ category, activeOnly: true }),
    staleTime: 1000 * 60 * 5, // 5 min
  })
  return (data ?? []).map(d => d.value)
}

/**
 * Hook for stage→probability lookup.
 * Returns: { probabilityForStage: (stage: string) => number | undefined }
 */
export function useStageProbabilities() {
  const { data } = useQuery({
    queryKey: ["master-data", "stage_probability"],
    queryFn: () => MasterDataService.listByCategory({ category: "stage_probability", activeOnly: true }),
    staleTime: 1000 * 60 * 5,
  })
  const mapping = new Map<string, number>()
  ;(data ?? []).forEach(entry => {
    const parts = entry.value.split(":")
    if (parts.length === 2) {
      const stage = parts[0].trim()
      const prob = parseInt(parts[1].trim(), 10)
      if (!Number.isNaN(prob)) mapping.set(stage, prob)
    }
  })
  return {
    probabilityForStage: (stage: string) => mapping.get(stage),
    stageProbabilities: mapping,
  }
}

/**
 * Master data category keys — typed for autocomplete.
 */
export const MD = {
  COUNTRY: "country",
  SEGMENT: "segment",
  CONSTRUCTION_STATUS: "construction_status",
  DESIGN_STATUS: "design_status",
  LEGAL_STATUS: "legal_status",
  FUNDING_STATUS: "funding_status",
  PROJECT_STATUS: "project_status",
  DEAL_STAGE: "deal_stage",
  DEAL_RISK: "deal_risk",
  FEASIBILITY_STATUS: "feasibility_status",
  PROJECT_TYPE: "project_type",
  REGION: "region",
  BRAND: "brand",
  OWNER_TYPE: "owner_type",
  OWNER_RELATIONSHIP: "owner_relationship",
  CATCHUP_STATUS: "catchup_status",
  CONTACT_STRENGTH: "contact_strength",
  INTERACTION_TYPE: "interaction_type",
  TASK_STATUS: "task_status",
  TASK_PRIORITY: "task_priority",
  ACTIVITY_TYPE: "activity_type",
  DOC_TYPE: "doc_type",
  DOC_PERMISSION: "doc_permission",
  MILESTONE_DEPT: "milestone_dept",
  MILESTONE_GATE: "milestone_gate",
  OPENING_TARGET: "opening_target",
} as const
