# Technical Requirements Document
## Qelvix — Autonomous AI Security Operations Center

*Version 1.0 | Confidential | July 2026*

---

## 1. Executive Summary

Qelvix is a multi-tenant SaaS SOC-as-a-Service platform targeting Indian MSMEs (10–250 employees) who have zero dedicated security staff. The system autonomously monitors an organisation's digital footprint, produces deterministic rule-based findings (never hallucinated), translates them into plain-language business context via Claude, and delivers the exact next action via WhatsApp, email, and a web dashboard.

**Core architectural principle: Rules-before-LLM.**

Every security decision (risk score, severity, compliance pass/fail) is computed by deterministic rules engines. Claude is used only to explain findings in plain language and draft remediation steps.

**Build target for a solo developer with Claude Code:**
- Phase 1 MVP ~ 6 weeks
- Full 13-agent pipeline ~ 16 weeks
- Stack is entirely within Tarun's existing skill set (FastAPI + LangGraph)

---

## 2. System Architecture

### 2.1 Architectural Pattern

```
[Digital Asset] → [Rules Engine Scan] → [Deterministic Finding]
                                                |
                                                ▼
                                [Claude: Explain in plain language]
                                                |
                                                ▼
                                [WhatsApp / Dashboard / Email]
```

Claude is never involved in deciding whether something is a threat.
Claude is always involved in communicating what it means and how to fix it.

### 2.2 High-Level Component Diagram

```
┌──────────────────────────────────────────────────────────┐
│                     QELVIX PLATFORM                        │
│  ┌────────────────┐   ┌──────────────────────────────┐    │
│  │   Next.js 14     │   │   LangGraph Agent Pipeline    │   │
│  │   Dashboard      │   │   (13 agents, 4-phase DAG)    │   │
│  └────────────────┘   └──────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐   │
│  │   FastAPI Backend                                   │   │
│  │   Auth | Scan API | Findings API | Reports API      │   │
│  └────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │   Data Layer                                        │   │
│  │   PostgreSQL (findings, orgs, scans) + Redis (queue)│   │
│  └────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │   Notification Layer                                │   │
│  │   WhatsApp Business Cloud API | Resend Email        │   │
│  └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 2.3 Request Flow

1. Org onboards → enters domain(s) + WhatsApp number
2. Celery scheduler triggers full scan every 7 days (or manual trigger)
3. LangGraph pipeline executes all 13 agents sequentially/in parallel
4. Rules engines produce deterministic findings → stored in PostgreSQL
5. Claude generates plain-language explanation per finding
6. Risk Scoring Agent computes org risk score (0–100)
7. DPDP Agent checks compliance clauses
8. Notification Agent sends WhatsApp + email summary
9. Owner views full dashboard for details and fix steps

---

## 3. Agent Architecture (13 Agents)

### 3.1 Orchestration Framework

| Layer | Choice | Reason |
|---|---|---|
| Graph engine | LangGraph 0.2.x | Stateful DAG, familiar to team, production-ready |
| Agent pattern | Tool-calling nodes | Each agent is a Python function that calls external APIs |
| Parallelism | LangGraph Send API | Phase 2 agents run in parallel |
| State | TypedDict | Typed, serialisable, inspectable |

### 3.2 Agent Pipeline DAG

```
PHASE 1 — DISCOVERY (sequential)
[1] Asset Discovery Agent      → discovers domains, subdomains, IPs
[2] Port Scanner Agent         → open ports and services per IP
[3] SSL/TLS Analysis Agent     → certificate validity, grade, expiry
[4] DNS Analysis Agent         → SPF, DKIM, DMARC, MX, DNSSEC

PHASE 2 — ANALYSIS (parallel, all run simultaneously)
[5] Vulnerability Analysis Agent → CVE matches from NVD/OSV
[6] Threat Intelligence Agent    → VirusTotal, HIBP, AbuseIPDB
[7] Phishing Detection Agent     → lookalike domains, PhishTank
[8] Fraud Detection Agent        → brand squatting, WHOIS abuse

PHASE 3 — AGGREGATION (sequential)
[9]  Risk Scoring Agent        → weighted 0–100 score
[10] DPDP Compliance Agent     → clause-by-clause DPDP Act 2023 check

