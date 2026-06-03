"""Add is_confidential to document

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-06-03 00:05:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('document',
        sa.Column('is_confidential', sa.Boolean(), nullable=False, server_default='false')
    )


def downgrade():
    op.drop_column('document', 'is_confidential')
