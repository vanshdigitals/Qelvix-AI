from app.agents.state import AgentState
from app.rules.vuln_rules import evaluate_vulnerabilities
from app.services.vuln_service import fetch_cve_data


async def run(state: AgentState) -> dict:
    inventory = state.get("asset_inventory", {})  # noqa
    # Mocking some software versions that would be detected by agent 2
    software_versions = [{"software": "nginx", "version": "1.14.0"}]

    vuln_data = await fetch_cve_data(software_versions)

    if vuln_data.get("stubbed"):
        return {
            "vuln_findings": [
                {
                    "agent_source": "vuln_analysis",
                    "finding_type": "scanner_not_configured",
                    "severity": "low",
                    "title": "Vulnerability scanner (NVD) not yet configured",
                    "raw_data": {"reason": vuln_data.get("reason")},
                }
            ]
        }

    findings = evaluate_vulnerabilities(vuln_data)
    for f in findings:
        f["agent_source"] = "vuln_analysis"
        f["finding_type"] = f.pop("type")
        f["raw_data"] = f.pop("evidence")

    return {"vuln_findings": findings}
