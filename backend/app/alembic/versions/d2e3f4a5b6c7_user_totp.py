"""User — add TOTP 2FA fields

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-06-09 06:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd2e3f4a5b6c7'
down_revision = 'c1d2e3f4a5b6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user', sa.Column('totp_secret', sa.String(64), nullable=True))
    op.add_column('user', sa.Column('totp_enabled', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    op.drop_column('user', 'totp_enabled')
    op.drop_column('user', 'totp_secret')
