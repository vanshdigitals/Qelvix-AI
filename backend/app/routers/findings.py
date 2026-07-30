import uuid
from datetime import UTC
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.dependencies import CurrentOrg, get_current_org, require_role
from app.models.scan import Finding
from app.schemas.common import PaginatedResponse
from app.schemas.findings import FindingResponse, FindingStatusUpdate

router = APIRouter(prefix="/findings", tags=["findings"])


@router.get("", response_model=PaginatedResponse[FindingResponse])
async def list_findings(  # noqa
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
    severity: str | None = None,
    status: str | None = None,
    finding_type: str | None = None,
    asset_id: uuid.UUID | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """All findings with optional filtering."""
    stmt = select(Finding).where(Finding.org_id == current_org.org_id)

    if severity:
        stmt = stmt.where(Finding.severity == severity)
    if status:
        stmt = stmt.where(Finding.status == status)
    if finding_type:
        stmt = stmt.where(Finding.finding_type == finding_type)
    if asset_id:
        stmt = stmt.where(Finding.asset_id == asset_id)

    stmt = stmt.order_by(Finding.discovered_at.desc()).limit(limit).offset(offset)

    result = await db.execute(stmt)
    findings = result.scalars().all()

    from sqlalchemy import func

    count_stmt = select(func.count()).where(Finding.org_id == current_org.org_id)
    if severity:
        count_stmt = count_stmt.where(Finding.severity == severity)
    if status:
        count_stmt = count_stmt.where(Finding.status == status)
    if finding_type:
        count_stmt = count_stmt.where(Finding.finding_type == finding_type)
    if asset_id:
        count_stmt = count_stmt.where(Finding.asset_id == asset_id)

    total = await db.scalar(count_stmt) or 0

    return PaginatedResponse(
        items=list(findings), total=total, page=(offset // limit) + 1, size=limit
    )


@router.get("/{finding_id}", response_model=FindingResponse)
async def get_finding(  # noqa
    finding_id: uuid.UUID,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Finding detail + explanation + remediation."""
    finding = await db.get(Finding, finding_id)
    if not finding or finding.org_id != current_org.org_id:
        raise HTTPException(status_code=404, detail="Finding not found")

    return finding


@router.put(
    "/{finding_id}/status",
    response_model=FindingResponse,
    dependencies=[Depends(require_role("owner", "admin", "member"))],
)
async def update_finding_status(  # noqa
    finding_id: uuid.UUID,
    payload: FindingStatusUpdate,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Mark acknowledged | resolved | false_positive."""
    if payload.status == "false_positive" and not payload.false_positive_reason:
        raise HTTPException(
            status_code=422, detail="false_positive requires a false_positive_reason"
        )

    finding = await db.get(Finding, finding_id)
    if not finding or finding.org_id != current_org.org_id:
        raise HTTPException(status_code=404, detail="Finding not found")

    finding.status = payload.status
    if payload.status == "false_positive":
        finding.false_positive_reason = payload.false_positive_reason
    else:
        finding.false_positive_reason = None

    if payload.status == "resolved":
        from datetime import datetime

        finding.resolved_at = datetime.now(UTC)
    else:
        finding.resolved_at = None

    await db.commit()
    await db.refresh(finding)

    return finding
