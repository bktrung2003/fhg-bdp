"""Demo seed — rich realistic data for COO presentation.

Run via:
    cd backend
    uv run python scripts/seed_demo.py

Creates:
  - 6 owners (hospitality developers across APAC)
  - 8 projects (Vietnam destinations + 2 regional)
  - 12 deals across all pipeline stages
  - 5 feasibility assessments with mixed recommendations
  - 6 financial snapshots (Base/Worst/Upside for top deals)
  - ~30 tasks (mix of open/in-progress/done)
  - ~40 activities (last 60 days)
  - ~15 pre-opening milestones (for HMA Signed + Pre-opening deals)

All records tagged via DEMO_SEED note/tag for safe re-runs.
"""
import json
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Make `app` importable when run from anywhere
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, create_engine, select  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.models import (  # noqa: E402
    Activity, Deal, DealAuditLog, FeasibilityAssessment,
    FeasibilitySnapshot, Milestone, Owner, OwnerContact, OwnerInteraction,
    Project, Task, User,
    compute_feasibility_total, compute_feasibility_recommendation,
)

SEED_TAG = "DEMO_SEED"
NOW = datetime.now(timezone.utc)


def days_ago(n: int) -> datetime:
    return NOW - timedelta(days=n)


def iso(d: datetime | None) -> str | None:
    return d.date().isoformat() if d else None


# ── Data ────────────────────────────────────────────────────────────────────

OWNERS = [
    {"company": "Sun Group", "country": "Vietnam", "priority": "High",
     "relationship": "Strategic", "catchup_status": "Quarterly cadence",
     "assets": "12 hotels, 8 in pipeline", "financial_health": "Strong",
     "strategic_value": "Tier-1 partner — owns prime resort sites in central VN",
     "contacts": [
         {"fusion_role": "CEO", "owner_contact": "Mr. Đặng Minh Tuấn (Group CEO)",
          "strength": "Champion", "senior_flag": True,
          "note": "Direct relationship since 2019. Quarterly executive review."},
         {"fusion_role": "BD Director", "owner_contact": "Ms. Lê Phương Linh (VP Hospitality)",
          "strength": "Strong", "senior_flag": False,
          "note": "Day-to-day deal point of contact."},
     ]},
    {"company": "BRG Group", "country": "Vietnam", "priority": "High",
     "relationship": "Strategic", "catchup_status": "Monthly cadence",
     "assets": "5 hotels, 3 in development",
     "financial_health": "Strong",
     "strategic_value": "Hanoi/Hai Phong portfolio. Strong government ties.",
     "contacts": [
         {"fusion_role": "COO", "owner_contact": "Mr. Nguyễn Quang Hải (BRG Hospitality COO)",
          "strength": "Strong", "senior_flag": True,
          "note": "Met at IHIF 2024. Interest in luxury brand for new Hanoi project."},
     ]},
    {"company": "Vingroup", "country": "Vietnam", "priority": "Medium",
     "relationship": "Active",
     "catchup_status": "Active negotiation",
     "assets": "Vinpearl portfolio (17 properties)",
     "financial_health": "Strong",
     "strategic_value": "Largest VN hospitality operator. Selective brand partnerships.",
     "contacts": [
         {"fusion_role": "BD Director", "owner_contact": "Mr. Phạm Văn Hùng (Investment Director)",
          "strength": "Developing", "senior_flag": False,
          "note": "Phú Quốc resort dialogue ongoing."},
     ]},
    {"company": "FLC Group", "country": "Vietnam", "priority": "Low",
     "relationship": "Watching",
     "catchup_status": "No cadence",
     "assets": "Sam Son, Quy Nhon, Quang Ninh resorts",
     "financial_health": "Concerning",
     "strategic_value": "Regulatory issues 2022-2024. On hold until clarity.",
     "contacts": [
         {"fusion_role": "BD Manager", "owner_contact": "Ms. Trần Thị Mai (Acting CEO)",
          "strength": "Weak", "senior_flag": False,
          "note": "Last contact Q3 2024. Reactivate if regulatory clears."},
     ]},
    {"company": "NovaLand", "country": "Vietnam", "priority": "Medium",
     "relationship": "Active",
     "catchup_status": "Active negotiation",
     "assets": "NovaWorld Phan Thiet, Mui Ne, Ho Tram pipeline",
     "financial_health": "Stable",
     "strategic_value": "Master-planned community focus. Resort & branded residence potential.",
     "contacts": [
         {"fusion_role": "BD Director", "owner_contact": "Mr. Bùi Thành Nhơn (Founder)",
          "strength": "Developing", "senior_flag": True,
          "note": "Phan Thiet resort discussion. Long-term partnership potential."},
     ]},
    {"company": "Bangkok Capital Partners", "country": "Thailand", "priority": "Medium",
     "relationship": "New",
     "catchup_status": "Initial contact",
     "assets": "3 hotels in BKK, 1 Phuket development",
     "financial_health": "Strong",
     "strategic_value": "First Thailand expansion opportunity for FHG.",
     "contacts": [
         {"fusion_role": "BD Director APAC", "owner_contact": "Mr. Chatchawal Vongvanij (Managing Partner)",
          "strength": "New", "senior_flag": True,
          "note": "Introduced by mutual fund. Phuket greenfield."},
     ]},
]

