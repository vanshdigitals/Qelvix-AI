import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.dependencies import CurrentOrg, get_current_org
from app.models.compliance import ComplianceReport
from app.schemas.compliance import ComplianceReportResponse

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.get("/latest", response_model=ComplianceReportResponse)
async def get_latest_compliance(  # noqa
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Most recent DPDP report."""
    stmt = (
        select(ComplianceReport)
        .where(ComplianceReport.org_id == current_org.org_id)
        .order_by(ComplianceReport.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="No compliance report found")

    return report


@router.get("/{scan_id}", response_model=ComplianceReportResponse)
async def get_compliance_for_scan(  # noqa
    scan_id: uuid.UUID,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Report for specific scan."""
    stmt = (
        select(ComplianceReport)
        .where(ComplianceReport.org_id == current_org.org_id)
        .where(ComplianceReport.scan_id == scan_id)
    )
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Compliance report not found for this scan")

    return report
