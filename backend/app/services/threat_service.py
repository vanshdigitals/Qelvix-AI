"""
Threat intelligence service.

Real integrations:
  - XposedOrNot (xposedornot.com) — breach corpus check via GET /v1/check-email/{email}
  - VirusTotal  — VIRUSTOTAL_API_KEY
  - AbuseIPDB   — ABUSEIPDB_API_KEY
"""

from __future__ import annotations

import httpx
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# --------------------------------------------------------------------------- #
# XposedOrNot — FREE, KEYLESS breach check                                    #
# --------------------------------------------------------------------------- #

XON_BASE = "https://api.xposedornot.com/v1"
_SENTINEL_PREFIXES = ["info", "admin", "support", "contact", "hello"]

async def _xon_check_email(client: httpx.AsyncClient, email: str) -> list[str]:
    try:
        r = await client.get(f"{XON_BASE}/check-email/{email}", timeout=8)
        if r.status_code == 200:
            data = r.json()
            raw = data.get("breaches", [])
            if raw and isinstance(raw[0], list):
                return raw[0]
            if isinstance(raw, list):
                return raw
        return []
    except Exception:
        return []

async def fetch_breach_corpus(domain: str) -> dict:
    results: dict[str, list[str]] = {}
    async with httpx.AsyncClient() as client:
        for prefix in _SENTINEL_PREFIXES:
            email = f"{prefix}@{domain}"
            breaches = await _xon_check_email(client, email)
            if breaches:
                results[email] = breaches
    all_breaches: list[str] = []
    for v in results.values():
        all_breaches.extend(v)
    return {
        "breached_emails": results,
        "total_breached": len(results),
        "breach_names": sorted(set(all_breaches)),
    }

# --------------------------------------------------------------------------- #
# VirusTotal / AbuseIPDB                                                      #
# --------------------------------------------------------------------------- #

async def _virustotal_check(domain: str) -> dict:
    if not settings.virustotal_api_key:
        return {"stubbed": True, "reason": "VIRUSTOTAL_API_KEY not configured"}
        
    api_key = settings.virustotal_api_key.get_secret_value()
    url = f"https://www.virustotal.com/api/v3/domains/{domain}"
    headers = {"x-apikey": api_key}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            
        if response.status_code == 200:
            data = response.json()
            stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            return {
                "domain": domain,
                "malicious": stats.get("malicious", 0),
                "suspicious": stats.get("suspicious", 0),
                "harmless": stats.get("harmless", 0)
            }
        elif response.status_code == 404:
            return {"domain": domain, "malicious": 0, "suspicious": 0, "harmless": 0}
        else:
            logger.error(f"[VirusTotal] API error: {response.status_code} {response.text}")
            return {"stubbed": True, "reason": f"API error {response.status_code}"}
    except Exception as e:
        logger.error(f"[VirusTotal] Exception: {e}")
        return {"stubbed": True, "reason": str(e)}

async def _abuseipdb_check(ip: str) -> dict:
    if not settings.abuseipdb_api_key:
        return {"stubbed": True, "reason": "ABUSEIPDB_API_KEY not configured"}
        
    api_key = settings.abuseipdb_api_key.get_secret_value()
    url = "https://api.abuseipdb.com/api/v2/check"
    headers = {"Key": api_key, "Accept": "application/json"}
    params = {"ipAddress": ip, "maxAgeInDays": "90"}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers, params=params)
            
        if response.status_code == 200:
            data = response.json().get("data", {})
            return {
                "ip": ip,
                "abuse_confidence_score": data.get("abuseConfidenceScore", 0),
                "total_reports": data.get("totalReports", 0)
            }
        else:
            logger.error(f"[AbuseIPDB] API error: {response.status_code} {response.text}")
            return {"stubbed": True, "reason": f"API error {response.status_code}"}
    except Exception as e:
        logger.error(f"[AbuseIPDB] Exception: {e}")
        return {"stubbed": True, "reason": str(e)}

# --------------------------------------------------------------------------- #
# Public entry point called by threat_intel agent                             #
# --------------------------------------------------------------------------- #

async def fetch_threat_intel(indicators: list[str]) -> dict:
    domain = ""
    ips = []
    
    # Try to heuristically split indicators into domain vs IPs
    for ind in indicators:
        if ind.replace('.', '').isnumeric():
            ips.append(ind)
        elif not domain:
            domain = ind
            
    # Fallback to the first indicator if we didn't guess right
    if not domain and indicators:
        domain = indicators[0]
        
    breach_data = await fetch_breach_corpus(domain)
    vt_reports = []
    if domain:
        vt_reports.append(await _virustotal_check(domain))
        
    abuseipdb_reports = []
    for ip in ips:
        abuseipdb_reports.append(await _abuseipdb_check(ip))

    return {
        "stubbed": False,
        "breach_corpus": breach_data,
        "vt_reports": vt_reports,
        "abuseipdb_reports": abuseipdb_reports,
    }

