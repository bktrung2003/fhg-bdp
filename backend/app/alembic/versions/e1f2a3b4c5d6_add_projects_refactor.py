"""Add Projects entity + refactor Deal to link to Project + enhance OwnerContact

Revision ID: e1f2a3b4c5d6
Revises: d0e1f2a3b4c5
Create Date: 2026-06-05 00:00:00.000000

"""
import uuid
from alembic import op
import sqlalchemy as sa


revision = 'e1f2a3b4c5d6'
down_revision = 'd0e1f2a3b4c5'
branch_labels = None
depends_on = None


def upgrade():
    # ── 1. Create project table ────────────────────────────────────────────────
    op.create_table(
        'project',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('project_number', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('owner_id', sa.Uuid(), nullable=True),
        sa.Column('country', sa.String(100), nullable=False),
        sa.Column('region', sa.String(50), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('project_type', sa.String(80), nullable=True),
        sa.Column('keys', sa.Integer(), nullable=True),
        sa.Column('opening_target', sa.String(20), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='Prospect'),
        sa.Column('description', sa.String(1000), nullable=True),
        sa.Column('created_by_id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['owner.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_project_number', 'project', ['project_number'])
    op.create_index('ix_project_owner_id', 'project', ['owner_id'])

    # ── 2. Add project_id + deal_type to deal ──────────────────────────────────
    op.add_column('deal', sa.Column('project_id', sa.Uuid(), nullable=True))
    op.add_column('deal', sa.Column('deal_type', sa.String(20), nullable=False, server_default='HMA'))
    op.create_foreign_key('fk_deal_project', 'deal', 'project', ['project_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_deal_project_id', 'deal', ['project_id'])

    # ── 3. Add new fields to owner_contact ─────────────────────────────────────
    op.add_column('owner_contact', sa.Column('contact_title', sa.String(100), nullable=True))
    op.add_column('owner_contact', sa.Column('email', sa.String(255), nullable=True))
    op.add_column('owner_contact', sa.Column('phone', sa.String(50), nullable=True))
    op.add_column('owner_contact', sa.Column('seniority', sa.String(20), nullable=True))

    # ── 4. Data migration: auto-create Project for each existing Deal ─────────
    # For every deal, create a project with the same name + project-level data
    # then link the deal to it.
    conn = op.get_bind()

    deals = conn.execute(sa.text(
        "SELECT id, name, country, region, city, owner_name, project_type, keys, opening_target, created_by_id "
        "FROM deal"
    )).fetchall()

    # Get user ID for owner lookup
    owner_map = {}  # owner_name → owner.id
    owners = conn.execute(sa.text("SELECT id, company FROM owner")).fetchall()
    for o in owners:
        owner_map[o.company] = o.id

    project_number = 1
    for d in deals:
        proj_id = str(uuid.uuid4())
        owner_id = owner_map.get(d.owner_name) if d.owner_name else None

        conn.execute(sa.text("""
            INSERT INTO project (
                id, project_number, name, owner_id, country, region, city,
                project_type, keys, opening_target, status, created_by_id,
                created_at, updated_at
            ) VALUES (
                :id, :pn, :name, :oid, :country, :region, :city,
                :ptype, :keys, :opening, 'Active', :uid,
                NOW(), NOW()
            )
        """), {
            "id": proj_id, "pn": project_number, "name": d.name, "oid": owner_id,
            "country": d.country, "region": d.region, "city": d.city,
            "ptype": d.project_type, "keys": d.keys, "opening": d.opening_target,
            "uid": d.created_by_id,
        })

        # Link the deal to this new project + set deal_type=HMA by default
        conn.execute(sa.text("UPDATE deal SET project_id = :pid, deal_type = 'HMA' WHERE id = :did"), {
            "pid": proj_id, "did": d.id,
        })

        project_number += 1

    # ── 5. Add DealType + ProjectStatus to master_data ────────────────────────
    DEAL_TYPES = ["HMA", "TSA", "Franchise", "Consulting", "Pre-opening", "Other"]
    PROJECT_STATUSES = ["Prospect", "Active", "On Hold", "Operating", "Lost", "Closed"]
    SENIORITY = ["C-Suite", "Senior", "Mid", "Junior"]

    md_rows = []
    for i, v in enumerate(DEAL_TYPES):
        md_rows.append({"id": str(uuid.uuid4()), "category": "deal_type", "value": v, "sort_order": i, "is_active": True})
    for i, v in enumerate(PROJECT_STATUSES):
        md_rows.append({"id": str(uuid.uuid4()), "category": "project_status", "value": v, "sort_order": i, "is_active": True})
    for i, v in enumerate(SENIORITY):
        md_rows.append({"id": str(uuid.uuid4()), "category": "seniority", "value": v, "sort_order": i, "is_active": True})

    op.bulk_insert(sa.table(
        'master_data',
        sa.column('id', sa.Uuid()),
        sa.column('category', sa.String()),
        sa.column('value', sa.String()),
        sa.column('sort_order', sa.Integer()),
        sa.column('is_active', sa.Boolean()),
    ), md_rows)


def downgrade():
    op.execute("DELETE FROM master_data WHERE category IN ('deal_type', 'project_status', 'seniority')")
    op.drop_column('owner_contact', 'seniority')
    op.drop_column('owner_contact', 'phone')
    op.drop_column('owner_contact', 'email')
    op.drop_column('owner_contact', 'contact_title')
    op.drop_index('ix_deal_project_id', table_name='deal')
    op.drop_constraint('fk_deal_project', 'deal', type_='foreignkey')
    op.drop_column('deal', 'deal_type')
    op.drop_column('deal', 'project_id')
    op.drop_index('ix_project_owner_id', table_name='project')
    op.drop_index('ix_project_number', table_name='project')
    op.drop_table('project')
