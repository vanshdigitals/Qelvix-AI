import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.dependencies import CurrentOrg, get_current_org, require_role
from app.models.scan import Scan
from app.schemas.common import PaginatedResponse
from app.schemas.scans import ScanResponse, ScanTriggerResponse

router = APIRouter(prefix="/scans", tags=["scans"])


@router.post("/trigger", response_model=ScanTriggerResponse, dependencies=[Depends(require_role("owner", "admin", "member"))])
async def trigger_scan(
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),
):
    """Start manual scan (queues Celery task)."""
    # 1. Create Scan record
    scan = Scan(
        org_id=current_org.org_id,
        status="queued",
        scan_type="full",
        triggered_by="manual"
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    
    # 2. Get the primary domain
    # For MVP we can use a hardcoded domain or look it up from Organization model
    from app.models.organization import Organization
    org = await db.get(Organization, current_org.org_id)
    primary_domain = org.domain if org else "example.com"
    
    # 3. Queue Celery task
    from app.worker import run_scan_pipeline
    run_scan_pipeline.delay(str(current_org.org_id), str(scan.id), primary_domain)
    
    return ScanTriggerResponse(
        message="Scan triggered successfully",
        scan_id=scan.id
    )


@router.get("", response_model=PaginatedResponse[ScanResponse])
async def list_scans(
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Scan history."""
    stmt = (
        select(Scan)
        .where(Scan.org_id == current_org.org_id)
        .order_by(Scan.started_at.desc().nulls_last(), Scan.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    scans = result.scalars().all()
    
    from sqlalchemy import func
    count_stmt = select(func.count()).where(Scan.org_id == current_org.org_id)
    total = await db.scalar(count_stmt) or 0
    
    return PaginatedResponse(
        items=list(scans),
        total=total,
        page=(offset // limit) + 1,
        size=limit
    )


@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(
    scan_id: uuid.UUID,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),
):
    """Scan detail."""
    scan = await db.get(Scan, scan_id)
    if not scan or scan.org_id != current_org.org_id:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    return scan


@router.get("/{scan_id}/report")
async def get_scan_report(
    scan_id: uuid.UUID,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),
):
    """Full JSON report."""
    scan = await db.get(Scan, scan_id)
    if not scan or scan.org_id != current_org.org_id:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    # MVP: Return the langgraph state or findings summary as the report
    return {
        "scan": ScanResponse.model_validate(scan).model_dump(mode='json'),
        "findings": scan.findings_summary or {}
    }


@router.get("/{scan_id}/report.pdf")
async def get_scan_report_pdf(
    scan_id: uuid.UUID,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),
):
    """Downloadable PDF (WeasyPrint), Phase 2."""
    raise HTTPException(status_code=501, detail="PDF generation not implemented yet (Phase 2)")
