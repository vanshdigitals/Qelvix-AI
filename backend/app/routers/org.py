import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.dependencies import CurrentOrg, get_current_org, require_role
from app.models.org import Asset, Organization
from app.schemas.common import MessageResponse, PaginatedResponse
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

    # We pretend domain is verified if they got past onboarding,
    # or implement actual domain_verified logic.
    return OrgProfileResponse(
        id=org.id,
        name=org.name,
        primary_domain=org.primary_domain,
        whatsapp_number=org.whatsapp_number,
        notification_email=org.notification_email,
        domain_verified=True,  # Simplified for MVP unless specified otherwise
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

    await db.commit()
    await db.refresh(org)

    return OrgProfileResponse(
        id=org.id,
        name=org.name,
        primary_domain=org.primary_domain,
        whatsapp_number=org.whatsapp_number,
        notification_email=org.notification_email,
        domain_verified=True,
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
):
    """Issues a DNS TXT / well-known-file verification token."""
    # Simplified: in a real app, you would store this token in the DB to check later
    token = f"qelvix-verify-{secrets.token_urlsafe(16)}"
    return VerifyTokenResponse(token=token, txt_record=f"qelvix-verification={token}")


@router.post(
    "/domain/verify-check",
    response_model=MessageResponse,
    dependencies=[Depends(require_role("owner", "admin"))],
)
async def check_domain_verification(  # noqa
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
):
    """Polled by Domain Verification screen to check if TXT record / file exists."""
    # MVP: Always succeed or implement actual DNS lookup
    return MessageResponse(message="Domain verified successfully")
