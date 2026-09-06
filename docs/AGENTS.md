# Agents

Scope: each of the 13 agent nodes wired into the compiled pipeline. Input read from state, external dependency, probe performed, output written to state, failure and degradation behaviour, and rate limits.

## Agent count

`backend/app/agents/` contains 13 agent modules besides `pipeline.py`, `state.py` and `__init__.py`:

`asset_discovery`, `port_scanner`, `ssl_analyzer`, `dns_analyzer`, `vuln_analysis`, `threat_intel`, `phishing_detection`, `fraud_detection`, `risk_scoring`, `dpdp_compliance`, `incident_response`, `recovery_recommendation`, `notification`.

All 13 are added as nodes in `backend/app/agents/pipeline.py:82-100` and all 13 are reachable from the entry point. There are no unreferenced agent modules. The "13 agents" figure in the older documents matches the code.

## Shared contract

Every agent module exposes one coroutine, `run(state: AgentState) -> dict`, returning a partial state update.

Every node is wrapped by `resilient(name, fn)` (`backend/app/agents/pipeline.py:32`), which:

- Applies `asyncio.wait_for` with `AGENT_TIMEOUT_SECONDS = 90` (`pipeline.py:29`).
- Catches `asyncio.TimeoutError` and appends `"<name>: unavailable (timeout after 90s)"` to `errors`.
- Catches every other exception and appends `"<name>: unavailable (<ExceptionType>)"`.
- Returns only the `errors` key on failure, so the agent's own output key is left untouched and downstream nodes still run.

`errors` is surfaced to the API as `degraded_providers` on `GET /scans/{scan_id}/report` (`backend/app/routers/scans.py:231`).

Agents that call an unconfigured provider do not fail. They emit a low-severity finding whose `finding_type` is `scanner_not_configured` or `scanner_unavailable`, so the gap is visible in the report rather than silently absent. Those stub findings do count toward the risk score at 1 point each; see `RULES.md`.

There is no rate limiting inside any agent. The only rate limits in the system are the per-org API limits in `backend/app/rate_limit.py` (20 scan triggers per hour, 30 verify-checks per 5 minutes). External provider quotas are consumed at whatever rate the pipeline runs.

## Phase 1, sequential

### asset_discovery

`backend/app/agents/asset_discovery.py`

- Input: `primary_domain`.
- Dependencies: Shodan DNS API (`backend/app/services/shodan_service.py:59`), key required; crt.sh Certificate Transparency search (`backend/app/services/dns_service.py:25`), keyless.
- Probe: one Shodan `GET /dns/domain/{domain}` for A records, and one `GET https://crt.sh/?q=%25.{domain}&output=json`, filtered to names ending in the domain, excluding the apex and wildcards.
- Output: `asset_inventory` with `domains`, `subdomains`, `ips`, `email_domains` and a `shodan_stubbed` flag.
- Degradation: with no Shodan key the service returns `stubbed: true` and an empty `ips` list; the agent propagates the flag rather than inventing IPs (`asset_discovery.py:14-16`). crt.sh failures are logged at WARNING and produce an empty subdomain list (`dns_service.py:50-62`); crt.sh 502 and 503 responses are common. If `primary_domain` is absent the agent returns `asset_inventory: None`.
- Timeouts: crt.sh 20s, Shodan 10s.
- Rate limits: crt.sh publishes none. Shodan free tier is roughly 1 request per second, well above one call per scan.
- Note: `asset_inventory` is a plain dict with an extra `shodan_stubbed` key that is not declared on the `AssetInventory` TypedDict (`backend/app/agents/state.py:4`). This is a typing gap, not a runtime one.

### port_scanner

`backend/app/agents/port_scanner.py`

