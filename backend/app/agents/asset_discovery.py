from app.agents.state import AgentState
from app.services.dns_service import enumerate_subdomains
from app.services.shodan_service import fetch_shodan_domain


async def run(state: AgentState) -> dict:
    domain = state.get("primary_domain")
    if not domain:
        return {"asset_inventory": None}

    shodan_data = await fetch_shodan_domain(domain)
    subdomains = await enumerate_subdomains(domain)

    # Shodan is stubbed — IPs list will be empty; that is intentional and honest.
    # Do not substitute fake IPs.
    ips = shodan_data.get("ips", [])

    inventory = {
        "domains": [domain],
        "subdomains": subdomains,
        "ips": ips,
        "email_domains": [domain],
        "shodan_stubbed": shodan_data.get("stubbed", False),
    }

    return {"asset_inventory": inventory}
