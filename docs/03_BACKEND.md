# 03: Backend Architecture

Implements the API surface, data layer, and service boundary that `02_FRONTEND.md` consumes and that `04_AGENT_PIPELINE.md` runs inside of. This document covers the FastAPI application, the persistence layer, and the non-agent services (auth, notifications, external API clients); the 13-agent LangGraph pipeline itself — node definitions, rules engines, the Rules-before-LLM boundary, and the DeepSeek integration — is specified in full in `04_AGENT_PIPELINE.md` and only referenced here at the points where the API triggers or reads from it. Security controls (RLS policy detail, rate limiting, DPDP erasure workflow, consent lifecycle) are specified in `07_SECURITY_COMPLIANCE.md` and referenced here at their integration points, not repeated.

## 1. Stack

| Layer | Technology | Notes |
|---|---|---|
| Language | Python 3.11+ | Per TRD §4.1 |
| API Framework | FastAPI | Async, OpenAPI auto-docs |
| Agent Orchestration | LangGraph 0.2.x | Stateful DAG; full spec in `04_AGENT_PIPELINE.md` |
| Task Queue | Celery + Redis | Periodic and manual scan execution |
| Database ORM | SQLAlchemy 2.0 (async) + Alembic | Migrations versioned, never hand-edited in prod |
| Database | PostgreSQL 15 (Supabase) | JSONB for findings/state, RLS for multi-tenancy |
| Cache / broker | Redis 7 (Upstash) | Celery broker + rate-limit tracking |
| Auth | Supabase Auth | JWT; user identity from `sub`, active `org_id` from a custom claim (see §3) |
| LLM | DeepSeek V4 Flash | Explanation/remediation only; see `04_AGENT_PIPELINE.md` |
| PDF export | WeasyPrint | Reports, Phase 2 |

Frontend stack, its own state/data-fetching conventions, and the exact route-to-endpoint mapping consumed by each screen are owned by `02_FRONTEND.md`; this document specifies the endpoints themselves and does not restate how the client calls them.

## 2. Repository Structure

```text
backend/
├── app/
│   ├── main.py                    # FastAPI app factory
│   ├── config.py                  # Settings (pydantic-settings)
│   ├── database.py                # SQLAlchemy async engine
│   │
│   ├── models/                    # SQLAlchemy ORM models
│   │   ├── organization.py
│   │   ├── scan.py
│   │   ├── finding.py
│   │   ├── asset.py
│   │   └── compliance.py
│   │
│   ├── routers/                   # FastAPI route handlers
│   │   ├── auth.py
│   │   ├── org.py
│   │   ├── scans.py
│   │   ├── findings.py
│   │   ├── compliance.py
│   │   ├── dashboard.py
│   │   ├── notifications.py
│   │   └── webhooks.py
│   │
│   ├── agents/                    # LangGraph agents — see 04_AGENT_PIPELINE.md
│   ├── rules/                     # Deterministic rules engines — see 04_AGENT_PIPELINE.md
│   │
│   └── services/                  # External integrations
│       ├── claude_service.py      # LLM client — explain + remediate only
│       ├── whatsapp_service.py    # Meta WhatsApp Cloud API
│       ├── email_service.py       # Resend
│       ├── shodan_service.py
│       ├── virustotal_service.py
│       ├── ssl_labs_service.py
│       ├── nvd_service.py
│       └── pdf_service.py         # WeasyPrint report generation
│
├── migrations/                    # Alembic
├── celery_worker.py
├── requirements.txt
└── Dockerfile
```

Follows TRD §12, with `routers/org.py` added to house the ORGANISATION endpoints listed in TRD §7.1. `agents/` and `rules/` are listed here for repository completeness only; their contents, the 4-phase DAG, and the individual rule sets are owned entirely by `04_AGENT_PIPELINE.md`.

## 3. Application Structure

