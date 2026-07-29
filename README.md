# Qelvix

AI-powered cybersecurity platform for Indian SMBs. Monorepo: FastAPI + LangGraph backend, Next.js frontend.

## Documentation

All specifications live in [`docs/`](docs/). Read them before writing code.

| Document | Scope |
|---|---|
| [`docs/README.md`](docs/README.md) | Documentation set overview and reading order |
| [`docs/Qelvix_TRD_transcribed.md`](docs/Qelvix_TRD_transcribed.md) | Technical Requirements Document — highest authority |
| [`docs/01_PRODUCT_BLUEPRINT.md`](docs/01_PRODUCT_BLUEPRINT.md) | Product scope, screens, navigation |
| [`docs/02_FRONTEND.md`](docs/02_FRONTEND.md) | Frontend architecture |
| [`docs/03_BACKEND.md`](docs/03_BACKEND.md) | Backend architecture, data models, API |
| [`docs/04_AGENT_PIPELINE.md`](docs/04_AGENT_PIPELINE.md) | LangGraph pipeline and rules engines |
| [`docs/05_DESIGN_SYSTEM.md`](docs/05_DESIGN_SYSTEM.md) | Tokens, components, visual language |
| [`docs/06_DEVELOPMENT_GUIDE.md`](docs/06_DEVELOPMENT_GUIDE.md) | Setup, workflows, standards |
| [`docs/07_SECURITY_COMPLIANCE.md`](docs/07_SECURITY_COMPLIANCE.md) | Auth, RLS, DPDP compliance |
| [`docs/08`–`docs/12`](docs/) | Implementation methodology, roadmap, sprints, tasks, AI workflow |

Documents `01`–`07` are frozen. Conflicts are resolved by ADR, never by editing them.

## Repository Structure

```text
qelvix/
├── backend/            # FastAPI + LangGraph — see docs/03_BACKEND.md, docs/04_AGENT_PIPELINE.md
├── frontend/           # Next.js — see docs/02_FRONTEND.md
├── playbooks/          # IR playbook YAML — see docs/04_AGENT_PIPELINE.md §9
├── docs/               # This documentation set
├── docker-compose.yml  # Local dev: postgres + redis
├── .env.example
├── .github/
│   └── workflows/      # CI — see docs/06_DEVELOPMENT_GUIDE.md §16
└── README.md
```

## Quick Start

Prerequisites: Python 3.11+, Node 20+, Docker, a Supabase project, and free-tier keys for the external services in `docs/03_BACKEND.md` §11.

Full setup instructions are in [`docs/06_DEVELOPMENT_GUIDE.md`](docs/06_DEVELOPMENT_GUIDE.md) §2.

Frontend runs at `http://localhost:3000`, API at `http://localhost:8000` with OpenAPI docs at `/docs`.
