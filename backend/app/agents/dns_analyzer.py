from app.services.dns_service import resolve_dns_records
from app.rules.dns_rules import evaluate_dns
from app.agents.state import AgentState

async def run(state: AgentState) -> dict:
    domain = state.get("primary_domain")
    if not domain:
        return {"dns_findings": []}
        
    dns_data = await resolve_dns_records(domain)
    findings = evaluate_dns(dns_data)
    
    for f in findings:
        f["agent_source"] = "dns_analyzer"
        f["finding_type"] = f.pop("type")
        f["raw_data"] = f.pop("evidence")
        
    return {"dns_findings": findings}