# Projects represent hotel assets (one project can have multiple deals)
# NOTE: region must match APACRegion enum exactly; project_type must match ProjectType enum.
PROJECTS = [
    {"name": "Fusion Phú Quốc Beachfront Resort", "country": "Vietnam", "region": "Vietnam",
     "city": "Phú Quốc", "project_type": "Hotel New Build (Greenfield)", "keys": 280,
     "owner_company": "Sun Group", "status": "Active",
     "opening_target": "Q4 2026"},
    {"name": "BRG Hanoi Downtown Hotel", "country": "Vietnam", "region": "Vietnam",
     "city": "Hà Nội", "project_type": "Hotel New Build (Greenfield)", "keys": 220,
     "owner_company": "BRG Group", "status": "Active",
     "opening_target": "Q2 2027"},
    {"name": "Vinpearl Phú Quốc Marina Extension", "country": "Vietnam", "region": "Vietnam",
     "city": "Phú Quốc", "project_type": "Hotel Conversion (Takeover)", "keys": 180,
     "owner_company": "Vingroup", "status": "Active",
     "opening_target": "Q3 2026"},
    {"name": "Sun World Đà Nẵng Lifestyle Hotel", "country": "Vietnam", "region": "Vietnam",
     "city": "Đà Nẵng", "project_type": "Hotel New Build (Greenfield)", "keys": 320,
     "owner_company": "Sun Group", "status": "Active",
     "opening_target": "Q1 2027"},
    {"name": "NovaWorld Phan Thiết Resort", "country": "Vietnam", "region": "Vietnam",
     "city": "Phan Thiết", "project_type": "Hotel New Build (Greenfield)", "keys": 240,
     "owner_company": "NovaLand", "status": "Active",
     "opening_target": "Q2 2028"},
    {"name": "Sam Son Resort & Conference (FLC)", "country": "Vietnam", "region": "Vietnam",
     "city": "Sầm Sơn", "project_type": "Hotel New Build (Greenfield)", "keys": 380,
     "owner_company": "FLC Group", "status": "On Hold",
     "opening_target": "TBD"},
    {"name": "Fusion Đà Lạt Hilltop Resort", "country": "Vietnam", "region": "Vietnam",
     "city": "Đà Lạt", "project_type": "Wellness / Spa Resort", "keys": 120,
     "owner_company": "Sun Group", "status": "Active",
     "opening_target": "Q4 2025"},
    {"name": "Phuket Patong Beachfront", "country": "Thailand", "region": "Thailand",
     "city": "Phuket", "project_type": "Hotel New Build (Greenfield)", "keys": 260,
     "owner_company": "Bangkok Capital Partners", "status": "Active",
     "opening_target": "Q3 2027"},
]

# Deals: project_name + stage + financial structure
DEALS = [
    # Sun Group · Phú Quốc → HMA Signed (post-handover Pre-opening track)
    {"project": "Fusion Phú Quốc Beachfront Resort", "name": "Fusion Phú Quốc HMA",
     "deal_type": "HMA", "stage": "HMA Signed", "brand": "Fusion Original",
     "probability": 95, "pipeline_value": 18_000_000, "fee_forecast": 540_000,
     "risk": "Green", "feasibility": "Strong",
     "next_action": "Pre-opening kickoff scheduled June 15",
     "days_back": 30},
    # BRG · Hanoi → Negotiation
    {"project": "BRG Hanoi Downtown Hotel", "name": "BRG Hanoi Downtown HMA",
     "deal_type": "HMA", "stage": "Negotiation", "brand": "Fusion Original",
     "probability": 60, "pipeline_value": 22_000_000, "fee_forecast": 660_000,
     "risk": "Amber", "feasibility": "Medium",
     "next_action": "Revised LOI terms by June 10",
     "days_back": 14},
    # Vingroup · Phú Quốc → LOI Signed
    {"project": "Vinpearl Phú Quốc Marina Extension", "name": "Vinpearl Marina FA",
     "deal_type": "Franchise", "stage": "LOI Signed", "brand": "Fusion Original",
     "probability": 75, "pipeline_value": 12_000_000, "fee_forecast": 480_000,
     "risk": "Green", "feasibility": "Strong",
     "next_action": "HMA term sheet review June 20",
     "days_back": 7},
    # Sun Group · Đà Nẵng → Proposal
    {"project": "Sun World Đà Nẵng Lifestyle Hotel", "name": "Sun World Đà Nẵng HMA",
     "deal_type": "HMA", "stage": "Proposal", "brand": "Fusion Maia",
     "probability": 40, "pipeline_value": 26_000_000, "fee_forecast": 780_000,
     "risk": "Amber", "feasibility": "Strong",
     "next_action": "Submit revised proposal with phased fee June 12",
     "days_back": 21},
    # NovaLand · Phan Thiết → Feasibility
    {"project": "NovaWorld Phan Thiết Resort", "name": "NovaWorld Phan Thiết HMA",
     "deal_type": "HMA", "stage": "Feasibility", "brand": "Fusion Original",
     "probability": 20, "pipeline_value": 16_000_000, "fee_forecast": 480_000,
     "risk": "Amber", "feasibility": "Medium",
     "next_action": "Market study completion June 25",
     "days_back": 45},
    # FLC · Sầm Sơn → Lost (regulatory)
    {"project": "Sam Son Resort & Conference (FLC)", "name": "Sầm Sơn Resort HMA",
     "deal_type": "HMA", "stage": "Lost", "brand": None,
     "probability": 0, "pipeline_value": 19_000_000, "fee_forecast": 0,
     "risk": "Red", "feasibility": "Weak",
     "next_action": "Closed — owner regulatory issues unresolved",
     "days_back": 60},
    # Bangkok · Phuket → NDA / Qualified
    {"project": "Phuket Patong Beachfront", "name": "Phuket Patong HMA",
     "deal_type": "HMA", "stage": "NDA / Qualified", "brand": "Fusion Original",
     "probability": 10, "pipeline_value": 14_000_000, "fee_forecast": 420_000,
     "risk": "Amber", "feasibility": "TBD",
     "next_action": "Site visit scheduled June 28",
     "days_back": 10},
    # Sun Group · Đà Lạt → Pre-opening
    {"project": "Fusion Đà Lạt Hilltop Resort", "name": "Fusion Đà Lạt HMA",
     "deal_type": "HMA", "stage": "Pre-opening", "brand": "Fusion Original",
     "probability": 100, "pipeline_value": 8_000_000, "fee_forecast": 240_000,
     "risk": "Amber", "feasibility": "Strong",
     "next_action": "Pre-opening track 60-day countdown",
     "days_back": 90},
    # Standalone TSA deal — different deal type
    {"project": "Sun World Đà Nẵng Lifestyle Hotel", "name": "Sun World Đà Nẵng TSA",
     "deal_type": "TSA", "stage": "Proposal", "brand": None,
     "probability": 50, "pipeline_value": 400_000, "fee_forecast": None,
     "risk": "Green", "feasibility": "Strong",
     "next_action": "TSA scope confirmation June 8",
     "days_back": 14},
    # Pre-opening services deal
    {"project": "Vinpearl Phú Quốc Marina Extension", "name": "Vinpearl Marina Pre-opening",
     "deal_type": "Pre-opening", "stage": "Proposal", "brand": None,
     "probability": 50, "pipeline_value": 320_000, "fee_forecast": None,
     "risk": "Green", "feasibility": "Strong",
     "next_action": "Scope finalize after FA signed",
     "days_back": 5},
    # Lead stage — fresh
    {"project": "Fusion Phú Quốc Beachfront Resort", "name": "Phú Quốc Villa Annex Lead",
     "deal_type": "HMA", "stage": "Lead", "brand": "Fusion Original",
     "probability": 5, "pipeline_value": 6_000_000, "fee_forecast": 180_000,
     "risk": "Green", "feasibility": "TBD",
     "next_action": "Initial scoping call with Sun Group team",
     "days_back": 3},
    # BRG · Hai Phong follow-up — Opened (success)
    {"project": "BRG Hanoi Downtown Hotel", "name": "BRG Hải Phòng Sister Project",
     "deal_type": "HMA", "stage": "Opened", "brand": "Fusion Original",
     "probability": 100, "pipeline_value": 14_000_000, "fee_forecast": 420_000,
     "risk": "Green", "feasibility": "Strong",
     "next_action": "Operational handover complete",
     "days_back": 180},
]

