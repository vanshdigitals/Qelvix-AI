"""
Phishing detection service.

Live integrations (no key needed):
  - Levenshtein/typosquat logic (deterministic, in-process)

Live integrations (key required, now wired):
  - Google Safe Browsing API v4 — GOOGLE_SAFE_BROWSING_API_KEY

Stubbed:
  - Newly registered domain feed (would require a paid threat-intel subscription)
"""

from __future__ import annotations

import httpx

from app.config import get_settings

settings = get_settings()

GSB_URL = "https://safebrowsing.googleapis.com/v4/threatMatches:find"

# Threat types we check against
GSB_THREAT_TYPES = [
    "MALWARE",
    "SOCIAL_ENGINEERING",   # phishing
    "UNWANTED_SOFTWARE",
    "POTENTIALLY_HARMFUL_APPLICATION",
]
GSB_PLATFORM_TYPES = ["ANY_PLATFORM"]
GSB_ENTRY_TYPES = ["URL"]


async def _check_safe_browsing(domain: str, api_key: str) -> list[dict]:
    """
    Call Google Safe Browsing v4 threatMatches:find for the domain.
    Returns list of threat match dicts if any threats found, else empty list.
    """
    url_to_check = f"https://{domain}/"
    payload = {
        "client": {"clientId": "qelvix", "clientVersion": "1.0"},
        "threatInfo": {
            "threatTypes": GSB_THREAT_TYPES,
            "platformTypes": GSB_PLATFORM_TYPES,
            "threatEntryTypes": GSB_ENTRY_TYPES,
            "threatEntries": [{"url": url_to_check}],
        },
    }
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.post(GSB_URL, params={"key": api_key}, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                # Empty response body {} means no threats found
                return data.get("matches", [])
            return []
    except Exception:
        return []


async def fetch_phishing_data(domain: str) -> dict:
    """
    Checks the domain against Google Safe Browsing.
    Returns live data if key is configured, honest stub if not.
    """
    gsb_key = settings.google_safe_browsing_api_key
    if not gsb_key:
        return {
            "stubbed": True,
            "reason": "Google Safe Browsing key not configured",
            "typosquats": [],
            "safebrowsing": [],
        }

    api_key = gsb_key.get_secret_value()
    matches = await _check_safe_browsing(domain, api_key)

    return {
        "stubbed": False,
        "typosquats": [],   # Newly registered domain feed not yet wired
        "safebrowsing": matches,
    }
