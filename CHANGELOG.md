# Changelog

All notable changes to Fusion BD CORE OS.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/) and
[Semantic Versioning](https://semver.org/). The in-app **What's New** page
(`/whats-new`) is generated from `frontend/src/releases.ts` — keep the two in
sync when cutting a release.

## [1.1.0] — 2026-06-09

### Added
- **Reports** (`/reports`) — auto-generated from live data. **Pipeline Report**:
  KPI summary (active/total deals, active + weighted pipeline), breakdown by
  stage / deal type / country, and the full deal-by-deal list. One-click
  **Print / Save as PDF** (A4, branded, board-ready).
- **Owner logos** — upload/replace/remove a company logo; shown on the owner
  header, list and mobile cards (graceful initials fallback).

### Changed
- Owner contacts: full edit + phone field. Interactions can be deleted.
- Owner & Project pages scale: search, multi-filter, sort; owner Deals tab
  grouped by project.
- Project detail re-ordered — Deals first, asset details last.
- Mobile polish across owner / deal / project detail.

### Fixed
- Backend runs migrations on startup (Watchtower-safe deploys).
- React #310 on owner detail (hook order).

## [1.0.0] — 2026-06-09

First release — COO demo baseline.

### Added
- **Owner CRM 360** — owners with priority, relationship strength, catch-up
  cadence; contacts (full CRUD: title, email, phone) and an interaction
  timeline (add + delete, append-only).
- **Projects** — hotel assets with location, keys, type, status; quarter-based
  opening target picker.
- **Deal Pipeline** — table + Kanban, stage gate with mandatory audit note,
  auto win-probability per stage, weighted pipeline value, risk flags.
- **Feasibility scorecard** — 6-dimension evidence scoring, recommendation
  bands, pipeline-wide ranking.
- **Financial Model** — NOI, yield, GOP, payback; Base/Worst/Upside scenarios;
  sensitivity (tornado); committee-ready PDF export; auto-suggested score.
- **Activities, Tasks & Documents** — interaction log, tasks with owners/due
  dates, document storage (MinIO) with in-app PDF preview + confidential flag.
- **Mobile app (PWA)** — installable to home screen, bottom navigation, card
  layouts, bottom-sheet modals; install prompt.
- **Push notifications** — deal stage changes (to executives) and overdue task
  reminders (daily).
- **User management** — roles, title, country scope.
- **Admin** — demo data loader, master data, in-app Help & Guide, What's New.

### Infrastructure
- GitHub Actions build → GHCR images; Portainer stack (Postgres + MinIO +
  backend + frontend); one-click deploy via Watchtower.

[1.0.0]: https://github.com/bktrung2003/fhg-bdp/releases/tag/v1.0.0
