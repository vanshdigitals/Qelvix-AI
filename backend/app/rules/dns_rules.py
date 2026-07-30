def evaluate_dns(dns_data: dict) -> list[dict]:
    """
    DNS Analysis rules.
    Takes plain dict of dns_data and returns a list of finding dicts.
    """
    results = []
    domain = dns_data.get("domain", "unknown")

    spf_record = dns_data.get("spf_record")
    if not spf_record:
        results.append({
            "type": "no_spf",
            "severity": "high",
            "title": f"No SPF record on {domain}",
            "evidence": {"spf_record": None}
        })
    elif "~all" in spf_record:
        results.append({
            "type": "spf_soft_fail",
            "severity": "medium",
            "title": f"SPF uses soft fail (~all) on {domain}",
            "evidence": {"spf_record": spf_record}
        })

    dmarc_record = dns_data.get("dmarc_record")
    if not dmarc_record:
        results.append({
            "type": "no_dmarc",
            "severity": "high",
            "title": f"No DMARC record on {domain}",
            "evidence": {"dmarc_record": None}
        })

    dkim_present = dns_data.get("dkim_present", False)
    if not dkim_present:
        results.append({
            "type": "no_dkim",
            "severity": "high",
            "title": f"No DKIM on primary MX for {domain}",
            "evidence": {"dkim_present": False}
        })

    dnssec_enabled = dns_data.get("dnssec_enabled", False)
    if not dnssec_enabled:
        results.append({
            "type": "no_dnssec",
            "severity": "low",
            "title": f"DNSSEC not enabled on {domain}",
            "evidence": {"dnssec_enabled": False}
        })

    return results
