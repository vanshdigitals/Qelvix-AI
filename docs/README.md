# Qelvix

Autonomous, plain-language cybersecurity for MSMEs. Qelvix continuously scans an organization's public attack surface, decides severity with deterministic rules, and delivers what to fix — in plain language, over WhatsApp — to owners who have no security team and no time to read a scanner report.

## Vision

An MSME with a website and a mail server has the same public attack surface as a company with a security operations center, and none of the visibility into it. Enterprise security tooling assumes a team to operate it. Qelvix closes that gap: the triage happens in software (fixed, auditable rules — never AI guesswork), and the translation happens in language (Gemini/DeepSeek explains what the rules found). The output a business owner receives is already a decision, not a puzzle.

## Key Features

- External, passive attack-surface scanning across 13 specialized agents (asset discovery, SSL/TLS, DNS, ports, vulnerabilities, threat intel, phishing, fraud, and more).
- Deterministic risk scoring — severity and findings are decided by rules, before any LLM is invoked.
- Plain-language finding explanations and remediation steps, generated per finding.
- WhatsApp-first alerting: the acquisition, retention, and notification channel in one.
- DPDP Act 2023 readiness reporting (readiness indicator, not certification).
- Multi-tenant from the data model up, built to extend to CA-firm / MSME-association portfolios without a redesign.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind + shadcn/ui, TanStack Query, Zustand |
| Backend | FastAPI (Python 3.11+), SQLAlchemy 2.0 (async) + Alembic, Celery + Redis |
| Agent orchestration | LangGraph 0.2.x |
| Database | PostgreSQL 15 (Supabase), RLS multi-tenancy |
| Auth | Supabase Auth (JWT) |
| LLM | Claude (`claude-sonnet-4-6`) — explanation/remediation only |
| Notifications | Meta WhatsApp Business Cloud API, Resend (email) |
| Infra | Vercel (frontend), Railway → AWS ECS (backend), Upstash (Redis) |

Full detail: frontend in `02_FRONTEND.md`, backend in `03_BACKEND.md`.

## Repository Structure

```text
qelvix/
├── backend/            # FastAPI + LangGraph — see 03_BACKEND.md, 04_AGENT_PIPELINE.md
├── frontend/           # Next.js — see 02_FRONTEND.md
├── playbooks/          # IR playbook YAML — see 04_AGENT_PIPELINE.md §9
├── docs/               # This documentation set (README + 01–07)
├── docker-compose.yml  # Local dev: postgres + redis
├── .env.example
├── .github/
│   └── workflows/      # CI — see 06_DEVELOPMENT_GUIDE.md §16
└── README.md
```

## Documentation Index

| Document | Owns |
|---|---|
| [README.md](README.md) | Project overview, entry point, corrected data-model and stack baseline |
| [01_PRODUCT_BLUEPRINT.md](01_PRODUCT_BLUEPRINT.md) | Product thinking, personas, full screen inventory, navigation, UX flows |
| [02_FRONTEND.md](02_FRONTEND.md) | Frontend architecture, routing, state, data fetching, component structure |
| [03_BACKEND.md](03_BACKEND.md) | API surface, data models, services, LLM integration boundary |
| [04_AGENT_PIPELINE.md](04_AGENT_PIPELINE.md) | 13-agent LangGraph pipeline, rules engines, LLM prompts, DPDP rules |
| [05_DESIGN_SYSTEM.md](05_DESIGN_SYSTEM.md) | Tokens, typography, components, dashboard rules, data visualization |
| [06_DEVELOPMENT_GUIDE.md](06_DEVELOPMENT_GUIDE.md) | Setup, standards, git workflow, testing, deployment, troubleshooting |
| [07_SECURITY_COMPLIANCE.md](07_SECURITY_COMPLIANCE.md) | Security architecture, RLS, auth, RBAC, AI security, compliance mapping |

`01_PRODUCT_BLUEPRINT.md` is the foundation document; if a later document conflicts with it, it wins unless a critical architectural issue is found.

### Corrected data model (baseline)

The schema in `03_BACKEND.md` §4.1 is authoritative. Beyond TRD v1.0's single-user assumption, the corrected model adds a `members` join table (`org_id`, `user_id`, `role`) so an organization supports multiple members with distinct roles, and adds `findings.previous_status` and `findings.false_positive_reason`. This is the corrected data model the rest of the set builds against; it exists specifically so multi-member and Phase 3 multi-org support are activations, not retrofits.

## Quick Start

Prerequisites: Python 3.11+, Node 20+, Docker, a Supabase project, and free-tier API keys for the external services in `03_BACKEND.md` §11.

```bash
git clone <repo-url> qelvix && cd qelvix

# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env          # fill in per 06_DEVELOPMENT_GUIDE.md §3
alembic upgrade head
docker compose up -d postgres redis
uvicorn app.main:create_app --factory --reload --port 8000

# Celery worker (separate terminal)
celery -A celery_worker.celery_app worker --loglevel=info

# Frontend (separate terminal)
cd ../frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Frontend: `http://localhost:3000`. API + OpenAPI docs: `http://localhost:8000/docs`. Full setup detail in `06_DEVELOPMENT_GUIDE.md` §2.

## Development Workflow

Trunk-based off `main`, Conventional Commits, squash-merge, one logical change per PR. Every change ships with the test coverage its category requires and passes the full CI gate before merge. Full standards, git workflow, testing strategy, and the Definition of Done are in `06_DEVELOPMENT_GUIDE.md`.

## Deployment Overview

Git-triggered, not manual. Frontend deploys via Vercel's GitHub integration (preview per PR, production on merge to `main`). Backend builds a Docker image via GitHub Actions and deploys to Railway (MVP) / AWS ECS Fargate (scale) after the Alembic migration step, which blocks the deploy on failure. Full pipeline and CI gate in `06_DEVELOPMENT_GUIDE.md` §16.

## Architecture Overview

Browser → Next.js (Vercel) → FastAPI (Railway/ECS) → PostgreSQL (Supabase). Scans run asynchronously: `POST /scans/trigger` enqueues a Celery task that runs the 13-agent LangGraph pipeline, which fetches from external scanning services, applies deterministic rules to decide findings and severity, computes a risk score, and only then invokes the LLM to explain results and compress them into a WhatsApp summary. The LLM never decides severity or takes action — the single `claude_service.py` module is the only code permitted to call the Gemini/DeepSeek APIs. Tenant isolation is enforced twice, independently: application-layer `org_id` scoping and database-layer RLS. Full detail in `03_BACKEND.md`, `04_AGENT_PIPELINE.md`, and `07_SECURITY_COMPLIANCE.md`.

## Current Project Status

Pre-launch, building toward MVP. Phasing (per `01_PRODUCT_BLUEPRINT.md` §3 and `04_AGENT_PIPELINE.md` §12):

- **Phase 1 (MVP):** asset discovery, SSL/TLS, DNS, simplified risk scoring, remediation, WhatsApp/email notification; core app screens (Dashboard, Findings, Scans, Settings).
- **Phase 2 (Core Product):** port scanning, vulnerability analysis, threat intel, phishing detection, DPDP compliance, incident response, PDF export, command palette.
- **Phase 3 (Scale & GTM):** fraud detection, CA-firm / MSME-association multi-org portfolio view, billing, API keys, audit log, SOC2-readiness work.

---

Owner: Qelvix Engineering Team
