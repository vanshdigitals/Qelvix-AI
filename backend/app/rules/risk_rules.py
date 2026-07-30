def calculate_risk(findings: list[dict]) -> dict:
    """
    Risk Scoring algorithm.
    Takes a list of findings and returns a dict with score, band, and summary.
    """
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    for f in findings:
        sev = f.get("severity", "low")
        if sev in counts:
            counts[sev] += 1

    raw_score = (
        (counts["critical"] * 25)
        + (counts["high"] * 10)
        + (counts["medium"] * 4)
        + (counts["low"] * 1)
    )
    risk_score = min(100, raw_score)

    if risk_score <= 30:
        band = "Low"
    elif risk_score <= 59:
        band = "Medium"
    elif risk_score <= 79:
        band = "High"
    else:
        band = "Critical"

    return {"score": risk_score, "band": band, "findings_summary": counts}
