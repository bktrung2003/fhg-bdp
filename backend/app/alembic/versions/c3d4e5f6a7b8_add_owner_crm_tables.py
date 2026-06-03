"""Add owner CRM tables

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-03 00:02:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade():
    # ── owner ─────────────────────────────────────────────────────────────────
    op.create_table(
        'owner',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('company', sa.String(255), nullable=False),
        sa.Column('owner_type', sa.String(50), nullable=False, server_default='Developer'),
        sa.Column('country', sa.String(100), nullable=False),
        sa.Column('priority', sa.String(20), nullable=False, server_default='Medium'),
        sa.Column('relationship', sa.String(30), nullable=False, server_default='New'),
        sa.Column('catchup_status', sa.String(30), nullable=False, server_default='No cadence'),
        sa.Column('next_catchup', sa.String(20), nullable=True),
        sa.Column('assets', sa.String(500), nullable=True),
        sa.Column('financial_health', sa.String(20), nullable=True),
        sa.Column('strategic_value', sa.String(1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_owner_company', 'owner', ['company'])

    # ── owner_contact ─────────────────────────────────────────────────────────
    op.create_table(
        'owner_contact',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('owner_id', sa.Uuid(), nullable=False),
        sa.Column('fusion_role', sa.String(100), nullable=False),
        sa.Column('owner_contact', sa.String(100), nullable=False),
        sa.Column('strength', sa.String(20), nullable=False, server_default='New'),
        sa.Column('last_met', sa.String(20), nullable=True),
        sa.Column('senior_flag', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('note', sa.String(500), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['owner.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── owner_interaction ─────────────────────────────────────────────────────
    op.create_table(
        'owner_interaction',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('owner_id', sa.Uuid(), nullable=False),
        sa.Column('interaction_type', sa.String(30), nullable=False, server_default='Meeting'),
        sa.Column('date', sa.String(20), nullable=False),
        sa.Column('note', sa.String(1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['owner.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade():
    op.drop_table('owner_interaction')
    op.drop_table('owner_contact')
    op.drop_index('ix_owner_company', table_name='owner')
    op.drop_table('owner')
