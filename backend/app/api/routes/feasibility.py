import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import col, select

from app.api.deps import CurrentUser, SessionDep
from sqlmodel import SQLModel

from app.models import (
    Deal, DealAuditLog,
    FeasibilityAssessment, FeasibilityAssessmentCreate,
    FeasibilityAssessmentPublic, FeasibilityAssessmentHistory,
    FeasibilityAssessmentNotesUpdate, FeasibilityAssessmentReview,
    FeasibilitySnapshot, FeasibilitySnapshotCreate,
    FeasibilitySnapshotPublic, Message, User,
    compute_feasibility_recommendation, compute_feasibility_total,
)


# ── Scorecard schema ─────────────────────────────────────────────────────────

class ScorecardRow(SQLModel):
    assessment_id: uuid.UUID
    deal_id: uuid.UUID
    deal_number: int | None
    deal_name: str
    stage: str | None
    country: str | None
    bd_owner_name: str | None
    total_score: int
    recommendation: str
    location_score: int
    market_score: int
    owner_readiness_score: int
    brand_fit_score: int
    financial_score: int
    technical_score: int
    assessed_by_name: str | None
    assessed_at: datetime | None
    reviewed: bool
    days_since_assessed: int


class ScorecardResponse(SQLModel):
    data: list[ScorecardRow]
    count: int
    avg_score: float
    distribution: dict[str, int]  # {recommendation: count}

router = APIRouter(prefix="/feasibility", tags=["feasibility"])


@router.get("/snapshots", response_model=list[FeasibilitySnapshotPublic])
def list_snapshots(
    session: SessionDep, current_user: CurrentUser,
    deal_id: uuid.UUID | None = None,
    limit: int = Query(default=50, le=200),
) -> Any:
    stmt = select(FeasibilitySnapshot)
    if deal_id:
        stmt = stmt.where(FeasibilitySnapshot.deal_id == deal_id)
    stmt = stmt.order_by(col(FeasibilitySnapshot.created_at).desc()).limit(limit)
    return session.exec(stmt).all()


@router.post("/snapshots", response_model=FeasibilitySnapshotPublic, status_code=201)
def save_snapshot(
    *, session: SessionDep, current_user: CurrentUser,
    snap_in: FeasibilitySnapshotCreate,
) -> Any:
    snap = FeasibilitySnapshot.model_validate(
        snap_in,
        update={"created_by_id": current_user.id, "created_at": datetime.now(timezone.utc)},
    )
    session.add(snap)
    session.commit()
    session.refresh(snap)
    return snap


@router.get("/scorecard", response_model=ScorecardResponse)
def pipeline_scorecard(
    *, session: SessionDep, current_user: CurrentUser,
    recommendation: str | None = Query(default=None),
    reviewed_only: bool = Query(default=False),
) -> Any:
    """Pipeline-wide feasibility scorecard.

    Returns all CURRENT (is_current=True) assessments joined with deal and
    assessor info. Used by /feasibility 'Pipeline Scorecard' tab to give
    COO a single matrix view of all assessed deals."""
    stmt = select(FeasibilityAssessment).where(
        FeasibilityAssessment.is_current == True  # noqa: E712
    )
    if recommendation:
        stmt = stmt.where(FeasibilityAssessment.recommendation == recommendation)
    if reviewed_only:
        stmt = stmt.where(FeasibilityAssessment.reviewed_by_id.is_not(None))  # type: ignore
    stmt = stmt.order_by(col(FeasibilityAssessment.total_score).desc())

    rows = session.exec(stmt).all()
    now = datetime.now(timezone.utc)

    data: list[ScorecardRow] = []
    distribution: dict[str, int] = {}
    total_sum = 0

    for a in rows:
        deal = session.get(Deal, a.deal_id)
        if not deal:
            continue
        assessor = session.get(User, a.assessed_by_id)
        bd = session.get(User, deal.bd_owner_id) if deal.bd_owner_id else None
        delta_days = 0
        if a.assessed_at:
            delta = now - a.assessed_at.replace(tzinfo=timezone.utc)
            delta_days = delta.days

        row = ScorecardRow(
            assessment_id=a.id,
            deal_id=a.deal_id,
            deal_number=deal.deal_number,
            deal_name=deal.name,
            stage=deal.stage,
            country=deal.country,
            bd_owner_name=(bd.full_name or bd.email) if bd else None,
            total_score=a.total_score,
            recommendation=a.recommendation,
            location_score=a.location_score,
            market_score=a.market_score,
            owner_readiness_score=a.owner_readiness_score,
            brand_fit_score=a.brand_fit_score,
            financial_score=a.financial_score,
            technical_score=a.technical_score,
            assessed_by_name=(assessor.full_name or assessor.email) if assessor else None,
            assessed_at=a.assessed_at,
            reviewed=a.reviewed_by_id is not None,
            days_since_assessed=delta_days,
        )
        data.append(row)
        total_sum += a.total_score
        distribution[a.recommendation] = distribution.get(a.recommendation, 0) + 1

    avg = round(total_sum / len(data), 1) if data else 0.0
    return ScorecardResponse(
        data=data, count=len(data), avg_score=avg, distribution=distribution,
    )


