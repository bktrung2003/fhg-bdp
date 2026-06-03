"""Add tasks and activities tables

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-03 00:03:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'task',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('deal_id', sa.Uuid(), nullable=True),
        sa.Column('deal_name', sa.String(255), nullable=True),
        sa.Column('task_owner', sa.String(100), nullable=True),
        sa.Column('due_date', sa.String(20), nullable=True),
        sa.Column('priority', sa.String(20), nullable=False, server_default='Medium'),
        sa.Column('status', sa.String(20), nullable=False, server_default='Open'),
        sa.Column('note', sa.String(1000), nullable=True),
        sa.Column('created_by_id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'activity',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('activity_type', sa.String(30), nullable=False, server_default='Meeting'),
        sa.Column('date', sa.String(20), nullable=False),
        sa.Column('deal_id', sa.Uuid(), nullable=True),
        sa.Column('deal_name', sa.String(255), nullable=True),
        sa.Column('note', sa.String(1000), nullable=True),
        sa.Column('created_by_id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade():
    op.drop_table('activity')
    op.drop_table('task')
