"""Task — add task_owner_id link to User (keep task_owner string as legacy fallback)

Revision ID: b4c5d6e7f8a9
Revises: a3b4c5d6e7f8
Create Date: 2026-06-05 00:03:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'b4c5d6e7f8a9'
down_revision = 'a3b4c5d6e7f8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('task', sa.Column('task_owner_id', sa.Uuid(), nullable=True))
    op.create_foreign_key(
        'fk_task_owner_user', 'task', 'user',
        ['task_owner_id'], ['id'], ondelete='SET NULL'
    )
    op.create_index('ix_task_owner_id', 'task', ['task_owner_id'])


def downgrade():
    op.drop_index('ix_task_owner_id', table_name='task')
    op.drop_constraint('fk_task_owner_user', 'task', type_='foreignkey')
    op.drop_column('task', 'task_owner_id')