@router.delete("/snapshots/{id}", response_model=Message)
def delete_snapshot(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    snap = session.get(FeasibilitySnapshot, id)
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    session.delete(snap)
    session.commit()
    return Message(message="Snapshot deleted")


# ─────────────────────────────────────────────────────────────────────────────
# FEASIBILITY ASSESSMENT (6-dimension scorecard, per deal)
# ─────────────────────────────────────────────────────────────────────────────

assessment_router = APIRouter(prefix="/deals/{deal_id}/feasibility", tags=["feasibility-assessment"])


def _enrich(session: SessionDep, a: FeasibilityAssessment) -> FeasibilityAssessmentPublic:
    pub = FeasibilityAssessmentPublic.model_validate(a, from_attributes=True)
    assessor = session.get(User, a.assessed_by_id)
    pub.assessed_by_name = (assessor.full_name or assessor.email) if assessor else None
    if a.reviewed_by_id:
        reviewer = session.get(User, a.reviewed_by_id)
        pub.reviewed_by_name = (reviewer.full_name or reviewer.email) if reviewer else None
    return pub


@assessment_router.get("", response_model=FeasibilityAssessmentPublic | None)
def get_current_assessment(
    *, session: SessionDep, current_user: CurrentUser, deal_id: uuid.UUID,
) -> Any:
    """Latest (is_current=True) assessment for a deal, or None."""
    a = session.exec(
        select(FeasibilityAssessment).where(
            FeasibilityAssessment.deal_id == deal_id,
            FeasibilityAssessment.is_current == True,  # noqa: E712
        )
    ).first()
    if not a:
        return None
    return _enrich(session, a)


@assessment_router.get("/history", response_model=FeasibilityAssessmentHistory)
def list_assessment_history(
    *, session: SessionDep, current_user: CurrentUser, deal_id: uuid.UUID,
) -> Any:
    rows = session.exec(
        select(FeasibilityAssessment)
        .where(FeasibilityAssessment.deal_id == deal_id)
        .order_by(col(FeasibilityAssessment.version).desc())
    ).all()
    data = [_enrich(session, r) for r in rows]
    return FeasibilityAssessmentHistory(data=data, count=len(data))


@assessment_router.post("", response_model=FeasibilityAssessmentPublic, status_code=201)
def create_assessment(
    *, session: SessionDep, current_user: CurrentUser,
    deal_id: uuid.UUID, body: FeasibilityAssessmentCreate,
) -> Any:
    """Create a new assessment version. Marks previous current=False."""
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Demote previous current
    previous = session.exec(
        select(FeasibilityAssessment).where(
            FeasibilityAssessment.deal_id == deal_id,
            FeasibilityAssessment.is_current == True,  # noqa: E712
        )
    ).all()
    next_version = 1
    for p in previous:
        p.is_current = False
        session.add(p)
        next_version = max(next_version, p.version + 1)

    scores = [
        body.location_score, body.market_score, body.owner_readiness_score,
        body.brand_fit_score, body.financial_score, body.technical_score,
    ]
    total = compute_feasibility_total(scores)
    rec = compute_feasibility_recommendation(total)

    now = datetime.now(timezone.utc)
    new_a = FeasibilityAssessment(
        deal_id=deal_id,
        location_score=body.location_score,
        market_score=body.market_score,
        owner_readiness_score=body.owner_readiness_score,
        brand_fit_score=body.brand_fit_score,
        financial_score=body.financial_score,
        technical_score=body.technical_score,
        total_score=total,
        recommendation=rec,
        strengths=body.strengths,
        concerns=body.concerns,
        competitive_landscape=body.competitive_landscape,
        deal_killers=body.deal_killers,
        conditions_to_proceed=body.conditions_to_proceed,
        version=next_version,
        is_current=True,
        assessed_by_id=current_user.id,
        assessed_at=now,
    )
    session.add(new_a)

    # Auto-sync legacy deal.feasibility dropdown from recommendation
    if rec in ("Strong Proceed", "Proceed"):
        deal.feasibility = "Pass"
    elif rec == "Reject":
        deal.feasibility = "Fail"
    else:
        deal.feasibility = "TBD"
    deal.updated_at = now
    session.add(deal)

    # Audit log
    session.add(DealAuditLog(
        deal_id=deal_id,
        user_id=current_user.id,
        field="feasibility_assessment",
        old_value=None,
        new_value=f"{total}/100 {rec}",
        note=f"v{next_version} assessed",
        created_at=now,
    ))
    session.commit()
    session.refresh(new_a)
    return _enrich(session, new_a)


@assessment_router.patch("/notes", response_model=FeasibilityAssessmentPublic)
def edit_assessment_notes(
    *, session: SessionDep, current_user: CurrentUser,
    deal_id: uuid.UUID, body: FeasibilityAssessmentNotesUpdate,
) -> Any:
    """Quick-edit the 5 strategic-notes text fields on the CURRENT assessment.

    Does NOT create a new version (scores unchanged). Use this for typo fixes,
    adding context, updating competitive intel — anything that doesn't change
    the scoring. Use POST (Reassess) when scores change."""
    a = session.exec(
        select(FeasibilityAssessment).where(
            FeasibilityAssessment.deal_id == deal_id,
            FeasibilityAssessment.is_current == True,  # noqa: E712
        )
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="No current assessment — run Assessment first")

    changed_fields: list[str] = []
    for field in ("strengths", "concerns", "competitive_landscape", "deal_killers", "conditions_to_proceed"):
        new_val = getattr(body, field)
        if new_val is not None and new_val != getattr(a, field):
            setattr(a, field, new_val if new_val.strip() else None)
            changed_fields.append(field)

    if not changed_fields:
        return _enrich(session, a)

    session.add(a)
    now = datetime.now(timezone.utc)
    session.add(DealAuditLog(
        deal_id=deal_id,
        user_id=current_user.id,
        field="feasibility_notes",
        old_value=None,
        new_value=f"v{a.version} notes edited",
        note=f"Edited: {', '.join(changed_fields)}",
        created_at=now,
    ))
    session.commit()
    session.refresh(a)
    return _enrich(session, a)


@assessment_router.post("/{assessment_id}/review", response_model=FeasibilityAssessmentPublic)
def review_assessment(
    *, session: SessionDep, current_user: CurrentUser,
    deal_id: uuid.UUID, assessment_id: uuid.UUID, body: FeasibilityAssessmentReview,
) -> Any:
    """Reviewer sign-off — typically COO or BD Director."""
    a = session.get(FeasibilityAssessment, assessment_id)
    if not a or a.deal_id != deal_id:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if a.assessed_by_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot review your own assessment (2-eyes principle)")
    now = datetime.now(timezone.utc)
    a.reviewed_by_id = current_user.id
    a.reviewed_at = now
    a.review_note = body.review_note
    session.add(a)
    session.add(DealAuditLog(
        deal_id=deal_id,
        user_id=current_user.id,
        field="feasibility_review",
        old_value=None,
        new_value=f"v{a.version} reviewed",
        note=body.review_note or "(no note)",
        created_at=now,
    ))
    session.commit()
    session.refresh(a)
    return _enrich(session, a)
