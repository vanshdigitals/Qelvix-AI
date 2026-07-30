from app.agents.state import AgentState
from app.rules.fraud_rules import evaluate_fraud
from app.services.fraud_service import fetch_fraud_data


async def run(state: AgentState) -> dict:
    domain = state.get("primary_domain")
    if not domain:
        return {"fraud_findings": []}

    fraud_data = await fetch_fraud_data(domain)

    if fraud_data.get("stubbed"):
        return {
            "fraud_findings": [
                {
                    "agent_source": "fraud_detection",
                    "finding_type": "scanner_not_configured",
                    "severity": "low",
                    "title": "Fraud Detection (ViewDNS) not yet configured",
                    "raw_data": {"reason": fraud_data.get("reason")},
                }
            ]
        }

    findings = evaluate_fraud(fraud_data)
    for f in findings:
        f["agent_source"] = "fraud_detection"
        f["finding_type"] = f.pop("type")
        f["raw_data"] = f.pop("evidence")

    return {"fraud_findings": findings}
