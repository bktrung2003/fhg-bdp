"""Feasibility Assessment — 6-dimension scorecard table

Revision ID: e7f8a9b0c1d2
Revises: d6e7f8a9b0c1
Create Date: 2026-06-05 00:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'e7f8a9b0c1d2'
down_revision = 'd6e7f8a9b0c1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "feasibility_assessment",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("deal_id", sa.Uuid(), sa.ForeignKey("deal.id", ondelete="CASCADE"), nullable=False),
        sa.Column("location_score", sa.Integer(), nullable=False),
        sa.Column("market_score", sa.Integer(), nullable=False),
        sa.Column("owner_readiness_score", sa.Integer(), nullable=False),
        sa.Column("brand_fit_score", sa.Integer(), nullable=False),
        sa.Column("financial_score", sa.Integer(), nullable=False),
        sa.Column("technical_score", sa.Integer(), nullable=False),
        sa.Column("total_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("recommendation", sa.String(50), nullable=False, server_default=""),
        sa.Column("strengths", sa.String(4000), nullable=True),
        sa.Column("concerns", sa.String(4000), nullable=True),
        sa.Column("conditions_to_proceed", sa.String(4000), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("assessed_by_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by_id", sa.Uuid(), sa.ForeignKey("user.id"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_note", sa.String(2000), nullable=True),
    )
    op.create_index("ix_feasibility_assessment_deal_id", "feasibility_assessment", ["deal_id"])
    op.create_index("ix_feasibility_assessment_is_current", "feasibility_assessment", ["is_current"])


def downgrade():
    op.drop_index("ix_feasibility_assessment_is_current", table_name="feasibility_assessment")
    op.drop_index("ix_feasibility_assessment_deal_id", table_name="feasibility_assessment")
    op.drop_table("feasibility_assessment")