# Feasibility assessments — for 5 deals across recommendation bands
ASSESSMENTS = [
    {"deal_name": "Fusion Phú Quốc HMA",
     "scores": {"location_score": 5, "market_score": 5, "owner_readiness_score": 5,
                "brand_fit_score": 5, "financial_score": 4, "technical_score": 4},
     "strengths": "Prime beachfront site, Sun Group strong track record, market white-space for upscale resort",
     "concerns": "Phú Quốc supply pipeline growing 30% YoY — pricing pressure risk in Year 2-3",
     "competitive_landscape": "IHG (InterContinental), Marriott (JW), Accor (Pullman) all bidding. Sun Group leans Fusion based on local brand affinity.",
     "deal_killers": "If Sun Group pulls back on TSA fee, or pivots to all-villa configuration that fails brand standard",
     "conditions": "Final fee structure to include incentive component triggering at GOP > 35%"},
    {"deal_name": "Sun World Đà Nẵng HMA",
     "scores": {"location_score": 4, "market_score": 4, "owner_readiness_score": 5,
                "brand_fit_score": 5, "financial_score": 4, "technical_score": 3},
     "strengths": "Lifestyle positioning matches Fusion Maia brand white-space. Sun Group repeat client.",
     "concerns": "Technical design needs significant rework for brand BOH standards",
     "competitive_landscape": "Accor and IHG both pitched. Sun Group's preference toward Fusion based on Phú Quốc success.",
     "deal_killers": "If design rework cost exceeds owner capex envelope (currently \\$26M)",
     "conditions": "Design review by FHG Technical Services team within 30 days"},
    {"deal_name": "NovaWorld Phan Thiết HMA",
     "scores": {"location_score": 3, "market_score": 3, "owner_readiness_score": 3,
                "brand_fit_score": 4, "financial_score": 3, "technical_score": 3},
     "strengths": "Master-planned community provides built-in demand. Long-term NovaLand partnership potential.",
     "concerns": "Phan Thiết market still maturing, ADR pressure. NovaLand cash flow constraints reported.",
     "competitive_landscape": "Wyndham incumbent in NovaWorld. We're challenger.",
     "deal_killers": "NovaLand financing delay beyond Q3 2025",
     "conditions": "NovaLand to confirm bridge financing before HMA signing"},
    {"deal_name": "Sầm Sơn Resort HMA",
     "scores": {"location_score": 2, "market_score": 2, "owner_readiness_score": 1,
                "brand_fit_score": 2, "financial_score": 1, "technical_score": 2},
     "strengths": "Large key count (380), F&B potential strong",
     "concerns": "FLC regulatory issues unresolved. Sầm Sơn market highly seasonal.",
     "competitive_landscape": "No active competitors — most operators avoiding FLC",
     "deal_killers": "Owner cannot certify clean title / regulatory clearance",
     "conditions": "FLC to provide audited financials + regulatory clearance — both pending 18+ months"},
    {"deal_name": "BRG Hanoi Downtown HMA",
     "scores": {"location_score": 5, "market_score": 4, "owner_readiness_score": 4,
                "brand_fit_score": 4, "financial_score": 4, "technical_score": 4},
     "strengths": "Prime Hanoi old quarter location. BRG well-funded and well-connected.",
     "concerns": "Brand fee negotiation aggressive — owner pushing for 2% base, target 2.5%",
     "competitive_landscape": "Marriott Autograph pitching same site. Decision expected within 30 days.",
     "deal_killers": "If owner accepts Marriott's lower fee (heard 1.8% base + IMF)",
     "conditions": "Base fee >= 2.25% non-negotiable. FHG to add complimentary TSA up to \\$200K."},
]

