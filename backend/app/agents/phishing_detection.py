from app.agents.state import AgentState
from app.rules.phishing_rules import evaluate_phishing
from app.services.phishing_service import fetch_phishing_data


async def run(state: AgentState) -> dict:
    domain = state.get("primary_domain")
    if not domain:
        return {"phishing_findings": []}

    phishing_data = await fetch_phishing_data(domain)

    findings = []

    if phishing_data.get("stubbed"):
        # GSB key not configured — return honest stub
        findings.append(
            {
                "agent_source": "phishing_detection",
                "finding_type": "scanner_not_configured",
                "severity": "low",
                "title": "Google Safe Browsing not yet configured",
                "raw_data": {"reason": phishing_data.get("reason")},
            }
        )
    else:
        # Live GSB result — evaluate matches
        gsb_matches = phishing_data.get("safebrowsing", [])
        for match in gsb_matches:
            threat_type = match.get("threatType", "UNKNOWN")
            findings.append(
                {
                    "agent_source": "phishing_detection",
                    "finding_type": "safe_browsing_threat",
                    "severity": "critical",
                    "title": f"Domain flagged by Google Safe Browsing: {threat_type}",
                    "raw_data": match,
                }
            )

        # Clean result with no GSB matches — no finding generated (not a stub)

    # Levenshtein/typosquat rules (work regardless of GSB)
    rule_findings = evaluate_phishing(phishing_data)
    for f in rule_findings:
        f["agent_source"] = "phishing_detection"
        f["finding_type"] = f.pop("type")
        f["raw_data"] = f.pop("evidence")
        findings.append(f)

    return {"phishing_findings": findings}
