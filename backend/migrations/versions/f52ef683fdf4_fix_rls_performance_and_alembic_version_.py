"""fix rls performance and alembic_version rls

Revision ID: f52ef683fdf4
Revises: 551ce8261afa
Create Date: 2026-07-31 18:23:11.306546

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f52ef683fdf4'
down_revision: Union[str, None] = '551ce8261afa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. alembic_version RLS
    op.execute("ALTER TABLE alembic_version ENABLE ROW LEVEL SECURITY;")
    
    # 2. Fix performance of RLS policies by wrapping auth.jwt() in (select ...)
    tables = ['assets', 'scans', 'findings', 'compliance_reports', 'notifications']
    for table in tables:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_select ON {table};")
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_insert ON {table};")
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_update ON {table};")
        
        op.execute(f"CREATE POLICY tenant_isolation_select ON {table} FOR SELECT USING (org_id = (select (auth.jwt() ->> 'org_id')::uuid));")
        op.execute(f"CREATE POLICY tenant_isolation_insert ON {table} FOR INSERT WITH CHECK (org_id = (select (auth.jwt() ->> 'org_id')::uuid));")
        op.execute(f"CREATE POLICY tenant_isolation_update ON {table} FOR UPDATE USING (org_id = (select (auth.jwt() ->> 'org_id')::uuid)) WITH CHECK (org_id = (select (auth.jwt() ->> 'org_id')::uuid));")
    
    # Audit log (append only)
    op.execute("DROP POLICY IF EXISTS tenant_isolation_select ON audit_log;")
    op.execute("CREATE POLICY tenant_isolation_select ON audit_log FOR SELECT USING (org_id = (select (auth.jwt() ->> 'org_id')::uuid));")

    # Organizations
    op.execute("DROP POLICY IF EXISTS tenant_isolation_select ON organizations;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_update ON organizations;")
    op.execute("CREATE POLICY tenant_isolation_select ON organizations FOR SELECT USING (id = (select (auth.jwt() ->> 'org_id')::uuid));")
    op.execute("CREATE POLICY tenant_isolation_update ON organizations FOR UPDATE USING (id = (select (auth.jwt() ->> 'org_id')::uuid)) WITH CHECK (id = (select (auth.jwt() ->> 'org_id')::uuid));")

    # Members
    op.execute("DROP POLICY IF EXISTS tenant_isolation_select ON members;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_insert ON members;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_update ON members;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_delete ON members;")
    
    op.execute("CREATE POLICY tenant_isolation_select ON members FOR SELECT USING (org_id = (select (auth.jwt() ->> 'org_id')::uuid));")
    op.execute("CREATE POLICY tenant_isolation_insert ON members FOR INSERT WITH CHECK (org_id = (select (auth.jwt() ->> 'org_id')::uuid));")
    op.execute("""
        CREATE POLICY tenant_isolation_update ON members FOR UPDATE 
        USING (org_id = (select (auth.jwt() ->> 'org_id')::uuid))
        WITH CHECK (
            org_id = (select (auth.jwt() ->> 'org_id')::uuid) AND
            EXISTS (
                SELECT 1 FROM members m 
                WHERE m.org_id = members.org_id 
                AND m.user_id = (select (auth.jwt() ->> 'sub')::uuid)
                AND m.role IN ('owner', 'admin')
            )
        );
    """)
    op.execute("""
        CREATE POLICY tenant_isolation_delete ON members FOR DELETE 
        USING (
            org_id = (select (auth.jwt() ->> 'org_id')::uuid) AND
            EXISTS (
                SELECT 1 FROM members m 
                WHERE m.org_id = members.org_id 
                AND m.user_id = (select (auth.jwt() ->> 'sub')::uuid)
                AND m.role IN ('owner', 'admin')
            )
        );
    """)

def downgrade() -> None:
    # 1. alembic_version RLS
    op.execute("ALTER TABLE alembic_version DISABLE ROW LEVEL SECURITY;")
    
    # 2. Revert to original poor-performance RLS policies
    tables = ['assets', 'scans', 'findings', 'compliance_reports', 'notifications']
    for table in tables:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_select ON {table};")
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_insert ON {table};")
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_update ON {table};")
        
        op.execute(f"CREATE POLICY tenant_isolation_select ON {table} FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);")
        op.execute(f"CREATE POLICY tenant_isolation_insert ON {table} FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);")
        op.execute(f"CREATE POLICY tenant_isolation_update ON {table} FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid) WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);")
    
    # Audit log (append only)
    op.execute("DROP POLICY IF EXISTS tenant_isolation_select ON audit_log;")
    op.execute("CREATE POLICY tenant_isolation_select ON audit_log FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);")

    # Organizations
    op.execute("DROP POLICY IF EXISTS tenant_isolation_select ON organizations;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_update ON organizations;")
    op.execute("CREATE POLICY tenant_isolation_select ON organizations FOR SELECT USING (id = (auth.jwt() ->> 'org_id')::uuid);")
    op.execute("CREATE POLICY tenant_isolation_update ON organizations FOR UPDATE USING (id = (auth.jwt() ->> 'org_id')::uuid) WITH CHECK (id = (auth.jwt() ->> 'org_id')::uuid);")

    # Members
    op.execute("DROP POLICY IF EXISTS tenant_isolation_select ON members;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_insert ON members;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_update ON members;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_delete ON members;")
    
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
