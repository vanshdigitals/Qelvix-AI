# Rules

Scope: every deterministic rule that assigns a severity or contributes to the risk score. Trigger condition, threshold, severity, risk contribution, and the exact function that decides it.

This file is the evidence that no model touches scoring. Every severity literal and every arithmetic operation on the score appears below with a file and line reference. If a severity is not listed here, no code produces it.

## The scoring function

`calculate_risk`, `backend/app/rules/risk_rules.py:1`. Pure function of a list of finding dicts. No I/O, no LLM, no configuration.

1. Initialize counters for `critical`, `high`, `medium`, `low` (`risk_rules.py:6`).
2. For each finding, read `f.get("severity", "low")` and increment that counter if the value is one of the four keys (`risk_rules.py:8-11`). A severity outside the four is silently ignored and contributes nothing.
3. Compute the raw score (`risk_rules.py:13-18`):

   `raw = 25*critical + 10*high + 4*medium + 1*low`

4. Clamp: `risk_score = min(100, raw)` (`risk_rules.py:19`). There is no floor; an empty finding list scores 0.
5. Assign the band (`risk_rules.py:21-28`):

   | Score | Band |
   |---|---|
   | 0 to 30 | `Low` |
   | 31 to 59 | `Medium` |
   | 60 to 79 | `High` |
   | 80 to 100 | `Critical` |

6. Return `{"score", "band", "findings_summary"}` (`risk_rules.py:30`).

Called at `backend/app/agents/risk_scoring.py:18`, before the executive-summary LLM call at line 23 and with no LLM output in its input. The returned score and band are written to state at `risk_scoring.py:25` and persisted to `scans.risk_score` at `backend/app/worker.py:113`.

Higher score means worse. Four criticals, or ten highs, or one critical plus eight highs, all reach 100.

### The competing band function

`backend/app/routers/dashboard.py:35-44` computes a second, unrelated `security_health_band` from the same `risk_score`:

| Score | Band |
|---|---|
| >= 90 | `A` |
| 70 to 89 | `B` |
| 50 to 69 | `C` |
| 30 to 49 | `D` |
| < 30 | `F` |

This inverts the meaning `calculate_risk` assigns: a score of 95, which `risk_rules.py` classes `Critical`, is reported as band `A`. When no completed scan exists the endpoint substitutes 100 (`dashboard.py:32`), so a brand-new organization is shown as `A` with a risk score of 100. This is a defect, recorded here because it is the only other place in the codebase that derives a rating from a score.

## DNS rules

`evaluate_dns`, `backend/app/rules/dns_rules.py:1`. Input is the dict from `resolve_dns_records`.

| Trigger | Condition | `finding_type` | Severity | Points | Decided at |
|---|---|---|---|---|---|
| No SPF record | `spf_record` is falsy | `no_spf` | high | 10 | `dns_rules.py:10-18` |
| SPF soft fail | `spf_record` is present and contains the substring `~all` | `spf_soft_fail` | medium | 4 | `dns_rules.py:19-27` |
| No DMARC record | `dmarc_record` is falsy | `no_dmarc` | high | 10 | `dns_rules.py:29-38` |
| No DKIM | `dkim_present` is false | `no_dkim` | high | 10 | `dns_rules.py:40-49` |
| No DNSSEC | `dnssec_enabled` is false | `no_dnssec` | low | 1 | `dns_rules.py:51-60` |

The SPF branches are mutually exclusive (`elif` at `dns_rules.py:19`). A domain can otherwise emit all four remaining findings, for 25 points.

The `~all` check is a plain substring test with no SPF parsing, so `-all` (hard fail) and `?all` (neutral) produce no finding. `?all` is weaker than `~all` and is not flagged.

`dkim_present` is true only if one of 7 hardcoded selectors resolves (`backend/app/services/dns_service.py:95`). A domain using a selector outside that list is reported as having no DKIM.

## SSL rules

`evaluate_ssl`, `backend/app/rules/ssl_rules.py:1`. Input is the dict from `fetch_ssl_data`. Defaults: `grade` falls back to `"T"` and `days_to_expiry` to `0` (`ssl_rules.py:7-8`).

