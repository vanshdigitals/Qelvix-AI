from app.agents.state import AgentState
from app.rules.ssl_rules import evaluate_ssl
from app.services.ssl_labs_service import fetch_ssl_data


async def run(state: AgentState) -> dict:
    domain = state.get("primary_domain")
    if not domain:
        return {"ssl_findings": []}

    ssl_data = await fetch_ssl_data(domain)
    findings = evaluate_ssl(ssl_data)

    for f in findings:
        f["agent_source"] = "ssl_analyzer"
        f["finding_type"] = f.pop("type")
        f["raw_data"] = f.pop("evidence")

    return {"ssl_findings": findings}
