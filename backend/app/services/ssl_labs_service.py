"""
SSL Labs service — LIVE integration via Qualys SSL Labs API.

Endpoint: https://api.ssllabs.com/api/v3/analyze
No API key required. Free public API.
Rate limit: ~1 req per 10 seconds per IP.

The analyze endpoint is async — it starts an assessment if not cached,
and returns cached results if available. We poll until complete or
fall back gracefully on timeout.
"""

from __future__ import annotations

import asyncio
import httpx

SSL_LABS_BASE = "https://api.ssllabs.com/api/v3"
MAX_POLL_SECONDS = 90   # SSL Labs can take up to 60-90s for a fresh scan
POLL_INTERVAL = 10


async def fetch_ssl_data(domain: str) -> dict:
    """
    Calls the real Qualys SSL Labs API to get SSL grade and certificate details.
    Polls until the result is ready (status=READY) or times out.
    Falls back to a clearly-labelled error dict on any failure.
    """
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            # First call — use fromCache=on to get instant results for known domains
            # and startNew=off so we don't bust the cache unnecessarily
            params = {
                "host": domain,
                "all": "done",
                "ignoreMismatch": "on",
            }

            resp = await client.get(f"{SSL_LABS_BASE}/analyze", params=params)
            if resp.status_code != 200:
                return _error_result(domain, f"SSL Labs returned HTTP {resp.status_code}")

            data = resp.json()
            status = data.get("status", "")

            # Poll until READY or ERROR
            elapsed = 0
            while status not in ("READY", "ERROR") and elapsed < MAX_POLL_SECONDS:
                await asyncio.sleep(POLL_INTERVAL)
                elapsed += POLL_INTERVAL
                resp = await client.get(f"{SSL_LABS_BASE}/analyze", params=params)
                if resp.status_code != 200:
                    break
                data = resp.json()
                status = data.get("status", "")

            if status == "ERROR":
                return _error_result(domain, data.get("statusMessage", "SSL Labs error"))

            if status != "READY":
                # Timed out — return partial data with a flag
                return _error_result(domain, "SSL Labs scan timed out — try again later")

            # Parse the result
            return _parse_result(domain, data)

        except Exception as e:
            return _error_result(domain, str(e))


def _parse_result(domain: str, data: dict) -> dict:
    """Extract grade, expiry, and HSTS from SSL Labs response."""
    endpoints = data.get("endpoints", [])
    if not endpoints:
        return _error_result(domain, "No endpoints returned by SSL Labs")

    # Use the first (primary) endpoint
    ep = endpoints[0]
    grade = ep.get("grade", "T")  # T = test not complete / no grade
    has_warnings = ep.get("hasWarnings", False)

    # Certificate details live inside the endpoint's details
    details = ep.get("details", {})
    cert_chain = details.get("certChains", [{}])[0] if details.get("certChains") else {}
    certs = cert_chain.get("certs", [{}])
    cert = certs[0] if certs else {}

    not_after_ms = cert.get("notAfter", 0)
    days_to_expiry: int | None = None
    expiry_date: str | None = None
    if not_after_ms:
        import datetime
        expiry_dt = datetime.datetime.utcfromtimestamp(not_after_ms / 1000)
        days_to_expiry = max(0, (expiry_dt - datetime.datetime.utcnow()).days)
        expiry_date = expiry_dt.strftime("%Y-%m-%d")

    hsts = details.get("hstsPolicy", {}).get("status", "absent") == "present"

    # Collect specific issues flagged by SSL Labs
    issues = []
    if grade in ("C", "D", "E", "F", "T", "M"):
        issues.append(f"SSL grade is {grade} — certificate or configuration issue")
    if not hsts:
        issues.append("HSTS not enabled")
    if has_warnings:
        issues.append("SSL Labs reported warnings on this endpoint")

    return {
        "domain": domain,
        "grade": grade,
        "days_to_expiry": days_to_expiry,
        "expiry_date": expiry_date,
        "hsts_enabled": hsts,
        "issues": issues,
        "stubbed": False,
    }


def _error_result(domain: str, reason: str) -> dict:
    """Returned when SSL Labs is unreachable or times out — clearly NOT fake data."""
    return {
        "domain": domain,
        "stubbed": True,
        "reason": f"SSL Labs unavailable: {reason}",
        "grade": None,
        "days_to_expiry": None,
        "expiry_date": None,
        "hsts_enabled": None,
        "issues": [],
    }
