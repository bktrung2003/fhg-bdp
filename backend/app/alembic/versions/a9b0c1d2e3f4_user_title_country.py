"""User — add title + country fields

Revision ID: a9b0c1d2e3f4
Revises: f8a9b0c1d2e3
Create Date: 2026-06-05 03:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'a9b0c1d2e3f4'
down_revision = 'f8a9b0c1d2e3'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user', sa.Column('title', sa.String(120), nullable=True))
    op.add_column('user', sa.Column('country', sa.String(80), nullable=True))
    op.create_index('ix_user_country', 'user', ['country'])


def downgrade():
    op.drop_index('ix_user_country', table_name='user')
    op.drop_column('user', 'country')
    op.drop_column('user', 'title')
