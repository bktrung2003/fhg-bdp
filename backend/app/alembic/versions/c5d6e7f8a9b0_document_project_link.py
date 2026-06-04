"""Document — add project_id link (polymorphic context: Deal OR Project)

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-06-05 00:04:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'c5d6e7f8a9b0'
down_revision = 'b4c5d6e7f8a9'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('document', sa.Column('project_id', sa.Uuid(), nullable=True))
    op.add_column('document', sa.Column('project_name', sa.String(255), nullable=True))
    op.create_index('ix_document_project_id', 'document', ['project_id'])

    # Backfill: for existing docs with deal_id, derive project_id from deal
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE document d
        SET project_id = deal.project_id,
            project_name = (SELECT name FROM project WHERE id = deal.project_id)
        FROM deal
        WHERE d.deal_id = deal.id
          AND deal.project_id IS NOT NULL
          AND d.project_id IS NULL
    """))


def downgrade():
    op.drop_index('ix_document_project_id', table_name='document')
    op.drop_column('document', 'project_name')
    op.drop_column('document', 'project_id')
