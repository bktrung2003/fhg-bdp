"""Owner — add logo_path

Revision ID: c1d2e3f4a5b6
Revises: b0c1d2e3f4a5
Create Date: 2026-06-09 02:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'c1d2e3f4a5b6'
down_revision = 'b0c1d2e3f4a5'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('owner', sa.Column('logo_path', sa.String(500), nullable=True))


def downgrade():
    op.drop_column('owner', 'logo_path')