# Financial snapshots for 2 deals — Base/Worst/Upside scenarios
SNAPSHOTS = [
    # Fusion Phú Quốc — Base case
    {"deal_name": "Fusion Phú Quốc HMA", "label": "Base",
     "assumptions": {"rooms": 280, "adr": 185, "occupancy": 72, "otherRevPct": 38,
                     "gopPct": 36, "ffePct": 4, "feePct": 3, "projectCost": 52_000_000}},
    {"deal_name": "Fusion Phú Quốc HMA", "label": "Worst",
     "assumptions": {"rooms": 280, "adr": 150, "occupancy": 60, "otherRevPct": 30,
                     "gopPct": 30, "ffePct": 4, "feePct": 3, "projectCost": 55_000_000}},
    {"deal_name": "Fusion Phú Quốc HMA", "label": "Upside",
     "assumptions": {"rooms": 280, "adr": 210, "occupancy": 78, "otherRevPct": 42,
                     "gopPct": 40, "ffePct": 4, "feePct": 3.5, "projectCost": 52_000_000}},
    # BRG Hanoi — Base only
    {"deal_name": "BRG Hanoi Downtown HMA", "label": "Base",
     "assumptions": {"rooms": 220, "adr": 165, "occupancy": 70, "otherRevPct": 35,
                     "gopPct": 34, "ffePct": 4, "feePct": 2.75, "projectCost": 48_000_000}},
    # Sun World Đà Nẵng — Base + Worst
    {"deal_name": "Sun World Đà Nẵng HMA", "label": "Base",
     "assumptions": {"rooms": 320, "adr": 170, "occupancy": 68, "otherRevPct": 40,
                     "gopPct": 35, "ffePct": 4, "feePct": 3, "projectCost": 58_000_000}},
    {"deal_name": "Sun World Đà Nẵng HMA", "label": "Worst",
     "assumptions": {"rooms": 320, "adr": 140, "occupancy": 58, "otherRevPct": 32,
                     "gopPct": 30, "ffePct": 4, "feePct": 3, "projectCost": 60_000_000}},
]


def calc_outputs(a: dict) -> dict:
    revpar = a["adr"] * a["occupancy"] / 100
    rr = revpar * a["rooms"] * 365
    tr = rr * (1 + a["otherRevPct"] / 100)
    gop = tr * a["gopPct"] / 100
    ffe = tr * a["ffePct"] / 100
    noi = gop - ffe
    fee = tr * a["feePct"] / 100
    pb = a["projectCost"] / noi if noi > 0 else 0
    yld = (noi / a["projectCost"]) * 100 if a["projectCost"] > 0 else 0
    return {"revpar": revpar, "roomRevenue": rr, "totalRevenue": tr, "gop": gop,
            "ffeReserve": ffe, "ownerNOI": noi, "mgmtFee": fee,
            "paybackYears": pb, "noiYield": yld}


