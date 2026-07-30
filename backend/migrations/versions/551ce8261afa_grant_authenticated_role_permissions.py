"""grant_authenticated_role_permissions

Revision ID: 551ce8261afa
Revises: d3e0543d1ed1
Create Date: 2026-07-30 17:25:09.103652

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '551ce8261afa'
down_revision: Union[str, None] = 'd3e0543d1ed1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Grant permissions to authenticated role for all existing tables in public schema
    op.execute("GRANT USAGE ON SCHEMA public TO authenticated;")
    op.execute("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;")
    op.execute("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;")
    # Also set default privileges for future tables
    op.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO authenticated;")
    op.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO authenticated;")

def downgrade() -> None:
    op.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM authenticated;")
    op.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM authenticated;")
    op.execute("REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM authenticated;")
    op.execute("REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authenticated;")
    op.execute("REVOKE USAGE ON SCHEMA public FROM authenticated;")
