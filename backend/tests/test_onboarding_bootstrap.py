import uuid
from unittest.mock import patch

import jwt
import pytest
import sqlalchemy as sa
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.main import create_app
from app.models.org import Member, Organization

settings = get_settings()
app = create_app(settings)


@pytest.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


def create_token(user_id: str, org_id: str | None = None, email: str = "newuser@qelvix.com") -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
    }
    if org_id:
        payload["org_id"] = org_id
        payload["app_metadata"] = {"org_id": org_id}
    return jwt.encode(payload, settings.secret_key.get_secret_value(), algorithm="HS256")


@pytest.mark.asyncio
async def test_unauthenticated_requests_rejected(async_client: AsyncClient):
    """Missing or invalid JWT must be rejected."""
    # 1. No token
    res1 = await async_client.get("/org/me/onboarding")
    assert res1.status_code in (401, 403)

    res2 = await async_client.post("/org/me/bootstrap", json={"name": "Test Org"})
    assert res2.status_code in (401, 403)

    # 2. Invalid token
    res3 = await async_client.get(
        "/org/me/onboarding", headers={"Authorization": "Bearer invalid.jwt.token"}
    )
    assert res3.status_code == 401


@pytest.mark.asyncio
async def test_fresh_user_bootstrap_and_step_advance(async_client: AsyncClient):
    """Fresh authenticated user with NO org_id:
    - GET /org/me/onboarding returns initial clean state with no 401
    - POST /org/me/bootstrap creates organization + owner member transactionally
    - Active org context established and next step opens.
    """
    user_id = uuid.uuid4()
    token = create_token(str(user_id), org_id=None, email="fresh@company.in")

    engine = create_async_engine(settings.database_url)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    created_org_id: uuid.UUID | None = None

    try:
        # 1. Fresh user hits /org/me/onboarding with NO org_id claim
        res_initial = await async_client.get(
            "/org/me/onboarding", headers={"Authorization": f"Bearer {token}"}
        )
        assert res_initial.status_code == 200
        initial_data = res_initial.json()
        assert initial_data["onboarding_completed"] is False
        assert initial_data["onboarding_step"] == "business"
        assert initial_data["org_id"] is None
        assert initial_data["notification_email"] == "fresh@company.in"

        # 2. User submits Step 1 "About your business" to bootstrap
        with patch("app.routers.org.set_supabase_user_org_claim", return_value=True) as mock_claim:
            res_bootstrap = await async_client.post(
                "/org/me/bootstrap",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "name": "Acme Innovations Pvt Ltd",
                    "notification_email": "security@acme.in",
                    "gst": "27AAECV1234F1Z5",
                },
            )
            assert res_bootstrap.status_code == 200
            data = res_bootstrap.json()
            assert data["name"] == "Acme Innovations Pvt Ltd"
            assert data["notification_email"] == "security@acme.in"
            assert data["onboarding_step"] == "industry"
            assert data["org_id"] is not None
            created_org_id = uuid.UUID(data["org_id"])

            # Verify claim update was triggered
            mock_claim.assert_called_once_with(user_id=user_id, org_id=created_org_id)

        # 3. Verify in database: Organization and Member exist transactionally
        async with session_maker() as session:
            db_org = await session.get(Organization, created_org_id)
            assert db_org is not None
            assert db_org.name == "Acme Innovations Pvt Ltd"
            assert db_org.notification_email == "security@acme.in"
            assert db_org.onboarding_step == "industry"

            db_member = await session.scalar(
                sa.select(Member).where(Member.org_id == created_org_id, Member.user_id == user_id)
            )
            assert db_member is not None
            assert db_member.role == "owner"

        # 4. Now user advances to Step 2 "industry" using the new org_id
        authed_token = create_token(str(user_id), org_id=str(created_org_id))
        res_step2 = await async_client.patch(
            "/org/me/onboarding",
            headers={"Authorization": f"Bearer {authed_token}"},
            json={"step": "industry", "data": {"industry": "Manufacturing"}},
        )
        assert res_step2.status_code == 200
        step2_data = res_step2.json()
        assert step2_data["onboarding_step"] == "domain"
        assert step2_data["industry"] == "Manufacturing"

    finally:
        if created_org_id:
            async with session_maker() as session:
                await session.execute(sa.delete(Member).where(Member.org_id == created_org_id))
                await session.execute(sa.delete(Organization).where(Organization.id == created_org_id))
                await session.commit()
        await engine.dispose()


