import httpx

DPDP_CLAUSES = [
    {
        "id": "S4.1",
        "name": "Privacy Policy Published",
        "section": "Section 4 — Notice to Data Principal",
        "check": "check_privacy_policy_exists",
    },
    {
        "id": "S8.4",
        "name": "Reasonable Security Safeguards",
        "section": "Section 8(4) — Data Fiduciary duties",
        "check": "check_ssl_grade",
    },
    {
        "id": "S8.4b",
        "name": "No Internet-Exposed Databases",
        "section": "Section 8(4) — Data Fiduciary duties",
        "check": "check_no_exposed_databases",
    },
    {
        "id": "S8.6",
        "name": "Breach Notification Readiness",
        "section": "Section 8(6) — Breach notification to Board",
        "check": "check_incident_contact_defined",
    },
    {
        "id": "S9",
        "name": "Email Authentication (anti-spoofing)",
        "section": "Section 9 — Protection of children's data + general principle",
        "check": "check_spf_dmarc_present",
    },
    {
        "id": "S11",
        "name": "Consent Withdrawal Mechanism",
        "section": "Section 11 — Right to withdraw consent",
        "check": "check_contact_form_exists",
    },
]


async def check_privacy_policy_exists(domain: str, **kwargs) -> dict:  # noqa
    url = f"https://{domain}/privacy-policy"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, follow_redirects=True)
            if resp.status_code == 200:
                return {"status": "pass", "evidence": f"Found at {resp.url}"}
            else:
                return {"status": "fail", "evidence": f"HTTP {resp.status_code} at {url}"}
    except Exception as e:
        return {"status": "fail", "evidence": str(e)}


async def check_contact_form_exists(domain: str, **kwargs) -> dict:  # noqa
    url = f"https://{domain}/contact"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, follow_redirects=True)
            if resp.status_code == 200:
                return {"status": "pass", "evidence": f"Found at {resp.url}"}
            else:
                return {"status": "fail", "evidence": f"HTTP {resp.status_code} at {url}"}
    except Exception as e:
        return {"status": "fail", "evidence": str(e)}


async def check_ssl_grade(findings: list[dict], **kwargs) -> dict:  # noqa
    ssl_findings = [f for f in findings if f["agent_source"] == "ssl_analyzer"]
    if any(f["severity"] in ["critical", "high"] for f in ssl_findings):
        return {"status": "fail", "evidence": "Weak SSL grades detected"}
    return {"status": "pass", "evidence": "No critical/high SSL findings"}


async def check_no_exposed_databases(findings: list[dict], **kwargs) -> dict:  # noqa
    db_findings = [f for f in findings if f.get("finding_type") == "open_database_port"]
    if db_findings:
        return {"status": "fail", "evidence": f"{len(db_findings)} exposed databases"}
    return {"status": "pass", "evidence": "No exposed databases found"}


async def check_incident_contact_defined(**kwargs) -> dict:  # noqa
    # Requires org settings check. For the pipeline, we assume pass if they gave notification email
    # Let's say we pass it via kwargs
    org = kwargs.get("org", {})
    if org.get("notification_email"):
        return {"status": "pass", "evidence": "Notification email is set"}
    return {"status": "fail", "evidence": "No incident contact defined in settings"}


async def check_spf_dmarc_present(findings: list[dict], **kwargs) -> dict:  # noqa
    dns_findings = [f for f in findings if f["agent_source"] == "dns_analyzer"]
    if any(f["severity"] == "high" for f in dns_findings):
        return {"status": "fail", "evidence": "Missing SPF or DMARC records"}
    return {"status": "pass", "evidence": "Email authentication present"}


async def evaluate_dpdp_compliance(
    domain: str, all_findings: list[dict], org_context: dict
) -> list[dict]:
    results = []
    # Map function names to actual functions
    check_funcs = {
        "check_privacy_policy_exists": check_privacy_policy_exists,
        "check_ssl_grade": check_ssl_grade,
        "check_no_exposed_databases": check_no_exposed_databases,
        "check_incident_contact_defined": check_incident_contact_defined,
        "check_spf_dmarc_present": check_spf_dmarc_present,
        "check_contact_form_exists": check_contact_form_exists,
    }

    for clause in DPDP_CLAUSES:
        func = check_funcs[clause["check"]]
        res = await func(domain=domain, findings=all_findings, org=org_context)

        results.append(
            {
                "id": clause["id"],
                "name": clause["name"],
                "section": clause["section"],
                "status": res["status"],
                "evidence": res["evidence"],
            }
        )

    return results