PHASE 4 — ACTION (sequential)
[11] Incident Response Agent        → selects IR playbook
[12] Recovery Recommendation Agent  → Claude writes fix steps per finding
[13] Notification Agent             → WhatsApp + email + dashboard write
```

### 3.3 Agent Specifications

**Agent 1 — Asset Discovery Agent**
- **Input:** org domain(s) provided at onboarding
- **Tools:** Shodan API, SecurityTrails API, dnspython (passive subdomain enum)
- **Rules:** Flag any asset not in org's declared whitelist
- **Output:** `AssetInventory { domains[], subdomains[], ips[], cloud_services[] }`
- **LLM:** None — pure tool calls

**Agent 2 — Port Scanner Agent**
- **Input:** IP list from Asset Discovery
- **Tools:** Shodan host lookup API (NOT nmap — avoid ToS issues on hosted infra)
- **Rules:**
  - CRITICAL → RDP(3389), Telnet(23), SMB(445) open to 0.0.0.0
  - HIGH → MySQL(3306), PostgreSQL(5432), MongoDB(27017) internet-exposed
  - MEDIUM → Non-standard HTTP ports, FTP(21) open
- **Output:** `PortFindings { ip, port, service, severity, raw_data }`
- **LLM:** None

**Agent 3 — SSL/TLS Analysis Agent**
- **Input:** Domain list
- **Tools:** SSL Labs API (free, no key needed), `ssl` Python library
- **Rules:**
  - CRITICAL → Certificate expired
  - HIGH → Grade C or below, expiry < 30 days, self-signed
  - MEDIUM → Weak cipher suites, expiry < 60 days
  - LOW → Missing HSTS header
- **Output:** `SSLFindings { domain, grade, expiry_days, issues[], severity }`
- **LLM:** None

**Agent 4 — DNS Analysis Agent**
- **Input:** Domain list
- **Tools:** dnspython, MXToolbox API (free tier)
- **Rules:**
  - HIGH → No SPF record = anyone can spoof email
  - HIGH → No DMARC = phishing easy
  - HIGH → No DKIM on primary MX
  - MEDIUM → SPF uses `~all` instead of `-all` (soft fail)
  - LOW → No DNSSEC
- **Output:** `DNSFindings { domain, spf_status, dmarc_status, dkim_status, severity }`
- **LLM:** None

**Agent 5 — Vulnerability Analysis Agent**
- **Input:** Software/service versions from port scan
- **Tools:** NVD API (NIST, free), OSV API (Google, free), CVE Search API
- **Rules:** Map CVSS v3 score → CRITICAL(9+) / HIGH(7–8.9) / MEDIUM(4–6.9) / LOW(<4)
- **Output:** `VulnFindings { cve_id, cvss, description, affected_version, severity }`
- **LLM:** None

**Agent 6 — Threat Intelligence Agent**
- **Input:** IPs, domains, email domains from Asset Discovery
- **Tools:** VirusTotal API (free: 500/day), AbuseIPDB (free: 1000/day), Have I Been Pwned API (free public)
- **Rules:**
  - CRITICAL → Org email domain found in breach corpus (HIBP)
  - HIGH → IP flagged by ≥3 VirusTotal vendors
  - HIGH → IP on AbuseIPDB (confidence ≥75%)
  - MEDIUM → Domain flagged suspicious by 1–2 vendors
- **Output:** `ThreatIntelFindings { indicator, source, confidence, severity }`
- **LLM:** None

**Agent 7 — Phishing Detection Agent**
- **Input:** Domain list
- **Tools:** PhishTank API (free), Google Safe Browsing API (free: 10k/day), custom Levenshtein similarity check
- **Rules:**
  - HIGH → Any registered domain with Levenshtein distance < 2 from org domain
  - HIGH → Org domain or typosquat on PhishTank/Safe Browsing lists
  - MEDIUM → Suspicious newly-registered similar domain (< 30 days old)
- **Output:** `PhishingFindings { lookalike_domain, distance, source, severity }`
- **LLM:** None

**Agent 8 — Fraud Detection Agent**
- **Input:** Asset inventory, threat intel
- **Tools:** Wayback Machine API, reverse WHOIS (ViewDNS free API)
- **Rules:**
  - HIGH → Domain matching org name registered after org's founding date
  - MEDIUM → Org brand in foreign TLD not owned by org
- **Output:** `FraudFindings { fraudulent_domain, registration_date, severity }`
- **LLM:** None

**Agent 9 — Risk Scoring Agent**
- **Input:** All findings from Agents 1–8
- **Algorithm (deterministic):**
  ```
  raw_score = (critical × 25) + (high × 10) + (medium × 4) + (low × 1)
  risk_score = min(100, raw_score)
  ```
- **Bands:** 0–30 = Low | 31–59 = Medium | 60–79 = High | 80–100 = Critical
- **Output:** `RiskScore { score, band, findings_summary { critical, high, medium, low } }`
- **LLM:** Claude writes a 2-sentence executive summary **after** the score is computed

**Agent 10 — DPDP Compliance Agent**
- **Input:** Asset inventory, DNS/SSL findings
- **Rules:** Static checklist mapped from DPDP Act 2023 clauses:
  - Data processor obligation indicators
  - Breach notification readiness (incident response contact defined?)
  - Consent management indicators (privacy policy present?)
  - Data localisation (cloud provider region check)
  - Reasonable security safeguards (SSL grade, open ports)
- **Output:** `DPDPReport { clauses[{ id, status: pass|fail|na, evidence }], overall }`
- **LLM:** Claude generates the compliance narrative section only

**Agent 11 — Incident Response Agent**
- **Input:** Top 5 critical/high findings from Risk Report
- **Tools:** YAML IR playbook library (local, shipped with codebase)
- **Output:** `IRPlan { steps[], priority_finding, estimated_effort }`
- **LLM:** Claude selects and tailors the relevant playbook to the org's context

**Agent 12 — Recovery Recommendation Agent**
- **Input:** Individual findings
- **Tools:** Claude API + YAML remediation knowledge base
- **Output:** `RemediationSteps` per finding (owner-friendly, no jargon)
- **LLM:** Claude translates the technical fix into a 3–5 step plain-language guide
  > **Prompt:** "You are advising a non-technical MSME owner. Finding: [raw_data]. Write 3–5 steps to fix this. Use simple Hindi-English hybrid if helpful."

**Agent 13 — Notification Agent**
- **Input:** RiskReport, IRPlan, RemediationSteps, org notification preferences
- **Tools:** Meta WhatsApp Business Cloud API, Resend email API
- **Output:** Notifications sent, logged to DB
- **LLM:** Claude compresses the report into a <160-word WhatsApp message

---

## 4. Technology Stack

### 4.1 Backend Stack

| Layer | Technology | Notes |
|---|---|---|
| Language | Python 3.11+ | |
| API Framework | FastAPI | Async, OpenAPI auto-docs, familiar |
| Agent Orchestration | LangGraph 0.2.x | Stateful graphs, familiar from ChaseBot/restaurant work |
| Task Queue | Celery + Redis | Periodic scans, async job execution |
| Database ORM | SQLAlchemy 2.0 + Alembic | Async ORM, migrations |
| Database | PostgreSQL 15 (Supabase) | JSONB for findings, RLS for multi-tenancy |
| Cache / Queue broker | Redis 7 (Upstash) | Celery broker + rate-limit tracking |
| Auth | Supabase Auth | JWT, free tier, built-in user management |
| LLM | Claude (claude-sonnet-4-6) | Explanation + remediation only |
| PDF export | WeasyPrint | Reports |

### 4.2 Frontend Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR dashboard |
| Styling | Tailwind CSS + shadcn/ui | Rapid component building |
| Charts | Recharts | Risk score gauge, trend line |
| State | Zustand | Lightweight client state |
| Data fetching | TanStack Query | Cache, background refresh |
| Auth | Supabase JS client | JWT sessions |

### 4.3 External APIs (All Free Tiers Sufficient for MVP)

| Purpose | Tool | Free Limit | Key? |
|---|---|---|---|
| Asset / IP lookup | Shodan API | 1 query/sec, 100/month | Yes (free) |
| Subdomain enum | SecurityTrails | 50 queries/month | Yes (free) |
| SSL analysis | SSL Labs API | Unlimited (rate limited) | No |
| DNS analysis | dnspython + MXToolbox | Generous free tier | MXToolbox: free |
| CVE database | NVD API (NIST) | Unlimited | Yes (free register) |
| Vuln database | OSV API (Google) | Unlimited | No |
| Threat intel | VirusTotal API | 500 req/day | Yes (free) |
| Breach data | Have I Been Pwned | Public API free | No |
| IP reputation | AbuseIPDB | 1000 checks/day | Yes (free) |
| Phishing | PhishTank API | Free | Yes (free) |
| Safe browsing | Google Safe Browsing | 10,000 req/day | Yes (GCP) |
| WhatsApp | Meta WhatsApp Cloud API | 1000 convos/month free | Business account |
| Email | Resend | 3000 emails/month free | Yes (free) |
| LLM | Anthropic API | Pay per use | Yes (paid) |

### 4.4 Infrastructure

| Component | MVP (₹0–500/mo) | Scale (₹5,000+/mo) |
|---|---|---|
| Backend hosting | Railway (hobby $5/mo) | AWS ECS Fargate |
| Database | Supabase free | Supabase Pro or RDS |
| Redis | Upstash (free 10k/day) | Upstash Pay-as-you-go |
| Frontend | Vercel (free) | Vercel Pro |
| Cron / scheduler | APScheduler in-process | AWS EventBridge |
| Secrets | Railway env vars | AWS Secrets Manager |
| CI/CD | GitHub Actions (free) | Same |

---

## 5. Data Models

### 5.1 PostgreSQL Schema

```sql
-- Multi-tenant organisations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  primary_domain TEXT NOT NULL UNIQUE,
  plan TEXT DEFAULT 'freemium', -- freemium | starter | growth | enterprise
  whatsapp_number TEXT,
  notification_email TEXT,
  onboarded_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}' -- notification prefs, scan schedule
);

