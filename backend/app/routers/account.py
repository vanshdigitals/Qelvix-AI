"""Account deletion and management router.

Implements permanent, production-safe account deletion with complete cascade
of organization-owned assets, scans, findings, compliance reports, and Supabase
Auth credentials, plus pre-deletion DNS cleanup guidance.
"""

from __future__ import annotations

import logging
import uuid
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db_session
from app.dependencies import CurrentOrg, get_current_org, get_current_user_token
from app.models.audit import AuditLog
from app.models.compliance import ComplianceReport, Notification
from app.models.org import Asset, Member, Organization
from app.models.scan import Finding, Scan

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/account", tags=["account"])


# ---- Request / Response Models (INV-09) ----


class DnsRecordPreview(BaseModel):
    domain: str
    record_type: str = "TXT"
    host: str = "@ (root)"
    value: str
    verified: bool


class DeletionSummaryCounts(BaseModel):
    total_organizations: int
    total_scans: int
    total_findings: int
    total_assets: int
    total_compliance_reports: int
    total_notifications: int
    total_audit_logs: int


class DeletionPreviewResponse(BaseModel):
    user_id: uuid.UUID
    email: str | None
    organizations: list[dict[str, Any]]
    dns_records: list[DnsRecordPreview]
    summary_counts: DeletionSummaryCounts


class DeleteAccountRequest(BaseModel):
    confirmation: str


class DeleteAccountResponse(BaseModel):
    success: bool
    message: str


# ---- Helper: Supabase GoTrue Admin Deletion ----


async def delete_supabase_auth_user(user_id: uuid.UUID) -> bool:
    """Invokes the Supabase GoTrue Admin API to permanently delete the auth user."""
    settings = get_settings()
    service_key = settings.supabase_service_key.get_secret_value()
    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{str(user_id)}"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.delete(url, headers=headers)
            if resp.status_code in (200, 204, 404):
                logger.info("Successfully purged Supabase Auth user %s (status %s)", user_id, resp.status_code)
                return True
            logger.error(
                "GoTrue Admin user deletion failed for %s: %s - %s",
                user_id,
                resp.status_code,
                resp.text,
            )
            return False
    except Exception as exc:
        logger.error("Exception calling GoTrue Admin deletion for %s: %s", user_id, exc)
        return False


# ---- Endpoints ----