| Trigger | Condition | `finding_type` | Severity | Points | Decided at |
|---|---|---|---|---|---|
| Certificate expired | `days_to_expiry <= 0` | `ssl_expired` | critical | 25 | `ssl_rules.py:11-19` |
| Expiring within 30 days | `0 < days_to_expiry <= 30` | `ssl_expiring_soon` | high | 10 | `ssl_rules.py:20-31` |
| Expiring within 60 days | `30 < days_to_expiry <= 60` | `ssl_expiring_soon` | medium | 4 | `ssl_rules.py:32-43` |
| Weak grade C or D | `grade in ["C","D"]` | `ssl_weak_grade` | high | 10 | `ssl_rules.py:46-54` |
| Weak grade E, F or T | `grade in ["E","F","T"]` | `ssl_weak_grade` | critical | 25 | `ssl_rules.py:46-54` |
| HSTS absent | `hsts_enabled` is falsy | `ssl_missing_hsts` | low | 1 | `ssl_rules.py:56-64` |

The severity of `ssl_weak_grade` is chosen inline by the conditional expression at `ssl_rules.py:50`: `"high" if grade in ["C","D"] else "critical"`. Grades A, A+, B and M produce no grade finding; `M` (name mismatch) is listed in the service's issue text at `backend/app/services/ssl_labs_service.py:101` but not in the rule's trigger set, so a mismatched certificate is not flagged.

The expiry branches are an if/elif chain, so at most one fires. The grade and HSTS checks are independent, so a maximum of 3 SSL findings can coexist, worth up to 51 points.

`days_to_expiry` is computed as `max(0, ...)` (`ssl_labs_service.py:94`), so an already-expired certificate reports 0 and is correctly caught by the `<= 0` branch.

The `hsts_enabled` check is `if not ssl_data.get("hsts_enabled")` (`ssl_rules.py:56`), which is also true when the key is None. The error path sets `hsts_enabled: None` (`ssl_labs_service.py:128`), but that path is short-circuited earlier by the agent's `stubbed` branch, so the rule never sees it in practice.

## Port rules

`evaluate_ports`, `backend/app/rules/port_rules.py:1`. Input is the dict from `fetch_shodan_host`. Port classes are hardcoded at `port_rules.py:10-12`.

| Trigger | Condition | `finding_type` | Severity | Points | Decided at |
|---|---|---|---|---|---|
| RDP, Telnet or SMB open | `port in {3389, 23, 445}` | `open_critical_port` | critical | 25 | `port_rules.py:18-26` |
| MySQL, PostgreSQL or MongoDB open | `port in {3306, 5432, 27017}` | `open_database_port` | high | 10 | `port_rules.py:27-35` |
| FTP open, or any non-standard high port | `port == 21`, or `port > 1024 and port not in [3389, 3306, 5432, 27017, 8080, 8443]` | `open_medium_port` | medium | 4 | `port_rules.py:36-52` |

The three branches are an if/elif chain evaluated per open port, so each port yields at most one finding. The title text differs between the FTP case and the generic case (`port_rules.py:40-43`), but the type and severity are identical.

The third branch's exclusion list repeats ports already handled by the earlier branches, which is redundant but harmless. Ports 1 to 1024 other than 21, 23 and 445 produce no finding at all, so an exposed port 22 (SSH), 25 (SMTP) or 3389-equivalent alternate is not flagged. Ports 8080 and 8443 are explicitly exempted.

The heuristic is broad: any open port above 1024 is medium. A host with many high ports open accumulates 4 points each and can reach the 100 clamp on its own.

## Vulnerability rules

`evaluate_vulnerabilities`, `backend/app/rules/vuln_rules.py:1`. Input is the dict from `fetch_cve_data`. One finding per CVE, type always `vulnerability` (`vuln_rules.py:25`).

| CVSS base score | Severity | Points | Decided at |
|---|---|---|---|
| >= 9.0 | critical | 25 | `vuln_rules.py:14-15` |
| 7.0 to 8.9 | high | 10 | `vuln_rules.py:16-17` |
| 4.0 to 6.9 | medium | 4 | `vuln_rules.py:18-19` |
| < 4.0 | low | 1 | `vuln_rules.py:20-21` |

These thresholds match the CVSS v3 qualitative severity bands.

The score is read as `cve.get("cvss", 0.0)` (`vuln_rules.py:10`), while `fetch_cve_data` emits the key `base_score` (`backend/app/services/vuln_service.py:60`). Every CVE that reached this function would therefore be scored 0.0 and classed `low`. In the current configuration nothing reaches it at all; see `AGENTS.md`.

## Threat intelligence rules

`evaluate_threat_intel`, `backend/app/rules/threat_rules.py:1`.

### Breach corpus, XposedOrNot