-- All discovered digital assets
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL, -- domain | subdomain | ip | email_domain | cloud_service
  value TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- port, service, country, etc.
  whitelisted BOOLEAN DEFAULT FALSE,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, value)
);

-- Scan runs (one per triggered scan)
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued', -- queued | running | completed | failed
  scan_type TEXT DEFAULT 'full', -- full | partial
  risk_score INTEGER,
  findings_summary JSONB, -- { critical: n, high: n, medium: n, low: n }
  langgraph_state JSONB, -- full agent state snapshot for debugging
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  triggered_by TEXT DEFAULT 'scheduled', -- scheduled | manual | api
  error_log TEXT
);

-- Individual security findings
CREATE TABLE findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id),
  asset_id UUID REFERENCES assets(id),
  finding_type TEXT NOT NULL, -- ssl_expired | open_rdp | cve | breach | no_spf ...
  agent_source TEXT NOT NULL, -- which of the 13 agents produced this
  severity TEXT NOT NULL, -- critical | high | medium | low | info
  title TEXT NOT NULL, -- "RDP Port Open to Internet on 203.x.x.x"
  raw_data JSONB NOT NULL, -- deterministic rule output (auditable)
  plain_explanation TEXT, -- Claude-generated (after rules fire)
  remediation_steps TEXT, -- Claude-generated
  status TEXT DEFAULT 'open', -- open | acknowledged | resolved | false_positive
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- DPDP compliance reports
CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id),
  clauses JSONB NOT NULL, -- [{ id, name, status: pass|fail|na, evidence, note }]
  overall_status TEXT, -- compliant | partial | non_compliant
  narrative TEXT, -- Claude-generated prose summary
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification log
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id),
  channel TEXT NOT NULL, -- whatsapp | email | dashboard
  content TEXT NOT NULL,
  status TEXT DEFAULT 'sent', -- sent | failed | pending
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}' -- message_id, thread_id, etc.
);

