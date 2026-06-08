"""Web Push subscriptions table

Revision ID: b0c1d2e3f4a5
Revises: a9b0c1d2e3f4
Create Date: 2026-06-08 04:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


revision = 'b0c1d2e3f4a5'
down_revision = 'a9b0c1d2e3f4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'pushsubscription',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('endpoint', sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=False),
        sa.Column('p256dh', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('auth', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('user_agent', sqlmodel.sql.sqltypes.AutoString(length=300), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_pushsubscription_user_id', 'pushsubscription', ['user_id'])
    op.create_index('ix_pushsubscription_endpoint', 'pushsubscription', ['endpoint'], unique=True)


def downgrade():
    op.drop_index('ix_pushsubscription_endpoint', table_name='pushsubscription')
    op.drop_index('ix_pushsubscription_user_id', table_name='pushsubscription')
    op.drop_table('pushsubscription')