| Trigger | Condition | `finding_type` | Severity | Points | Decided at |
|---|---|---|---|---|---|
| 3 or more sentinel addresses breached | `total_breached >= 3` | `email_breached` | critical | 25 | `threat_rules.py:15` |
| 2 addresses breached | `total_breached == 2` | `email_breached` | high | 10 | `threat_rules.py:15` |
| 1 address breached | `total_breached == 1` | `email_breached` | medium | 4 | `threat_rules.py:15` |
| None breached | `total_breached == 0` | no finding | | 0 | `threat_rules.py:14` |

The severity is chosen by the nested conditional expression on the single line `threat_rules.py:15`. Exactly one `email_breached` finding is emitted per scan; it aggregates all breached addresses. `total_breached` counts distinct email addresses, not breaches (`backend/app/services/threat_service.py:54`), and the address set is the fixed 5 sentinel prefixes at `threat_service.py:25`. The stored evidence caps `breach_names` at 10 entries (`threat_rules.py:24`).

### VirusTotal

| Trigger | Condition | `finding_type` | Severity | Points | Decided at |
|---|---|---|---|---|---|
| 3 or more vendors flag the indicator | `positives >= 3` | `malicious_indicator` | high | 10 | `threat_rules.py:36-44` |
| 1 or 2 vendors flag the indicator | `positives >= 1` | `suspicious_indicator` | medium | 4 | `threat_rules.py:45-53` |

Unreachable. The service emits `malicious`, `suspicious` and `harmless`, never `positives` (`threat_service.py:79-81`), so `report.get("positives", 0)` is always 0.

### AbuseIPDB

| Trigger | Condition | `finding_type` | Severity | Points | Decided at |
|---|---|---|---|---|---|
| High-confidence abusive IP | `confidence >= 75` | `abusive_ip` | high | 10 | `threat_rules.py:60-68` |

Unreachable twice over: `abuseipdb_reports` is always empty because only the domain is passed as an indicator (`backend/app/agents/threat_intel.py:11`), and the service emits `abuse_confidence_score`, not `confidence` (`threat_service.py:109`).

## Phishing rules

`evaluate_phishing`, `backend/app/rules/phishing_rules.py:1`.

| Trigger | Condition | `finding_type` | Severity | Points | Decided at |
|---|---|---|---|---|---|
| Lookalike domain | `distance < 2` | `typosquat_domain` | high | 10 | `phishing_rules.py:15-23` |
| Recently registered lookalike | `distance >= 2` and `age_days < 30` | `suspicious_new_domain` | medium | 4 | `phishing_rules.py:24-32` |
| Domain on Safe Browsing | one per entry in `safebrowsing` | `domain_on_safebrowsing` | high | 10 | `phishing_rules.py:36-45` |

Defaults are `distance = 999` and `age_days = 999` (`phishing_rules.py:11-13`), so a malformed typosquat entry produces no finding.

The two typosquat branches are unreachable: `fetch_phishing_data` always returns `typosquats: []` (`backend/app/services/phishing_service.py:81`), and no distance or age computation exists anywhere in the repository.

The Safe Browsing branch double-counts. The agent already emits its own finding for the same match before calling this function:

| Trigger | `finding_type` | Severity | Points | Decided at |
|---|---|---|---|---|
| Safe Browsing match | `safe_browsing_threat` | critical | 25 | `backend/app/agents/phishing_detection.py:29-39` |

A single flagged domain therefore produces two findings and 35 points.

## Fraud rules

`evaluate_fraud`, `backend/app/rules/fraud_rules.py:1`.

| Trigger | Condition | `finding_type` | Severity | Points | Decided at |
|---|---|---|---|---|---|
| Third party registered the org name | `is_exact_name_match` is true | `exact_name_fraud_domain` | high | 10 | `fraud_rules.py:15-23` |
| Brand registered in a foreign TLD | `is_exact_name_match` is false and `is_foreign_tld` is true | `foreign_tld_brand_squat` | medium | 4 | `fraud_rules.py:24-32` |

Both are unreachable. `backend/app/services/fraud_service.py:1` always returns `suspicious_domains: []`.

## Provider-unavailable findings

These are emitted directly by agent modules rather than by a rules module. They carry severity `low`, so each contributes 1 point to the risk score.