-- Row Level Security (Supabase — one line per table)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

---

## 6. LangGraph Implementation

### 6.1 AgentState Schema

```python
# backend/app/agents/state.py
from typing import TypedDict, List, Optional, Any
from datetime import datetime

class AssetInventory(TypedDict):
    domains: List[str]
    subdomains: List[str]
    ips: List[str]
    email_domains: List[str]

class Finding(TypedDict):
    finding_type: str
    agent_source: str
    severity: str  # critical | high | medium | low
    title: str
    raw_data: dict
    asset_value: str

class AgentState(TypedDict):
    # Identity
    org_id: str
    scan_id: str
    primary_domain: str

    # Phase 1: Discovery outputs
    asset_inventory: Optional[AssetInventory]
    port_findings: List[Finding]
    ssl_findings: List[Finding]
    dns_findings: List[Finding]

    # Phase 2: Analysis outputs
    vuln_findings: List[Finding]
    threat_intel_findings: List[Finding]
    phishing_findings: List[Finding]
    fraud_findings: List[Finding]

    # Phase 3: Aggregation outputs
    all_findings: List[Finding]  # merged from all agents
    risk_score: Optional[int]
    risk_band: Optional[str]  # Low | Medium | High | Critical
    risk_executive_summary: Optional[str]  # Claude-generated
    dpdp_clauses: Optional[List[dict]]
    dpdp_overall_status: Optional[str]
    dpdp_narrative: Optional[str]  # Claude-generated

    # Phase 4: Action outputs
    ir_plan: Optional[dict]
    remediation_map: dict  # finding_id -> remediation text
    notifications_sent: List[str]
    errors: List[str]
```

### 6.2 Pipeline Graph Definition

```python
# backend/app/agents/pipeline.py
from langgraph.graph import StateGraph, END
from langgraph.constants import Send
from .state import AgentState
from . import (
    asset_discovery, port_scanner, ssl_analyzer, dns_analyzer,
    vuln_analysis, threat_intel, phishing_detection, fraud_detection,
    risk_scoring, dpdp_compliance, incident_response,
    recovery_recommendation, notification
)

def build_pipeline() -> StateGraph:
    workflow = StateGraph(AgentState)

    # Register all 13 nodes
    workflow.add_node("asset_discovery", asset_discovery.run)
    workflow.add_node("port_scanner", port_scanner.run)
    workflow.add_node("ssl_analyzer", ssl_analyzer.run)
    workflow.add_node("dns_analyzer", dns_analyzer.run)
    workflow.add_node("vuln_analysis", vuln_analysis.run)
    workflow.add_node("threat_intel", threat_intel.run)
    workflow.add_node("phishing_detection", phishing_detection.run)
    workflow.add_node("fraud_detection", fraud_detection.run)
    workflow.add_node("analysis_join", analysis_join_node)  # merge Phase 2
    workflow.add_node("risk_scoring", risk_scoring.run)
    workflow.add_node("dpdp_compliance", dpdp_compliance.run)
    workflow.add_node("incident_response", incident_response.run)
    workflow.add_node("recovery_recommendation", recovery_recommendation.run)
    workflow.add_node("notification", notification.run)

    # Phase 1: sequential
    workflow.set_entry_point("asset_discovery")
    workflow.add_edge("asset_discovery", "port_scanner")
    workflow.add_edge("port_scanner", "ssl_analyzer")
    workflow.add_edge("ssl_analyzer", "dns_analyzer")

    # Phase 2: fan-out to 4 parallel agents
    workflow.add_conditional_edges(
        "dns_analyzer",
        lambda _: ["vuln_analysis", "threat_intel", "phishing_detection", "fraud_detection"],
        ["vuln_analysis", "threat_intel", "phishing_detection", "fraud_detection"]
    )

    # All Phase 2 agents join before Phase 3
    for agent in ["vuln_analysis", "threat_intel", "phishing_detection", "fraud_detection"]:
        workflow.add_edge(agent, "analysis_join")

    # Phase 3 sequential
    workflow.add_edge("analysis_join", "risk_scoring")
    workflow.add_edge("risk_scoring", "dpdp_compliance")

    # Phase 4 sequential
    workflow.add_edge("dpdp_compliance", "incident_response")
    workflow.add_edge("incident_response", "recovery_recommendation")
    workflow.add_edge("recovery_recommendation", "notification")
    workflow.add_edge("notification", END)

    return workflow.compile()

pipeline = build_pipeline()
```

### 6.3 Rules-First Agent Pattern (Template for All Agents)

