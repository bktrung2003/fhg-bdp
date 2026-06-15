# Changelog

All notable changes to Fusion BD CORE OS.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/) and
[Semantic Versioning](https://semver.org/). The in-app **What's New** page
(`/whats-new`) is generated from `frontend/src/releases.ts` — keep the two in
sync when cutting a release.

## [1.2.2] — 2026-06-15

### Security
- **Login rate limiting (brute-force protection)** — failed sign-ins are
  recorded (DB-backed, works across workers) and throttled: 8 per email or 25
  per IP within a 15-minute window returns 429. Wrong TOTP codes count too.
  A successful login clears the counter; old rows are pruned opportunistically.

## [1.2.1] — 2026-06-14

### Security
- **Disabled public self-registration** — `/users/signup` now returns 403
  unless `USERS_OPEN_REGISTRATION=true` (default false). Removed the "Sign up"
  link from the login page. Accounts are created by an admin.
- **Delete authorization** — deleting an owner or a project now requires a
  senior role (BD Director / COO / CEO) or superuser, matching deal deletion.

### Notes
- Reviewed: CORS is origin-scoped (no wildcard), passwords argon2/bcrypt-hashed,
  JWT-signed sessions, SQLModel parameterised queries, 2FA + idle logout.
- Known minor: file-serve uses a `?token=` query (JWT in URL → may appear in
  logs/history). Acceptable same-origin; could move to short-lived tokens later.

## [1.2.0] — 2026-06-13

### Added
- **Two-factor authentication (2FA)** — opt-in TOTP per user (Settings →
  Security). Scan a QR with Google/Microsoft Authenticator, verify a code to
  enable. Sign-in then requires a 6-digit code. Backend: `pyotp`,
  `user.totp_secret`/`totp_enabled`, `/2fa/setup|enable|disable`, login flow
  returns `TOTP_REQUIRED` then accepts a `code`.
- **Auto sign-out when idle** — per-device timeout (Off / 5 / 15 / 30 / 60 min)
  in Settings → Security; activity-reset timer clears the session on timeout.

## [1.1.0] — 2026-06-11

### Added
- **Reports** (`/reports`) — auto-generated from live data, one-click
  **Print / Save as PDF** (A4, branded, board-ready):
  - **Pipeline Report** — KPIs, breakdown by stage / type / country, full deal list.
  - **Owner Relationship Report** — owners by priority & relationship, catch-up
    status, projects/deals per owner.
  - **Feasibility Scorecard Report** — assessed deals ranked by score, by
    recommendation, 6-dimension breakdown.
  - **Activity Summary Report** — activities by type, most active deals, recent log.
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
