from app.agents.state import AgentState
from app.rules.risk_rules import calculate_risk
from app.services.claude_service import generate_executive_summary, explain_finding

async def run(state: AgentState) -> dict:
    all_findings = state.get("all_findings", [])
    
    org_context = {
        "name": state.get("primary_domain"),
        "primary_domain": state.get("primary_domain")
    }

    # Generate explanations for all findings
    for finding in all_findings:
        explanation = await explain_finding(finding, org_context)
        finding["explanation"] = explanation

    risk_data = calculate_risk(all_findings)
    risk_score = risk_data["score"]
    risk_band = risk_data["band"]

    # Use LLM to generate executive summary based on the score
    summary = await generate_executive_summary(risk_data)

    return {"risk_score": risk_score, "risk_band": risk_band, "risk_executive_summary": summary, "all_findings": all_findings}
