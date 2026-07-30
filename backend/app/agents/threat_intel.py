from app.agents.state import AgentState
from app.rules.threat_rules import evaluate_threat_intel
from app.services.threat_service import fetch_threat_intel


async def run(state: AgentState) -> dict:
    domain = state.get("primary_domain")
    if not domain:
        return {"threat_intel_findings": []}

    threat_data = await fetch_threat_intel([domain])

    if threat_data.get("stubbed"):
        return {
            "threat_intel_findings": [
                {
                    "agent_source": "threat_intel",
                    "finding_type": "scanner_not_configured",
                    "severity": "low",
                    "title": "Threat Intel (VirusTotal/AbuseIPDB) not yet configured",
                    "raw_data": {"reason": threat_data.get("reason")},
                }
            ]
        }

    findings = evaluate_threat_intel(threat_data)
    for f in findings:
        f["agent_source"] = "threat_intel"
        f["finding_type"] = f.pop("type")
        f["raw_data"] = f.pop("evidence")

    return {"threat_intel_findings": findings}