```python
# backend/app/agents/ssl_analyzer.py
import ssl
import socket
from datetime import datetime, timezone
from .state import AgentState, Finding
from ..rules.ssl_rules import evaluate_ssl

async def run(state: AgentState) -> dict:
    """SSL/TLS Analysis Agent — pure rules, no LLM."""
    findings: List[Finding] = []
    domains = state["asset_inventory"]["domains"] + \
              state["asset_inventory"]["subdomains"]

    for domain in domains:
        try:
            raw = await fetch_ssl_data(domain)  # SSL Labs API call
            rule_results = evaluate_ssl(raw)    # DETERMINISTIC rules
            for rule in rule_results:
                findings.append(Finding(
                    finding_type=rule["type"],
                    agent_source="ssl_analyzer",
                    severity=rule["severity"],
                    title=rule["title"],
                    raw_data=rule["evidence"],  # auditable raw data
                    asset_value=domain
                ))
        except Exception as e:
            state["errors"].append(f"ssl_analyzer: {domain}: {str(e)}")

    return {"ssl_findings": findings}


# backend/app/rules/ssl_rules.py — DETERMINISTIC, no LLM
def evaluate_ssl(ssl_data: dict) -> list[dict]:
    results = []
    grade = ssl_data.get("grade", "T")
    days_to_expiry = ssl_data.get("days_to_expiry", 0)

    if days_to_expiry <= 0:
        results.append({
            "type": "ssl_expired",
            "severity": "critical",
            "title": f"SSL certificate EXPIRED on {ssl_data['domain']}",
            "evidence": {"days_to_expiry": days_to_expiry, "grade": grade}
        })
    elif days_to_expiry <= 30:
        results.append({
            "type": "ssl_expiring_soon",
            "severity": "high",
            "title": f"SSL certificate expiring in {days_to_expiry} days",
            "evidence": {"days_to_expiry": days_to_expiry, "expiry_date": ssl_data["expiry_date"]}
        })

    if grade in ["C", "D", "E", "F", "T"]:
        results.append({
            "type": "ssl_weak_grade",
            "severity": "high" if grade in ["C", "D"] else "critical",
            "title": f"SSL grade {grade} on {ssl_data['domain']} — weak encryption",
            "evidence": {"grade": grade, "issues": ssl_data.get("issues", [])}
        })

    return results
```

### 6.4 Claude Integration (Explanation Layer Only)

```python
# backend/app/services/claude_service.py
import anthropic
from typing import Optional

client = anthropic.Anthropic()  # uses ANTHROPIC_API_KEY env var

async def explain_finding(finding: dict, org_context: dict) -> str:
    """Called ONLY after deterministic rules fire. Never decides severity."""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=350,
        system=(
            "You are a cybersecurity advisor explaining findings to Indian MSME "
            "business owners with no technical background. Be concise, practical, "
            "and never alarming beyond what the evidence shows. "
            "Respond only about what is in the finding data provided."
        ),
        messages=[{
            "role": "user",
            "content": f"""
Explain this security finding in 2-3 plain-English sentences suitable for a
business owner. Include: what was found, what business risk it creates, and
the urgency of fixing it.

Organisation type: {org_context.get('industry', 'small business')}
Finding Type: {finding['finding_type']}
Severity: {finding['severity']}
Evidence: {finding['raw_data']}

Do NOT add findings not in the evidence. Speak directly to the owner.
"""
        }]
    )
    return response.content[0].text


async def generate_remediation(finding: dict) -> str:
    """Write owner-friendly fix steps for a specific finding."""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        system=(
            "You write simple, numbered fix steps for MSME owners with "
            "basic technical staff. Steps must be actionable by a web developer "
            "or IT admin, not a security expert. Max 5 steps."
        ),
        messages=[{
            "role": "user",
            "content": f"""
Write 3-5 numbered steps to fix this issue. Use plain language.
If a vendor needs to be contacted, say so. Include estimated time to fix.

Finding: {finding['finding_type']}
Title: {finding['title']}
Raw Data: {finding['raw_data']}
"""
        }]
    )
    return response.content[0].text


async def generate_whatsapp_summary(scan_result: dict, org: dict) -> str:
    """Compress full scan into <160-word WhatsApp message."""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=250,
        messages=[{
            "role": "user",
            "content": f"""
Write a WhatsApp message (max 160 words) for a business owner about their
security scan. Include: risk score, top 2-3 issues, one urgent action.
End with the dashboard link placeholder {{report_url}}.

Org: {org['name']}
Risk Score: {scan_result['risk_score']}/100 ({scan_result['risk_band']})
Critical: {scan_result['findings_summary']['critical']}
High: {scan_result['findings_summary']['high']}
Top Issues: {scan_result['top_findings']}
"""
        }]
    )
    return response.content[0].text
```

---

## 7. FastAPI Backend Structure

### 7.1 API Endpoints

```
AUTH
POST   /auth/register              # org signup
POST   /auth/login                 # returns JWT
POST   /auth/refresh

ORGANISATION
GET    /org/me                     # current org profile
PUT    /org/me                     # update settings/WhatsApp number
POST   /org/me/assets              # manually add an asset to monitor

SCANS
POST   /scans/trigger              # start manual scan (queues Celery task)
GET    /scans                      # scan history (paginated)
GET    /scans/{id}                 # scan detail + findings summary
GET    /scans/{id}/report          # full JSON report
GET    /scans/{id}/report.pdf      # downloadable PDF (WeasyPrint)

FINDINGS
GET    /findings                   # all findings (filter: severity, status, type)
GET    /findings/{id}              # finding detail + explanation + remediation
PUT    /findings/{id}/status       # mark acknowledged | resolved | false_positive

COMPLIANCE
GET    /compliance/latest          # most recent DPDP report
GET    /compliance/{scan_id}       # report for specific scan

DASHBOARD
GET    /dashboard/summary          # risk score, counts, 30-day trend
GET    /dashboard/assets           # full asset inventory

NOTIFICATIONS
GET    /notifications              # log of all sent messages
POST   /notifications/test         # send test WhatsApp + email

WEBHOOKS
POST   /webhooks/whatsapp          # handles incoming WhatsApp replies from owner
POST   /webhooks/scan-status       # internal — Celery posts scan completion
```

### 7.2 Celery Task (Scan Trigger)

