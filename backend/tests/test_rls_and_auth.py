import asyncio
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
import jwt
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import create_app
from app.config import get_settings
from app.models.org import Organization, Member
from app.models.scan import Finding

settings = get_settings()
app = create_app(settings)

@pytest.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

def create_mock_jwt(user_id: str, org_id: str) -> str:
    payload = {
        "sub": user_id,
        "org_id": org_id,
        "aud": "authenticated"
    }
    return jwt.encode(payload, settings.secret_key.get_secret_value(), algorithm="HS256")

@pytest.mark.asyncio
async def test_auth_rejection(async_client: AsyncClient):
    """Test 2: Auth rejection test."""
    # 1. No token
    resp_no_token = await async_client.get("/org/me")
    assert resp_no_token.status_code == 403, f"Expected 403, got {resp_no_token.status_code}"
    
    # 2. Invalid/expired token
    resp_invalid = await async_client.get("/org/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert resp_invalid.status_code == 401, f"Expected 401, got {resp_invalid.status_code}"
    
    # We will do the 3. Valid token test inside the RLS test since we need to seed an org first.

@pytest.mark.asyncio
async def test_rls_cross_tenant():
    """Test 1: RLS cross-tenant isolation."""
    # Connect to the real DB as the service role (bypasses RLS) to seed data
    engine = create_async_engine(settings.database_url)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    org_a_id = uuid.uuid4()
    org_b_id = uuid.uuid4()
    user_a_id = uuid.uuid4()
    user_b_id = uuid.uuid4()
    
    async with session_maker() as session:
        # Create Org A
        org_a = Organization(id=org_a_id, name="Org A", primary_domain=f"orga-{org_a_id}.com")
        member_a = Member(org_id=org_a_id, user_id=user_a_id, role="owner")
        
        # Create Org B
        org_b = Organization(id=org_b_id, name="Org B", primary_domain=f"orgb-{org_b_id}.com")
        member_b = Member(org_id=org_b_id, user_id=user_b_id, role="owner")
        
        session.add_all([org_a, org_b])
        await session.flush()
        
        session.add_all([member_a, member_b])
        await session.commit()
        
        # Insert finding under Org A
        finding_id = uuid.uuid4()
        finding = Finding(
            id=finding_id,
            org_id=org_a_id,
            finding_type="test_finding",
            agent_source="test",
            severity="low",
            title="Test Finding A",
            raw_data={"test": True}
        )
        session.add(finding)
        await session.commit()

    # Now simulate a connection from Org B's user using RLS
    # We set up the JWT claims in postgres settings exactly how the middleware + Supabase does it
    jwt_claim_org_id = str(org_b_id)
    
    async with engine.connect() as conn:
        # Begin transaction and set local claims
        async with conn.begin():
            await conn.execute(sa.text("SET ROLE authenticated;"))
            await conn.execute(sa.text(f"SET LOCAL request.jwt.claim.org_id = '{jwt_claim_org_id}'"))
            
            # Attempt to query findings
            result = await conn.execute(sa.select(Finding))
            findings_for_b = result.scalars().all()
            
            print(f"\n--- RLS TEST OUTPUT ---")
            print(f"Finding inserted for Org A: {finding_id}")
            print(f"Querying as Org B ({org_b_id}) returned {len(findings_for_b)} findings.")
            assert len(findings_for_b) == 0, "RLS failed: Org B saw Org A's finding!"
            
            # Let's also check if Org B can see Org A
            result = await conn.execute(sa.select(Organization).where(Organization.id == org_a_id))
            org_a_visible = result.scalar_one_or_none()
            print(f"Querying Org A directly as Org B returned: {org_a_visible}")
            assert org_a_visible is None, "RLS failed: Org B saw Org A!"

    # Finally, use the API client to test valid auth fetching the profile
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        valid_token = create_mock_jwt(str(user_a_id), str(org_a_id))
        resp_valid = await ac.get("/org/me", headers={"Authorization": f"Bearer {valid_token}"})
        print(f"Auth Test (Valid Token): GET /org/me -> Status {resp_valid.status_code}")
        assert resp_valid.status_code == 200, f"Expected 200, got {resp_valid.status_code}"
        data = resp_valid.json()
        assert data["id"] == str(org_a_id)

    # Cleanup
    async with session_maker() as session:
        # Delete orgs (cascades findings and members)
        org_a = await session.get(Organization, org_a_id)
        org_b = await session.get(Organization, org_b_id)
        if org_a: await session.delete(org_a)
        if org_b: await session.delete(org_b)
        await session.commit()
