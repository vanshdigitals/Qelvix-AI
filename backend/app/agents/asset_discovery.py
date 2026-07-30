from app.services.shodan_service import fetch_shodan_domain
from app.services.dns_service import enumerate_subdomains
from app.agents.state import AgentState

async def run(state: AgentState) -> dict:
    domain = state.get("primary_domain")
    if not domain:
        return {"asset_inventory": None}
        
    shodan_data = await fetch_shodan_domain(domain)
    subdomains = await enumerate_subdomains(domain)
    
    inventory = {
        "domains": [domain],
        "subdomains": subdomains,
        "ips": shodan_data.get("ips", []),
        "email_domains": [domain]
    }
    
    return {"asset_inventory": inventory}
