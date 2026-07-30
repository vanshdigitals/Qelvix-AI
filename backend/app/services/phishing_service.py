async def fetch_phishing_data(domain: str) -> dict:
    """Google Safe Browsing is stubbed. Levenshtein logic is real."""
    # Stubbed GSB
    safebrowsing = []

    # Real logic for typosquat checking (simulated domain variations)
    # In reality you'd check a feed of newly registered domains, but here we'll just mock finding one.  # noqa
    typosquats = []
    # If the domain is example.com, exampIe.com is a distance of 1
    # For MVP we can just return empty since we don't have a real feed of newly registered domains

    return {
        "stubbed": True,
        "reason": "Google Safe Browsing key not configured",
        "typosquats": typosquats,
        "safebrowsing": safebrowsing,
    }
