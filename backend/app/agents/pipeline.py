import asyncio
import logging
from collections.abc import Awaitable, Callable

from langgraph.graph import END, StateGraph

from . import (
    asset_discovery,
    dns_analyzer,
    dpdp_compliance,
    fraud_detection,
    incident_response,
    notification,
    phishing_detection,
    port_scanner,
    recovery_recommendation,
    risk_scoring,
    ssl_analyzer,
    threat_intel,
    vuln_analysis,
)
from .state import AgentState

logger = logging.getLogger(__name__)

# Hard cap per agent so a hung free-tier provider (a request that never returns)
# can't wedge the whole scan. Generous vs. real agent runtime (DNS/SSL are quick;
# LLM services already carry 15–20s client timeouts).
AGENT_TIMEOUT_SECONDS = 90


def resilient(name: str, fn: Callable[[AgentState], Awaitable[dict]]):
    """Isolate an agent so its failure degrades gracefully instead of aborting
    the whole scan (MVP critical rule: a scan always completes). Exceptions AND
    hangs (timeout) are recorded in `errors` and return an empty partial update;
    downstream nodes (risk scoring, notification) still run on whatever findings
    did succeed. Findings are never fabricated on timeout.
    """

    async def wrapped(state: AgentState) -> dict:
        try:
            return await asyncio.wait_for(fn(state), timeout=AGENT_TIMEOUT_SECONDS)
        except asyncio.TimeoutError:
            logger.error("Agent '%s' timed out after %ss", name, AGENT_TIMEOUT_SECONDS)
            errors = list(state.get("errors") or [])
            errors.append(f"{name}: unavailable (timeout after {AGENT_TIMEOUT_SECONDS}s)")
            return {"errors": errors}
        except Exception as e:  # noqa: BLE001 — provider/agent isolation boundary
            logger.error("Agent '%s' degraded: %s: %s", name, type(e).__name__, e)
            errors = list(state.get("errors") or [])
            errors.append(f"{name}: unavailable ({type(e).__name__})")
            return {"errors": errors}

    wrapped.__name__ = name
    return wrapped


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

    workflow.add_node("asset_discovery", resilient("asset_discovery", asset_discovery.run))
    workflow.add_node("port_scanner", resilient("port_scanner", port_scanner.run))
    workflow.add_node("ssl_analyzer", resilient("ssl_analyzer", ssl_analyzer.run))
    workflow.add_node("dns_analyzer", resilient("dns_analyzer", dns_analyzer.run))

    workflow.add_node("vuln_analysis", resilient("vuln_analysis", vuln_analysis.run))
    workflow.add_node("threat_intel", resilient("threat_intel", threat_intel.run))
    workflow.add_node("phishing_detection", resilient("phishing_detection", phishing_detection.run))
    workflow.add_node("fraud_detection", resilient("fraud_detection", fraud_detection.run))

    workflow.add_node("analysis_join", analysis_join_node)

    workflow.add_node("risk_scoring", resilient("risk_scoring", risk_scoring.run))
    workflow.add_node("dpdp_compliance", resilient("dpdp_compliance", dpdp_compliance.run))
    workflow.add_node("incident_response", resilient("incident_response", incident_response.run))
    workflow.add_node(
        "recovery_recommendation", resilient("recovery_recommendation", recovery_recommendation.run)
    )
    workflow.add_node("notification", resilient("notification", notification.run))

    workflow.set_entry_point("asset_discovery")
    workflow.add_edge("asset_discovery", "port_scanner")
    workflow.add_edge("port_scanner", "ssl_analyzer")
    workflow.add_edge("ssl_analyzer", "dns_analyzer")

    # The conditional edge routes to the parallel phase 2 nodes
    workflow.add_conditional_edges(
        "dns_analyzer",
        lambda _: ["vuln_analysis", "threat_intel", "phishing_detection", "fraud_detection"],
        ["vuln_analysis", "threat_intel", "phishing_detection", "fraud_detection"],
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
