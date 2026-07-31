import httpx
import logging
import urllib.parse
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

async def fetch_cve_data(software_versions: list[dict]) -> dict:
    if not settings.nvd_api_key:
        return {"stubbed": True, "reason": "NVD API key not configured", "cves": []}
        
    api_key = settings.nvd_api_key.get_secret_value()
    cves_found = []
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            headers = {"apiKey": api_key}
            
            for sw in software_versions:
                product = sw.get("product")
                version = sw.get("version")
                
                if not product or not version:
                    continue
                    
                # A simplistic CPE match. Real NVD matching is very complex,
                # but for this MVP we construct a basic cpeMatchString
                # Format: cpe:2.3:a:<vendor>:<product>:<version>:*:*:*:*:*:*:*
                # Often vendor == product for popular software (e.g. nginx, apache)
                vendor = product.lower().replace(" ", "_")
                product_clean = product.lower().replace(" ", "_")
                cpe_string = f"cpe:2.3:a:{vendor}:{product_clean}:{version}:*:*:*:*:*:*:*"
                encoded_cpe = urllib.parse.quote(cpe_string)
                
                url = f"https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName={encoded_cpe}"
                
                response = await client.get(url, headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    vulnerabilities = data.get("vulnerabilities", [])
                    
                    for item in vulnerabilities:
                        cve = item.get("cve", {})
                        cve_id = cve.get("id")
                        description = cve.get("descriptions", [{}])[0].get("value", "")
                        
                        # Extract CVSS v3 score if available
                        metrics = cve.get("metrics", {})
                        cvss = metrics.get("cvssMetricV31", metrics.get("cvssMetricV30", []))
                        base_score = 0.0
                        if cvss:
                            base_score = cvss[0].get("cvssData", {}).get("baseScore", 0.0)
                            
                        if cve_id:
                            cves_found.append({
                                "cve_id": cve_id,
                                "description": description,
                                "base_score": base_score,
                                "software": f"{product} {version}"
                            })
                else:
                    logger.warning(f"[NVD] API returned {response.status_code} for {cpe_string}")
                    
        return {
            "stubbed": False,
            "cves": cves_found
        }
    except Exception as e:
        logger.error(f"[NVD] Exception during CVE lookup: {e}")
        return {"stubbed": True, "reason": f"NVD exception: {str(e)}", "cves": []}