- Input: `asset_inventory.ips` and `asset_inventory.shodan_stubbed`.
- Dependency: Shodan host API (`shodan_service.py:8`), key required.
- Probe: one `GET /shodan/host/{ip}` per discovered IP. No packets are sent to the target; Shodan's existing scan data is queried.
- Output: `port_findings`, evaluated by `evaluate_ports` (`backend/app/rules/port_rules.py:1`).
- Degradation: if Shodan is stubbed or the IP list is empty, returns a single `scanner_not_configured` low finding (`port_scanner.py:11-22`). Per-IP stub responses are skipped rather than turned into findings. A Shodan 404 is treated as a valid result meaning no exposed ports.
- Timeout: 10s per IP. With no per-IP concurrency, a large IP list can approach the 90s node cap.
- Note: with no Shodan key the IP list is always empty, so this agent produces exactly one informational finding on every scan in the current configuration.

### ssl_analyzer

`backend/app/agents/ssl_analyzer.py`

- Input: `primary_domain`.
- Dependency: Qualys SSL Labs API v3 (`backend/app/services/ssl_labs_service.py:18`), keyless.
- Probe: `GET /analyze?host={domain}&all=done&ignoreMismatch=on`, then polls every 10 seconds until `status` is `READY` or `ERROR`, up to `MAX_POLL_SECONDS = 90` (`ssl_labs_service.py:19`). Parses grade, certificate `notAfter`, HSTS policy status and endpoint warnings from the first endpoint.
- Output: `ssl_findings`, evaluated by `evaluate_ssl` (`backend/app/rules/ssl_rules.py:1`).
- Degradation: any non-200, `ERROR` status, poll timeout, missing endpoint list or exception returns `_error_result` with `stubbed: true` and a reason string; the agent converts that into one `scanner_unavailable` low finding (`ssl_analyzer.py:14-25`).
- Rate limit: SSL Labs publishes roughly one assessment per 10 seconds per source IP and asks clients not to run concurrent assessments. The poll interval respects that for a single scan; concurrent scans across tenants do not coordinate.
- Conflict: the service polls for up to 90 seconds while the node cap is also 90 seconds. A cold SSL Labs assessment will usually hit the node timeout before the service's own fallback fires, so the result is a `ssl_analyzer: unavailable (timeout after 90s)` entry in `errors` and no SSL findings at all, rather than the intended `scanner_unavailable` finding.

### dns_analyzer

`backend/app/agents/dns_analyzer.py`

- Input: `primary_domain`.
- Dependency: dnspython against the host resolver (`backend/app/services/dns_service.py:119`), keyless.
- Probe: four lookups, each with a 5-second lifetime, run in the default thread pool: TXT on the apex for SPF, TXT on `_dmarc.<domain>` for DMARC, TXT on `<selector>._domainkey.<domain>` for 7 common DKIM selectors (`google`, `default`, `mail`, `dkim`, `selector1`, `selector2`, `k1`), and DNSKEY for DNSSEC.
- Output: `dns_findings`, evaluated by `evaluate_dns` (`backend/app/rules/dns_rules.py:1`).
- Degradation: every lookup swallows exceptions and returns None or False (`dns_service.py:88`, `dns_service.py:105`, `dns_service.py:115`). A resolver failure is therefore indistinguishable from a genuinely absent record, and produces a high-severity "missing SPF/DMARC/DKIM" finding rather than an "unavailable" one. This is the one agent that can report a false positive on a transient failure.
- Note: `_query_txt` falls back to returning the first TXT record of any kind when no `v=spf1` string is found (`dns_service.py:84-87`). A domain with a TXT record but no SPF will have a non-SPF string stored as `spf_record`, which suppresses the `no_spf` finding.
- Rate limits: none beyond the resolver's own.

## Phase 2, parallel fan-out

All four run concurrently from `dns_analyzer` (`backend/app/agents/pipeline.py:108-112`).

### vuln_analysis

`backend/app/agents/vuln_analysis.py`

