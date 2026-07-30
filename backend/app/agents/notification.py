from app.services.llm_service import generate_whatsapp_summary
from app.services.email_service import send_scan_report_email
from app.agents.state import AgentState
from app.database import get_db_session
from app.models.org import Organization
from app.config import get_settings

settings = get_settings()

async def run(state: AgentState) -> dict:
    scan_result = {
        "risk_score": state.get("risk_score"),
        "risk_band": state.get("risk_band"),
        "risk_executive_summary": state.get("risk_executive_summary"),
        "findings_summary": state.get("findings_summary", {}), 
        "top_findings": [f["title"] for f in state.get("all_findings", []) if f.get("severity") in ["critical", "high"]][:3]
    }
    
    org_id = state.get("org_id")
    org = None
    if org_id:
        # Get DB session from generator
        session_gen = get_db_session()
        db = await anext(session_gen)
        try:
            org = await db.get(Organization, org_id)
        finally:
            await session_gen.aclose()
            
    org_name = org.name if org else state.get("primary_domain")
    notification_email = org.notification_email if org else None
    whatsapp_number = org.whatsapp_number if org else None
    
    notifications_sent = []
    
    # 1. Email Channel
    if notification_email:
        dashboard_url = f"{settings.frontend_url}/dashboard"
        send_scan_report_email(notification_email, org_name, scan_result, dashboard_url)
        notifications_sent.append("email")
        
    # 2. WhatsApp Channel (Stubbed)
    # TODO: Phase 8 - WhatsApp Business API setup is paused. When ready, 
    # plug in credentials and replace the stub below with actual HTTP API call.
    if whatsapp_number:
        whatsapp_msg = await generate_whatsapp_summary(scan_result, {"name": org_name})
        print(f"[WhatsApp Stub] Would send message to {whatsapp_number}:\n{whatsapp_msg}")
        notifications_sent.append("whatsapp_stubbed")
    
    return {"notifications_sent": notifications_sent}