```python
# backend/celery_worker.py
from celery import Celery
from celery.schedules import crontab
from app.agents.pipeline import pipeline
from app.database import get_db_session

celery_app = Celery("qelvix", broker="redis://localhost:6379/0")

@celery_app.task(name="run_full_scan")
async def run_full_scan(org_id: str, scan_id: str, primary_domain: str):
    initial_state = {
        "org_id": org_id,
        "scan_id": scan_id,
        "primary_domain": primary_domain,
        "port_findings": [], "ssl_findings": [], "dns_findings": [],
        "vuln_findings": [], "threat_intel_findings": [],
        "phishing_findings": [], "fraud_findings": [],
        "all_findings": [], "remediation_map": {},
        "notifications_sent": [], "errors": []
    }
    final_state = await pipeline.ainvoke(initial_state)
    await persist_scan_results(final_state)


# Scheduled: every Sunday 2am IST for all active orgs
@celery_app.on_after_configure.connect
def setup_weekly_scans(sender, **kwargs):
    sender.add_periodic_task(
        crontab(hour=20, minute=30, day_of_week=6),  # Sunday 2am IST = Saturday 20:30 UTC
        schedule_all_org_scans.s(),
    )
```

---

## 8. Notification System

### 8.1 WhatsApp Flow

```
Scan completes
     |
     ▼
Risk Score > 30  OR  any Critical finding?
     | YES
     ▼
Claude generates ≤160-word WhatsApp summary
     |
     ▼
Meta WhatsApp Business Cloud API → owner's WhatsApp number
     |
     ▼
Owner replies "DETAILS"
     |
     ▼
Webhook → FastAPI → respond with full report link + top 3 fix steps
```

### 8.2 WhatsApp Message Template (pre-approve with Meta)

```
🔒 *Qelvix Security Alert*
*{{org_name}}* | Score: {{score}}/100 ({{level}})

{{#if critical_count}}⛔ {{critical_count}} CRITICAL issue(s) need immediate
attention{{/if}}
{{#if high_count}}🔴 {{high_count}} High severity issue(s){{/if}}

Top issue: {{top_finding_title}}

👉 Full report + fix steps:
{{report_url}}

Reply *DETAILS* for step-by-step fixes.
```

### 8.3 Email Schedule

| Trigger | Template | Frequency |
|---|---|---|
| Scan completes (Critical finding) | Alert email | Immediate |
| Weekly scan | Digest email | Monday 9am IST |
| Monthly | DPDP compliance report PDF | 1st of month |
| Expiry warning | SSL/Domain expiry warning | 30, 14, 7 days before |

---

## 9. Frontend Architecture

### 9.1 Next.js Page Structure

```
app/
├── (auth)/
│   ├── login/page.tsx          # email/password + Google OAuth
│   └── register/page.tsx       # domain + WhatsApp onboarding wizard
├── (dashboard)/
│   ├── layout.tsx               # sidebar nav + header
│   ├── page.tsx                 # Home: risk gauge + summary cards
│   ├── assets/
│   │   └── page.tsx             # Asset inventory table
│   ├── findings/
│   │   ├── page.tsx             # Findings list (filter by severity/status)
│   │   └── [id]/page.tsx        # Finding detail: explanation + fix steps
│   ├── scans/
│   │   ├── page.tsx             # Scan history table
│   │   └── [id]/page.tsx        # Scan detail + per-agent results
│   ├── compliance/
│   │   └── page.tsx             # DPDP clause checklist
│   └── settings/
│       └── page.tsx             # WhatsApp, email, scan schedule
└── layout.tsx
```

### 9.2 Key UI Components

```typescript
// RiskScoreGauge.tsx — 0-100 radial gauge with colour bands
// 0-30 green | 31-59 yellow | 60-79 orange | 80-100 red

// FindingCard.tsx — severity badge + title + "Mark Resolved" button
// Expandable to show plain_explanation + remediation_steps

// ScanTimeline.tsx — Recharts area chart: 90-day risk score trend

// ComplianceChecklist.tsx — DPDP clauses as grid rows
// PASS (green check) | FAIL (red x) | N/A (grey)

// AssetInventoryTable.tsx — sortable table with asset type icon badges

// AgentStatusBadge.tsx — shows per-agent status during live scan
// (polling /scans/{id} every 5s while status === 'running')
```

---

## 10. DPDP Act 2023 — Compliance Rule Set

```python
# backend/app/rules/dpdp_rules.py
DPDP_CLAUSES = [
    {
        "id": "S4.1",
        "name": "Privacy Policy Published",
        "check": "check_privacy_policy_exists",  # HTTP GET /privacy-policy
        "section": "Section 4 — Notice to Data Principal"
    },
    {
        "id": "S8.4",
        "name": "Reasonable Security Safeguards",
        "check": "check_ssl_grade",  # from ssl_findings
        "section": "Section 8(4) — Data Fiduciary duties"
    },
    {
        "id": "S8.4b",
        "name": "No Internet-Exposed Databases",
        "check": "check_no_exposed_databases",  # from port_findings
        "section": "Section 8(4) — Data Fiduciary duties"
    },
    {
        "id": "S8.6",
        "name": "Breach Notification Readiness",
        "check": "check_incident_contact_defined",  # org settings
        "section": "Section 8(6) — Breach notification to Board"
    },
    {
        "id": "S9",
        "name": "Email Authentication (anti-spoofing)",
        "check": "check_spf_dmarc_present",  # from dns_findings
        "section": "Section 9 — Protection of children's data + general principle"
    },
    {
        "id": "S11",
        "name": "Consent Withdrawal Mechanism",
        "check": "check_contact_form_exists",  # HTTP GET /contact
        "section": "Section 11 — Right to withdraw consent"
    }
]
```

