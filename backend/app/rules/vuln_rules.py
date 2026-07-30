def evaluate_vulnerabilities(vuln_data: dict) -> list[dict]:
    """
    Vulnerability Analysis rules.
    Takes plain dict of vuln_data and returns a list of finding dicts.
    """
    results = []
    cves = vuln_data.get("cves", [])

    for cve in cves:
        cvss = cve.get("cvss", 0.0)
        cve_id = cve.get("cve_id", "Unknown CVE")
        affected = cve.get("affected_version", "unknown version")
        
        if cvss >= 9.0:
            severity = "critical"
        elif cvss >= 7.0:
            severity = "high"
        elif cvss >= 4.0:
            severity = "medium"
        else:
            severity = "low"
            
        results.append({
            "type": "vulnerability",
            "severity": severity,
            "title": f"Vulnerability {cve_id} (CVSS {cvss}) in {affected}",
            "evidence": cve
        })

    return results