@pytest.mark.asyncio
async def test_seamless_patch_fallback_bootstrap(async_client: AsyncClient):
    """If a client calls PATCH /org/me/onboarding for step 'business' before org exists,
    it should seamlessly bootstrap the organization without throwing 401.
    """
    user_id = uuid.uuid4()
    token = create_token(str(user_id), org_id=None, email="patchuser@test.in")

    engine = create_async_engine(settings.database_url)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    created_org_id: uuid.UUID | None = None

    try:
        with patch("app.routers.org.set_supabase_user_org_claim", return_value=True):
            res = await async_client.patch(
                "/org/me/onboarding",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "step": "business",
                    "data": {
                        "name": "Seamless Corp",
                        "notification_email": "admin@seamless.in",
                        "gst": "29ABCDE1234F1Z5",
                    },
                },
            )
            assert res.status_code == 200
            data = res.json()
            assert data["name"] == "Seamless Corp"
            assert data["onboarding_step"] == "industry"
            assert data["org_id"] is not None
            created_org_id = uuid.UUID(data["org_id"])

        # Attempting PATCH for another step without an org should be rejected with 400
        unrelated_user_id = uuid.uuid4()
        unrelated_token = create_token(str(unrelated_user_id), org_id=None)
        res_bad = await async_client.patch(
            "/org/me/onboarding",
            headers={"Authorization": f"Bearer {unrelated_token}"},
            json={"step": "industry", "data": {"industry": "Retail"}},
        )
        assert res_bad.status_code == 400
        assert "Organization must be set up" in res_bad.json().get("detail", "")

    finally:
        if created_org_id:
            async with session_maker() as session:
                await session.execute(sa.delete(Member).where(Member.org_id == created_org_id))
                await session.execute(sa.delete(Organization).where(Organization.id == created_org_id))
                await session.commit()
        await engine.dispose()


@pytest.mark.asyncio
async def test_impersonation_protection_and_tenant_isolation(async_client: AsyncClient):
    """Client-supplied org_id claiming an org they are not a member of must be rejected/ignored.
    User A cannot access or modify Org B.
    """
    user_a_id = uuid.uuid4()
    org_a_id = uuid.uuid4()
    user_b_id = uuid.uuid4()
    org_b_id = uuid.uuid4()

    engine = create_async_engine(settings.database_url)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as session:
        org_a = Organization(
            id=org_a_id,
            name="Org A Real",
            primary_domain=f"orga-{str(org_a_id)[:8]}.com",
            onboarding_completed=False,
            onboarding_step="industry",
        )
        org_b = Organization(
            id=org_b_id,
            name="Org B Secret",
            primary_domain=f"orgb-{str(org_b_id)[:8]}.com",
            onboarding_completed=True,
            onboarding_step="done",
        )
        session.add_all([org_a, org_b])
        await session.flush()

        member_a = Member(org_id=org_a_id, user_id=user_a_id, role="owner")
        member_b = Member(org_id=org_b_id, user_id=user_b_id, role="owner")
        session.add_all([member_a, member_b])
        await session.commit()

    try:
        # Attacker User A creates a forged token claiming org_id = org_b_id
        forged_token = create_token(str(user_a_id), org_id=str(org_b_id))

        # Request to /org/me/onboarding must NOT return Org B's data
        res = await async_client.get(
            "/org/me/onboarding", headers={"Authorization": f"Bearer {forged_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        # Should fall back to User A's real organization (Org A), never Org B
        assert data["org_id"] == str(org_a_id)
        assert data["name"] == "Org A Real"
        assert data["name"] != "Org B Secret"

        # User A attempting to modify Org B's domain via forged claim
        res_put = await async_client.put(
            "/org/me/domain",
            headers={"Authorization": f"Bearer {forged_token}"},
            json={"domain": "hacked-domain.com"},
        )
        assert res_put.status_code == 200
        # The update applied to Org A, NOT Org B
        async with session_maker() as session:
            db_b = await session.get(Organization, org_b_id)
            assert db_b.primary_domain == f"orgb-{str(org_b_id)[:8]}.com"

    finally:
        async with session_maker() as session:
            await session.execute(sa.delete(Member).where(Member.org_id.in_([org_a_id, org_b_id])))
            await session.execute(sa.delete(Organization).where(Organization.id.in_([org_a_id, org_b_id])))
            await session.commit()
        await engine.dispose()


@pytest.mark.asyncio
async def test_resumption_after_reload_or_relogin(async_client: AsyncClient):
    """Reloading or logging back in during onboarding must resume from the saved step,
    not restart or loop.
    """
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    engine = create_async_engine(settings.database_url)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as session:
        org = Organization(
            id=org_id,
            name="Resume Corp",
            primary_domain=f"resume-{str(org_id)[:8]}.com",
            onboarding_completed=False,
            onboarding_step="verify",
            onboarding_data={"verification_token": "qelvix-verification=xyz"},
        )
        session.add(org)
        await session.flush()
        member = Member(org_id=org_id, user_id=user_id, role="owner")
        session.add(member)
        await session.commit()

    token = create_token(str(user_id), org_id=str(org_id))

    try:
        # Simulate browser refresh/re-login on /onboarding
        res = await async_client.get(
            "/org/me/onboarding", headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["onboarding_completed"] is False
        assert data["onboarding_step"] == "verify"
        assert data["name"] == "Resume Corp"

    finally:
        async with session_maker() as session:
            await session.execute(sa.delete(Member).where(Member.org_id == org_id))
            await session.execute(sa.delete(Organization).where(Organization.id == org_id))
            await session.commit()
        await engine.dispose()
