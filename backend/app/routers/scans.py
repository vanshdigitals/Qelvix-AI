import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.dependencies import CurrentOrg, get_current_org, get_onboarded_org, require_role
from app.models.org import Organization
from app.models.scan import Finding, Scan
from app.rate_limit import org_rate_limit
from app.schemas.common import PaginatedResponse
from app.schemas.findings import FindingResponse
from app.schemas.scans import (
    ComplianceSummary,
    RecommendationItem,
    ScanReportResponse,
    ScanResponse,
    ScanTriggerResponse,
)

router = APIRouter(prefix="/scans", tags=["scans"])

_SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}

# A scan wedged in queued/running past this window (backend crash/restart or a
# provider hang beyond the worker's own timeout) is treated as stale and
# recovered to "failed" so it can never permanently block new scans. Larger than
# worker.PIPELINE_TIMEOUT_SECONDS (480) so the worker fails cleanly first.
SCAN_MAX_RUNTIME_SECONDS = 600


async def _reap_stale_scans(db: AsyncSession, org_id: uuid.UUID) -> int:
    """Recover scans stuck in queued/running past SCAN_MAX_RUNTIME_SECONDS.

    Idempotent: marks them failed with a human-readable reason + completed_at.
    Never marks an incomplete scan as completed and never fabricates findings.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=SCAN_MAX_RUNTIME_SECONDS)
    result = await db.execute(
        update(Scan)
        .where(Scan.org_id == org_id)
        .where(Scan.status.in_(["queued", "running"]))
        .where(Scan.started_at < cutoff)
        .values(
            status="failed",
            completed_at=datetime.now(timezone.utc),
            error_log=(
                f"Scan exceeded the maximum runtime of {SCAN_MAX_RUNTIME_SECONDS}s and was "
                "recovered (stale). The backend likely restarted mid-scan; run a new scan."
            ),
        )
    )
    if result.rowcount:
        await db.commit()
    return result.rowcount or 0


def _derive_recommendations(findings: list[Finding]) -> list[RecommendationItem]:
    """Build recommendations strictly from real findings — never fabricated.

    Priority: the finding's own remediation_steps → an honest 'provider
    unavailable' note for free-tier gaps → its plain explanation → a generic
    review action built from the finding's real severity/title.
    """
    recs: list[RecommendationItem] = []
    seen: set[str] = set()
    for f in findings:
        if f.finding_type in seen:
            continue
        seen.add(f.finding_type)
        title_l = (f.title or "").lower()
        if f.remediation_steps:
            action = f.remediation_steps
        elif any(x in title_l for x in ("not yet configured", "not configured", "unavailable")):
            action = (
                "Provider unavailable on the free tier — no action required now; "
                "enabling it later widens scan coverage."
            )
        elif f.plain_explanation:
            action = f.plain_explanation
        else:
            action = f"Review and remediate this {f.severity}-severity issue: {f.title}"
        recs.append(
            RecommendationItem(
                finding_type=f.finding_type, severity=f.severity, title=f.title, action=action
            )
        )
    recs.sort(key=lambda r: _SEVERITY_ORDER.get(r.severity.lower(), 5))
    return recs


@router.post(
    "/trigger",
    response_model=ScanTriggerResponse,
    dependencies=[
        Depends(org_rate_limit("scan_trigger", max_calls=20, window_seconds=3600)),
        Depends(require_role("owner", "admin", "member")),
    ],
)
async def trigger_scan(  # noqa
    background_tasks: BackgroundTasks,
    current_org: Annotated[CurrentOrg, Depends(get_onboarded_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Start a real scan against the org's verified primary domain.

    Execution uses FastAPI BackgroundTasks (in-process). For higher volume the
    same `execute_and_save` runs as a Celery task (app.worker.run_scan_pipeline)
    once a Redis broker + worker dyno are provisioned.
    """
    org = await db.get(Organization, current_org.org_id)
    if not org or not org.primary_domain:
        raise HTTPException(status_code=400, detail="Set a primary domain before scanning.")
    if not org.domain_verified:
        raise HTTPException(status_code=403, detail="Verify domain ownership before scanning.")

    # Recover any scan wedged past the max runtime so it can't permanently block
    # new scans (the P0 anti-brick guarantee), then enforce one active scan.
    await _reap_stale_scans(db, current_org.org_id)
    active = await db.scalar(
        select(Scan.id)
        .where(Scan.org_id == current_org.org_id)
        .where(Scan.status.in_(["queued", "running"]))
        .limit(1)
    )
    if active:
        raise HTTPException(status_code=409, detail="A scan is already in progress.")

    # started_at is set at creation so even a queued scan whose worker never ran
    # (process died between commit and task start) is ageable by the reaper.
    scan = Scan(
        org_id=current_org.org_id,
        status="queued",
        scan_type="full",
        triggered_by="manual",
        started_at=datetime.now(timezone.utc),
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    from app.worker import execute_and_save

    background_tasks.add_task(
        execute_and_save, str(current_org.org_id), str(scan.id), org.primary_domain
    )

    return ScanTriggerResponse(message="Scan triggered successfully", scan_id=scan.id)


@router.get("", response_model=PaginatedResponse[ScanResponse])
async def list_scans(  # noqa
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Scan history."""
    stmt = (
        select(Scan)
        .where(Scan.org_id == current_org.org_id)
        .order_by(Scan.started_at.desc().nulls_last(), Scan.id.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    scans = result.scalars().all()

    from sqlalchemy import func

    count_stmt = select(func.count()).where(Scan.org_id == current_org.org_id)
    total = await db.scalar(count_stmt) or 0

    return PaginatedResponse(items=list(scans), total=total, page=(offset // limit) + 1, size=limit)


@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(  # noqa
    scan_id: uuid.UUID,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Scan detail."""
    scan = await db.get(Scan, scan_id)
    if not scan or scan.org_id != current_org.org_id:
        raise HTTPException(status_code=404, detail="Scan not found")

    return scan


@router.get("/{scan_id}/report", response_model=ScanReportResponse)
async def get_scan_report(  # noqa
    scan_id: uuid.UUID,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Full report assembled from real scan data (findings, risk, DPDP, degraded
    providers). Recommendations are derived from the actual findings only."""
    scan = await db.get(Scan, scan_id)
    if not scan or scan.org_id != current_org.org_id:
        raise HTTPException(status_code=404, detail="Scan not found")

    result = await db.execute(
        select(Finding)
        .where(Finding.org_id == current_org.org_id)
        .where(Finding.scan_id == scan_id)
    )
    findings = list(result.scalars().all())

    state = scan.langgraph_state or {}
    summary = scan.findings_summary or {}
    return ScanReportResponse(
        scan_id=scan.id,
        status=scan.status,
        risk_score=scan.risk_score,
        risk_band=state.get("risk_band"),
        started_at=scan.started_at,
        completed_at=scan.completed_at,
        summary={k: int(summary.get(k, 0)) for k in ("critical", "high", "medium", "low")},
        executive_summary=state.get("risk_executive_summary"),
        findings=[FindingResponse.model_validate(f) for f in findings],
        recommendations=_derive_recommendations(findings),
        compliance=ComplianceSummary(
            status=state.get("dpdp_overall_status"),
            clauses=state.get("dpdp_clauses"),
            narrative=state.get("dpdp_narrative"),
        ),
        degraded_providers=list(state.get("errors") or []),
    )


@router.get("/{scan_id}/report.pdf")
async def get_scan_report_pdf(  # noqa
    scan_id: uuid.UUID,
    current_org: Annotated[CurrentOrg, Depends(get_current_org)],
    db: AsyncSession = Depends(get_db_session),  # noqa
):
    """Downloadable PDF (WeasyPrint), Phase 2."""
    raise HTTPException(status_code=501, detail="PDF generation not implemented yet (Phase 2)")
