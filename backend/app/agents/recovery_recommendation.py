from app.agents.state import AgentState
from app.services.llm_service import generate_remediation


async def run(state: AgentState) -> dict:
    all_findings = state.get("all_findings", [])

    remediation_map = {}

    # In a real app we'd process all, but to save tokens/time we might only process critical/high
    for i, finding in enumerate(all_findings):
        finding_id = f"finding_{i}"
        if finding.get("severity") in ["critical", "high"]:
            remediation = await generate_remediation(finding)
            remediation_map[finding_id] = remediation

    return {"remediation_map": remediation_map}
