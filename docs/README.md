# Qelvix

Scope: what the code in this repository does today, the verified stack, the repo layout, a traced quick start, and the current implementation status.

Every claim below traces to a file and line that was read. Where something could not be verified, it says "Not verified" and names the check.

## What Qelvix does

An organization signs up, sets one primary domain, and proves it owns that domain with a DNS TXT record (`backend/app/routers/org.py:246`). It then triggers a scan. The scan runs a compiled LangGraph pipeline of 13 agent nodes against that single domain (`backend/app/agents/pipeline.py:79`). The agents call external services, deterministic Python rules turn the service responses into findings with a severity, a deterministic formula turns the findings into a 0-100 risk score, and an LLM writes plain-language explanation, remediation, executive summary and compliance narrative text on top of results it did not decide (`backend/app/agents/risk_scoring.py:18`, `backend/app/rules/risk_rules.py:1`).

Findings, the risk score and the full pipeline state are written to Postgres (`backend/app/worker.py:107`). The Next.js frontend reads them through the API.

Scanning is external and passive: DNS lookups, Certificate Transparency logs, the SSL Labs public API, Google Safe Browsing, a breach-corpus lookup, and, when keys are present, Shodan, VirusTotal, AbuseIPDB and NVD. No agent sends traffic that probes the target host directly.

## Verified stack

Backend versions read from `backend/requirements.txt`; frontend versions from `frontend/package.json`.

| Layer | Technology | Version | Source |
|---|---|---|---|
| API framework | FastAPI | 0.115.6 | `backend/requirements.txt:6` |
| ASGI server | uvicorn[standard] | 0.34.0 | `backend/requirements.txt:7` |
| Agent orchestration | LangGraph | 0.2.61 | `backend/requirements.txt:11` |
| LangChain core | langchain-core | 0.3.29 | `backend/requirements.txt:12` |
| Task queue (defined, never enqueued) | Celery | 5.4.0 | `backend/requirements.txt:15` |
| Redis client | redis | 5.2.1 | `backend/requirements.txt:16` |
| Scheduler (never imported) | APScheduler | 3.11.0 | `backend/requirements.txt:19` |
| ORM | SQLAlchemy[asyncio] | 2.0.36 | `backend/requirements.txt:22` |
| Migrations | Alembic | 1.14.0 | `backend/requirements.txt:23` |
| Postgres driver | asyncpg | 0.30.0 | `backend/requirements.txt:24` |
| Settings | pydantic 2.10.4, pydantic-settings 2.7.0 | | `backend/requirements.txt:28` |
| JWT | pyjwt[crypto] | 2.10.1 | `backend/requirements.txt:33` |
| LLM client | openai (OpenAI-compatible SDK) | 1.109.1 | `backend/requirements.txt:38` |
| HTTP client | httpx | 0.28.1 | `backend/requirements.txt:41` |
| DNS | dnspython | 2.8.0 | `backend/requirements.txt:44` |
| Email | resend | 2.35.0 | `backend/requirements.txt:47` |
| PDF (never imported) | weasyprint | 63.1 | `backend/requirements.txt:50` |
| Fuzzy matching (never imported) | rapidfuzz | 3.14.5 | `backend/requirements.txt:54` |
| Python | CPython | 3.11.9 | `backend/runtime.txt` |
| Frontend framework | Next.js (App Router) | 14.2.35 | `frontend/package.json:29` |
| UI runtime | react, react-dom | 18.3.1 | `frontend/package.json:32` |
| Language | TypeScript | 5.7.2 | `frontend/package.json:63` |
| Styling | tailwindcss | 3.4.17 | `frontend/package.json:62` |
| Auth client | @supabase/ssr ^0.5.2, @supabase/supabase-js ^2.111.0 | | `frontend/package.json:22` |
| Charts | recharts | 2.15.0 | `frontend/package.json:35` |
| Animation | framer-motion | 11.15.0 | `frontend/package.json:27` |
| Unit tests | vitest | 4.1.10 | `frontend/package.json:64` |
| E2E | @playwright/test | 1.62.0 | `frontend/package.json:43` |
| Node | engines constraint | >=20 | `frontend/package.json:6` |

`@tanstack/react-query` 5.62.11, `zustand` 5.0.2, `react-hook-form` 7.54.2, `zod` 3.24.1 and `next-intl` 3.26.3 are declared in `frontend/package.json` and imported nowhere. A grep for each across `frontend/app`, `frontend/components` and `frontend/lib` returns zero files. Data fetching is hand-rolled in `frontend/lib/api/client.ts:102`, and no form or schema-validation library is in use.

The database is PostgreSQL on Supabase. The configured `DATABASE_URL` points at the Supabase IPv4 session pooler on `aws-1-ap-south-1.pooler.supabase.com:5432` and connects as the `postgres` role. See `SECURITY.md` for what that means for row-level security.

`pyyaml` is imported by `backend/app/agents/incident_response.py:3` but is not declared in `backend/requirements.txt`. It resolves only as a transitive dependency of `langchain-core`.

## Repo layout