| Emitted by | `finding_type` | Severity | Points | Condition |
|---|---|---|---|---|
| `backend/app/agents/port_scanner.py:11-22` | `scanner_not_configured` | low | 1 | Shodan stubbed or no IPs discovered |
| `backend/app/agents/ssl_analyzer.py:14-25` | `scanner_unavailable` | low | 1 | SSL Labs returned an error or timed out |
| `backend/app/agents/vuln_analysis.py:13-24` | `scanner_not_configured` | low | 1 | NVD key absent or the client raised |
| `backend/app/agents/threat_intel.py:24-33` | `scanner_not_configured` | low | 1 | Dead branch; the condition can never be true |
| `backend/app/agents/phishing_detection.py:15-25` | `scanner_not_configured` | low | 1 | Safe Browsing key absent |
| `backend/app/agents/fraud_detection.py:13-24` | `scanner_not_configured` | low | 1 | Always, because the service is a stub |

In the default configuration with no Shodan key, at least two of these fire on every scan (port scanner and fraud detection), adding 2 points to every organization's risk score for reasons unrelated to that organization's security posture. `_derive_recommendations` recognises them by title substring and downgrades them to a "no action required now" note (`backend/app/routers/scans.py:77-81`), but the score contribution stands.

## DPDP clause rules

`evaluate_dpdp_compliance`, `backend/app/rules/dpdp_rules.py:99`. Six clauses defined at `dpdp_rules.py:3-40`. Each returns `pass` or `fail` with an evidence string. These do not carry a severity and do not contribute to the risk score.

| Clause | Name | Check function | Pass condition |
|---|---|---|---|
| S4.1 | Privacy Policy Published | `check_privacy_policy_exists`, `dpdp_rules.py:43` | `GET https://{domain}/privacy-policy` returns HTTP 200 after redirects |
| S8.4 | Reasonable Security Safeguards | `check_ssl_grade`, `dpdp_rules.py:69` | No `ssl_analyzer` finding has severity `critical` or `high` |
| S8.4b | No Internet-Exposed Databases | `check_no_exposed_databases`, `dpdp_rules.py:76` | No finding has `finding_type == "open_database_port"` |
| S8.6 | Breach Notification Readiness | `check_incident_contact_defined`, `dpdp_rules.py:83` | `org["notification_email"]` is truthy |
| S9 | Email Authentication | `check_spf_dmarc_present`, `dpdp_rules.py:92` | No `dns_analyzer` finding has severity `high` |
| S11 | Consent Withdrawal Mechanism | `check_contact_form_exists`, `dpdp_rules.py:56` | `GET https://{domain}/contact` returns HTTP 200 after redirects |

Overall status is computed at `backend/app/agents/dpdp_compliance.py:17`: `compliant` only if every clause passed, otherwise `non_compliant`. No weighting, no partial credit.

Behaviour worth knowing:

- S4.1 and S11 probe one fixed path each. A privacy policy at `/privacy` or `/legal/privacy` fails the check. A site with a catch-all that returns 200 passes it regardless of content.
- Both HTTP checks treat any exception, including a timeout, as `fail` with the exception string as evidence (`dpdp_rules.py:52-53`, `dpdp_rules.py:65-66`).
- S8.6 always passes, because the org context is hardcoded to `{"notification_email": "admin@example.com"}` at `dpdp_compliance.py:11` rather than read from the organization row.
- S9 keys on severity rather than finding type, so a `no_dkim` finding (high) fails a clause whose stated subject is SPF and DMARC.
- S8.4 keys on `f["agent_source"]` and `f["severity"]` with direct subscripting (`dpdp_rules.py:70-71`), so a finding missing either key raises a `KeyError`, which the `resilient` wrapper converts into a degraded-provider entry and no DPDP output at all.

## Where the LLM is, and is not

Confirmed by reading every call site of `backend/app/services/claude_service.py`:

| Function | Called from | What its output becomes |
|---|---|---|
| `explain_finding` | `backend/app/agents/risk_scoring.py:15` | `findings.plain_explanation` |
| `generate_executive_summary` | `backend/app/agents/risk_scoring.py:23` | `langgraph_state.risk_executive_summary` |
| `generate_dpdp_narrative` | `backend/app/agents/dpdp_compliance.py:15` | `langgraph_state.dpdp_narrative` |
| `generate_remediation` | `backend/app/agents/recovery_recommendation.py:14` | `langgraph_state.remediation_map` |
| `generate_whatsapp_summary` | `backend/app/agents/notification.py:51` | A string printed to stdout |
| `tailor_ir_playbook` | nowhere | unused |

No LLM return value is read by any rules module, by `calculate_risk`, by any DPDP check, or by any code that writes a `severity`, `risk_score`, `risk_band` or clause `status`. All six calls use `temperature=0.0` and pass no tools or function schemas.

The separation is structural, not asserted. No test enforces it. A regression that fed model output into a severity decision would pass CI.