- Input: none in practice. `asset_inventory` is read and discarded (`vuln_analysis.py:7`); the software list is hardcoded to `[{"software": "nginx", "version": "1.14.0"}]` (`vuln_analysis.py:9`).
- Dependency: NVD CVE API 2.0 (`backend/app/services/vuln_service.py:36`), key required.
- Probe: one `GET /rest/json/cves/2.0?cpeName=<cpe>` per software entry, with a constructed CPE 2.3 string in which vendor is assumed equal to product.
- Output: `vuln_findings`, evaluated by `evaluate_vulnerabilities` (`backend/app/rules/vuln_rules.py:1`).
- Degradation: with no key the service returns `stubbed: true` and the agent emits one `scanner_not_configured` low finding (`vuln_analysis.py:13-24`). Exceptions also return a stub.
- Known defect: even with a key, this agent finds nothing. The agent supplies `{"software": ..., "version": ...}` while the service reads `sw.get("product")` (`vuln_service.py:21`), so `product` is None and the loop `continue`s on every entry. A second mismatch follows it: the service emits CVE dicts keyed `base_score` (`vuln_service.py:60`) while the rule reads `cve.get("cvss", 0.0)` (`vuln_rules.py:10`), so any CVE that did get through would be scored 0.0 and classed `low`. Because the outer branch returns `stubbed: false` with an empty CVE list, the result is zero findings and no stub notice, so nothing surfaces in the report at all.
- Rate limits: NVD allows 5 requests per 30 seconds without a key and 50 with one. One request per scan is well inside both.

### threat_intel

`backend/app/agents/threat_intel.py`

- Input: `primary_domain`.
- Dependencies: XposedOrNot (`backend/app/services/threat_service.py:24`), keyless; VirusTotal domains API (`threat_service.py:62`), key required; AbuseIPDB check API (`threat_service.py:92`), key required.
- Probe: five sequential XposedOrNot `GET /v1/check-email/{prefix}@{domain}` calls for the sentinel prefixes `info`, `admin`, `support`, `contact`, `hello` (`threat_service.py:25`), each with an 8-second timeout; one VirusTotal `GET /api/v3/domains/{domain}`; one AbuseIPDB check per IP.
- Output: `threat_intel_findings`, evaluated by `evaluate_threat_intel` (`backend/app/rules/threat_rules.py:1`).
- Degradation: XposedOrNot failures return an empty breach list per address (`threat_service.py:38`). Missing VirusTotal or AbuseIPDB keys return `{"stubbed": true, ...}` dicts, which are still appended to the report lists.
- Known defects: `fetch_threat_intel` is called with `[domain]` only (`threat_intel.py:11`), so `ips` is always empty and AbuseIPDB is never called regardless of its key. The VirusTotal branch returns `malicious`, `suspicious` and `harmless` counts (`threat_service.py:79-81`) while the rule reads `report.get("positives", 0)` (`threat_rules.py:33`), so the VirusTotal thresholds can never fire. The intended `scanner_not_configured` notice at `threat_intel.py:24` is also dead: `vt_stubbed` is computed as `not threat_data.get("vt_reports")`, and `vt_reports` always contains at least the stub dict, so the condition is always false.
- Net effect: this agent contributes exactly one finding type in practice, `email_breached`, from XposedOrNot.
- Rate limits: XposedOrNot publishes no documented limit and is called five times per scan sequentially. VirusTotal free tier is 4 requests per minute and 500 per day; one call per scan is inside that.

### phishing_detection

`backend/app/agents/phishing_detection.py`

