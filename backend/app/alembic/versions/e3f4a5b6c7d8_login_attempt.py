"""Login attempts (rate limiting)

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-06-09 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


revision = 'e3f4a5b6c7d8'
down_revision = 'd2e3f4a5b6c7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'loginattempt',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('ip_address', sqlmodel.sql.sqltypes.AutoString(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_loginattempt_email', 'loginattempt', ['email'])
    op.create_index('ix_loginattempt_ip_address', 'loginattempt', ['ip_address'])
    op.create_index('ix_loginattempt_created_at', 'loginattempt', ['created_at'])


def downgrade():
    op.drop_index('ix_loginattempt_created_at', table_name='loginattempt')
    op.drop_index('ix_loginattempt_ip_address', table_name='loginattempt')
    op.drop_index('ix_loginattempt_email', table_name='loginattempt')
    op.drop_table('loginattempt')
