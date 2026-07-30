async def fetch_cve_data(software_versions: list[dict]) -> dict:
    """Stubbed NVD API."""
    return {
        "stubbed": True,
        "reason": "NVD API key not configured",
        "cves": []
    }
