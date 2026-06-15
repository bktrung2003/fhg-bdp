// Single source of truth for app version + release notes.
// Bump CURRENT_VERSION and add an entry here on each meaningful release.
// Powers the version badge + the /whats-new page.

export const CURRENT_VERSION = "1.2.2"

export interface Release {
  version: string
  date: string          // YYYY-MM-DD
  title: string
  highlights: string[]
}

export const RELEASES: Release[] = [
  {
    version: "1.2.2",
    date: "2026-06-09",
    title: "Login rate limiting",
    highlights: [
      "Brute-force protection — repeated failed sign-ins are throttled per account & IP (locks for 15 min)",
    ],
  },
  {
    version: "1.2.1",
    date: "2026-06-09",
    title: "Security hardening",
    highlights: [
      "Disabled public self-registration — accounts are created by an administrator",
      "Deleting owners and projects now requires a senior role (Director / COO / CEO)",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-06-09",
    title: "Security — 2FA & auto sign-out",
    highlights: [
      "Two-factor authentication (2FA) — opt-in TOTP with Google / Microsoft Authenticator (Settings → Security)",
      "Auto sign-out when idle — choose 5 / 15 / 30 / 60 min per device (Settings → Security)",
      "Sign-in adds a 6-digit code step for accounts with 2FA enabled",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-06-09",
    title: "Reports + polish",
    highlights: [
      "Reports — auto-generated, one-click Print / Save as PDF: Pipeline, Owner Relationship, Feasibility Scorecard, Activity Summary",
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
