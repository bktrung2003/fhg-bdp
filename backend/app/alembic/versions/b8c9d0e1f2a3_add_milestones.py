"""Add milestones table for pre-opening tracker

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-06-03 00:07:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'b8c9d0e1f2a3'
down_revision = 'a7b8c9d0e1f2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'milestone',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('deal_id', sa.Uuid(), nullable=True),
        sa.Column('deal_name', sa.String(255), nullable=True),
        sa.Column('department', sa.String(30), nullable=False, server_default='Ops'),
        sa.Column('milestone_owner', sa.String(100), nullable=True),
        sa.Column('due_date', sa.String(20), nullable=True),
        sa.Column('status', sa.String(10), nullable=False, server_default='Green'),
        sa.Column('blocker', sa.String(500), nullable=True),
        sa.Column('created_by_id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_milestone_deal_id', 'milestone', ['deal_id'])


def downgrade():
    op.drop_index('ix_milestone_deal_id', table_name='milestone')
    op.drop_table('milestone')