`main.py` is a factory function (`create_app()`), not a module-level `app` instance, so test setup can construct an isolated app with overridden settings/dependencies. Routers are registered by domain, matching `routers/` one-to-one: `auth`, `org`, `scans`, `findings`, `compliance`, `dashboard`, `notifications`, `webhooks`. Each router owns its own Pydantic request/response models colocated in the same file rather than a shared global schema module, since a finding response shape and an org response shape have no reason to share a namespace.

Dependency injection (FastAPI `Depends`) handles three cross-cutting concerns identically across every router:

| Dependency | Purpose |
|---|---|
| `get_db_session` | Yields an async SQLAlchemy session, one per request, closed on response |
| `get_current_org` | Validates the Supabase JWT, takes user identity from `sub`, and reads the active `org_id` from a custom JWT claim. The claim is populated after validating the user's membership via the `members` table (§4.2) and cached in the token thereafter; `org_id` is never parsed from `sub`. Raises 401 if the token is invalid or the claim is absent |
| `require_role(*roles)` | Parameterized dependency; raises 403 if the authenticated user's role in `organizations` isn't in the allowed set. Role source of truth and the full authorization matrix live in `07_SECURITY_COMPLIANCE.md` |

No router queries the database directly with a hand-rolled tenant filter; `get_current_org` is required on every authenticated route, and RLS (configured per `07_SECURITY_COMPLIANCE.md`) is the enforced backstop if an application-layer filter is ever missed, not the only layer.

## 4. Data Models

### 4.1 PostgreSQL Schema

The full schema as specified in TRD §5.1, reproduced here as the authoritative version this document and `04_AGENT_PIPELINE.md` both build against:

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
  severity TEXT NOT NULL, -- critical | high | medium | low
  title TEXT NOT NULL,
  raw_data JSONB NOT NULL, -- deterministic rule output (auditable)
  plain_explanation TEXT, -- DeepSeek-generated (after rules fire)
  remediation_steps TEXT, -- DeepSeek-generated
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
  narrative TEXT, -- DeepSeek-generated prose summary
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

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

Policy definitions for each `ENABLE ROW LEVEL SECURITY` line (the actual `CREATE POLICY` statements, the tenant-isolation predicate, and the service-role bypass used by Celery workers) are specified in `07_SECURITY_COMPLIANCE.md` §6, not here — this document owns table shape, that document owns the access-control rules layered on top of it.

### 4.2 Schema Extensions Required by `01_PRODUCT_BLUEPRINT.md`

Three product decisions in `01` depend on state this TRD schema doesn't yet carry. Flagged individually rather than silently added, since each is a real schema change beyond TRD v1.0:

