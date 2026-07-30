def evaluate_fraud(fraud_data: dict) -> list[dict]:
    """
    Fraud Detection rules.
    Takes plain dict of fraud_data and returns a list of finding dicts.
    """
    results = []

    suspicious_domains = fraud_data.get("suspicious_domains", [])

    for domain_info in suspicious_domains:
        domain = domain_info.get("domain", "unknown")
        is_exact_match = domain_info.get("is_exact_name_match", False)
        is_foreign_tld = domain_info.get("is_foreign_tld", False)

        if is_exact_match:
            results.append(
                {
                    "type": "exact_name_fraud_domain",
                    "severity": "high",
                    "title": f"Domain matching org name registered by third party: {domain}",
                    "evidence": domain_info,
                }
            )
        elif is_foreign_tld:
            results.append(
                {
                    "type": "foreign_tld_brand_squat",
                    "severity": "medium",
                    "title": f"Org brand registered in foreign TLD: {domain}",
                    "evidence": domain_info,
                }
            )

    return results
