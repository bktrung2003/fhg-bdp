import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Home, UserCheck, Briefcase, Building2, BarChart3, Calculator,
  CheckSquare, Rocket, Sparkles, Bell, Smartphone, ArrowRight,
  HelpCircle, BookOpen, Workflow, Lightbulb,
} from "lucide-react"

export const Route = createFileRoute("/_layout/help")({
  component: HelpPage,
  head: () => ({ meta: [{ title: "Help — Fusion BD CORE OS" }] }),
})

// ── Module reference ──────────────────────────────────────────────────────────
const MODULES = [
  { icon: Home, name: "Dashboard", path: "/", what: "Your daily snapshot: pipeline funnel, hot deals, KPIs, and the latest activity across the whole team." },
  { icon: UserCheck, name: "Owner CRM 360", path: "/owners", what: "The relationship hub. Every hotel owner / developer with their priority, relationship strength, catch-up cadence, contacts, and linked deals." },
  { icon: Briefcase, name: "Projects", path: "/projects", what: "The physical hotel assets (a property). One project can carry several deals over its life — new build, re-brand, conversion." },
  { icon: Building2, name: "Deal Pipeline", path: "/deals", what: "Every opportunity moving through the stages Lead → NDA → Feasibility → Proposal → … → HMA Signed. Table or Kanban view." },
  { icon: BarChart3, name: "Feasibility", path: "/feasibility", what: "Score a deal across 6 dimensions to get an evidence-based recommendation (Strong Proceed → Reject). Pipeline scorecard ranks all deals." },
  { icon: Calculator, name: "Financial Model", path: "/feasibility", what: "Estimate NOI, fees, payback and run sensitivity (tornado) on a deal. Auto-suggests a Financial score. Print to PDF for committee." },
  { icon: CheckSquare, name: "Activities & Tasks", path: "/activities", what: "Log every interaction (meeting, call, site visit) and track tasks with owners, due dates and priority. Activities are append-only." },
  { icon: Rocket, name: "Pre-opening", path: "/preopening", what: "After HMA signs, track the milestones to opening day across departments, with Green / Amber / Red status." },
]

// ── Deal lifecycle ────────────────────────────────────────────────────────────
const LIFECYCLE = [
  { stage: "Lead", note: "New opportunity captured. Link it to an Owner + Project." },
  { stage: "NDA / Qualified", note: "NDA signed, basic fit confirmed." },
  { stage: "Feasibility", note: "Run the Feasibility scorecard + Financial Model." },
  { stage: "Proposal", note: "Send the term sheet / proposal." },
  { stage: "Negotiation", note: "Work the commercial terms." },
  { stage: "LOI / HMA Signed", note: "Deal won — contract executed." },
  { stage: "Pre-opening → Opened", note: "Hand to operations; track milestones to opening." },
]

// ── Key concepts ──────────────────────────────────────────────────────────────
const CONCEPTS = [
  { term: "Feasibility Score", def: "0–100 from 6 weighted dimensions (location, owner, market, financial, brand fit, risk). Drives the Recommendation band." },
  { term: "Stage & Probability", def: "Each pipeline stage maps to a default win probability. Weighted pipeline = value × probability." },
  { term: "Pipeline Value", def: "For HMA/Franchise it's annual revenue potential; for TSA/Consulting it's the one-time contract value. Badges show which." },
  { term: "NOI Yield", def: "Net Operating Income ÷ project cost. A core hotel investment return metric in the Financial Model." },
  { term: "ADR / RevPAR / Occupancy", def: "Average Daily Rate, Revenue per Available Room, and how full the hotel is — the revenue drivers." },
  { term: "Sensitivity (Tornado)", def: "Shows which assumption (ADR, occupancy, cost…) moves the result most — where due-diligence should focus." },
]

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQ = [
  { q: "How do I install the app on my phone?", a: "Open the site in your phone browser. Android/Chrome: tap the Install banner (one tap). iPhone/Safari: Share → Add to Home Screen (iOS 16.4+)." },
  { q: "How do I get notifications?", a: "Settings → Notifications → Enable. On iPhone you must install the app to the Home Screen first, then enable." },
  { q: "What gets me notified?", a: "Executives get a push when any deal changes stage. You get a daily summary if your tasks become overdue." },
  { q: "Who can see which deals?", a: "Today everyone with access sees the pipeline. Country-scoped visibility (BD Director sees their country) is a planned Phase 2 feature." },
  { q: "Can I try the system with sample data?", a: "Yes — Settings → Demo Data → Load. It adds realistic owners, projects, deals and more. Clear it anytime; it never touches real records." },
  { q: "Why can't I edit an activity?", a: "Activities are an immutable audit log — add a new one to correct the record. Tasks, however, can be edited." },
]

function HelpPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1100px] mx-auto w-full pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" />
          Help &amp; Guide
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Everything you need to get productive with Fusion BD CORE OS.
        </p>
      </div>

      {/* Quick start */}
      <section className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />Quick start (3 steps)
        </h2>
        <ol className="space-y-3">
          {[
            { t: "Load sample data", d: "Settings → Demo Data → Load — so the screens have something to explore.", to: "/settings" },
            { t: "Scan the Dashboard", d: "See the funnel, hot deals and KPIs at a glance.", to: "/" },
            { t: "Open a deal", d: "Pipeline → click a deal → explore Feasibility + Financial Model tabs.", to: "/deals" },
          ].map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{i + 1}</span>
              <div className="text-sm">
                <Link to={s.to} className="font-semibold hover:underline">{s.t}</Link>
                <span className="text-muted-foreground"> — {s.d}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Modules */}
      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-primary" />What each module is for
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MODULES.map((m) => (
            <Link key={m.name} to={m.path} className="rounded-lg border bg-card p-3 flex items-start gap-3 hover:bg-muted/40 transition-colors">
              <div className="rounded-md bg-muted p-2 shrink-0">
                <m.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm flex items-center gap-1">
                  {m.name} <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </p>
                <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">{m.what}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Deal lifecycle */}
      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Workflow className="h-4 w-4 text-primary" />A deal's journey
        </h2>
        <div className="rounded-lg border bg-card divide-y">
          {LIFECYCLE.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <span className="text-[10px] font-bold tabular-nums text-muted-foreground w-5">{i + 1}</span>
              <span className="font-semibold text-sm w-44 shrink-0">{s.stage}</span>
              <span className="text-[12px] text-muted-foreground">{s.note}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Concepts */}
      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-primary" />Key concepts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CONCEPTS.map((c) => (
            <div key={c.term} className="rounded-lg border bg-card p-3">
              <p className="font-semibold text-sm">{c.term}</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">{c.def}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mobile + notifications callout */}
      <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h2 className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
          <Smartphone className="h-4 w-4" />On your phone
        </h2>
        <ul className="text-[13px] text-blue-800 space-y-1.5 list-disc list-inside">
          <li>Install to your Home Screen for a full-screen, app-like experience (tap the Install banner).</li>
          <li className="flex items-start gap-1"><Bell className="h-3.5 w-3.5 mt-0.5 shrink-0" /> Turn on push in <b>Settings → Notifications</b> to get deal + task alerts.</li>
          <li>iPhone needs iOS 16.4+ and the app installed before notifications work.</li>
        </ul>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <HelpCircle className="h-4 w-4 text-primary" />FAQ
        </h2>
        <div className="flex flex-col gap-2">
          {FAQ.map((f, i) => (
            <details key={i} className="rounded-lg border bg-card p-3 group">
              <summary className="font-medium text-sm cursor-pointer list-none flex items-center justify-between">
                {f.q}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="text-center text-[11px] text-muted-foreground pt-2">
        Need more help? Contact your system administrator.
      </p>
    </div>
  )
}
