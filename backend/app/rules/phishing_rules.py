def evaluate_phishing(phishing_data: dict) -> list[dict]:
    """
    Phishing Detection rules.
    Takes plain dict of phishing_data and returns a list of finding dicts.
    """
    results = []
    
    # Levenshtein / Typosquat
    typosquats = phishing_data.get("typosquats", [])
    for domain_info in typosquats:
        distance = domain_info.get("distance", 999)
        domain = domain_info.get("domain", "unknown")
        age_days = domain_info.get("age_days", 999)
        
        if distance < 2:
            results.append({
                "type": "typosquat_domain",
                "severity": "high",
                "title": f"Lookalike domain registered: {domain}",
                "evidence": domain_info
            })
        elif age_days < 30:
            results.append({
                "type": "suspicious_new_domain",
                "severity": "medium",
                "title": f"Suspicious lookalike domain registered recently: {domain}",
                "evidence": domain_info
            })

    # Safe Browsing
    safebrowsing_hits = phishing_data.get("safebrowsing", [])
    for hit in safebrowsing_hits:
        domain = hit.get("domain", "unknown")
        results.append({
            "type": "domain_on_safebrowsing",
            "severity": "high",
            "title": f"Domain {domain} listed on Google Safe Browsing",
            "evidence": hit
        })

    return results
