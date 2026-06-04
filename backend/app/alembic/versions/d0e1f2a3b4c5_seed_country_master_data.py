"""Seed country master data

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-06-04 00:09:00.000000

"""
import uuid
from alembic import op
import sqlalchemy as sa

revision = 'd0e1f2a3b4c5'
down_revision = 'c9d0e1f2a3b4'
branch_labels = None
depends_on = None

COUNTRIES = [
    # APAC core
    "Vietnam", "Thailand", "Indonesia", "Philippines", "Malaysia", "Singapore",
    "Cambodia", "Laos", "Myanmar", "Brunei",
    # North Asia
    "Japan", "South Korea", "China", "Hong Kong", "Taiwan",
    # South Asia
    "India", "Sri Lanka", "Maldives", "Nepal", "Bhutan", "Bangladesh",
    # Oceania
    "Australia", "New Zealand", "Fiji",
    # Middle East
    "UAE", "Saudi Arabia", "Qatar", "Oman",
]


def upgrade():
    rows = [{
        "id": str(uuid.uuid4()),
        "category": "country",
        "value": country,
        "sort_order": i,
        "is_active": True,
    } for i, country in enumerate(COUNTRIES)]

    op.bulk_insert(sa.table(
        'master_data',
        sa.column('id', sa.Uuid()),
        sa.column('category', sa.String()),
        sa.column('value', sa.String()),
        sa.column('sort_order', sa.Integer()),
        sa.column('is_active', sa.Boolean()),
    ), rows)


def downgrade():
    op.execute("DELETE FROM master_data WHERE category = 'country'")
