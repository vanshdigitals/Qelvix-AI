from app.agents.state import AgentState
from app.rules.phishing_rules import evaluate_phishing
from app.services.phishing_service import fetch_phishing_data


async def run(state: AgentState) -> dict:
    domain = state.get("primary_domain")
    if not domain:
        return {"phishing_findings": []}

    phishing_data = await fetch_phishing_data(domain)

    findings = []

    # Process stubbed Safe Browsing specifically
    if phishing_data.get("stubbed"):
        findings.append(
            {
                "agent_source": "phishing_detection",
                "finding_type": "scanner_not_configured",
                "severity": "low",
                "title": "Google Safe Browsing not yet configured",
                "raw_data": {"reason": phishing_data.get("reason")},
            }
        )

    # Still evaluate Levenshtein if data is there
    rule_findings = evaluate_phishing(phishing_data)
    for f in rule_findings:
        f["agent_source"] = "phishing_detection"
        f["finding_type"] = f.pop("type")
        f["raw_data"] = f.pop("evidence")
        findings.append(f)

    return {"phishing_findings": findings}
