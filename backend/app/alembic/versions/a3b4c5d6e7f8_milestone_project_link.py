"""Milestone — add project_id (PRIMARY) + auto-link from existing deal_id

Revision ID: a3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Create Date: 2026-06-05 00:02:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'a3b4c5d6e7f8'
down_revision = 'f2a3b4c5d6e7'
branch_labels = None
depends_on = None


def upgrade():
    # ── 1. Add project_id + project_name to milestone ────────────────────────
    op.add_column('milestone', sa.Column('project_id', sa.Uuid(), nullable=True))
    op.add_column('milestone', sa.Column('project_name', sa.String(255), nullable=True))
    op.create_index('ix_milestone_project_id', 'milestone', ['project_id'])

    # ── 2. Backfill: for each milestone with deal_id, get the deal's project ─
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE milestone m
        SET project_id = d.project_id,
            project_name = (SELECT p.name FROM project p WHERE p.id = d.project_id)
        FROM deal d
        WHERE m.deal_id = d.id
          AND d.project_id IS NOT NULL
          AND m.project_id IS NULL
    """))


def downgrade():
    op.drop_index('ix_milestone_project_id', table_name='milestone')
    op.drop_column('milestone', 'project_name')
    op.drop_column('milestone', 'project_id')