```text
Qelvix-AI-Web-MVP/
├── backend/
│   ├── app/
│   │   ├── main.py            # create_app factory, CORS, router registration, /health
│   │   ├── config.py          # pydantic-settings Settings, the only env reader
│   │   ├── database.py        # async engine (NullPool) + get_db_session dependency
│   │   ├── dependencies.py    # JWT verification, CurrentOrg, onboarding gate, require_role
│   │   ├── rate_limit.py      # in-process per-org sliding window
│   │   ├── worker.py          # execute_and_save (the real scan runner) + an unused Celery task
│   │   ├── routers/           # auth, org, members, scans, findings, compliance,
│   │   │                      # dashboard, notifications, webhooks
│   │   ├── agents/            # 13 agent modules + state.py + pipeline.py (the compiled graph)
│   │   ├── rules/             # deterministic severity and scoring rules
│   │   ├── services/          # one module per external provider
│   │   ├── models/            # SQLAlchemy models
│   │   └── schemas/           # pydantic request/response models
│   ├── migrations/versions/   # 5 Alembic revisions (schema, RLS, grants, RLS perf, onboarding)
│   ├── playbooks/             # 2 incident-response YAML playbooks
│   ├── tests/                 # 3 test modules
│   ├── requirements.txt, requirements-dev.txt, pyproject.toml, alembic.ini
│   └── *.py                   # loose one-off scripts at the backend root, not application code
├── frontend/
│   ├── app/                   # App Router groups: (marketing) (auth) (app) (onboarding)
│   ├── components/            # dashboard screens, marketing sections, auth, onboarding
│   ├── lib/                   # api client, supabase client/middleware, auth actions
│   ├── middleware.ts          # session refresh + protected-route redirect
│   └── tests/                 # 1 vitest component test, 2 playwright specs
├── docs/                      # this documentation set + the frozen 01-12 specification set
├── scratch/                   # ad-hoc developer scripts, not part of the app
├── scripts/                   # openapi export, type generation, doc guards
├── .github/workflows/ci.yml   # gates G1-G7
├── docker-compose.yml         # local postgres 15 + redis 7 only
└── .env.example
```

`docs/01_PRODUCT_BLUEPRINT.md` through `docs/12_AI_DEVELOPMENT_WORKFLOW.md` and `docs/Qelvix_TRD_transcribed.md` were written before implementation. They describe intent, and several of their claims are contradicted by the code. They are left in place unmodified. `docs/archive/QELVIX_FULL_STACK_HEALTH_AUDIT.md` is a superseded 2026-08-17 audit.

## Quick start

Traced against `Makefile`, `docker-compose.yml`, `backend/app/config.py`, `backend/alembic.ini` and `frontend/lib/supabase/config.ts`.

1. Start local infrastructure (PostgreSQL 15 and Redis 7):

```bash
docker compose up -d postgres redis
```

2. Install backend dependencies:

```bash
cd backend && pip install -r requirements-dev.txt
```

3. Create `backend/.env`. Do not copy `.env.example` verbatim. `Settings` sets `extra="forbid"` (`backend/app/config.py:30`), and `.env.example:30-31` declares `PHISHTANK_API_KEY` and `SECURITY_TRAILS_API_KEY`, which have no matching field on `Settings` and will fail validation at import. The minimum set that satisfies the required fields is:

```text
NVIDIA_API_KEY=...
DATABASE_URL=postgresql+asyncpg://qelvix:qelvix@localhost:5432/qelvix
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=...
SECRET_KEY=...
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
```

4. Apply migrations:

```bash
cd backend && alembic upgrade head
```

5. Run the API:

```bash
cd backend && uvicorn app.main:create_app --factory --reload --port 8000
```

6. Run the frontend:

```bash
cd frontend && npm ci && npm run dev
```

`frontend/.env.local` needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`frontend/lib/supabase/config.ts:8`) plus `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:8000` (`frontend/lib/api/client.ts:7`).

Frontend at `http://localhost:3000`, API at `http://localhost:8000`, OpenAPI at `/docs` (`backend/app/main.py:37`).

No Celery worker needs to be started. Scans run inside the API process as FastAPI `BackgroundTasks` (`backend/app/routers/scans.py:147`). Redis is started by compose, but nothing in the request path reads it.

## Current status

### Working

