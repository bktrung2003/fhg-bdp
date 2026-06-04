"""Deal — probability_source field + seed stage→probability master data

Revision ID: d6e7f8a9b0c1
Revises: c5d6e7f8a9b0
Create Date: 2026-06-05 00:05:00.000000

"""
import uuid
from alembic import op
import sqlalchemy as sa


revision = 'd6e7f8a9b0c1'
down_revision = 'c5d6e7f8a9b0'
branch_labels = None
depends_on = None


# Default probability per stage (industry standard hospitality BD)
STAGE_PROBABILITIES = [
    ("Lead", 5),
    ("NDA / Qualified", 10),
    ("Feasibility", 20),
    ("Proposal", 40),
    ("Negotiation", 60),
    ("LOI Signed", 75),
    ("HMA Signed", 95),
    ("Pre-opening", 100),
    ("Opened", 100),
    ("Lost", 0),
]


def upgrade():
    # Add probability_source column
    op.add_column('deal', sa.Column(
        'probability_source', sa.String(10),
        nullable=False, server_default='auto'
    ))

    # Seed master data — store as "Stage:Probability" string for editability
    rows = []
    for i, (stage, prob) in enumerate(STAGE_PROBABILITIES):
        rows.append({
            "id": str(uuid.uuid4()),
            "category": "stage_probability",
            "value": f"{stage}:{prob}",
            "sort_order": i,
            "is_active": True,
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
    op.execute("DELETE FROM master_data WHERE category = 'stage_probability'")
    op.drop_column('deal', 'probability_source')
