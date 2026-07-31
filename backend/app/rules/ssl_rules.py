def evaluate_ssl(ssl_data: dict) -> list[dict]:
    """
    SSL/TLS Analysis rules.
    Takes plain dict of ssl_data and returns a list of finding dicts.
    """
    results = []
    grade = ssl_data.get("grade", "T")
    days_to_expiry = ssl_data.get("days_to_expiry", 0)

    if days_to_expiry is not None:
        if days_to_expiry <= 0:
            results.append(
                {
                    "type": "ssl_expired",
                    "severity": "critical",
                    "title": f"SSL certificate EXPIRED on {ssl_data.get('domain', 'unknown')}",
                    "evidence": {"days_to_expiry": days_to_expiry, "grade": grade},
                }
            )
        elif days_to_expiry <= 30:
            results.append(
                {
                    "type": "ssl_expiring_soon",
                    "severity": "high",
                    "title": f"SSL certificate expiring in {days_to_expiry} days",
                    "evidence": {
                        "days_to_expiry": days_to_expiry,
                        "expiry_date": ssl_data.get("expiry_date"),
                    },
                }
            )
        elif days_to_expiry <= 60:
            results.append(
                {
                    "type": "ssl_expiring_soon",
                    "severity": "medium",
                    "title": f"SSL certificate expiring in {days_to_expiry} days",
                    "evidence": {
                        "days_to_expiry": days_to_expiry,
                        "expiry_date": ssl_data.get("expiry_date"),
                    },
                }
            )


    if grade in ["C", "D", "E", "F", "T"]:
        results.append(
            {
                "type": "ssl_weak_grade",
                "severity": "high" if grade in ["C", "D"] else "critical",
                "title": f"SSL grade {grade} on {ssl_data.get('domain', 'unknown')} — weak encryption",  # noqa
                "evidence": {"grade": grade, "issues": ssl_data.get("issues", [])},
            }
        )

    if not ssl_data.get("hsts_enabled"):
        results.append(
            {
                "type": "ssl_missing_hsts",
                "severity": "low",
                "title": f"HSTS not enabled on {ssl_data.get('domain', 'unknown')}",
                "evidence": {"hsts_enabled": False},
            }
        )

    return results
