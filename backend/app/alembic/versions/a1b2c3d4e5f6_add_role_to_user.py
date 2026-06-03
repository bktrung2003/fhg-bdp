"""Add role to User

Revision ID: a1b2c3d4e5f6
Revises: fe56fa70289e
Create Date: 2026-06-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'fe56fa70289e'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE userrole AS ENUM (
                'CEO', 'COO', 'BD Director', 'BD Manager',
                'Legal', 'Finance', 'IT Admin'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.add_column(
        'user',
        sa.Column(
            'role',
            sa.Enum(name='userrole', create_type=False),
            nullable=False,
            server_default='BD Manager',
        )
    )


def downgrade():
    op.drop_column('user', 'role')
    op.execute('DROP TYPE IF EXISTS userrole')
