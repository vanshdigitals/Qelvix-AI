from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.dependencies import CurrentOrg, get_current_org
from app.models.org import Asset
from app.models.scan import Finding, Scan
from app.schemas.dashboard import DashboardAssetsResponse, DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(  # noqa
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Security health band + risk score, counts, trend."""
    # Get latest scan for risk score
    latest_scan_stmt = (
        select(Scan)
        .where(Scan.org_id == current_org.org_id)
        .where(Scan.status == "completed")
        .order_by(Scan.completed_at.desc().nulls_last())
        .limit(1)
    )
    scan = (await db.execute(latest_scan_stmt)).scalar_one_or_none()

    risk_score = scan.risk_score if scan and scan.risk_score else 100

    # Calculate health band based on risk score (example logic)
    if risk_score >= 90:
        band = "A"
    elif risk_score >= 70:
        band = "B"
    elif risk_score >= 50:
        band = "C"
    elif risk_score >= 30:
        band = "D"
    else:
        band = "F"

    # Get total assets
    total_assets = (
        await db.scalar(select(func.count()).where(Asset.org_id == current_org.org_id)) or 0
    )

    # Get open critical findings
    critical_findings = (
        await db.scalar(
            select(func.count())
            .where(Finding.org_id == current_org.org_id)
            .where(Finding.status == "open")
            .where(Finding.severity == "critical")
        )
        or 0
    )

    # Get open high findings
    high_findings = (
        await db.scalar(
            select(func.count())
            .where(Finding.org_id == current_org.org_id)
            .where(Finding.status == "open")
            .where(Finding.severity == "high")
        )
        or 0
    )

    return DashboardSummaryResponse(
        security_health_band=band,
        risk_score=risk_score,
        total_assets=total_assets,
        open_critical_findings=critical_findings,
        open_high_findings=high_findings,
    )


@router.get("/assets", response_model=DashboardAssetsResponse)
async def get_dashboard_assets(  # noqa
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Full asset inventory summary."""
    stmt = (
        select(Asset.asset_type, func.count(Asset.id))
        .where(Asset.org_id == current_org.org_id)
        .group_by(Asset.asset_type)
    )
    result = await db.execute(stmt)
    counts = dict(result.all())

    return DashboardAssetsResponse(
        total_domains=counts.get("domain", 0),
        total_subdomains=counts.get("subdomain", 0),
        total_ips=counts.get("ip", 0),
    )