- Input: `primary_domain`.
- Dependency: Google Safe Browsing v4 `threatMatches:find` (`backend/app/services/phishing_service.py:22`), key required.
- Probe: one POST checking `https://{domain}/` against `MALWARE`, `SOCIAL_ENGINEERING`, `UNWANTED_SOFTWARE` and `POTENTIALLY_HARMFUL_APPLICATION` for `ANY_PLATFORM` (`phishing_service.py:25-32`), 8-second timeout.
- Output: `phishing_findings`. The agent builds Safe Browsing findings inline (`phishing_detection.py:29-39`) and then appends whatever `evaluate_phishing` returns (`backend/app/rules/phishing_rules.py:1`).
- Degradation: with no key the service returns `stubbed: true` and the agent emits one `scanner_not_configured` low finding. Any exception or non-200 from the API returns an empty match list, which is indistinguishable from a clean result (`phishing_service.py:57-59`).
- Known defect and duplication: a Safe Browsing hit is turned into a `safe_browsing_threat` critical finding by the agent, and `evaluate_phishing` independently turns the same match into a `domain_on_safebrowsing` high finding (`phishing_rules.py:36-45`). One flagged domain therefore produces two findings worth 25 and 10 risk points. The typosquat branch of the rule is unreachable: `fetch_phishing_data` always returns `typosquats: []` (`phishing_service.py:81`) and no Levenshtein or fuzzy-matching code exists in the repository, despite `rapidfuzz` being a declared dependency.
- Rate limits: Safe Browsing Lookup API allows 10,000 requests per day by default. One per scan.

### fraud_detection

`backend/app/agents/fraud_detection.py`

- Input: `primary_domain`.
- Dependency: intended ViewDNS. Not implemented. `backend/app/services/fraud_service.py` is three lines that return `{"stubbed": True, "reason": "ViewDNS API key not configured", "suspicious_domains": []}`. There is no `VIEWDNS_API_KEY` field on `Settings` and no HTTP client in the module.
- Probe: none.
- Output: `fraud_findings`, always a single `scanner_not_configured` low finding (`fraud_detection.py:13-24`).
- Degradation: not applicable; the stub cannot fail.
- The rule module `backend/app/rules/fraud_rules.py` is fully written and permanently unreachable.

## Phase 3 and 4, sequential

### analysis_join

Not an agent. A plain synchronous node (`backend/app/agents/pipeline.py:58`) that concatenates the seven per-agent finding lists into `all_findings`. It exists because `AgentState` declares no `Annotated` reducers, so the parallel branch cannot merge into a shared list. It is not wrapped by `resilient`; an exception here fails the whole scan.

### risk_scoring

`backend/app/agents/risk_scoring.py`

- Input: `all_findings`, `primary_domain`.
- Dependency: the LLM chain in `backend/app/services/claude_service.py`.
- Behaviour: calls `explain_finding` once per finding, writing the result to `finding["explanation"]` (`risk_scoring.py:14-16`); calls `calculate_risk` on the finding list (`risk_scoring.py:18`); then calls `generate_executive_summary` with the already-computed risk data (`risk_scoring.py:23`).
- Output: `risk_score`, `risk_band`, `risk_executive_summary`, and the mutated `all_findings`.
- Degradation: `_call_llm_with_retry` never raises. If Gemini and NVIDIA both fail it returns the string `"AI service temporarily unavailable (both primary and fallback failed)."`, which is stored as the explanation. Nothing marks such a finding as un-explained.
- Cost and timing: this is the most expensive node. One LLM call per finding plus one summary call, all sequential. With a 15-second Gemini timeout and a typical 10-finding scan, worst-case latency exceeds the 90-second node cap, in which case the whole node is discarded and the scan completes with no risk score at all. The score is not recoverable afterwards because `calculate_risk` runs inside the same node, after the explanation loop.
- The org context passed to the LLM is `{"name": primary_domain, "primary_domain": primary_domain}` (`risk_scoring.py:8-11`), not the real organization record.

### dpdp_compliance

`backend/app/agents/dpdp_compliance.py`

- Input: `primary_domain`, `all_findings`.
- Dependencies: two unauthenticated HTTPS GETs against the customer's own site (`backend/app/rules/dpdp_rules.py:44`, `dpdp_rules.py:57`), each with a 5-second timeout and redirects followed; plus the LLM.
- Probe: `GET https://{domain}/privacy-policy` and `GET https://{domain}/contact`. The other four clauses are evaluated against findings already in state.
- Output: `dpdp_clauses` (6 entries), `dpdp_overall_status`, `dpdp_narrative`.
- Degradation: a request exception is recorded as a `fail` with the exception string as evidence (`dpdp_rules.py:52-53`), so a network blip reads as non-compliance.
- Known defect: `org_context` is hardcoded to `{"notification_email": "admin@example.com"}` (`dpdp_compliance.py:11`) instead of being read from the organization row, so clause S8.6 always passes regardless of whether the tenant has configured an incident contact.
- Results are written only into `scans.langgraph_state`. No `compliance_reports` row is created.

