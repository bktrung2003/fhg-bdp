"""Add feasibility_snapshot table

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-06-03 00:06:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'a7b8c9d0e1f2'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'feasibility_snapshot',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('deal_id', sa.Uuid(), nullable=True),
        sa.Column('deal_name', sa.String(255), nullable=True),
        sa.Column('label', sa.String(100), nullable=True),
        sa.Column('assumptions', sa.String(2000), nullable=False),
        sa.Column('outputs', sa.String(2000), nullable=False),
        sa.Column('created_by_id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_feasibility_snapshot_deal_id', 'feasibility_snapshot', ['deal_id'])


def downgrade():
    op.drop_index('ix_feasibility_snapshot_deal_id', table_name='feasibility_snapshot')
    op.drop_table('feasibility_snapshot')