# Tasks — mix per deal
TASKS = [
    # Phú Quốc HMA (post-handover)
    {"deal": "Fusion Phú Quốc HMA", "title": "Schedule Operations handover meeting", "owner": "Admin", "due_days": 3, "status": "Open", "priority": "High"},
    {"deal": "Fusion Phú Quốc HMA", "title": "Coordinate pre-opening team kickoff", "owner": "Admin", "due_days": 7, "status": "Open", "priority": "High"},
    {"deal": "Fusion Phú Quốc HMA", "title": "Send executed HMA to Legal team archive", "owner": "Admin", "due_days": -2, "status": "Done", "priority": "Medium"},
    # BRG Hanoi (Negotiation)
    {"deal": "BRG Hanoi Downtown HMA", "title": "Draft revised LOI with phased fee structure", "owner": "Admin", "due_days": 2, "status": "In Progress", "priority": "High"},
    {"deal": "BRG Hanoi Downtown HMA", "title": "Schedule Mr. Hai senior executive review", "owner": "Admin", "due_days": 5, "status": "Open", "priority": "High"},
    {"deal": "BRG Hanoi Downtown HMA", "title": "Prepare competitive analysis vs Marriott Autograph", "owner": "Admin", "due_days": 4, "status": "In Progress", "priority": "High"},
    # Vinpearl Marina (LOI)
    {"deal": "Vinpearl Marina FA", "title": "HMA term sheet draft", "owner": "Admin", "due_days": 7, "status": "Open", "priority": "Medium"},
    {"deal": "Vinpearl Marina FA", "title": "Brand standard compliance check on existing build", "owner": "Admin", "due_days": 14, "status": "Open", "priority": "Medium"},
    # Sun World Đà Nẵng (Proposal)
    {"deal": "Sun World Đà Nẵng HMA", "title": "Submit revised proposal", "owner": "Admin", "due_days": 1, "status": "In Progress", "priority": "High"},
    {"deal": "Sun World Đà Nẵng HMA", "title": "Technical Services team design review", "owner": "Admin", "due_days": 21, "status": "Open", "priority": "Medium"},
    {"deal": "Sun World Đà Nẵng HMA", "title": "Lifestyle positioning workshop with Sun Group", "owner": "Admin", "due_days": 10, "status": "Open", "priority": "Medium"},
    # NovaWorld Phan Thiết (Feasibility)
    {"deal": "NovaWorld Phan Thiết HMA", "title": "Complete market study report", "owner": "Admin", "due_days": 14, "status": "In Progress", "priority": "Medium"},
    {"deal": "NovaWorld Phan Thiết HMA", "title": "Validate NovaLand financing capacity", "owner": "Admin", "due_days": -5, "status": "Done", "priority": "High"},
    # Sầm Sơn (Lost)
    {"deal": "Sầm Sơn Resort HMA", "title": "Re-evaluate when FLC regulatory clears", "owner": "Admin", "due_days": 180, "status": "Open", "priority": "Low"},
    # Phuket
    {"deal": "Phuket Patong HMA", "title": "Site visit with Mr. Chatchawal", "owner": "Admin", "due_days": 14, "status": "Open", "priority": "High"},
    {"deal": "Phuket Patong HMA", "title": "Brand fit study for Phuket market", "owner": "Admin", "due_days": 21, "status": "Open", "priority": "Medium"},
    # Đà Lạt (Pre-opening)
    {"deal": "Fusion Đà Lạt HMA", "title": "Confirm PMS go-live date", "owner": "Admin", "due_days": -1, "status": "Done", "priority": "High"},
    {"deal": "Fusion Đà Lạt HMA", "title": "Coordinate brand launch press release", "owner": "Admin", "due_days": 10, "status": "Open", "priority": "Medium"},
    # Cross-deal admin
    {"deal": "Fusion Phú Quốc HMA", "title": "Q2 board pack pipeline summary", "owner": "Admin", "due_days": 5, "status": "Open", "priority": "Medium"},
    {"deal": "BRG Hanoi Downtown HMA", "title": "Update Salesforce CRM with latest notes", "owner": "Admin", "due_days": 0, "status": "Open", "priority": "Low"},
]

# Activities — chronological, last 60 days
ACTIVITIES = [
    {"deal": "Fusion Phú Quốc HMA", "type": "Meeting",  "days_ago": 2,  "note": "Pre-opening handover meeting with Sun Group Ops team. Action items captured."},
    {"deal": "Fusion Phú Quốc HMA", "type": "Email",    "days_ago": 5,  "note": "Sent executed HMA copy to Legal team archive."},
    {"deal": "Fusion Phú Quốc HMA", "type": "Call",     "days_ago": 10, "note": "Mr. Tuấn called to confirm signing ceremony details."},
    {"deal": "Fusion Phú Quốc HMA", "type": "Document", "days_ago": 30, "note": "HMA executed — final version uploaded to Documents."},
    {"deal": "BRG Hanoi Downtown HMA", "type": "Meeting",  "days_ago": 1,  "note": "Mr. Hai term sheet review. Pushing back on 2.25% base fee."},
    {"deal": "BRG Hanoi Downtown HMA", "type": "Email",    "days_ago": 3,  "note": "Sent revised LOI draft to BRG legal team."},
    {"deal": "BRG Hanoi Downtown HMA", "type": "Meeting",  "days_ago": 7,  "note": "Competitive intelligence: Marriott pitched 1.8% base + IMF tiered."},
    {"deal": "BRG Hanoi Downtown HMA", "type": "Call",     "days_ago": 14, "note": "Initial term sheet alignment call. Gaps identified on fee + term."},
    {"deal": "Vinpearl Marina FA",     "type": "Document", "days_ago": 7,  "note": "LOI executed."},
    {"deal": "Vinpearl Marina FA",     "type": "Meeting",  "days_ago": 12, "note": "Brand fit review with Vinpearl asset management team."},
    {"deal": "Sun World Đà Nẵng HMA", "type": "Meeting",  "days_ago": 5,  "note": "Lifestyle brand positioning workshop. Maia brand aligned."},
    {"deal": "Sun World Đà Nẵng HMA", "type": "Email",    "days_ago": 14, "note": "Submitted initial proposal with standard fee structure."},
    {"deal": "Sun World Đà Nẵng HMA", "type": "Site Visit","days_ago": 28, "note": "Site walkthrough. Identified BOH design gaps."},
    {"deal": "Sun World Đà Nẵng TSA", "type": "Email",    "days_ago": 3,  "note": "TSA scope clarification sent."},
    {"deal": "NovaWorld Phan Thiết HMA", "type": "Meeting", "days_ago": 8, "note": "Mr. Nhơn meeting. Discussed financing timing."},
    {"deal": "NovaWorld Phan Thiết HMA", "type": "Document", "days_ago": 21, "note": "NovaLand financial statements reviewed — bridge financing concern."},
    {"deal": "NovaWorld Phan Thiết HMA", "type": "Site Visit", "days_ago": 35, "note": "Site visit to Phan Thiết master plan area."},
    {"deal": "Sầm Sơn Resort HMA", "type": "Note", "days_ago": 60, "note": "Deal marked Lost — FLC regulatory unresolved 18+ months."},
    {"deal": "Phuket Patong HMA", "type": "Meeting", "days_ago": 7, "note": "Initial intro call with Mr. Chatchawal. Site visit scheduled."},
    {"deal": "Phuket Patong HMA", "type": "Email",   "days_ago": 10, "note": "NDA executed and returned."},
    {"deal": "Fusion Đà Lạt HMA", "type": "Meeting", "days_ago": 1, "note": "Pre-opening 60-day countdown review."},
    {"deal": "Fusion Đà Lạt HMA", "type": "Document", "days_ago": 5, "note": "Brand standards compliance audit complete — all green."},
    {"deal": "Fusion Đà Lạt HMA", "type": "Meeting", "days_ago": 14, "note": "Weekly pre-opening standup. PMS on schedule."},
    {"deal": "Vinpearl Marina Pre-opening", "type": "Email", "days_ago": 2, "note": "Pre-opening services scope draft sent."},
    {"deal": "Phú Quốc Villa Annex Lead", "type": "Call", "days_ago": 1, "note": "Initial scoping call with Sun Group team about villa annex."},
    {"deal": "BRG Hải Phòng Sister Project", "type": "Note", "days_ago": 180, "note": "Hotel opened successfully. Soft launch complete."},
]

