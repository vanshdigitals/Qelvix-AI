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
from app.models.scan import Finding, Scan

settings = get_settings()
app = create_app(settings)


@pytest.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


def create_mock_jwt(user_id: str, org_id: str, email: str = "test@qelvix.com") -> str:
    payload = {
        "sub": user_id,
        "org_id": org_id,
        "email": email,
        "aud": "authenticated",
    }
    return jwt.encode(payload, settings.secret_key.get_secret_value(), algorithm="HS256")


@pytest.mark.asyncio
async def test_deletion_preview_unauthenticated(async_client: AsyncClient):
    """Unauthenticated request to deletion-preview must be rejected."""
    res = await async_client.get("/account/deletion-preview")
    assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_delete_account_invalid_confirmation(async_client: AsyncClient):
    """Request without exact 'DELETE' string must be rejected."""
    user_id = str(uuid.uuid4())
    org_id = str(uuid.uuid4())
    token = create_mock_jwt(user_id, org_id)

    # Seed org and member so auth passes
    engine = create_async_engine(settings.database_url)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as session:
        org = Organization(
            id=uuid.UUID(org_id),
            name="Test Org",
            primary_domain=f"test-{org_id[:8]}.com",
        )
        session.add(org)
        await session.flush()

        member = Member(org_id=uuid.UUID(org_id), user_id=uuid.UUID(user_id), role="owner")
        session.add(member)
        await session.commit()

    try:
        res = await async_client.post(
            "/account/delete",
            headers={"Authorization": f"Bearer {token}"},
            json={"confirmation": "NO"},
        )
        assert res.status_code == 400
        assert "DELETE" in res.json().get("detail", "")
    finally:
        async with session_maker() as session:
            await session.execute(sa.delete(Member).where(Member.org_id == uuid.UUID(org_id)))
            await session.execute(sa.delete(Organization).where(Organization.id == uuid.UUID(org_id)))
            await session.commit()
        await engine.dispose()


@pytest.mark.asyncio
async def test_account_deletion_preview_and_purge(async_client: AsyncClient):
    """Full deletion lifecycle: preview surfaces real DNS, purge deletes all data."""
    user_a_id = uuid.uuid4()
    org_a_id = uuid.uuid4()
    user_b_id = uuid.uuid4()
    org_b_id = uuid.uuid4()

    token_a = create_mock_jwt(str(user_a_id), str(org_a_id), email="user_a@test.com")

    engine = create_async_engine(settings.database_url)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Seed isolated tenants A and B
    async with session_maker() as session:
        org_a = Organization(
            id=org_a_id,
            name="Org A Corp",
            primary_domain=f"orga-{str(org_a_id)[:8]}.com",
            domain_verified=True,
            onboarding_data={"verification_token": "qelvix-verification=token-a-123"},
        )
        org_b = Organization(
            id=org_b_id,
            name="Org B Corp",
            primary_domain=f"orgb-{str(org_b_id)[:8]}.com",
            domain_verified=True,
            onboarding_data={"verification_token": "qelvix-verification=token-b-456"},
        )
        session.add_all([org_a, org_b])
        await session.flush()

        member_a = Member(org_id=org_a_id, user_id=user_a_id, role="owner")
        member_b = Member(org_id=org_b_id, user_id=user_b_id, role="owner")
        session.add_all([member_a, member_b])
        await session.flush()

        scan_a = Scan(id=uuid.uuid4(), org_id=org_a_id, status="completed")
        scan_b = Scan(id=uuid.uuid4(), org_id=org_b_id, status="completed")
        session.add_all([scan_a, scan_b])
        await session.flush()

        finding_a = Finding(
            id=uuid.uuid4(),
            org_id=org_a_id,
            scan_id=scan_a.id,
            severity="high",
            title="A finding",
            finding_type="test",
            agent_source="test",
            raw_data={},
        )
        finding_b = Finding(
            id=uuid.uuid4(),
            org_id=org_b_id,
            scan_id=scan_b.id,
            severity="low",
            title="B finding",
            finding_type="test",
            agent_source="test",
            raw_data={},
        )
        session.add_all([finding_a, finding_b])
        await session.commit()

    try:
        # 1. Test preview
        preview_res = await async_client.get(
            "/account/deletion-preview",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert preview_res.status_code == 200
        preview_data = preview_res.json()
        assert preview_data["summary_counts"]["total_scans"] == 1
        assert preview_data["summary_counts"]["total_findings"] == 1
        assert len(preview_data["dns_records"]) == 1
        assert preview_data["dns_records"][0]["domain"] == org_a.primary_domain
        assert preview_data["dns_records"][0]["value"] == "qelvix-verification=token-a-123"

        # 2. Test execution of deletion (mocking external GoTrue admin network call)
        with patch("app.routers.account.delete_supabase_auth_user", return_value=True) as mock_auth_del:
            del_res = await async_client.post(
                "/account/delete",
                headers={"Authorization": f"Bearer {token_a}"},
                json={"confirmation": "DELETE"},
            )
            assert del_res.status_code == 200
            assert del_res.json()["success"] is True
            mock_auth_del.assert_called_once_with(user_a_id)

        # 3. Assert Org A data is completely purged
        async with session_maker() as session:
            db_org_a = await session.get(Organization, org_a_id)
            assert db_org_a is None

            members_a = (
                await session.execute(sa.select(Member).where(Member.org_id == org_a_id))
            ).scalars().all()
            assert len(members_a) == 0

            findings_a = (
                await session.execute(sa.select(Finding).where(Finding.org_id == org_a_id))
            ).scalars().all()
            assert len(findings_a) == 0

            scans_a = (
                await session.execute(sa.select(Scan).where(Scan.org_id == org_a_id))
            ).scalars().all()
            assert len(scans_a) == 0

            # 4. Assert Org B data is completely untouched
            db_org_b = await session.get(Organization, org_b_id)
            assert db_org_b is not None

            findings_b = (
                await session.execute(sa.select(Finding).where(Finding.org_id == org_b_id))
            ).scalars().all()
            assert len(findings_b) == 1
    finally:
        # Cleanup tenant B
        async with session_maker() as session:
            await session.execute(sa.delete(Finding).where(Finding.org_id == org_b_id))
            await session.execute(sa.delete(Scan).where(Scan.org_id == org_b_id))
            await session.execute(sa.delete(Member).where(Member.org_id == org_b_id))
            await session.execute(sa.delete(Organization).where(Organization.id == org_b_id))
            await session.commit()
        await engine.dispose()
