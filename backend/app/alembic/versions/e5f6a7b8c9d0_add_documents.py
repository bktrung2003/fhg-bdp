"""Add documents table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-06-03 00:04:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'document',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('doc_type', sa.String(30), nullable=False, server_default='Other'),
        sa.Column('permission', sa.String(30), nullable=False, server_default='Internal Only'),
        sa.Column('deal_id', sa.Uuid(), nullable=True),
        sa.Column('deal_name', sa.String(255), nullable=True),
        sa.Column('version', sa.String(20), nullable=True, server_default='v1.0'),
        sa.Column('note', sa.String(500), nullable=True),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('content_type', sa.String(100), nullable=False, server_default='application/octet-stream'),
        sa.Column('storage_path', sa.String(500), nullable=False),
        sa.Column('uploaded_by_id', sa.Uuid(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_document_deal_id', 'document', ['deal_id'])


def downgrade():
    op.drop_index('ix_document_deal_id', table_name='document')
    op.drop_table('document')