# Pre-opening milestones — for Đà Lạt and Phú Quốc
MILESTONES = [
    # Đà Lạt — opening in 60 days
    {"project": "Fusion Đà Lạt Hilltop Resort", "name": "PMS Implementation", "dept": "IT", "owner": "IT Manager", "due_days": -2, "status": "Green", "blocker": None},
    {"project": "Fusion Đà Lạt Hilltop Resort", "name": "Brand Compliance Audit", "dept": "Ops", "owner": "Pre-opening Director", "due_days": -5, "status": "Green", "blocker": None},
    {"project": "Fusion Đà Lạt Hilltop Resort", "name": "Staff Training Program", "dept": "HR", "owner": "Training Lead", "due_days": 15, "status": "Amber", "blocker": "20% staff turnover Q1 2026"},
    {"project": "Fusion Đà Lạt Hilltop Resort", "name": "Marketing Launch Campaign", "dept": "Marketing", "owner": "Marketing Director", "due_days": 30, "status": "Green", "blocker": None},
    {"project": "Fusion Đà Lạt Hilltop Resort", "name": "Soft Opening Plan", "dept": "Ops", "owner": "Pre-opening Director", "due_days": 45, "status": "Green", "blocker": None},
    {"project": "Fusion Đà Lạt Hilltop Resort", "name": "Operating License", "dept": "Legal", "owner": "Legal Counsel", "due_days": -10, "status": "Red", "blocker": "Local authority paperwork delayed 3 weeks"},
    {"project": "Fusion Đà Lạt Hilltop Resort", "name": "FF&E Final Delivery", "dept": "Procurement", "owner": "Procurement Lead", "due_days": 7, "status": "Amber", "blocker": "Shipping container delay from Italy"},
    # Phú Quốc — opening Q4 2026
    {"project": "Fusion Phú Quốc Beachfront Resort", "name": "Pre-opening Team Kickoff", "dept": "Ops", "owner": "Pre-opening Director", "due_days": 14, "status": "Green", "blocker": None},
    {"project": "Fusion Phú Quốc Beachfront Resort", "name": "IT Infrastructure Design", "dept": "IT", "owner": "IT Director", "due_days": 60, "status": "Green", "blocker": None},
    {"project": "Fusion Phú Quốc Beachfront Resort", "name": "Chart of Accounts Setup", "dept": "Finance", "owner": "Finance Manager", "due_days": 90, "status": "Green", "blocker": None},
    {"project": "Fusion Phú Quốc Beachfront Resort", "name": "Brand Standards Walkthrough", "dept": "Design", "owner": "Design Lead", "due_days": 30, "status": "Amber", "blocker": "BOH layout pending owner sign-off"},
    {"project": "Fusion Phú Quốc Beachfront Resort", "name": "Permits & Licenses", "dept": "Legal", "owner": "Legal Counsel", "due_days": 120, "status": "Green", "blocker": None},
    # BRG Hải Phòng — opened (post-opening)
    {"project": "BRG Hanoi Downtown Hotel", "name": "Post-opening Review", "dept": "Ops", "owner": "Asset Manager", "due_days": 30, "status": "Green", "blocker": None},
]


# ── Loader ──────────────────────────────────────────────────────────────────

def get_admin(session: Session) -> User:
    user = session.exec(select(User).where(User.email == "admin@fusionhotelgroup.com")).first()
    if not user:
        raise RuntimeError("Admin user not found — run initial migrate + create_superuser first")
    return user


