from app.agents.state import AgentState
from app.rules.port_rules import evaluate_ports
from app.services.shodan_service import fetch_shodan_host


async def run(state: AgentState) -> dict:
    inventory = state.get("asset_inventory", {})
    ips = inventory.get("ips", [])

    all_port_findings = []

    for ip in ips:
        port_data = await fetch_shodan_host(ip)
        findings = evaluate_ports(port_data)
        for f in findings:
            f["agent_source"] = "port_scanner"
            f["finding_type"] = f.pop("type")
            f["raw_data"] = f.pop("evidence")
            all_port_findings.append(f)

    return {"port_findings": all_port_findings}
