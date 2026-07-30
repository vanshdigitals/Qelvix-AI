from app.rules.dpdp_rules import evaluate_dpdp_compliance
from app.services.llm_service import generate_dpdp_narrative
from app.agents.state import AgentState

async def run(state: AgentState) -> dict:
    domain = state.get("primary_domain")
    all_findings = state.get("all_findings", [])
    
    # Mocking org context, ideally fetched from DB or state
    org_context = {"notification_email": "admin@example.com"}
    
    clauses = await evaluate_dpdp_compliance(domain, all_findings, org_context)
    
    narrative = await generate_dpdp_narrative(clauses)
    
    overall_status = "compliant" if all(c["status"] == "pass" for c in clauses) else "non_compliant"
    
    return {
        "dpdp_clauses": clauses,
        "dpdp_overall_status": overall_status,
        "dpdp_narrative": narrative
    }
