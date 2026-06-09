// Single source of truth for app version + release notes.
// Bump CURRENT_VERSION and add an entry here on each meaningful release.
// Powers the version badge + the /whats-new page.

export const CURRENT_VERSION = "1.1.0"

export interface Release {
  version: string
  date: string          // YYYY-MM-DD
  title: string
  highlights: string[]
}

export const RELEASES: Release[] = [
  {
    version: "1.1.0",
    date: "2026-06-09",
    title: "Reports + polish",
    highlights: [
      "Reports — auto-generated Pipeline Report (KPIs, stage/type/country breakdown, full deal list) with one-click Print / Save as PDF",
      "Owner logos — upload a company logo, shown across owner views",
      "Owner contacts — full edit + phone field; delete interactions",
      "Owner & Project pages handle scale — search, filters, sort, grouped deals",
      "Project detail re-ordered — deals first, asset details last",
      "Mobile polish across owner / deal / project detail pages",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-06-09",
    title: "First release — COO demo baseline",
    highlights: [
      "Owner CRM 360 — relationships, contacts (full CRUD), interaction timeline",
      "Projects & Deal Pipeline — table + Kanban, stage gate with audit trail",
      "Feasibility scorecard — 6-dimension evidence scoring + pipeline ranking",
      "Financial Model — NOI, payback, sensitivity (tornado), committee PDF",
      "Activities, Tasks & Documents (in-app PDF preview)",
      "Mobile app (PWA) — install to home screen, bottom nav, card layouts",
      "Push notifications — deal stage changes + overdue task reminders",
      "In-app Help & Guide, demo data loader, one-click deploy",
    ],
  },
]
