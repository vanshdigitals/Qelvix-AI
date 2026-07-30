"""Add RLS policies

Revision ID: d3e0543d1ed1
Revises: f5312e8d14c4
Create Date: 2026-07-30 16:57:02.910711

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3e0543d1ed1'
down_revision: Union[str, None] = 'f5312e8d14c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tables = ['assets', 'scans', 'findings', 'compliance_reports', 'notifications']
    for table in tables:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"CREATE POLICY tenant_isolation_select ON {table} FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);")
        op.execute(f"CREATE POLICY tenant_isolation_insert ON {table} FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);")
        op.execute(f"CREATE POLICY tenant_isolation_update ON {table} FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid) WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);")
    
    # Audit log (append only)
    op.execute("ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;")
    op.execute("CREATE POLICY tenant_isolation_select ON audit_log FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);")

    # Organizations
    op.execute("ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;")
    op.execute("CREATE POLICY tenant_isolation_select ON organizations FOR SELECT USING (id = (auth.jwt() ->> 'org_id')::uuid);")
    op.execute("CREATE POLICY tenant_isolation_update ON organizations FOR UPDATE USING (id = (auth.jwt() ->> 'org_id')::uuid) WITH CHECK (id = (auth.jwt() ->> 'org_id')::uuid);")

    # Members
    op.execute("ALTER TABLE members ENABLE ROW LEVEL SECURITY;")
    op.execute("CREATE POLICY tenant_isolation_select ON members FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);")
    op.execute("CREATE POLICY tenant_isolation_insert ON members FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);")
    op.execute("""
        CREATE POLICY tenant_isolation_update ON members FOR UPDATE 
        USING (org_id = (auth.jwt() ->> 'org_id')::uuid)
        WITH CHECK (
            org_id = (auth.jwt() ->> 'org_id')::uuid AND
            EXISTS (
                SELECT 1 FROM members m 
                WHERE m.org_id = members.org_id 
                AND m.user_id = (auth.jwt() ->> 'sub')::uuid 
                AND m.role IN ('owner', 'admin')
            )
        );
    """)
    op.execute("""
        CREATE POLICY tenant_isolation_delete ON members FOR DELETE 
        USING (
            org_id = (auth.jwt() ->> 'org_id')::uuid AND
            EXISTS (
                SELECT 1 FROM members m 
                WHERE m.org_id = members.org_id 
                AND m.user_id = (auth.jwt() ->> 'sub')::uuid 
                AND m.role IN ('owner', 'admin')
            )
        );
    """)

def downgrade() -> None:
    tables = ['assets', 'scans', 'findings', 'compliance_reports', 'notifications', 'audit_log', 'organizations', 'members']
    for table in tables:
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_select ON {table};")
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_insert ON {table};")
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_update ON {table};")
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_delete ON {table};")
