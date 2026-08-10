import logging
import secrets
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.database import get_db_session
import dns.asyncresolver
import dns.resolver

from app.dependencies import CurrentOrg, get_current_org, require_role
from app.models.org import Asset, Organization
from app.rate_limit import org_rate_limit
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.onboarding import (
    OnboardingState,
    OnboardingStepUpdate,
    DomainUpdate,
    next_step,
)
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


@router.post(
    "/domain/verify-token",
    response_model=VerifyTokenResponse,
    dependencies=[Depends(require_role("owner", "admin"))],
)
async def get_verify_token(  # noqa
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Issues a DNS TXT verification token for the org's real primary domain."""
    org = await db.get(Organization, current_org.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
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
        Depends(require_role("owner", "admin")),
    ],
)
async def check_domain_verification(  # noqa
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Polled by the Domain Verification screen: does the real TXT record exist?"""
    org = await db.get(Organization, current_org.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

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
        # The "token not found" 400 is raised inside the try; let it propagate
        # cleanly instead of being re-wrapped as a 500 by the catch-all below.
        raise
    except Exception as e:
        # Don't leak resolver/stack internals to the client.
        logging.error(f"verify-check DNS lookup failed for {domain}: {type(e).__name__}: {e}")
        raise HTTPException(  # noqa
            status_code=502,
            detail="Could not complete the DNS lookup right now. Please try again in a moment.",
        )


# ---------------------------------------------------------------------------
# Onboarding: server-owned state so the wizard resumes and gates the dashboard.
# ---------------------------------------------------------------------------

def _onboarding_state(org: Organization) -> OnboardingState:
    return OnboardingState(
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


@router.get("/onboarding", response_model=OnboardingState)
async def get_onboarding(  # noqa
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Auto-resume payload: completion, current step, and everything saved so far."""
    org = await db.get(Organization, current_org.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return _onboarding_state(org)


@router.patch(
    "/onboarding",
    response_model=OnboardingState,
    dependencies=[Depends(require_role("owner", "admin"))],
)
async def save_onboarding_step(  # noqa
    payload: OnboardingStepUpdate,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Persist one step immediately, then advance the resume pointer.

    Known fields are mirrored onto real columns (name/email/whatsapp/industry);
    everything is also merged into onboarding_data so nothing is ever lost.
    """
    org = await db.get(Organization, current_org.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if org.onboarding_completed:
        return _onboarding_state(org)

    data = payload.data or {}

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
    dependencies=[Depends(require_role("owner", "admin"))],
)
async def set_primary_domain(  # noqa
    payload: DomainUpdate,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Persist the real domain to verify. No suffixes, no fake values."""
    org = await db.get(Organization, current_org.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

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
    dependencies=[Depends(require_role("owner", "admin"))],
)
async def complete_onboarding(  # noqa
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Finalize onboarding. Hard-gated on real domain verification."""
    org = await db.get(Organization, current_org.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

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