def clear_demo(session: Session) -> None:
    """Delete records tagged with DEMO_SEED. Order matters for FK."""
    # Audit logs first (FK to Deal)
    audits = session.exec(select(DealAuditLog).where(
        DealAuditLog.note.like(f"%{SEED_TAG}%")  # type: ignore[union-attr]
    )).all()
    for a in audits:
        session.delete(a)
    session.commit()

    # Get demo deals (by name in seed)
    seed_deal_names = {d["name"] for d in DEALS}
    deals_to_clear = session.exec(select(Deal).where(
        Deal.name.in_(seed_deal_names)  # type: ignore[attr-defined]
    )).all()
    deal_ids = [d.id for d in deals_to_clear]

    if deal_ids:
        # Feasibility assessments
        for fa in session.exec(select(FeasibilityAssessment).where(
            FeasibilityAssessment.deal_id.in_(deal_ids)  # type: ignore[attr-defined]
        )).all():
            session.delete(fa)
        # Snapshots
        for s in session.exec(select(FeasibilitySnapshot).where(
            FeasibilitySnapshot.deal_id.in_(deal_ids)  # type: ignore[attr-defined]
        )).all():
            session.delete(s)
        # Audit logs by deal
        for a in session.exec(select(DealAuditLog).where(
            DealAuditLog.deal_id.in_(deal_ids)  # type: ignore[attr-defined]
        )).all():
            session.delete(a)
        # Tasks
        for t in session.exec(select(Task).where(
            Task.deal_id.in_(deal_ids)  # type: ignore[attr-defined]
        )).all():
            session.delete(t)
        # Activities
        for a in session.exec(select(Activity).where(
            Activity.deal_id.in_(deal_ids)  # type: ignore[attr-defined]
        )).all():
            session.delete(a)

    # Milestones (linked by project)
    seed_project_names = {p["name"] for p in PROJECTS}
    for m in session.exec(select(Milestone).where(
        Milestone.project_name.in_(seed_project_names)  # type: ignore[attr-defined]
    )).all():
        session.delete(m)

    # Deals
    for d in deals_to_clear:
        session.delete(d)

    # Projects
    for p in session.exec(select(Project).where(
        Project.name.in_(seed_project_names)  # type: ignore[attr-defined]
    )).all():
        session.delete(p)

    # Owners — by company
    seed_owner_companies = {o["company"] for o in OWNERS}
    for o in session.exec(select(Owner).where(
        Owner.company.in_(seed_owner_companies)  # type: ignore[attr-defined]
    )).all():
        # Owner contacts/interactions cascade by ondelete=CASCADE
        session.delete(o)

    session.commit()
    print(f"  Cleared previous demo data ({len(deals_to_clear)} deals, related records)")


def seed_owners(session: Session, admin: User) -> dict[str, uuid.UUID]:
    owner_map: dict[str, uuid.UUID] = {}
    for od in OWNERS:
        owner = Owner(
            company=od["company"], owner_type="Developer", country=od["country"],
            priority=od["priority"], relationship=od["relationship"],
            catchup_status=od["catchup_status"],
            assets=od.get("assets"), financial_health=od.get("financial_health", "Unknown"),
            strategic_value=od.get("strategic_value"),
            created_at=NOW, updated_at=NOW,
        )
        session.add(owner)
        session.flush()
        owner_map[od["company"]] = owner.id
        for cd in od["contacts"]:
            session.add(OwnerContact(
                owner_id=owner.id, fusion_role=cd["fusion_role"],
                owner_contact=cd["owner_contact"], strength=cd.get("strength", "New"),
                senior_flag=cd.get("senior_flag", False), note=cd.get("note"),
            ))
        # 2 interactions per owner
        session.add(OwnerInteraction(
            owner_id=owner.id, interaction_type="Meeting",
            date=iso(days_ago(30)), note=f"{SEED_TAG}: Quarterly review meeting",
            created_at=NOW,
        ))
        session.add(OwnerInteraction(
            owner_id=owner.id, interaction_type="Email",
            date=iso(days_ago(7)), note=f"{SEED_TAG}: Follow-up correspondence",
            created_at=NOW,
        ))
    return owner_map


def seed_projects(session: Session, admin: User, owner_map: dict[str, uuid.UUID]) -> dict[str, uuid.UUID]:
    project_map: dict[str, uuid.UUID] = {}
    # Get max existing project_number to avoid collision
    existing_max = session.exec(select(Project)).all()
    next_num = (max([p.project_number or 0 for p in existing_max], default=0)) + 1
    for pd in PROJECTS:
        proj = Project(
            name=pd["name"], country=pd["country"], region=pd.get("region"),
            city=pd.get("city"), project_type=pd.get("project_type"),
            keys=pd.get("keys"),
            owner_id=owner_map.get(pd["owner_company"]),
            owner_name=pd["owner_company"],
            status=pd.get("status", "Active"),
            opening_target=pd.get("opening_target"),
            project_number=next_num,
            created_by_id=admin.id, created_at=NOW, updated_at=NOW,
        )
        session.add(proj)
        session.flush()
        project_map[pd["name"]] = proj.id
        next_num += 1
    return project_map


def seed_deals(session: Session, admin: User, project_map: dict[str, uuid.UUID],
               owner_map: dict[str, uuid.UUID]) -> dict[str, uuid.UUID]:
    deal_map: dict[str, uuid.UUID] = {}
    # Get max existing deal_number
    existing_max = session.exec(select(Deal)).all()
    next_num = (max([d.deal_number or 0 for d in existing_max], default=0)) + 1

    project_meta = {p["name"]: p for p in PROJECTS}

    for dd in DEALS:
        proj = project_meta[dd["project"]]
        stage_changed = days_ago(dd["days_back"])
        deal = Deal(
            name=dd["name"], country=proj["country"], region=proj.get("region"),
            city=proj.get("city"),
            owner_name=proj["owner_company"], brand=dd.get("brand"),
            project_type=proj.get("project_type"),
            stage=dd["stage"], opening_target=proj.get("opening_target"),
            keys=proj.get("keys"), probability=dd["probability"],
            probability_source="manual",  # avoid auto-set on insert
            pipeline_value=dd["pipeline_value"], fee_forecast=dd.get("fee_forecast"),
            risk=dd["risk"], feasibility=dd.get("feasibility", "TBD"),
            next_action=dd["next_action"],
            deal_type=dd["deal_type"],
            project_id=project_map[dd["project"]],
            deal_number=next_num,
            bd_owner_id=admin.id, created_by_id=admin.id,
            stage_changed_at=stage_changed, created_at=stage_changed, updated_at=NOW,
        )
        session.add(deal)
        session.flush()
        deal_map[dd["name"]] = deal.id
        # Audit log
        session.add(DealAuditLog(
            deal_id=deal.id, user_id=admin.id, field="stage",
            old_value=None, new_value=deal.stage,
            note=f"{SEED_TAG}: Deal created", created_at=stage_changed,
        ))
        next_num += 1
    return deal_map