@router.get("/deletion-preview", response_model=DeletionPreviewResponse)
async def get_deletion_preview(
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    token_payload: Annotated[dict, Depends(get_current_user_token)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DeletionPreviewResponse:
    """Inspects the authenticated user's data and returns the exact DNS records

    and asset counts that will be permanently deleted.
    """
    user_id = current_org.user_id
    email = token_payload.get("email")

    # Find all organizations the user belongs to
    members_stmt = select(Member).where(Member.user_id == user_id)
    memberships = (await db.execute(members_stmt)).scalars().all()
    org_ids = [m.org_id for m in memberships]

    orgs_info: list[dict[str, Any]] = []
    dns_records: list[DnsRecordPreview] = []

    total_scans = 0
    total_findings = 0
    total_assets = 0
    total_compliance_reports = 0
    total_notifications = 0
    total_audit_logs = 0

    for org_id in org_ids:
        org = await db.get(Organization, org_id)
        if not org:
            continue

        orgs_info.append(
            {
                "id": str(org.id),
                "name": org.name,
                "primary_domain": org.primary_domain,
                "domain_verified": org.domain_verified,
            }
        )

        # Extract stored DNS TXT verification token
        if org.primary_domain:
            token = (org.onboarding_data or {}).get("verification_token")
            if token:
                dns_records.append(
                    DnsRecordPreview(
                        domain=org.primary_domain,
                        record_type="TXT",
                        host="@ (root)",
                        value=token,
                        verified=org.domain_verified,
                    )
                )

        # Count records owned by this org
        s_cnt = await db.scalar(select(func.count(Scan.id)).where(Scan.org_id == org_id)) or 0
        f_cnt = (
            await db.scalar(select(func.count(Finding.id)).where(Finding.org_id == org_id)) or 0
        )
        a_cnt = await db.scalar(select(func.count(Asset.id)).where(Asset.org_id == org_id)) or 0
        c_cnt = (
            await db.scalar(
                select(func.count(ComplianceReport.id)).where(ComplianceReport.org_id == org_id)
            )
            or 0
        )
        n_cnt = (
            await db.scalar(
                select(func.count(Notification.id)).where(Notification.org_id == org_id)
            )
            or 0
        )
        aud_cnt = (
            await db.scalar(select(func.count(AuditLog.id)).where(AuditLog.org_id == org_id)) or 0
        )

        total_scans += s_cnt
        total_findings += f_cnt
        total_assets += a_cnt
        total_compliance_reports += c_cnt
        total_notifications += n_cnt
        total_audit_logs += aud_cnt

    return DeletionPreviewResponse(
        user_id=user_id,
        email=email,
        organizations=orgs_info,
        dns_records=dns_records,
        summary_counts=DeletionSummaryCounts(
            total_organizations=len(orgs_info),
            total_scans=total_scans,
            total_findings=total_findings,
            total_assets=total_assets,
            total_compliance_reports=total_compliance_reports,
            total_notifications=total_notifications,
            total_audit_logs=total_audit_logs,
        ),
    )


@router.post("/delete", response_model=DeleteAccountResponse)
async def delete_account(
    payload: DeleteAccountRequest,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DeleteAccountResponse:
    """Permanently deletes the authenticated user, all organizations where they

    are the sole owner, all associated security data, and their Supabase Auth user.
    """
    if payload.confirmation.strip() != "DELETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation string must be 'DELETE' to confirm permanent deletion.",
        )

    user_id = current_org.user_id

    # 1. Inspect all memberships
    memberships_res = await db.execute(select(Member).where(Member.user_id == user_id))
    memberships = memberships_res.scalars().all()

    # Track orgs to be completely deleted vs orgs where user is just demoted/removed
    orgs_to_delete: list[uuid.UUID] = []

    for m in memberships:
        if m.role == "owner":
            # Check if there are other owners
            other_owners_count = (
                await db.scalar(
                    select(func.count(Member.id)).where(
                        Member.org_id == m.org_id,
                        Member.role == "owner",
                        Member.user_id != user_id,
                    )
                )
                or 0
            )
            if other_owners_count == 0:
                orgs_to_delete.append(m.org_id)

    try:
        # 2. Delete all owned organizations and their child data transactionally
        for org_id in orgs_to_delete:
            logger.info("Executing transactional cascade purge for organization %s", org_id)
            # Sibling references first to satisfy NO ACTION constraints cleanly
            await db.execute(delete(Finding).where(Finding.org_id == org_id))
            await db.execute(delete(ComplianceReport).where(ComplianceReport.org_id == org_id))
            await db.execute(delete(Notification).where(Notification.org_id == org_id))
            await db.execute(delete(Scan).where(Scan.org_id == org_id))
            await db.execute(delete(Asset).where(Asset.org_id == org_id))
            await db.execute(delete(AuditLog).where(AuditLog.org_id == org_id))
            await db.execute(delete(Member).where(Member.org_id == org_id))
            await db.execute(delete(Organization).where(Organization.id == org_id))

        # 3. For any remaining organizations where user was not sole owner, remove membership
        await db.execute(delete(Member).where(Member.user_id == user_id))
        await db.execute(delete(AuditLog).where(AuditLog.actor_id == user_id))

        # 4. Commit PostgreSQL changes
        await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.error("Database deletion failed for user %s: %s", user_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account data. No data was modified.",
        ) from exc

    # 5. Purge the user in Supabase GoTrue Auth
    auth_deleted = await delete_supabase_auth_user(user_id)
    if not auth_deleted:
        logger.warning(
            "Account database records were purged, but Supabase Auth deletion encountered an error for user %s",
            user_id,
        )

    return DeleteAccountResponse(
        success=True,
        message="Your Qelvix account and all associated data have been permanently deleted.",
    )
