from langgraph.graph import StateGraph, END
from .state import AgentState
from . import (
    asset_discovery, port_scanner, ssl_analyzer, dns_analyzer,
    vuln_analysis, threat_intel, phishing_detection, fraud_detection,
    risk_scoring, dpdp_compliance, incident_response,
    recovery_recommendation, notification
)

def analysis_join_node(state: AgentState) -> dict:
    """Combines parallel outputs. LangGraph reducer pattern handles list appends automatically
    if we used Annotated, but here we just pass through and let it merge."""
    # Since we are using standard TypedDict without Annotated reducers (per the docs),
    # the dictionary updates merge keys. We need to manually aggregate all findings.
    all_findings = []
    
    # Phase 1 findings
    all_findings.extend(state.get("port_findings", []))
    all_findings.extend(state.get("ssl_findings", []))
    all_findings.extend(state.get("dns_findings", []))
    
    # Phase 2 findings
    all_findings.extend(state.get("vuln_findings", []))
    all_findings.extend(state.get("threat_intel_findings", []))
    all_findings.extend(state.get("phishing_findings", []))
    all_findings.extend(state.get("fraud_findings", []))
    
    return {"all_findings": all_findings}

def build_pipeline() -> StateGraph:
    workflow = StateGraph(AgentState)

    workflow.add_node("asset_discovery", asset_discovery.run)
    workflow.add_node("port_scanner", port_scanner.run)
    workflow.add_node("ssl_analyzer", ssl_analyzer.run)
    workflow.add_node("dns_analyzer", dns_analyzer.run)
    
    workflow.add_node("vuln_analysis", vuln_analysis.run)
    workflow.add_node("threat_intel", threat_intel.run)
    workflow.add_node("phishing_detection", phishing_detection.run)
    workflow.add_node("fraud_detection", fraud_detection.run)
    
    workflow.add_node("analysis_join", analysis_join_node)
    
    workflow.add_node("risk_scoring", risk_scoring.run)
    workflow.add_node("dpdp_compliance", dpdp_compliance.run)
    workflow.add_node("incident_response", incident_response.run)
    workflow.add_node("recovery_recommendation", recovery_recommendation.run)
    workflow.add_node("notification", notification.run)

    workflow.set_entry_point("asset_discovery")
    workflow.add_edge("asset_discovery", "port_scanner")
    workflow.add_edge("port_scanner", "ssl_analyzer")
    workflow.add_edge("ssl_analyzer", "dns_analyzer")

    # The conditional edge routes to the parallel phase 2 nodes
    workflow.add_conditional_edges(
        "dns_analyzer",
        lambda _: ["vuln_analysis", "threat_intel", "phishing_detection", "fraud_detection"],
        ["vuln_analysis", "threat_intel", "phishing_detection", "fraud_detection"]
    )

    for agent in ["vuln_analysis", "threat_intel", "phishing_detection", "fraud_detection"]:
        workflow.add_edge(agent, "analysis_join")

    workflow.add_edge("analysis_join", "risk_scoring")
    workflow.add_edge("risk_scoring", "dpdp_compliance")
    workflow.add_edge("dpdp_compliance", "incident_response")
    workflow.add_edge("incident_response", "recovery_recommendation")
    workflow.add_edge("recovery_recommendation", "notification")
    workflow.add_edge("notification", END)

    return workflow.compile()

pipeline = build_pipeline()
