"""Add master_data table

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-06-04 00:08:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'c9d0e1f2a3b4'
down_revision = 'b8c9d0e1f2a3'
branch_labels = None
depends_on = None

# Default master data values — seeded on first migration
DEFAULTS = {
    "deal_stage": ["Lead","NDA / Qualified","Feasibility","Proposal","Negotiation","LOI Signed","HMA Signed","Pre-opening","Opened","Lost"],
    "deal_risk": ["Green","Amber","Red"],
    "feasibility_status": ["TBD","Weak","Medium","Strong","Updated"],
    "project_type": ["Hotel New Build (Greenfield)","Hotel Re-Brand","Hotel Conversion (Takeover)","Hotel Adaptive Re-Use","Serviced Apartment New Build","Wellness / Spa Resort","Branded Residences"],
    "region": ["Vietnam","Thailand","Southeast Asia","Greater China","North Asia","South Asia","Australia / Pacific","Europe","Americas","Middle East & Africa"],
    "brand": ["Fusion","Fusion Resort","Fusion Suites","Fusion Wellness","Fusion Residences","Branded Residences"],
    "owner_type": ["Developer","Family Office","REIT","Asset Owner","Institutional Investor"],
    "owner_relationship": ["New","Warm","Strong","Strategic Partner","Risk / Unstable"],
    "catchup_status": ["On track","Due this week","Overdue","No cadence"],
    "contact_strength": ["New","Warm","Strong"],
    "interaction_type": ["Meeting","Dinner","Site visit","Phone call","WhatsApp summary","Proposal sent","NDA signed","Other"],
    "task_status": ["Open","In Progress","Blocked","Done"],
    "task_priority": ["High","Medium","Low"],
    "activity_type": ["Meeting","Dinner","Site visit","Phone call","WhatsApp summary","Proposal sent","NDA signed","LOI signed","HMA signed","Pre-opening review","Other"],
    "doc_type": ["NDA","Proposal","Feasibility","HMA Draft","Contract","Technical Drawings","Legal Document","Presentation","Other"],
    "doc_permission": ["Internal Only","Shared with Owner","Restricted"],
    "milestone_dept": ["Ops","IT","Finance","Design","Legal","Procurement","HR","Marketing"],
    "milestone_gate": ["Green","Amber","Red"],
    "opening_target": ["Q1 2026","Q2 2026","Q3 2026","Q4 2026","Q1 2027","Q2 2027","Q3 2027","Q4 2027","Q1 2028","TBD"],
}


def upgrade():
    op.create_table(
        'master_data',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('value', sa.String(255), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_master_data_category', 'master_data', ['category'])

    # Seed default values
    import uuid
    rows = []
    for category, values in DEFAULTS.items():
        for i, value in enumerate(values):
            rows.append({
                "id": str(uuid.uuid4()),
                "category": category,
                "value": value,
                "sort_order": i,
                "is_active": True,
            })

    if rows:
        op.bulk_insert(sa.table(
            'master_data',
            sa.column('id', sa.Uuid()),
            sa.column('category', sa.String()),
            sa.column('value', sa.String()),
            sa.column('sort_order', sa.Integer()),
            sa.column('is_active', sa.Boolean()),
        ), rows)


def downgrade():
    op.drop_index('ix_master_data_category', table_name='master_data')
    op.drop_table('master_data')
