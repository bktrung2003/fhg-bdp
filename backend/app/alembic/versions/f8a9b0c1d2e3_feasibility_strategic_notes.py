"""Feasibility Assessment — add competitive_landscape + deal_killers

Pragmatic BD strategic notes (revised from SWOT — see CLAUDE conversation).
Captures intelligence BD actually tracks vs. duplicating Market Score in O+T boxes.

Revision ID: f8a9b0c1d2e3
Revises: e7f8a9b0c1d2
Create Date: 2026-06-05 01:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'f8a9b0c1d2e3'
down_revision = 'e7f8a9b0c1d2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('feasibility_assessment',
        sa.Column('competitive_landscape', sa.String(4000), nullable=True))
    op.add_column('feasibility_assessment',
        sa.Column('deal_killers', sa.String(4000), nullable=True))


def downgrade():
    op.drop_column('feasibility_assessment', 'deal_killers')
    op.drop_column('feasibility_assessment', 'competitive_landscape')
