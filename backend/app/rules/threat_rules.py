def evaluate_threat_intel(threat_data: dict) -> list[dict]:
    """
    Threat Intelligence rules.
    Takes plain dict of threat_data and returns a list of finding dicts.
    """
    results = []
    
    # HIBP
    hibp_breaches = threat_data.get("hibp_breaches", [])
    if hibp_breaches:
        results.append({
            "type": "email_breached",
            "severity": "critical",
            "title": f"Email domain found in {len(hibp_breaches)} breaches (HIBP)",
            "evidence": {"breaches": hibp_breaches}
        })
        
    # VirusTotal
    vt_reports = threat_data.get("vt_reports", [])
    for report in vt_reports:
        vendors_flagged = report.get("positives", 0)
        indicator = report.get("indicator", "unknown")
        
        if vendors_flagged >= 3:
            results.append({
                "type": "malicious_indicator",
                "severity": "high",
                "title": f"Indicator {indicator} flagged by {vendors_flagged} vendors on VirusTotal",
                "evidence": report
            })
        elif vendors_flagged >= 1:
            results.append({
                "type": "suspicious_indicator",
                "severity": "medium",
                "title": f"Indicator {indicator} flagged by {vendors_flagged} vendors on VirusTotal",
                "evidence": report
            })
            
    # AbuseIPDB
    abuse_reports = threat_data.get("abuseipdb_reports", [])
    for report in abuse_reports:
        confidence = report.get("confidence", 0)
        ip = report.get("ip", "unknown")
        if confidence >= 75:
            results.append({
                "type": "abusive_ip",
                "severity": "high",
                "title": f"IP {ip} flagged by AbuseIPDB (confidence {confidence}%)",
                "evidence": report
            })
            
    return results
