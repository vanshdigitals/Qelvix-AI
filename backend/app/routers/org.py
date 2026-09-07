import logging
import secrets
import uuid
from datetime import datetime, timezone
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.config import get_settings
from app.database import get_db_session
import dns.asyncresolver
import dns.resolver

from app.dependencies import CurrentOrg, get_current_org, get_current_user_token, require_role
from app.models.org import Asset, Member, Organization
from app.rate_limit import org_rate_limit
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.onboarding import (
    DomainUpdate,
    OnboardingState,
    OnboardingStepUpdate,
    OrgBootstrapRequest,
    next_step,
)

logger = logging.getLogger(__name__)
from app.schemas.org import (
    AssetCreate,
    AssetResponse,
    OrgProfileResponse,
    OrgSettingsUpdate,
    VerifyTokenResponse,
)

router = APIRouter(prefix="/org/me", tags=["org"])


@router.get("", response_model=OrgProfileResponse)
async def get_org_profile(  # noqa
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Get the current organization profile."""
    org = await db.get(Organization, current_org.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return OrgProfileResponse(
        id=org.id,
        name=org.name,
        primary_domain=org.primary_domain,
        whatsapp_number=org.whatsapp_number,
        notification_email=org.notification_email,
        industry=org.settings.get("industry"),
        domain_verified=org.domain_verified,
        created_at=org.onboarded_at,
    )


@router.put(
    "", response_model=OrgProfileResponse, dependencies=[Depends(require_role("owner", "admin"))]
)
async def update_org_settings(  # noqa
    payload: OrgSettingsUpdate,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Update organization settings."""
    org = await db.get(Organization, current_org.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if payload.name is not None:
        org.name = payload.name
    if payload.whatsapp_number is not None:
        org.whatsapp_number = payload.whatsapp_number
    if payload.notification_email is not None:
        org.notification_email = payload.notification_email
    if payload.industry is not None:
        if not isinstance(org.settings, dict):
            org.settings = {}
        org.settings["industry"] = payload.industry
        # Force SQLAlchemy to detect JSONB mutation
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(org, "settings")

    await db.commit()
    await db.refresh(org)

    return OrgProfileResponse(
        id=org.id,
        name=org.name,
        primary_domain=org.primary_domain,
        whatsapp_number=org.whatsapp_number,
        notification_email=org.notification_email,
        industry=org.settings.get("industry"),
        domain_verified=org.domain_verified,
        created_at=org.onboarded_at,
    )


@router.delete(
    "", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(require_role("owner"))]
)
async def delete_org(  # noqa
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Danger Zone: triggers DPDP erasure workflow."""
    # MVP: Hard delete or mark for deletion
    org = await db.get(Organization, current_org.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    await db.delete(org)
    await db.commit()
    return {"message": "Organization deletion workflow initiated"}


@router.get("/assets", response_model=PaginatedResponse[AssetResponse])
async def list_assets(  # noqa
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List asset inventory."""
    stmt = (
        select(Asset)
        .where(Asset.org_id == current_org.org_id)
        .order_by(Asset.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    assets = result.scalars().all()

    # Need total count
    from sqlalchemy import func

    count_stmt = select(func.count()).where(Asset.org_id == current_org.org_id)
    total = await db.scalar(count_stmt) or 0

    return PaginatedResponse(
        items=list(assets), total=total, page=(offset // limit) + 1, size=limit
    )


@router.get("/assets/{asset_id}", response_model=AssetResponse)
async def get_asset(  # noqa
    asset_id: uuid.UUID,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Single asset detail."""
    asset = await db.get(Asset, asset_id)
    if not asset or asset.org_id != current_org.org_id:
        raise HTTPException(status_code=404, detail="Asset not found")

    return asset


@router.post(
    "/assets", response_model=AssetResponse, dependencies=[Depends(require_role("owner", "admin"))]
)
async def add_asset(  # noqa
    payload: AssetCreate,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Manually add an asset to monitor."""
    asset = Asset(
        org_id=current_org.org_id,
        asset_type=payload.asset_type,
        value=payload.value,
        source="user",
        verified=True,  # User-added assets are trusted per 01_PRODUCT_BLUEPRINT
    )
    db.add(asset)
    try:
        await db.commit()
        await db.refresh(asset)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Asset already exists")  # noqa

    return asset


# ---------------------------------------------------------------------------
# Onboarding context & organization bootstrap helpers
# ---------------------------------------------------------------------------

async def set_supabase_user_org_claim(user_id: uuid.UUID, org_id: uuid.UUID) -> bool:
    """Updates user's app_metadata in Supabase GoTrue Auth to include org_id."""
    settings = get_settings()
    admin_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{str(user_id)}"
    headers = {
        "apikey": settings.supabase_service_key.get_secret_value(),
        "Authorization": f"Bearer {settings.supabase_service_key.get_secret_value()}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.put(
                admin_url, headers=headers, json={"app_metadata": {"org_id": str(org_id)}}
            )
            if resp.status_code < 400:
                logger.info(
                    "Successfully updated Supabase app_metadata for user %s to org %s",
                    user_id,
                    org_id,
                )
                return True
            logger.error(
                "Failed to update GoTrue app_metadata for user %s: %s - %s",
                user_id,
                resp.status_code,
                resp.text,
            )
            return False
    except Exception as exc:
        logger.error("Exception updating GoTrue app_metadata for user %s: %s", user_id, exc)
        return False


class OnboardingContext:
    def __init__(
        self,
        user_id: uuid.UUID,
        org: Organization | None,
        role: str | None,
        token_payload: dict,
    ):
        self.user_id = user_id
        self.org = org
        self.role = role
        self.token_payload = token_payload


async def get_onboarding_context(
    token_payload: Annotated[dict, Depends(get_current_user_token)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> OnboardingContext:
    """Narrowly-scoped onboarding context dependency.

    Extracts user_id from verified JWT sub. Resolves organization from token
    claims if present, or by inspecting member records for the user. Allows
    un-onboarded users with NO org yet to access initial onboarding state and
    bootstrap their organization safely.
    """
    sub = token_payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Subject missing in token")
    try:
        user_id = uuid.UUID(sub)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID in token")

    app_metadata = token_payload.get("app_metadata", {})
    user_metadata = token_payload.get("user_metadata", {})
    org_id_str = (
        token_payload.get("org_id") or app_metadata.get("org_id") or user_metadata.get("org_id")
    )

    org: Organization | None = None
    role: str | None = None

    if org_id_str:
        try:
            target_org_id = uuid.UUID(org_id_str)
            member = await db.scalar(
                select(Member)
                .where(Member.user_id == user_id, Member.org_id == target_org_id)
                .limit(1)
            )
            if member:
                org = await db.get(Organization, target_org_id)
                role = member.role
        except ValueError:
            pass

    if not org:
        member = await db.scalar(
            select(Member).where(Member.user_id == user_id).limit(1)
        )
        if member:
            org = await db.get(Organization, member.org_id)
            role = member.role

    return OnboardingContext(user_id=user_id, org=org, role=role, token_payload=token_payload)


def _onboarding_state(org: Organization) -> OnboardingState:
    return OnboardingState(
        org_id=str(org.id),
        onboarding_completed=org.onboarding_completed,
        onboarding_step=org.onboarding_step,
        onboarding_data=org.onboarding_data or {},
        primary_domain=org.primary_domain,
        domain_verified=org.domain_verified,
        name=org.name,
        industry=(org.settings or {}).get("industry"),
        notification_email=org.notification_email,
        whatsapp_number=org.whatsapp_number,
    )


@router.post(
    "/domain/verify-token",
    response_model=VerifyTokenResponse,
)
async def get_verify_token(  # noqa
    ctx: Annotated[OnboardingContext, Depends(get_onboarding_context)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Issues a DNS TXT verification token for the org's real primary domain."""
    if not ctx.org:
        raise HTTPException(status_code=400, detail="Set up your organization first.")
    if ctx.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )
    org = ctx.org
    if not org.primary_domain:
        raise HTTPException(
            status_code=400, detail="Set your primary domain before generating a token."
        )

    token = f"qelvix-verify-{secrets.token_urlsafe(16)}"
    txt_record = f"qelvix-verification={token}"

    # Persist the expected record on the onboarding blob so verify-check can compare.
    org.onboarding_data = {**(org.onboarding_data or {}), "verification_token": txt_record}
    flag_modified(org, "onboarding_data")
    org.onboarding_updated_at = datetime.now(timezone.utc)
    await db.commit()

    return VerifyTokenResponse(token=token, txt_record=txt_record)


@router.post(
    "/domain/verify-check",
    response_model=MessageResponse,
    dependencies=[
        Depends(org_rate_limit("verify_check", max_calls=30, window_seconds=300)),
    ],
)
async def check_domain_verification(  # noqa
    ctx: Annotated[OnboardingContext, Depends(get_onboarding_context)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Polled by the Domain Verification screen: does the real TXT record exist?"""
    if not ctx.org:
        raise HTTPException(status_code=400, detail="Set up your organization first.")
    if ctx.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )
    org = ctx.org

    expected_txt = (org.onboarding_data or {}).get("verification_token")
    if not expected_txt:
        raise HTTPException(status_code=400, detail="No verification token generated yet.")

    domain = org.primary_domain
    if not domain:
        raise HTTPException(status_code=400, detail="No primary domain set.")

    try:
        answers = await dns.asyncresolver.resolve(domain, "TXT")
        txt_records = [
            txt_string.decode("utf-8")
            for rdata in answers
            for txt_string in rdata.strings
        ]

        if expected_txt in txt_records:
            org.domain_verified = True
            # Verification is the gate; advance the resume pointer past it.
            if org.onboarding_step == "verify":
                org.onboarding_step = next_step("verify")
            org.onboarding_updated_at = datetime.now(timezone.utc)
            await db.commit()
            return MessageResponse(message="Domain verified successfully")
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Verification token not found in DNS TXT records. Hostname: {domain}, Records found: {txt_records}, Expected: {expected_txt}"
            )
    except dns.resolver.NoAnswer as e:
        raise HTTPException(status_code=400, detail=f"No TXT records found for domain. Hostname: {domain}. Raw error: {str(e)}")
    except dns.resolver.NXDOMAIN as e:
        raise HTTPException(status_code=400, detail=f"Domain does not exist. Hostname: {domain}. Raw error: {str(e)}")
    except dns.resolver.NoNameservers as e:
        raise HTTPException(status_code=400, detail=f"No nameservers found for domain. Hostname: {domain}. Raw error: {str(e)}")
    except dns.resolver.LifetimeTimeout as e:
        raise HTTPException(status_code=400, detail=f"DNS resolution timed out. Hostname: {domain}. Raw error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"verify-check DNS lookup failed for {domain}: {type(e).__name__}: {e}")
        raise HTTPException(  # noqa
            status_code=502,
            detail="Could not complete the DNS lookup right now. Please try again in a moment.",
        )


@router.get("/onboarding", response_model=OnboardingState)
async def get_onboarding(  # noqa
    ctx: Annotated[OnboardingContext, Depends(get_onboarding_context)],
):
    """Auto-resume payload: completion, current step, and everything saved so far.

    Returns clean initial onboarding state for newly authenticated users who
    have not yet created an organization.
    """
    if not ctx.org:
        user_email = ctx.token_payload.get("email")
        return OnboardingState(
            org_id=None,
            onboarding_completed=False,
            onboarding_step="business",
            onboarding_data={},
            primary_domain=None,
            domain_verified=False,
            name=None,
            industry=None,
            notification_email=user_email,
            whatsapp_number=None,
        )
    return _onboarding_state(ctx.org)


@router.post("/bootstrap", response_model=OnboardingState)
async def bootstrap_organization(
    payload: OrgBootstrapRequest,
    ctx: Annotated[OnboardingContext, Depends(get_onboarding_context)],
    db: AsyncSession = Depends(get_db_session),
) -> OnboardingState:
    """Initial organization creation endpoint for freshly authenticated users.

    Derives user_id solely from verified JWT sub. Transactionally creates
    Organization + Member(role="owner") and syncs active org_id into Supabase
    GoTrue app_metadata.
    """
    user_id = ctx.user_id
    org_name = payload.name.strip() if payload.name and payload.name.strip() else "My organization"
    notification_email = (
        payload.notification_email.strip()
        if payload.notification_email and payload.notification_email.strip()
        else ctx.token_payload.get("email")
    )

    onboarding_data = {**(payload.data or {})}
    if payload.gst and payload.gst.strip():
        onboarding_data["gst"] = payload.gst.strip()
    if notification_email:
        onboarding_data["notification_email"] = notification_email
    if org_name:
        onboarding_data["name"] = org_name

    org = ctx.org
    if org:
        org.name = org_name
        org.notification_email = notification_email
        org.onboarding_data = {**(org.onboarding_data or {}), **onboarding_data}
        flag_modified(org, "onboarding_data")
        if org.onboarding_step in ("business", "welcome"):
            org.onboarding_step = next_step("business")
        org.onboarding_updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(org)
    else:
        org = Organization(
            name=org_name,
            primary_domain=None,
            notification_email=notification_email,
            onboarding_step=next_step("business"),
            onboarding_data=onboarding_data,
            onboarding_completed=False,
        )
        db.add(org)
        await db.flush()

        member = Member(org_id=org.id, user_id=user_id, role="owner")
        db.add(member)
        await db.commit()
        await db.refresh(org)

    await set_supabase_user_org_claim(user_id=user_id, org_id=org.id)
    return _onboarding_state(org)


@router.patch("/onboarding", response_model=OnboardingState)
async def save_onboarding_step(  # noqa
    payload: OnboardingStepUpdate,
    ctx: Annotated[OnboardingContext, Depends(get_onboarding_context)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Persist one step immediately, then advance the resume pointer.

    Known fields are mirrored onto real columns (name/email/whatsapp/industry);
    everything is also merged into onboarding_data so nothing is ever lost.
    Handles seamless initial bootstrap if step == 'business' and user has no org yet.
    """
    org = ctx.org
    data = payload.data or {}

    if not org:
        if payload.step == "business":
            bootstrap_req = OrgBootstrapRequest(
                name=str(data.get("name") or "My organization"),
                notification_email=data.get("notification_email"),
                gst=data.get("gst"),
                data=data,
            )
            return await bootstrap_organization(payload=bootstrap_req, ctx=ctx, db=db)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization must be set up before saving this step.",
        )

    if ctx.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )

    if org.onboarding_completed:
        return _onboarding_state(org)

    # Mirror recognised fields onto first-class columns / settings.
    if isinstance(data.get("name"), str) and data["name"].strip():
        org.name = data["name"].strip()
    if isinstance(data.get("notification_email"), str) and data["notification_email"].strip():
        org.notification_email = data["notification_email"].strip()
    if isinstance(data.get("whatsapp_number"), str):
        org.whatsapp_number = data["whatsapp_number"].strip() or None
    if isinstance(data.get("industry"), str) and data["industry"].strip():
        org.settings = {**(org.settings or {}), "industry": data["industry"].strip()}
        flag_modified(org, "settings")

    # Merge the full step payload so partial progress is never dropped.
    org.onboarding_data = {**(org.onboarding_data or {}), **data}
    flag_modified(org, "onboarding_data")

    # Only advance forward — re-saving an earlier step must not rewind resume.
    from app.schemas.onboarding import ONBOARDING_STEPS

    target = next_step(payload.step)
    if ONBOARDING_STEPS.index(target) > ONBOARDING_STEPS.index(org.onboarding_step):
        org.onboarding_step = target

    org.onboarding_updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(org)
    return _onboarding_state(org)


@router.put(
    "/domain",
    response_model=OnboardingState,
)
async def set_primary_domain(  # noqa
    payload: DomainUpdate,
    ctx: Annotated[OnboardingContext, Depends(get_onboarding_context)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Persist the real domain to verify. No suffixes, no fake values."""
    if not ctx.org:
        raise HTTPException(status_code=400, detail="Set up your organization first.")
    if ctx.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )
    org = ctx.org

    # Changing the domain invalidates any prior verification.
    if org.primary_domain != payload.domain:
        org.primary_domain = payload.domain
        org.domain_verified = False
        org.onboarding_data = {
            k: v for k, v in (org.onboarding_data or {}).items() if k != "verification_token"
        }
        flag_modified(org, "onboarding_data")

    if org.onboarding_step in ("business", "industry", "domain"):
        org.onboarding_step = "verify"
    org.onboarding_updated_at = datetime.now(timezone.utc)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(  # noqa
            status_code=409, detail="That domain is already registered to another organization."
        )
    await db.refresh(org)
    return _onboarding_state(org)


@router.post(
    "/onboarding/complete",
    response_model=OnboardingState,
)
async def complete_onboarding(  # noqa
    ctx: Annotated[OnboardingContext, Depends(get_onboarding_context)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Finalize onboarding. Hard-gated on real domain verification."""
    if not ctx.org:
        raise HTTPException(status_code=400, detail="Set up your organization first.")
    if ctx.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )
    org = ctx.org

    missing = []
    if not org.name:
        missing.append("business name")
    if not org.primary_domain:
        missing.append("primary domain")
    if not org.domain_verified:
        missing.append("domain verification")
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot complete onboarding — still required: {', '.join(missing)}.",
        )

    org.onboarding_completed = True
    org.onboarding_step = "done"
    org.onboarding_updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(org)
    return _onboarding_state(org)
