async def fetch_threat_intel(indicators: list[str]) -> dict:
    """Stubbed VirusTotal and AbuseIPDB."""
    return {
        "stubbed": True,
        "reason": "VirusTotal / AbuseIPDB keys not configured",
        "hibp_breaches": [],
        "vt_reports": [],
        "abuseipdb_reports": [],
    }