def seed_assessments(session: Session, admin: User, deal_map: dict[str, uuid.UUID]) -> None:
    for ad in ASSESSMENTS:
        deal_id = deal_map.get(ad["deal_name"])
        if not deal_id:
            continue
        scores = ad["scores"]
        score_vals = list(scores.values())
        total = compute_feasibility_total(score_vals)
        rec = compute_feasibility_recommendation(total)
        fa = FeasibilityAssessment(
            deal_id=deal_id, **scores, total_score=total, recommendation=rec,
            strengths=ad["strengths"], concerns=ad["concerns"],
            competitive_landscape=ad["competitive_landscape"],
            deal_killers=ad["deal_killers"],
            conditions_to_proceed=ad["conditions"],
            version=1, is_current=True,
            assessed_by_id=admin.id, assessed_at=days_ago(5),
        )
        session.add(fa)
        # Audit log
        session.add(DealAuditLog(
            deal_id=deal_id, user_id=admin.id, field="feasibility_assessment",
            old_value=None, new_value=f"{total}/100 {rec}",
            note=f"{SEED_TAG}: v1 assessed", created_at=days_ago(5),
        ))


def seed_snapshots(session: Session, admin: User, deal_map: dict[str, uuid.UUID]) -> None:
    for sd in SNAPSHOTS:
        deal_id = deal_map.get(sd["deal_name"])
        if not deal_id:
            continue
        outputs = calc_outputs(sd["assumptions"])
        session.add(FeasibilitySnapshot(
            deal_id=deal_id, deal_name=sd["deal_name"], label=sd["label"],
            assumptions=json.dumps(sd["assumptions"]),
            outputs=json.dumps(outputs),
            created_by_id=admin.id, created_at=days_ago(7),
        ))


def seed_tasks(session: Session, admin: User, deal_map: dict[str, uuid.UUID]) -> None:
    for td in TASKS:
        deal_id = deal_map.get(td["deal"])
        if not deal_id:
            continue
        session.add(Task(
            title=td["title"], deal_id=deal_id, deal_name=td["deal"],
            task_owner=td["owner"], task_owner_id=admin.id,
            due_date=iso(days_ago(-td["due_days"])),
            priority=td.get("priority", "Medium"), status=td.get("status", "Open"),
            created_by_id=admin.id, created_at=days_ago(20), updated_at=NOW,
        ))


def seed_activities(session: Session, admin: User, deal_map: dict[str, uuid.UUID]) -> None:
    for ad in ACTIVITIES:
        deal_id = deal_map.get(ad["deal"])
        if not deal_id:
            continue
        session.add(Activity(
            activity_type=ad["type"], date=iso(days_ago(ad["days_ago"])),
            deal_id=deal_id, deal_name=ad["deal"], note=ad["note"],
            created_by_id=admin.id, created_at=days_ago(ad["days_ago"]),
        ))


def seed_milestones(session: Session, admin: User, project_map: dict[str, uuid.UUID]) -> None:
    for md in MILESTONES:
        project_id = project_map.get(md["project"])
        session.add(Milestone(
            name=md["name"], project_id=project_id, project_name=md["project"],
            department=md["dept"], milestone_owner=md["owner"],
            due_date=iso(days_ago(-md["due_days"])),
            status=md["status"], blocker=md.get("blocker"),
            created_by_id=admin.id, created_at=days_ago(20), updated_at=NOW,
        ))


def main() -> None:
    print(f"Seeding demo data for Fusion BD CORE OS...")
    print(f"  Database: {settings.SQLALCHEMY_DATABASE_URI}")

    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    with Session(engine) as session:
        admin = get_admin(session)
        print(f"  Admin user: {admin.email}\n")

        print("  Clearing previous demo data...")
        clear_demo(session)

        print(f"  Seeding {len(OWNERS)} owners...")
        owner_map = seed_owners(session, admin)
        session.flush()

        print(f"  Seeding {len(PROJECTS)} projects...")
        project_map = seed_projects(session, admin, owner_map)
        session.flush()

        print(f"  Seeding {len(DEALS)} deals...")
        deal_map = seed_deals(session, admin, project_map, owner_map)
        session.flush()

        print(f"  Seeding {len(ASSESSMENTS)} feasibility assessments...")
        seed_assessments(session, admin, deal_map)

        print(f"  Seeding {len(SNAPSHOTS)} financial snapshots...")
        seed_snapshots(session, admin, deal_map)

        print(f"  Seeding {len(TASKS)} tasks...")
        seed_tasks(session, admin, deal_map)

        print(f"  Seeding {len(ACTIVITIES)} activities...")
        seed_activities(session, admin, deal_map)

        print(f"  Seeding {len(MILESTONES)} milestones...")
        seed_milestones(session, admin, project_map)

        session.commit()
        print(f"\n  Done. Login at http://localhost:5173 as admin@fusionhotelgroup.com")


if __name__ == "__main__":
    main()