- **Finding regression** ([Finding Lifecycle](01_PRODUCT_BLUEPRINT.md#finding-lifecycle)) requires distinguishing "reopened after resolution" from "newly discovered." `findings.status` alone can't carry this. Add `previous_status TEXT` (nullable) and treat a transition into `open` where `previous_status = 'resolved'` as the `regressed` UI state, computed at the API layer rather than stored as its own enum value — the underlying lifecycle stays `open | acknowledged | resolved | false_positive` per TRD, and "regressed" is a presentation label the API attaches, not a fifth status the rules engines need to know about.
- **False-positive reason** (`01` §13, Beyond the Brief: "Marking a finding as a false positive requires a reason"). Add `false_positive_reason TEXT` (nullable, required at the API-validation layer when `status` transitions to `false_positive`). Feeds the false-positive-handling loop referenced in `04_AGENT_PIPELINE.md`.
- **WhatsApp consent lifecycle** (`01`'s Notification Setup screen: consent is a distinct, legally-weighted capture, not a checkbox). `organizations.settings` JSONB is sufficient to store `{ whatsapp_consent: bool, whatsapp_consent_at: timestamp }` without a new column, consistent with `settings` already being the catch-all for notification preferences. Consent semantics and retention are specified in `07_SECURITY_COMPLIANCE.md`; this is only the storage location.

No other table changes. Team & Roles (`01` §9) and role-based authorization reference a `role` concept that isn't a column in TRD v1.0's `organizations` table because roles are per-member, not per-org — this requires a `members` join table (`org_id`, `user_id`, `role`) that TRD v1.0 doesn't specify at all, since v1.0 assumed single-user orgs implicitly. This is not a correction of an existing decision, it's filling a gap `01` already flagged (Team & Roles is "schema-complete at MVP even though the UI is intentionally minimal"):

```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Supabase auth.users.id
  role TEXT NOT NULL DEFAULT 'owner', -- owner | admin | member
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  UNIQUE(org_id, user_id)
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
```

Constraint that an org is never left without an owner (`01` §9, Team & Roles) is enforced at the application layer in the role-change/removal endpoint, not as a raw SQL constraint, since "at least one owner" isn't expressible as a simple column check.

## 5. API Endpoints

Full endpoint list per TRD §7.1, with role gating per `01_PRODUCT_BLUEPRINT.md`'s per-screen Permissions rows and the additions from §4.2 above folded in.

```text
AUTH
POST   /auth/register              # org signup
POST   /auth/login                 # returns JWT
POST   /auth/refresh

ORGANISATION
GET    /org/me                     # current org profile
PUT    /org/me                     # update settings/WhatsApp number
DELETE /org/me                     # Danger Zone — triggers DPDP erasure workflow, see 07_SECURITY_COMPLIANCE.md
POST   /org/me/assets               # manually add an asset to monitor
GET    /org/me/assets               # asset inventory (Assets screen)
POST   /org/me/domain/verify-token  # issues DNS TXT / well-known-file verification value
POST   /org/me/domain/verify-check  # polled by Domain Verification screen

MEMBERS  (added — see §4.2; not in TRD v1.0, required by 01's Team & Roles)
GET    /org/me/members              # list members + roles
POST   /org/me/members/invite       # owner/admin only
PUT    /org/me/members/{id}/role    # owner/admin only; cannot demote sole owner
DELETE /org/me/members/{id}         # owner/admin only; cannot remove sole owner

SCANS
POST   /scans/trigger              # start manual scan (queues Celery task)
GET    /scans                      # scan history (paginated)
GET    /scans/{id}                 # scan detail + findings summary
GET    /scans/{id}/report          # full JSON report
GET    /scans/{id}/report.pdf      # downloadable PDF (WeasyPrint), Phase 2

FINDINGS
GET    /findings                   # all findings (filter: severity, status, type, asset)
GET    /findings/{id}              # finding detail + explanation + remediation
PUT    /findings/{id}/status       # mark acknowledged | resolved | false_positive
                                    # false_positive requires reason (see 4.2)

COMPLIANCE  (Phase 2)
GET    /compliance/latest          # most recent DPDP report
GET    /compliance/{scan_id}       # report for specific scan

DASHBOARD
GET    /dashboard/summary          # security health band + risk score, counts, trend
GET    /dashboard/assets           # full asset inventory summary

NOTIFICATIONS
GET    /notifications              # log of all sent messages
POST   /notifications/test         # send test WhatsApp + email

WEBHOOKS
POST   /webhooks/whatsapp          # handles incoming WhatsApp replies (e.g. DETAILS)
POST   /webhooks/scan-status       # internal — Celery posts scan completion
```

Endpoints not in TRD v1.0 (`/org/me/domain/verify-*`, `/org/me/members*`) exist because `01_PRODUCT_BLUEPRINT.md` specifies screens — Domain Verification, Team & Roles — that TRD v1.0 didn't design an API for. Everything else matches TRD §7.1 exactly.

### 5.1 Request/Response Conventions

- List endpoints (`GET /findings`, `GET /scans`, `GET /org/me/members`) are paginated with `limit`/`offset` query params and a consistent `{ items[], total, limit, offset }` envelope. Filterable endpoints (`GET /findings`) accept filters as query params matching the filter names in `01`'s Findings List filter bar (`severity`, `status`, `finding_type`, `asset_id`) one-to-one, so the frontend's URL-search-param filter state (`02_FRONTEND.md` §4) maps directly without a translation layer.
- Detail endpoints return the full row plus any joined display data the screen needs in one call (e.g. `GET /findings/{id}` includes the asset's `value` and `asset_type`, not just `asset_id`), since `01`'s Finding Detail screen has no secondary fetch for that context.
- Mutation endpoints (`PUT /findings/{id}/status`) return the updated resource, not a bare 204, so the frontend's optimistic-update rollback (`02_FRONTEND.md` §5) has the authoritative state to reconcile against on success.
- All authenticated endpoints require a valid Supabase JWT in the `Authorization: Bearer` header; `org_id` is never accepted as a request parameter for tenant-scoped routes, only derived from the JWT, so a client can't query another org's data by changing an ID in the URL path — that gate is what `get_current_org` (§3) enforces on every route.

## 6. Scan Execution

### 6.1 Trigger Path

`POST /scans/trigger` creates a `scans` row (`status: queued`), enqueues `run_full_scan` as a Celery task, and returns the `scans.id` immediately — the endpoint does not block on pipeline execution. The frontend's live Scan view (`01` §7, First Scan; `02_FRONTEND.md` §5) polls `GET /scans/{id}` against that ID with the backoff strategy already specified in `02_FRONTEND.md`.

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

`pipeline` (the compiled LangGraph graph), `AgentState`, and `persist_scan_results`'s field-by-field write logic are specified in `04_AGENT_PIPELINE.md`; this section owns only the Celery task boundary — how a scan is queued, scheduled, and how its terminal state reaches the API layer that `GET /scans/{id}` reads from.

### 6.2 Partial Failure

A scan whose `error_log` is non-empty is persisted with `status: completed` if the pipeline reached `notification` regardless of per-agent errors (per-agent errors are appended to `AgentState["errors"]`, not raised — see `04_AGENT_PIPELINE.md`), but `GET /scans/{id}` and `GET /scans` both surface `error_log` alongside `status` so no consumer — frontend or otherwise — can read `status: completed` and assume a clean run. This is the backend half of the contract `02_FRONTEND.md` §5 enforces at its query `select` function, and the same principle `01`'s Scans Detail and Dashboard partial-failure states depend on.

### 6.3 Scheduling

Free tier: manual trigger only, rate-limited to one full scan per org per 24 hours (per TRD §17 Pre-Launch Checklist; enforcement mechanism specified in `07_SECURITY_COMPLIANCE.md`). Paid tiers: weekly (Starter) or daily (Growth) automatic scans via the Celery periodic task above, configurable per-org through `organizations.settings.scan_schedule`, read by `PUT /org/me` from `01`'s Settings screen.

## 7. Notification Delivery

### 7.1 WhatsApp Flow

Per TRD §8.1, matching the [Notification Delivery Flow](01_PRODUCT_BLUEPRINT.md#notification-delivery-flow) diagram in `01` exactly:

```text
Scan completes
     |
     ▼
Risk Score > 30  OR  any Critical finding?
     | YES
     ▼
DeepSeek generates ≤160-word WhatsApp summary  (see 04_AGENT_PIPELINE.md, Agent 13)
     |
     ▼
Meta WhatsApp Business Cloud API → owner's WhatsApp number
     |
     ▼
Owner replies "DETAILS"
     |
     ▼
Webhook → POST /webhooks/whatsapp → FastAPI → respond with full report link + top 3 fix steps
```

`POST /webhooks/whatsapp` is unauthenticated by JWT (it's called by Meta, not a logged-in user) and instead validated via Meta's webhook signature verification, configured per `07_SECURITY_COMPLIANCE.md`. It looks up the originating org by the WhatsApp number the message arrived on, not by any client-supplied identifier.

WhatsApp delivery is gated on the consent flag from §4.2; a scan completing for an org with no consent on file routes to email-only, per `01`'s Notification Setup edge case ("User skips WhatsApp entirely: allowed").

### 7.2 Message Template

Pre-approved with Meta per TRD §8.2, unchanged:

```text
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

### 7.3 Email Schedule

Per TRD §8.3:

| Trigger | Template | Frequency |
|---|---|---|
| Scan completes (Critical finding) | Alert email | Immediate |
| Weekly scan | Digest email | Monday 9am IST |
| Monthly | DPDP compliance report PDF | 1st of month, Phase 2 |
| Expiry warning | SSL/Domain expiry warning | 30, 14, 7 days before |

Both channels write to `notifications` (§4.1) on send attempt, whether the attempt succeeds or fails, so `GET /notifications` (`01`'s Notifications Log, "did the alert actually go out") is a complete record and not just a log of successes.

## 8. External Service Integrations

One module per external API under `services/`, matching TRD §4.3's tool list. Each wraps its respective free-tier API (Shodan, SSL Labs, NVD/OSV, VirusTotal, HIBP, AbuseIPDB, PhishTank, Google Safe Browsing, SecurityTrails) behind a consistent interface — an async function returning a plain dict, no client-specific types leaking into the agents that call them. This boundary is what lets `04_AGENT_PIPELINE.md`'s rules engines stay pure functions of plain data (`evaluate_ssl(data: dict) -> list[dict]`, etc.) with no HTTP or SDK dependency of their own; the service layer is where the network call and any provider-specific error handling live, agents call the service, rules evaluate the service's return value.

Full agent-to-tool mapping (which service each of the 13 agents calls, and the exact rule thresholds applied to each response) is specified in `04_AGENT_PIPELINE.md` §6; this section owns only the service client contract.

| Service module | Wraps | Free tier ceiling |
|---|---|---|
| `shodan_service.py` | Shodan host lookup | 1 query/sec, 100/month |
| `ssl_labs_service.py` | SSL Labs API | Unlimited, rate-limited |
| `nvd_service.py` | NVD (NIST) + OSV (Google) | Unlimited |
| `virustotal_service.py` | VirusTotal | 500 req/day |
| `whatsapp_service.py` | Meta WhatsApp Business Cloud API | 1000 convos/month |
| `email_service.py` | Resend | 3000 emails/month |
| `pdf_service.py` | WeasyPrint (local, not an external API) | N/A |

`claude_service.py` is listed separately in §9, since it's the one service module with a hard architectural constraint (never used for finding/severity decisions) rather than a plain external-data fetch.

## 9. DeepSeek Integration Boundary

`claude_service.py` is the single module permitted to call the NVIDIA NIM API. This is an enforced boundary, not a convention: no rules engine, no agent node other than the four specified in `04_AGENT_PIPELINE.md` (Risk Scoring's executive summary, DPDP Compliance's narrative, Recovery Recommendation, Notification's WhatsApp compression), and no router handler calls DeepSeek directly. A finding's `severity` and `raw_data` are fully determined before `claude_service` is ever invoked for that finding — this is the Rules-before-LLM principle from the TRD Executive Summary, enforced structurally by which module owns the only NVIDIA NIM client in the codebase.

```python
# backend/app/services/claude_service.py
import openai

client = openai.NVIDIA NIM()  # uses NVIDIA_API_KEY env var

async def explain_finding(finding: dict, org_context: dict) -> str:
    """Called ONLY after deterministic rules fire. Never decides severity."""
    ...

async def generate_remediation(finding: dict) -> str:
    """Write owner-friendly fix steps for a specific finding."""
    ...

async def generate_whatsapp_summary(scan_result: dict, org: dict) -> str:
    """Compress full scan into <160-word WhatsApp message."""
    ...
```

Full prompt text, system prompts, token limits, and the caching-by-finding-shape strategy referenced in `01`'s Finding Detail AI-interaction row are specified in `04_AGENT_PIPELINE.md`, which owns the complete DeepSeek integration including this service module's function bodies. This section exists to state the boundary itself: which module is allowed to hold the client, and why that's the enforcement mechanism for the product's core architectural claim on the Landing Page ("Your risk score is never decided by AI guesswork").

## 10. Error Handling & Logging

FastAPI exception handlers return a consistent error envelope (`{ error: { code, message } }`) across every router, so the frontend's `error.tsx` retry-action convention (`02_FRONTEND.md` §3) has a stable shape to key off regardless of which endpoint failed. Validation errors (Pydantic) map to 422 with field-level detail, matching the field-level inline error pattern specified per-screen throughout `01` (Signup, Domain Verification, Notification Setup) rather than a single generic message the frontend has to parse.

Agent-level errors during a scan never raise past the pipeline boundary — they're appended to `AgentState["errors"]` per `04_AGENT_PIPELINE.md`'s Rules-First Agent Pattern, and surfaced to the user as the partial-failure state (§6.2), not as an API 500. A 500 from a Qelvix endpoint means an application bug, not "a security check failed," and is treated and logged accordingly — those are different failure classes and the API's status codes keep them distinct.

Structured logging (JSON, one line per request) captures `org_id`, route, status code, and latency on every request; scan-specific logging additionally captures per-agent duration and error counts, feeding the operational health tracked by the Scan failure rate metric in `01_PRODUCT_BLUEPRINT.md` §1 (Success Metrics). Full SOC2-readiness audit logging (the Phase 3 `audit_log` table and Audit Log screen) is specified in `07_SECURITY_COMPLIANCE.md`.

## 11. Environment Variables

Per TRD §15, unchanged:

```env
# NVIDIA NIM
NVIDIA_API_KEY=sk-ant-...

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

Loaded via `pydantic-settings` in `config.py`; never read from `os.environ` directly outside that module, so every setting has one typed, validated point of entry.

## 12. Infrastructure

Per TRD §4.4:

| Component | MVP (₹0–500/mo) | Scale (₹5,000+/mo) |
|---|---|---|
| Backend hosting | Railway (hobby $5/mo) | AWS ECS Fargate |
| Database | Supabase free | Supabase Pro or RDS |
| Redis | Upstash (free 10k/day) | Upstash Pay-as-you-go |
| Cron / scheduler | APScheduler in-process | AWS EventBridge |
| Secrets | Railway env vars | AWS Secrets Manager |
| CI/CD | GitHub Actions (free) | Same |

Frontend hosting (Vercel) is owned by `02_FRONTEND.md`; deployment pipeline detail (build steps, environment promotion, GitHub Actions workflow definitions) is specified in `06_DEVELOPMENT_GUIDE.md`, not here — this table exists only to record the infra shape the API and its dependencies run on.

## 13. Design Decisions

Additions or clarifications beyond a literal reading of TRD v1.0, collected here per this document set's convention:

- **`members` table added** (§4.2). Not in TRD v1.0's schema at all; required because `01_PRODUCT_BLUEPRINT.md` specifies a Team & Roles screen with per-member roles, which has no home in a schema that only modeled single-user orgs.
- **`findings.previous_status` and `findings.false_positive_reason` added** (§4.2). Required to support the Finding Lifecycle regression state and the mandatory false-positive reason, both specified in `01`'s Beyond the Brief section — neither is a backend-originated decision, both are schema consequences of product decisions already made and locked in `01`.
- **Domain verification and member-management endpoints added** (§5). TRD v1.0's API list has no route for either concern, since v1.0 didn't design the Domain Verification screen or multi-member orgs at all.
- **Scan trigger is fire-and-forget, not synchronous** (§6.1). TRD v1.0 implies this via Celery but doesn't state it explicitly; stated here because it's the fact `02_FRONTEND.md`'s polling-based live Scan view depends on.
- **Partial-failure surfacing is a stated API contract, not just a schema field** (§6.2, §10). `error_log` existing on `scans` (TRD §5.1) doesn't by itself guarantee every consumer checks it; this document makes checking it a requirement on every read path, matching the enforcement `02_FRONTEND.md` already built at the query layer.

---

Owner: Qelvix Engineering Team
