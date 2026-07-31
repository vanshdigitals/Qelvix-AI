"""
DNS service — LIVE integrations, no API key required.

  1. enumerate_subdomains() — crt.sh Certificate Transparency (live, but
     crt.sh has known uptime issues — 502/503 are common; failures are
     logged at WARNING and result in an empty subdomain list, not fake data)
  2. resolve_dns_records()  — dnspython real DNS lookups (SPF, DMARC, DKIM, DNSSEC)
"""

from __future__ import annotations

import logging

import dns.resolver
import dns.dnssec
import httpx

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# crt.sh — Subdomain Discovery (keyless, live)                                #
# --------------------------------------------------------------------------- #

async def enumerate_subdomains(domain: str) -> list[str]:
    """
    Uses crt.sh (Certificate Transparency) to find subdomains for a domain.
    Real HTTP call — no API key required.

    crt.sh is a free service with known stability issues (frequent 502/503).
    On failure we log a WARNING and return an empty list — never fake data.
    """
    url = f"https://crt.sh/?q=%25.{domain}&output=json"
    subdomains: set[str] = set()
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                for entry in data:
                    name = entry.get("name_value", "")
                    for d in name.split("\n"):
                        d = d.strip().lower()
                        if d.endswith(domain) and d != domain and "*" not in d:
                            subdomains.add(d)
                logger.info(
                    "crt.sh returned %d unique subdomains for %s",
                    len(subdomains), domain,
                )
            else:
                logger.warning(
                    "crt.sh returned HTTP %d for %s — subdomain list will "
                    "be empty (this is a known crt.sh uptime issue, not a "
                    "code bug)",
                    resp.status_code, domain,
                )
    except httpx.TimeoutException:
        logger.warning(
            "crt.sh timed out for %s — subdomain list will be empty", domain
        )
    except Exception as e:
        logger.warning("crt.sh error for %s: %s", domain, e)

    return list(subdomains)


# --------------------------------------------------------------------------- #
# dnspython — Real DNS Lookups (keyless, live)                                #
# --------------------------------------------------------------------------- #

def _query_txt(domain: str, prefix: str = "") -> str | None:
    """Query TXT records for a given subdomain. Returns first matching string or None."""
    target = f"{prefix}.{domain}" if prefix else domain
    try:
        answers = dns.resolver.resolve(target, "TXT", lifetime=5)
        for rdata in answers:
            for txt_string in rdata.strings:
                decoded = txt_string.decode("utf-8", errors="ignore")
                if prefix == "_dmarc":
                    if decoded.startswith("v=DMARC1"):
                        return decoded
                elif decoded.startswith("v=spf1"):
                    return decoded
        # If no SPF/DMARC prefix match found, return first TXT value
        for rdata in answers:
            for txt_string in rdata.strings:
                return txt_string.decode("utf-8", errors="ignore")
    except Exception:
        return None
    return None


def _check_dkim(domain: str) -> bool:
    """Check if a DKIM selector exists. Tries common selectors."""
    common_selectors = ["google", "default", "mail", "dkim", "selector1", "selector2", "k1"]
    for selector in common_selectors:
        try:
            target = f"{selector}._domainkey.{domain}"
            answers = dns.resolver.resolve(target, "TXT", lifetime=5)
            for rdata in answers:
                for txt_string in rdata.strings:
                    decoded = txt_string.decode("utf-8", errors="ignore")
                    if "v=DKIM1" in decoded or "p=" in decoded:
                        return True
        except Exception:
            continue
    return False


def _check_dnssec(domain: str) -> bool:
    """Check if DNSSEC is enabled by looking for DNSKEY records."""
    try:
        answers = dns.resolver.resolve(domain, "DNSKEY", lifetime=5)
        return len(list(answers)) > 0
    except Exception:
        return False


async def resolve_dns_records(domain: str) -> dict:
    """
    Performs REAL DNS lookups using dnspython for:
      - SPF record (TXT on apex domain)
      - DMARC record (TXT on _dmarc.<domain>)
      - DKIM presence (TXT on <selector>._domainkey.<domain>)
      - DNSSEC (DNSKEY record presence)
    No API key required.
    """
    # Run synchronous DNS calls (dnspython's resolver is synchronous)
    import asyncio
    loop = asyncio.get_event_loop()

    spf_record = await loop.run_in_executor(None, _query_txt, domain)
    dmarc_record = await loop.run_in_executor(None, _query_txt, domain, "_dmarc")
    dkim_present = await loop.run_in_executor(None, _check_dkim, domain)
    dnssec_enabled = await loop.run_in_executor(None, _check_dnssec, domain)

    return {
        "domain": domain,
        "spf_record": spf_record,
        "dmarc_record": dmarc_record,
        "dkim_present": dkim_present,
        "dnssec_enabled": dnssec_enabled,
    }
