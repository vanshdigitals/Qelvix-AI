from app.agents.state import AgentState
from app.rules.threat_rules import evaluate_threat_intel
from app.services.threat_service import fetch_threat_intel


async def run(state: AgentState) -> dict:
    domain = state.get("primary_domain")
    if not domain:
        return {"threat_intel_findings": []}

    threat_data = await fetch_threat_intel([domain])

    # VirusTotal / AbuseIPDB still stubbed — only add a finding if both remain unconfigured
    vt_stubbed = not threat_data.get("vt_reports")
    abuse_stubbed = not threat_data.get("abuseipdb_reports")

    findings = evaluate_threat_intel(threat_data)
    for f in findings:
        f["agent_source"] = "threat_intel"
        f["finding_type"] = f.pop("type")
        f["raw_data"] = f.pop("evidence")

    # Append a single informational stub for the two still-unconfigured scanners
    if vt_stubbed and abuse_stubbed:
        findings.append(
            {
                "agent_source": "threat_intel",
                "finding_type": "scanner_not_configured",
                "severity": "low",
                "title": "VirusTotal/AbuseIPDB not yet configured (XposedOrNot breach check is live)",
                "raw_data": {"reason": "VirusTotal / AbuseIPDB keys not configured"},
            }
        )

    return {"threat_intel_findings": findings}
