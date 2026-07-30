from celery import Celery
import asyncio
from typing import Dict, Any

from app.config import get_settings
from app.agents.pipeline import pipeline
from app.agents.state import AgentState

settings = get_settings()

celery_app = Celery(
    "worker",
    broker=settings.redis_url,
    backend=settings.redis_url
)

def run_async(coro):
    """Helper to run async code inside a synchronous Celery task."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

@celery_app.task(name="run_scan_pipeline")
def run_scan_pipeline(org_id: str, scan_id: str, primary_domain: str) -> Dict[str, Any]:
    """
    Executes the LangGraph agent pipeline.
    """
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
        errors=[]
    )
    
    # LangGraph pipeline execution
    final_state = run_async(pipeline.ainvoke(initial_state))
    
    # We return the state to be saved (or we'd save it to Postgres here)
    # The scan results should be persisted to DB here or by whoever reads the Celery result.
    # For now we'll just return it so we can test the result.
    return final_state
