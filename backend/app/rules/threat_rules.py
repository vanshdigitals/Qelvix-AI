def evaluate_threat_intel(threat_data: dict) -> list[dict]:
    """
    Threat Intelligence rules.
    Takes plain dict of threat_data and returns a list of finding dicts.
    """
    results = []

    # XposedOrNot breach corpus (free, keyless)
    breach_corpus = threat_data.get("breach_corpus", {})
    breached_emails = breach_corpus.get("breached_emails", {})
    breach_names = breach_corpus.get("breach_names", [])
    total_breached = breach_corpus.get("total_breached", 0)

    if total_breached > 0:
        severity = "critical" if total_breached >= 3 else "high" if total_breached >= 2 else "medium"
        results.append(
            {
                "type": "email_breached",
                "severity": severity,
                "title": f"{total_breached} domain email address(es) found in {len(breach_names)} breach corpus(es)",
                "evidence": {
                    "source": "XposedOrNot",
                    "breached_emails": breached_emails,
                    "breach_names": breach_names[:10],  # cap to avoid DB bloat
                    "total_breached_addresses": total_breached,
                },
            }
        )

    # VirusTotal
    vt_reports = threat_data.get("vt_reports", [])
    for report in vt_reports:
        vendors_flagged = report.get("positives", 0)
        indicator = report.get("indicator", "unknown")

        if vendors_flagged >= 3:
            results.append(
                {
                    "type": "malicious_indicator",
                    "severity": "high",
                    "title": f"Indicator {indicator} flagged by {vendors_flagged} vendors on VirusTotal",  # noqa
                    "evidence": report,
                }
            )
        elif vendors_flagged >= 1:
            results.append(
                {
                    "type": "suspicious_indicator",
                    "severity": "medium",
                    "title": f"Indicator {indicator} flagged by {vendors_flagged} vendors on VirusTotal",  # noqa
                    "evidence": report,
                }
            )

    # AbuseIPDB
    abuse_reports = threat_data.get("abuseipdb_reports", [])
    for report in abuse_reports:
        confidence = report.get("confidence", 0)
        ip = report.get("ip", "unknown")
        if confidence >= 75:
            results.append(
                {
                    "type": "abusive_ip",
                    "severity": "high",
                    "title": f"IP {ip} flagged by AbuseIPDB (confidence {confidence}%)",
                    "evidence": report,
                }
            )

    return results
