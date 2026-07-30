from app.rules.risk_rules import calculate_risk
from app.services.llm_service import generate_executive_summary
from app.agents.state import AgentState

async def run(state: AgentState) -> dict:
    all_findings = state.get("all_findings", [])
    
    risk_data = calculate_risk(all_findings)
    risk_score = risk_data["score"]
    risk_band = risk_data["band"]
    
    # Use LLM to generate executive summary based on the score
    summary = await generate_executive_summary(risk_data)
    
    return {
        "risk_score": risk_score,
        "risk_band": risk_band,
        "risk_executive_summary": summary
    }
