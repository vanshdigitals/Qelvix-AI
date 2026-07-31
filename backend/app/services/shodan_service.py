import httpx
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

async def fetch_shodan_host(ip: str) -> dict:
    """
    Fetch host information from Shodan.
    """
    if not settings.shodan_api_key:
        return {
            "stubbed": True,
            "reason": "Shodan API integration not yet wired (key not configured)",
            "ip": ip,
            "open_ports": [],
        }
        
    api_key = settings.shodan_api_key.get_secret_value()
    url = f"https://api.shodan.io/shodan/host/{ip}?key={api_key}"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            
        if response.status_code == 200:
            data = response.json()
            return {
                "ip": ip,
                "open_ports": [{"port": p, "service": "unknown"} for p in data.get("ports", [])],
                "data": data.get("data", [])
            }
        elif response.status_code == 404:
            # Not found in Shodan is a valid result (no exposed ports)
            return {
                "ip": ip,
                "open_ports": [],
                "data": []
            }
        else:
            logger.error(f"[Shodan] API returned {response.status_code}: {response.text}")
            return {
                "stubbed": True,
                "reason": f"Shodan API error: {response.status_code}",
                "ip": ip,
                "open_ports": [],
            }
    except Exception as e:
        logger.error(f"[Shodan] Exception during host lookup for {ip}: {e}")
        return {
            "stubbed": True,
            "reason": f"Shodan exception: {str(e)}",
            "ip": ip,
            "open_ports": [],
        }


async def fetch_shodan_domain(domain: str) -> dict:
    """
    Fetch DNS records from Shodan to discover IPs.
    """
    if not settings.shodan_api_key:
        return {
            "stubbed": True,
            "reason": "Shodan API integration not yet wired (key not configured)",
            "domain": domain,
            "ips": [],
        }
        
    api_key = settings.shodan_api_key.get_secret_value()
    url = f"https://api.shodan.io/dns/domain/{domain}?key={api_key}"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            
        if response.status_code == 200:
            data = response.json()
            ips = []
            for record in data.get("data", []):
                if record.get("type") == "A" and record.get("value"):
                    ips.append(record.get("value"))
            return {
                "domain": domain,
                "ips": list(set(ips)),  # deduplicate
            }
        elif response.status_code == 404:
            return {
                "domain": domain,
                "ips": [],
            }
        else:
            logger.error(f"[Shodan] DNS API returned {response.status_code}: {response.text}")
            return {
                "stubbed": True,
                "reason": f"Shodan DNS API error: {response.status_code}",
                "domain": domain,
                "ips": [],
            }
    except Exception as e:
        logger.error(f"[Shodan] Exception during DNS lookup for {domain}: {e}")
        return {
            "stubbed": True,
            "reason": f"Shodan exception: {str(e)}",
            "domain": domain,
            "ips": [],
        }

