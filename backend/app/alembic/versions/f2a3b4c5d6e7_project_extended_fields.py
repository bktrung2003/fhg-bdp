"""Extended Project fields — location, segment, construction/design/legal/funding statuses

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-06-05 00:01:00.000000

"""
import uuid
from alembic import op
import sqlalchemy as sa


revision = 'f2a3b4c5d6e7'
down_revision = 'e1f2a3b4c5d6'
branch_labels = None
depends_on = None


def upgrade():
    # ── 1. Extend description to 2000 chars ──────────────────────────────────
    op.alter_column('project', 'description', type_=sa.String(2000), existing_nullable=True)

    # ── 2. New fields on project ─────────────────────────────────────────────
    op.add_column('project', sa.Column('location_detail', sa.String(500), nullable=True))
    op.add_column('project', sa.Column('google_maps_url', sa.String(500), nullable=True))
    op.add_column('project', sa.Column('segment', sa.String(50), nullable=True))
    op.add_column('project', sa.Column('room_mix', sa.String(500), nullable=True))
    op.add_column('project', sa.Column('facilities', sa.String(1000), nullable=True))
    op.add_column('project', sa.Column('construction_status', sa.String(50), nullable=True))
    op.add_column('project', sa.Column('design_status', sa.String(50), nullable=True))
    op.add_column('project', sa.Column('legal_status', sa.String(50), nullable=True))
    op.add_column('project', sa.Column('funding_status', sa.String(50), nullable=True))

    # ── 3. Seed master data for new categories ───────────────────────────────
    SEGMENTS = ["Luxury", "Upper Upscale", "Upscale", "Upper Midscale", "Midscale", "Economy"]
    CONSTRUCTION = ["Land only", "Site cleared", "Foundation", "Structure complete", "Topped out", "Fitting out", "Soft opening", "Operating"]
    DESIGN = ["Concept", "Schematic Design", "Design Development", "Construction Documents", "Approved", "Under revision"]
    LEGAL = ["Pre-MOU", "MOU signed", "LOI signed", "Due diligence", "HOA signed", "HMA signed", "Permits secured"]
    FUNDING = ["Self-funded", "Loan secured", "Equity partner", "Awaiting financing", "Capital raised", "Funded", "Funding unclear"]

    rows = []
    for cat, vals in [
        ("segment", SEGMENTS),
        ("construction_status", CONSTRUCTION),
        ("design_status", DESIGN),
        ("legal_status", LEGAL),
        ("funding_status", FUNDING),
    ]:
        for i, v in enumerate(vals):
            rows.append({
                "id": str(uuid.uuid4()), "category": cat, "value": v,
                "sort_order": i, "is_active": True,
            })

    op.bulk_insert(sa.table(
        'master_data',
        sa.column('id', sa.Uuid()),
        sa.column('category', sa.String()),
        sa.column('value', sa.String()),
        sa.column('sort_order', sa.Integer()),
        sa.column('is_active', sa.Boolean()),
    ), rows)


def downgrade():
    op.execute("DELETE FROM master_data WHERE category IN ('segment', 'construction_status', 'design_status', 'legal_status', 'funding_status')")
    for col in ('funding_status', 'legal_status', 'design_status', 'construction_status', 'facilities', 'room_mix', 'segment', 'google_maps_url', 'location_detail'):
        op.drop_column('project', col)
    op.alter_column('project', 'description', type_=sa.String(1000), existing_nullable=True)