---

## 11. IR Playbook Format (YAML)

```yaml
# playbooks/ssl_expired.yaml
id: ssl_expired
name: SSL Certificate Expired
severity: critical
triggers:
  - finding_type: ssl_expired
steps:
  - step: 1
    title: "Contact your hosting provider or domain registrar immediately"
    detail: "Log into your hosting panel (GoDaddy, Hostinger, cPanel, etc.) and
      navigate to SSL Certificates. Look for a Renew button."
    effort_minutes: 15
  - step: 2
    title: "If using Let's Encrypt (free SSL)"
    detail: "SSH into your server and run: sudo certbot renew --force-renewal
      Then restart your web server: sudo systemctl restart nginx"
    effort_minutes: 10
  - step: 3
    title: "Verify the fix"
    detail: "Visit https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
      and confirm you get an A or B grade."
    effort_minutes: 5
estimated_total_minutes: 30
escalate_to: hosting_support_if_no_access
```

---

## 12. Repository Structure

```
qelvix/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app factory
│   │   ├── config.py                  # Settings (pydantic-settings)
│   │   ├── database.py                # SQLAlchemy async engine
│   │   │
│   │   ├── models/                    # SQLAlchemy ORM models
│   │   │   ├── organization.py
│   │   │   ├── scan.py
│   │   │   ├── finding.py
│   │   │   ├── asset.py
│   │   │   └── compliance.py
│   │   │
│   │   ├── routers/                   # FastAPI route handlers
│   │   │   ├── auth.py
│   │   │   ├── scans.py
│   │   │   ├── findings.py
│   │   │   ├── compliance.py
│   │   │   ├── dashboard.py
│   │   │   ├── notifications.py
│   │   │   └── webhooks.py
│   │   │
│   │   ├── agents/                    # LangGraph agents
│   │   │   ├── pipeline.py            # Full 13-agent graph
│   │   │   ├── state.py               # AgentState TypedDict
│   │   │   ├── asset_discovery.py
│   │   │   ├── port_scanner.py
│   │   │   ├── ssl_analyzer.py
│   │   │   ├── dns_analyzer.py
│   │   │   ├── vuln_analysis.py
│   │   │   ├── threat_intel.py
│   │   │   ├── phishing_detection.py
│   │   │   ├── fraud_detection.py
│   │   │   ├── risk_scoring.py
│   │   │   ├── dpdp_compliance.py
│   │   │   ├── incident_response.py
│   │   │   ├── recovery_recommendation.py
│   │   │   └── notification.py
│   │   │
│   │   ├── rules/                     # Deterministic rules engines
│   │   │   ├── ssl_rules.py
│   │   │   ├── dns_rules.py
│   │   │   ├── port_rules.py
│   │   │   ├── vuln_rules.py
│   │   │   ├── threat_rules.py
│   │   │   └── dpdp_rules.py
│   │   │
│   │   └── services/                  # External integrations
│   │       ├── claude_service.py      # LLM (explain + remediate only)
│   │       ├── whatsapp_service.py    # Meta WhatsApp Cloud API
│   │       ├── email_service.py       # Resend
│   │       ├── shodan_service.py
│   │       ├── virustotal_service.py
│   │       ├── ssl_labs_service.py
│   │       ├── nvd_service.py
│   │       └── pdf_service.py         # WeasyPrint report gen
│   │
│   ├── migrations/                    # Alembic
│   ├── celery_worker.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   │   └── api.ts                     # TanStack Query hooks
│   └── package.json
│
├── playbooks/                         # IR playbooks (YAML)
│   ├── ssl_expired.yaml
│   ├── open_database_port.yaml
│   ├── email_breach.yaml
│   ├── no_spf_dmarc.yaml
│   └── dpdp_violation.yaml
│
├── docker-compose.yml                 # local dev (postgres + redis)
├── .env.example
└── README.md
```

---

## 13. Development Phases

### Phase 1 — Shippable MVP (Weeks 1–6)

*Goal: Pay-capable demo. MSME owner enters domain → sees risk score → gets WhatsApp.*

| # | Task | Week |
|---|---|---|
| 1 | FastAPI skeleton + Supabase auth + DB schema + Alembic | 1 |
| 2 | Asset Discovery Agent (domain + subdomain only) | 2 |
| 3 | SSL Analyzer Agent + DNS Analyzer Agent | 2 |
| 4 | Risk Scoring Agent (3-input simplified) | 3 |
| 5 | Claude explain_finding + remediation_steps | 3 |
| 6 | Notification Agent (WhatsApp + email) | 4 |
| 7 | Next.js dashboard: risk gauge + findings list | 4–5 |
| 8 | Manual scan trigger + Celery setup | 5 |
| 9 | Onboarding wizard (domain entry + WhatsApp number) | 6 |
| 10 | Deploy Railway (backend) + Vercel (frontend) | 6 |

**MVP Deliverable:** Working B2B demo. Charge ₹999/month for freemium → paid.

### Phase 2 — Core Product (Weeks 7–12)