### incident_response

`backend/app/agents/incident_response.py`

- Input: `all_findings`.
- Dependency: YAML files on the local filesystem. `load_playbooks` reads the relative path `playbooks` (`incident_response.py:10`), resolved against the process working directory.
- Probe: none.
- Output: `ir_plan`, a dict keyed `finding_0`, `finding_1`, and so on, mapping each finding either to a matched playbook or to `{"action": "manual_review", "reason": "No playbook found"}`.
- Degradation: if the directory does not exist the playbook map is empty and every finding gets `manual_review`. Because the path is relative, the agent finds playbooks when the process runs from `backend/` and finds none when it runs from the repository root.
- Content: 2 playbooks exist, `backend/playbooks/no_dmarc.yaml` and `backend/playbooks/open_database_port.yaml`. The repository-root `playbooks/` directory contains only `.gitkeep`.
- `ir_plan` is written to `scans.langgraph_state` and read by no endpoint. `tailor_ir_playbook` exists in `claude_service.py:142` and is called by nothing.

### recovery_recommendation

`backend/app/agents/recovery_recommendation.py`

- Input: `all_findings`.
- Dependency: the LLM chain.
- Behaviour: one `generate_remediation` call per finding whose severity is `critical` or `high` (`recovery_recommendation.py:13`), keyed positionally as `finding_{i}`.
- Output: `remediation_map`.
- Degradation: same as `risk_scoring`; the fallback string is stored as remediation text.
- Known defect: the worker looks these up by `finding_type` rather than by position (`backend/app/worker.py:169`), so `findings.remediation_steps` is never populated and the generated text is discarded except for its copy inside `langgraph_state`.

### notification

`backend/app/agents/notification.py`

- Input: `risk_score`, `risk_band`, `risk_executive_summary`, `all_findings`, `org_id`.
- Dependencies: the database, Resend (`backend/app/services/email_service.py`), and the LLM for the WhatsApp text.
- Behaviour: loads the organization, then branches on `notification_email` and `whatsapp_number`.
- Output: `notifications_sent`, a list containing `"email"` and/or `"whatsapp_stubbed"`.
- Email: real. `send_scan_report_email` posts to Resend when `RESEND_API_KEY` is set, from the hardcoded sender `security@qelvix.com` (`email_service.py:33`). With no key it prints a stub line and returns. Send failures are caught and printed, and the agent still records `"email"` as sent (`email_service.py:40-42`). The function is synchronous and called from an async node, so it blocks the event loop for the duration of the HTTP request.
- WhatsApp: stubbed. The message text is generated by the LLM and then printed to stdout (`notification.py:52`). No HTTP call is made, and `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_BUSINESS_ACCOUNT_ID` are declared on `Settings` and read by nothing.
- Known defect: the summary payload reads `state.get("findings_summary", {})` (`notification.py:16`), a key that is not part of `AgentState` and is never written, so both channels always receive an empty severity breakdown.
- Nothing is written to the `notifications` table, so a delivery leaves no record.

## Verification status of delivery paths

| Path | Implemented | Configured in `backend/.env` | Exercised by a test |
|---|---|---|---|
| Email via Resend | yes | `RESEND_API_KEY` is set | no |
| WhatsApp | no, prints to stdout | `WHATSAPP_ACCESS_TOKEN` is empty | no |

No test in `backend/tests/` imports `email_service` or `notification`. Whether a real Resend send succeeds from this codebase is unverified; the check is to run a scan for an org with `notification_email` set and confirm a message id in the Resend dashboard.
