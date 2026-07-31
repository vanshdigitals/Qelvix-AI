import asyncio
from typing import Any
import uuid
from datetime import datetime, timezone

from celery import Celery
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.pipeline import pipeline
from app.agents.state import AgentState
from app.config import get_settings
from app.database import async_session_maker
from app.models.org import Asset
from app.models.scan import Finding, Scan

settings = get_settings()
_redis_url = settings.redis_url or "redis://localhost:6379/0"

celery_app = Celery("worker", broker=_redis_url, backend=_redis_url)


def run_async(coro):  # noqa
    """Helper to run async code inside a synchronous Celery task."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    if loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    return loop.run_until_complete(coro)


async def execute_and_save(org_id: str, scan_id: str, primary_domain: str) -> dict[str, Any]:
    initial_state = AgentState(
        org_id=org_id,
        scan_id=scan_id,
        primary_domain=primary_domain,
        # Initialize default lists/dicts
        asset_inventory=None,
        port_findings=[],
        ssl_findings=[],
        dns_findings=[],
        vuln_findings=[],
        threat_intel_findings=[],
        phishing_findings=[],
        fraud_findings=[],
        all_findings=[],
        risk_score=None,
        risk_band=None,
        risk_executive_summary=None,
        dpdp_clauses=None,
        dpdp_overall_status=None,
        dpdp_narrative=None,
        ir_plan=None,
        remediation_map={},
        notifications_sent=[],
        errors=[],
    )

    # LangGraph pipeline execution
    final_state = await pipeline.ainvoke(initial_state)

    # Persist to Postgres
    async with async_session_maker() as session:
        # 1. Update Scan
        scan = await session.get(Scan, uuid.UUID(scan_id))
        if scan:
            scan.status = "completed"
            scan.completed_at = datetime.now(timezone.utc)
            scan.risk_score = final_state.get("risk_score")
            
            # findings summary
            all_f = final_state.get("all_findings", [])
            summary = {"critical": 0, "high": 0, "medium": 0, "low": 0}
            for f in all_f:
                sev = str(f.get("severity", "low")).lower()
                if sev in summary:
                    summary[sev] += 1
            
            scan.findings_summary = summary
            scan.langgraph_state = final_state
            
            # We don't have risk_band column directly on Scan model (it uses langgraph_state)
            # Actually, we can just save it in langgraph_state
        
        # 2. Save Assets
        assets = final_state.get("asset_inventory")
        if assets:
            for domain in assets.get("subdomains", []):
                # Check if exists
                stmt = select(Asset).where(Asset.org_id == uuid.UUID(org_id), Asset.value == domain)
                existing = (await session.execute(stmt)).scalar_one_or_none()
                if not existing:
                    new_asset = Asset(
                        org_id=uuid.UUID(org_id),
                        asset_type="subdomain",
                        value=domain
                    )
                    session.add(new_asset)
            
            for ip in assets.get("ips", []):
                stmt = select(Asset).where(Asset.org_id == uuid.UUID(org_id), Asset.value == ip)
                existing = (await session.execute(stmt)).scalar_one_or_none()
                if not existing:
                    new_asset = Asset(
                        org_id=uuid.UUID(org_id),
                        asset_type="ip",
                        value=ip
                    )
                    session.add(new_asset)

        # 3. Save Findings
        all_findings = final_state.get("all_findings", [])
        for f in all_findings:
            new_finding = Finding(
                id=uuid.uuid4(),
                org_id=uuid.UUID(org_id),
                scan_id=uuid.UUID(scan_id),
                finding_type=f.get("finding_type", "unknown"),
                agent_source=f.get("agent_source", "unknown"),
                severity=f.get("severity", "low"),
                title=f.get("title", "Untitled Finding"),
                raw_data=f.get("raw_data", {}),
                plain_explanation=f.get("explanation"),
                # Remediation map lookup
                remediation_steps=final_state.get("remediation_map", {}).get(f.get("finding_type"))
            )
            session.add(new_finding)
            
        await session.commit()
        
    return final_state


@celery_app.task(name="run_scan_pipeline")
def run_scan_pipeline(org_id: str, scan_id: str, primary_domain: str) -> dict[str, Any]:
    """
    Executes the LangGraph agent pipeline and saves to DB.
    """
    return run_async(execute_and_save(org_id, scan_id, primary_domain))
