"""Add deal and deal_audit_log tables

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-03 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # ── Enums ────────────────────────────────────────────────────────────────
    deal_stage = sa.Enum(
        'Lead', 'NDA / Qualified', 'Feasibility', 'Proposal', 'Negotiation',
        'LOI Signed', 'HMA Signed', 'Pre-opening', 'Opened', 'Lost',
        name='dealstage'
    )
    deal_risk = sa.Enum('Green', 'Amber', 'Red', name='dealrisk')
    deal_feas = sa.Enum('TBD', 'Weak', 'Medium', 'Strong', 'Updated', name='dealfeasibility')
    project_type = sa.Enum(
        'Hotel New Build (Greenfield)', 'Hotel Re-Brand',
        'Hotel Conversion (Takeover)', 'Hotel Adaptive Re-Use',
        'Serviced Apartment New Build', 'Wellness / Spa Resort', 'Branded Residences',
        name='projecttype'
    )
    apac_region = sa.Enum(
        'Vietnam', 'Thailand', 'Southeast Asia', 'Greater China',
        'North Asia', 'South Asia', 'Australia / Pacific',
        'Europe', 'Americas', 'Middle East & Africa',
        name='apacregion'
    )

    for e in [deal_stage, deal_risk, deal_feas, project_type, apac_region]:
        e.create(op.get_bind(), checkfirst=True)

    # ── deal table ───────────────────────────────────────────────────────────
    op.create_table(
        'deal',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('deal_number', sa.Integer(), nullable=True),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('country', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('region', sa.Enum(name='apacregion'), nullable=True),
        sa.Column('city', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('owner_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column('brand', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('project_type', sa.Enum(name='projecttype'), nullable=True),
        sa.Column('stage', sa.Enum(name='dealstage'), nullable=False, server_default='Lead'),
        sa.Column('opening_target', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column('keys', sa.Integer(), nullable=True),
        sa.Column('probability', sa.Integer(), nullable=True),
        sa.Column('pipeline_value', sa.Integer(), nullable=True),
        sa.Column('fee_forecast', sa.Integer(), nullable=True),
        sa.Column('risk', sa.Enum(name='dealrisk'), nullable=False, server_default='Green'),
        sa.Column('feasibility', sa.Enum(name='dealfeasibility'), nullable=False, server_default='TBD'),
        sa.Column('next_action', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('bd_owner_id', sa.Uuid(), nullable=True),
        sa.Column('created_by_id', sa.Uuid(), nullable=False),
        sa.Column('stage_changed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['bd_owner_id'], ['user.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_deal_deal_number', 'deal', ['deal_number'])

    # ── deal_audit_log table ─────────────────────────────────────────────────
    op.create_table(
        'deal_audit_log',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('deal_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('field', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('old_value', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('new_value', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False),
        sa.Column('note', sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['deal_id'], ['deal.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade():
    op.drop_table('deal_audit_log')
    op.drop_index('ix_deal_deal_number', table_name='deal')
    op.drop_table('deal')

    for name in ['apacregion', 'projecttype', 'dealfeasibility', 'dealrisk', 'dealstage']:
        sa.Enum(name=name).drop(op.get_bind(), checkfirst=True)