| # | Task |
|---|---|
| 1 | Port Scanner Agent (Shodan API) |
| 2 | Vulnerability Analysis Agent (NVD + OSV) |
| 3 | Threat Intelligence Agent (VirusTotal + HIBP) |
| 4 | Phishing Detection Agent (PhishTank + Safe Browsing) |
| 5 | DPDP Compliance Agent + report UI |
| 6 | Incident Response Agent + playbook YAML library |
| 7 | Recovery Recommendation Agent |
| 8 | Automated weekly scan scheduling |
| 9 | PDF report export (WeasyPrint) |
| 10 | Scan history + 90-day risk trend chart |

### Phase 3 — Scale & GTM (Weeks 13–20)

| # | Task |
|---|---|
| 1 | Fraud Detection Agent (brand squatting) |
| 2 | White-label mode for CA firms (subdomain + custom branding) |
| 3 | B2B API (MSME association integrations) |
| 4 | Freemium → paid upgrade flow + Razorpay integration |
| 5 | Multi-org management dashboard (for CA firm account) |
| 6 | MSME onboarding wizard (guided setup, <5 min to first scan) |
| 7 | SOC2-ready logging + audit trail |

---

## 14. Claude Code Prompting Strategy

*When using Claude Code to build this, use these prompt patterns:*

**Scaffold an Agent**
```
Implement [AgentName] as a LangGraph node function in Python.
- Input: AgentState TypedDict (see state.py)
- External tools to call: [list from spec]
- Rules to implement: [exact rules from TRD Section 3.3]
- Output: return dict updating AgentState with [specific field]
- Do NOT make any LLM API calls inside this agent
- Handle exceptions: append errors to state["errors"], do not raise
```

**Scaffold a Rules Engine**
```
Implement [agent_name]_rules.py with a function evaluate_[type](data: dict) -> list[dict].
Each returned dict must have: { finding_type, severity, title, evidence }.
Severity must be one of: critical | high | medium | low | info.
Rules to implement:
[paste exact rules from TRD]
No LLM calls. Pure Python logic only.
```

**Scaffold a FastAPI Router**
```
Implement the /[resource] FastAPI router with these endpoints:
[paste endpoints from Section 7.1]
Use SQLAlchemy async session. Use Supabase JWT for auth (extract org_id from JWT sub).
Return Pydantic response models. Include pagination for list endpoints.
```

**Build a Dashboard Component**
```
Build a Next.js React component: [ComponentName].
Props: [list props]
Uses: Tailwind CSS, shadcn/ui, Recharts (if chart)
Behaviour: [describe]
Fetch data from: GET /[endpoint] using TanStack Query
```

---

## 15. Environment Variables

```env
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/qelvix
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Redis
REDIS_URL=redis://localhost:6379/0

# External APIs
SHODAN_API_KEY=...
VIRUSTOTAL_API_KEY=...
NVD_API_KEY=...
GOOGLE_SAFE_BROWSING_API_KEY=...
ABUSEIPDB_API_KEY=...
PHISHTANK_API_KEY=...
SECURITY_TRAILS_API_KEY=...

# Notifications
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
RESEND_API_KEY=...

# App
SECRET_KEY=...
FRONTEND_URL=https://app.qelvix.com
ENVIRONMENT=production  # development | staging | production
```

---

## 16. Cost Model

### Per-Organisation Monthly Cost

| Item | Cost (INR) |
|---|---|
| Claude claude-sonnet-4-6 (50 findings × 2 scans × ~300 tokens out) | ₹15 |
| Shodan API (50 IP lookups) | ₹5 |
| VirusTotal (100 lookups — free tier) | ₹0 |
| NVD / OSV / PhishTank / Safe Browsing | ₹0 |
| WhatsApp (8 msgs/month × ₹0.50) | ₹4 |
| Email (4 emails/month — Resend free) | ₹0 |
| Infra share (100 orgs on ₹2,000/mo server) | ₹20 |
| **Total COGS per org** | **~₹45/month** |

**Target pricing:**
- Freemium: ₹0 (1 scan, limited findings)
- Starter: ₹999/month (weekly scans, WhatsApp alerts)
- Growth: ₹2,499/month (daily scans, DPDP report, PDF export)
- Enterprise / White-label: ₹9,999+/month

**Gross margin at Starter:** ~95%

---

## 17. Pre-Launch Checklist

### Accounts to Set Up Before Writing Code

- [ ] Supabase project (free tier)
- [ ] Railway account
- [ ] Vercel account
- [ ] Meta Business Account → WhatsApp Cloud API (takes 2–5 days approval)
- [ ] Meta WhatsApp message template submitted for approval
- [ ] Anthropic API account + API key
- [ ] Shodan account (free, API key)
- [ ] VirusTotal account (free, API key)
- [ ] NVD API key (register at nvd.nist.gov)
- [ ] Google Cloud project → Safe Browsing API enabled
- [ ] AbuseIPDB account (free)
- [ ] PhishTank account (free)
- [ ] Resend account + domain DNS verified (SPF, DKIM for qelvix.com)
- [ ] SecurityTrails account (free 50/month)
- [ ] GitHub repo + Railway / Vercel connected for CI/CD

### Security Before Launch

- [ ] Supabase RLS policies enforced on all tables
- [ ] API keys stored in Railway env (never in code)
- [ ] Rate limit on scan trigger (1 full scan per org per 24h on free tier)
- [ ] Scanning only assets explicitly added by the org owner (ToS protection)
- [ ] Qelvix own DPDP compliance: privacy policy, consent at signup, minimal PII

---

*Document maintained by NexLabs. Update each phase as the product evolves.*