- Supabase JWT verification, RS256 via JWKS and HS256 legacy (`backend/app/dependencies.py:22`).
- Org provisioning, idempotent, writing `app_metadata.org_id` back to Supabase (`backend/app/routers/auth.py:135`).
- Server-owned onboarding state machine with resume across 8 ordered steps (`backend/app/schemas/onboarding.py:31`, `backend/app/routers/org.py:317`).
- DNS TXT domain-ownership verification against a real resolver (`backend/app/routers/org.py:246`).
- Onboarding gate: tenant-data endpoints return 403 `onboarding_incomplete` until onboarding completes (`backend/app/dependencies.py:109`).
- Role checks for owner, admin and member (`backend/app/dependencies.py:130`).
- Per-org in-process rate limiting on scan trigger and verify-check (`backend/app/rate_limit.py:38`).
- Scan trigger with a domain-verified precondition, a single-active-scan lock, and a stale-scan reaper (`backend/app/routers/scans.py:95`).
- The compiled LangGraph pipeline, with a 90s per-agent timeout and a 480s whole-pipeline timeout, both degrading rather than aborting (`backend/app/agents/pipeline.py:29`, `backend/app/worker.py:24`).
- Live keyless scanning: DNS records via dnspython, subdomains via crt.sh, SSL grade via Qualys SSL Labs, breach corpus via XposedOrNot (`backend/app/services/dns_service.py`, `backend/app/services/ssl_labs_service.py`, `backend/app/services/threat_service.py:41`).
- Deterministic rules and risk scoring with no LLM input (`backend/app/rules/`).
- LLM text generation with a Gemini-primary, NVIDIA-fallback chain (`backend/app/services/claude_service.py:82`).
- Persistence of scan, findings, assets and full pipeline state (`backend/app/worker.py:107`).
- `GET /scans`, `GET /scans/{scan_id}`, `GET /scans/{scan_id}/report`, `GET /findings`, `GET /findings/{finding_id}`, `PUT /findings/{finding_id}/status`, `GET /dashboard/summary`, `GET /dashboard/assets`, `GET /org/me`, `PUT /org/me`.
- Frontend session refresh and protected-route redirect in middleware (`frontend/lib/supabase/middleware.ts:13`).

### Partial

- Email delivery. `send_scan_report_email` is implemented against Resend and is called by the notification agent, but only when `organizations.notification_email` is set (`backend/app/agents/notification.py:42`). No test exercises it, and nothing is written to the `notifications` table.
- Threat intelligence. The XposedOrNot breach check is live and produces findings. VirusTotal and AbuseIPDB are called when keys are present, but their response shapes do not match the keys the rules read, so they can never produce a finding. See `KNOWN_GAPS.md`.
- Vulnerability analysis. The NVD client is implemented but is fed a hardcoded software list whose key names it does not read, so it always finds zero CVEs (`backend/app/agents/vuln_analysis.py:9` against `backend/app/services/vuln_service.py:21`).
- Incident response. Playbook loading works but resolves `playbooks` relative to the process working directory (`backend/app/agents/incident_response.py:10`), and only 2 playbooks exist.
- Dashboard risk band. `GET /dashboard/summary` computes an A-F band that treats a high risk score as good, inverting the meaning the scoring rules assign (`backend/app/routers/dashboard.py:35`).

### Stubbed

- WhatsApp send. The agent generates the message text with the LLM, then prints it (`backend/app/agents/notification.py:52`).
- Fraud detection. `fetch_fraud_data` returns a fixed stub (`backend/app/services/fraud_service.py:1`).
- Typosquat detection. `fetch_phishing_data` always returns `typosquats: []` (`backend/app/services/phishing_service.py:81`). No Levenshtein or fuzzy-matching code exists.
- `POST /org/me/members/invite` returns a success message and creates nothing (`backend/app/routers/members.py:50`).
- `POST /notifications/test` returns a success message and sends nothing (`backend/app/routers/notifications.py:47`).
- `POST /webhooks/whatsapp` checks that a signature header is present but does not verify it (`backend/app/routers/webhooks.py:9`).
- `POST /webhooks/scan-status` is unauthenticated and returns a fixed response (`backend/app/routers/webhooks.py:24`).
- Frontend API keys, audit log, billing, notifications and team screens render "not available yet" panels with no data source.

### Not implemented

- `GET /scans/{scan_id}/report.pdf` raises 501 (`backend/app/routers/scans.py:242`).
- Scheduled and recurring scans. APScheduler is installed and never imported.
- Celery execution. A task is defined (`backend/app/worker.py:178`) and never enqueued anywhere in the repository.
- Audit logging. The `audit_log` table and `AuditLog` model exist; nothing writes to them.
- Compliance report persistence. The `compliance_reports` table and model exist; nothing writes to them, so `GET /compliance/latest` and `GET /compliance/{scan_id}` always 404.
- Notification records. The `notifications` table is never written.
- Port scanning without Shodan. With no Shodan key the asset inventory carries no IPs and the port agent emits a single informational "not configured" finding (`backend/app/agents/port_scanner.py:11`).
- MFA, API keys, billing.

## The rest of this set

| File | Scope |
|---|---|
| `ARCHITECTURE.md` | Request and scan lifecycle, the real orchestrator, LLM trust boundary |
| `API.md` | Every route from the routers, with auth dependency and org scoping |
| `DATA_MODEL.md` | Tables, columns, FKs, indexes, RLS policies and whether each enforces |
| `AGENTS.md` | Each implemented agent: input, dependency, probe, output, degradation |
| `RULES.md` | Every deterministic rule with thresholds, severity and line numbers |
| `SECURITY.md` | Auth, sessions, domain verification, tenant isolation as enforced, known gaps |
| `DEVELOPMENT.md` | Setup, env vars, migrations, tests, CI gates |
| `KNOWN_GAPS.md` | Stubs, mismatches, broken endpoints, failing tests, unverified paths |
