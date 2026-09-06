# Development

Scope: setup, the environment variables the code actually reads, migrations, how the scan runner is executed, test commands, and what each CI gate blocks on.

## Prerequisites

Python 3.11 (`backend/.python-version` pins 3.11.9, `backend/pyproject.toml:5` requires >=3.11), Node 20 or later (`frontend/package.json:6`), Docker for local Postgres and Redis, and a Supabase project for Auth.

## Setup

```bash
docker compose up -d postgres redis
```

`docker-compose.yml` defines only two services: `postgres:15-alpine` on 5432 with user, password and database all `qelvix`, and `redis:7-alpine` on 6379. Both have health checks. Nothing in the request path reads Redis; it exists for the Celery application that is never enqueued.

```bash
cd backend && pip install -r requirements-dev.txt
```

`requirements-dev.txt` includes `requirements.txt` plus ruff, mypy, pytest, pytest-asyncio, pytest-cov, asgi-lifespan, pip-audit, detect-secrets and two typing stub packages.

```bash
cd frontend && npm ci
```

Then create `backend/.env` and `frontend/.env.local`, run migrations, and start both processes:

```bash
cd backend && alembic upgrade head
```

```bash
cd backend && uvicorn app.main:create_app --factory --reload --port 8000
```

```bash
cd frontend && npm run dev
```

The `--factory` flag is required: `backend/app/main.py` exposes `create_app`, not a module-level `app`.

`make dev` (`Makefile:14`) does the compose, backend and frontend steps in one target, but backgrounds the API with a bare `&` inside a recursive `cd`, which does not reliably work on every shell. Running the two processes in separate terminals is more predictable.

## Environment variables

Read from `backend/app/config.py`. That module is the only place in the backend that reads the environment. `model_config` sets `env_file=".env"`, case-insensitive matching, and `extra="forbid"` (`config.py:26-31`).

### Required, backend

The process will not start without these. Each has no default.

| Variable | Field | Used by |
|---|---|---|
| `NVIDIA_API_KEY` | `nvidia_api_key`, `config.py:34` | The NVIDIA NIM fallback client, `backend/app/services/claude_service.py:19`. Required even if Gemini serves every call. |
| `DATABASE_URL` | `database_url`, `config.py:43` | `create_async_engine`, `backend/app/database.py:11`. Must use the `postgresql+asyncpg://` scheme. |
| `SUPABASE_URL` | `supabase_url`, `config.py:44` | JWKS endpoint construction (`dependencies.py:19`) and every Supabase Admin call in `routers/auth.py`. |
| `SUPABASE_SERVICE_KEY` | `supabase_service_key`, `config.py:45` | Supabase Admin calls in `routers/auth.py`. |
| `SECRET_KEY` | `secret_key`, `config.py:66` | HS256 token verification, `dependencies.py:34`. |
| `FRONTEND_URL` | `frontend_url`, `config.py:67` | The single allowed CORS origin (`main.py:43`) and the dashboard link in the scan email (`agents/notification.py:43`). |

### Optional, backend

| Variable | Field | Effect when absent |
|---|---|---|
| `ENVIRONMENT` | `config.py:68` | Defaults to `development`, which turns on SQLAlchemy echo (`database.py:13`). |
| `GEMINI_PRIMARY_API_KEY` | `config.py:39` | Dropped from the Gemini key chain. |
| `FALLBACK_BACKUP_GEMINI_PRIMARY_API_KEY` | `config.py:40` | Dropped from the chain. |
| `GEMINI_API_KEY` | `config.py:35` | Dropped from the chain. With all three unset, `_call_gemini` raises immediately and every call goes to NVIDIA. |
| `DEEPSEEK_API_KEY` | `config.py:37` | No effect. Declared and read by no code. |
| `REDIS_URL` | `config.py:48` | Falls back to `redis://localhost:6379/0` for the unused Celery app (`worker.py:18`). |
| `SHODAN_API_KEY` | `config.py:52` | Asset discovery finds no IPs; the port scanner emits one `scanner_not_configured` finding. |
| `VIRUSTOTAL_API_KEY` | `config.py:53` | VirusTotal is skipped. Present or absent, it produces no findings; see `RULES.md`. |
| `NVD_API_KEY` | `config.py:54` | Vulnerability analysis emits one `scanner_not_configured` finding. |
| `GOOGLE_SAFE_BROWSING_API_KEY` | `config.py:55` | Phishing detection emits one `scanner_not_configured` finding. |
| `ABUSEIPDB_API_KEY` | `config.py:56` | AbuseIPDB is skipped. It is never called regardless; see `AGENTS.md`. |
| `WHATSAPP_ACCESS_TOKEN` | `config.py:60` | No effect. Declared and read by no code. |
| `WHATSAPP_PHONE_NUMBER_ID` | `config.py:61` | No effect. Declared and read by no code. |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | `config.py:62` | No effect. Declared and read by no code. |
| `RESEND_API_KEY` | `config.py:63` | `send_scan_report_email` prints a stub line instead of sending (`services/email_service.py:15`). |

`RENDER_GIT_COMMIT` is read directly from `os.environ` by the health endpoint (`main.py:78`), the one place outside `config.py` that touches the environment. It is set by Render and is null elsewhere.

### `.env.example` does not work as-is

`.env.example:30` and `.env.example:31` declare `PHISHTANK_API_KEY` and `SECURITY_TRAILS_API_KEY`. Neither has a field on `Settings`, and `extra="forbid"` turns an unknown key in the dotenv file into a validation error at import. Copying the example verbatim prevents the application from starting. Delete those two lines, or add matching fields.

The example also documents `NVIDIA_API_KEY` as the primary LLM (`.env.example:4`) and `gemini-flash-latest` as the model (`.env.example:9`). Both are stale: Gemini is primary (`claude_service.py:83`) and the model string is `gemini-3.6-flash` (`claude_service.py:29`).

### Frontend

| Variable | Read at | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `frontend/lib/supabase/config.ts:8` | Yes. Without it `isSupabaseConfigured` is false and protected routes always redirect to login. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `frontend/lib/supabase/config.ts:9` | Yes, same. |
| `NEXT_PUBLIC_API_URL` | `frontend/lib/api/client.ts:7` | No. Defaults to `http://localhost:8000`. |

`frontend/.env.local.example` exists as a template.

## Migrations

Alembic, configured by `backend/alembic.ini`, with revisions in `backend/migrations/versions/`. The chain and the contents of each revision are documented in `DATA_MODEL.md`.

```bash
cd backend && alembic upgrade head
```

Current head is `b7c1a9d2e4f8`, which the live database reports as applied.

```bash
cd backend && alembic revision --autogenerate -m "description"
```

Autogenerate will not reproduce the RLS work: policies, grants and `ENABLE ROW LEVEL SECURITY` are hand-written `op.execute` calls in `d3e0543d1ed1`, `551ce8261afa` and `f52ef683fdf4`. It will also try to add `source`, `verified` and `created_at` columns that the response schemas expect but the models do not declare, and it will not do so, because the models are the autogenerate source and they do not declare them either. Review every generated revision before applying it.

`make migrate` (`Makefile:35`) runs the upgrade. `make seed` (`Makefile:38`) invokes `python -m scripts.seed`, and no such module exists under `backend/scripts/`; that target fails.

## Running the scan worker

There is no separate worker process to run. `POST /scans/trigger` schedules `execute_and_save` on FastAPI's `BackgroundTasks` inside the API process (`backend/app/routers/scans.py:147`). Starting uvicorn is sufficient.

A Celery application and a `run_scan_pipeline` task exist in `backend/app/worker.py:26` and `worker.py:178`. Nothing enqueues them. Starting a Celery worker would connect to Redis and idle. If you want to run one anyway:

```bash
cd backend && celery -A app.worker.celery_app worker --loglevel=info
```

Note that the command in `docs/06_DEVELOPMENT_GUIDE.md:42` references `celery_worker.celery_app`, a module that does not exist.

To run a scan without the API, `backend/test_pipeline.py` calls the task function synchronously. It is a loose script at the backend root, not a test, and it hits the live database configured in `backend/.env`.

The pipeline has two timeouts you will notice while developing: 90 seconds per agent node (`backend/app/agents/pipeline.py:29`) and 480 seconds for the whole graph (`backend/app/worker.py:24`). A scan wedged past 600 seconds is recovered to `failed` the next time any org member triggers a scan (`backend/app/routers/scans.py:32`).

## Tests

### Backend

```bash
cd backend && pytest
```

Configured at `backend/pyproject.toml:54`: `testpaths = ["tests"]`, `asyncio_mode = "auto"`, `addopts = "--strict-markers --strict-config"`, and three registered markers (`unit`, `tenancy`, `contract`).

Three test modules exist:

| File | What it covers | State |
|---|---|---|
| `tests/test_health.py` | Two assertions on `GET /health` | Both fail. Each asserts the response body has exactly `status` and `environment` (`test_health.py:15`, `test_health.py:23`), while `HealthResponse` also declares `commit` (`backend/app/main.py:22`). Verified by inspecting `HealthResponse.model_fields`, which returns three names. |
| `tests/test_claude_service.py` | That `explain_finding` falls through from a failing Gemini client to NVIDIA | Passes by inspection. Both clients are patched, so no network call is made. |
| `tests/test_rls_and_auth.py` | Auth rejection, and cross-tenant RLS | Requires a live database. It calls `get_settings()` at import (`test_rls_and_auth.py:17`), so it reads `backend/.env` and connects to whatever `DATABASE_URL` points at, seeding and deleting real rows. Its RLS assertion passes vacuously; see `SECURITY.md`. |

Neither `.venv` nor `.test_venv` in `backend/` has pytest installed, so the suite could not be executed during this review. The two `test_health.py` failures were established by reading the model definition rather than by running the tests. Not verified by execution: the check is `pip install -r requirements-dev.txt && pytest`.

There is no test for any router other than `/health` and `/org/me`, none for the rules modules, none for the pipeline, and none for the notification path.

### Frontend

```bash
cd frontend && npm run test        # vitest
cd frontend && npm run test:e2e    # playwright
```

`frontend/tests/` holds one component test (`components/placeholder.test.tsx`), one accessibility spec (`e2e/a11y.spec.ts`) and one smoke spec (`e2e/smoke.spec.ts`).

### Loose scripts

`backend/` contains `test_bgtask.py`, `test_email.py`, `test_findings.py`, `test_pipeline.py`, `test_trigger.py`, `backfill_explanation.py`, `backfill_explanation2.py`, `check_stale.py`, `db_check.py`, `fix_db.py` and `run_case_2.py`. `scratch/` holds another 17. None are collected by pytest, since `testpaths` is `tests`, but the `test_*.py` names at the backend root are close enough to be mistaken for the suite. They connect to the live database.

## Lint and type checks

```bash
cd backend && ruff check app tests && ruff format --check app tests
cd backend && mypy app
cd frontend && npm run lint && npm run typecheck && npm run format:check
```

Ruff is configured at `backend/pyproject.toml:7` with line length 100 and a broad rule set including bandit (`S`), flake8-print (`T20`) and flake8-annotations (`ANN`). Mypy runs in strict mode (`pyproject.toml:39`).

The codebase carries a large number of `# noqa` comments, many of them bare, on router handlers and dependency functions. `backend/app/agents/notification.py:52` and `backend/app/services/email_service.py:16` use `print` with `# noqa` rather than the logger, so the WhatsApp stub output and the email stub output go to stdout.

Whether `ruff check`, `ruff format --check` and `mypy app` currently pass was not established; neither tool is installed in the available virtual environments. Not verified: the check is to install `requirements-dev.txt` and run the three commands.

## Pre-commit

`.pre-commit-config.yaml` installs whitespace and syntax hooks, ruff with `--fix`, ruff-format, detect-secrets, prettier for frontend files, an `AGENTS.md` line-count check, and a frozen-documents guard.

```bash
pre-commit install
```

Two hooks will fail as configured:

- `detect-secrets` (`.pre-commit-config.yaml:26`) passes `--baseline .secrets.baseline`, and that file does not exist at the repository root.
- `frozen-docs` (`.pre-commit-config.yaml:47`) matches `^docs/(README|0[1-7]_).*\.md$` and fails the commit whenever one of those files changes. `docs/README.md` was rewritten as part of this documentation set, so committing it requires either updating that hook's pattern or passing `--no-verify`.

## CI gates

`.github/workflows/ci.yml`. Seven jobs, each blocking merge independently. All run on pull requests and on pushes to `main`. Non-secret placeholder values for the six required settings are injected as workflow-level env vars (`ci.yml:17-25`).

| Gate | Job | Steps | Blocks on |
|---|---|---|---|
| G1 | Lint and type-check | `ruff check`, `ruff format --check`, `mypy app`, `npm run lint`, `tsc --noEmit`, `prettier --check`, `scripts/check_agents_md_length.sh` | Any lint error, any formatting drift, any strict-mypy error, any TypeScript error, or `AGENTS.md` exceeding its line ceiling |
| G2 | Unit tests | `pytest` in `backend`, `npm run test` in `frontend`. Postgres 15 and Redis 7 service containers are started. | Any failing test. Currently blocked: the two `test_health.py` assertions do not match `HealthResponse`, and `test_rls_and_auth.py` connects to `DATABASE_URL` and queries tables that no migration step in this job has created. |
| G3 | Accessibility | `playwright test tests/e2e/a11y.spec.ts` with Chromium | Any axe-core violation |
| G4 | End-to-end | `playwright test tests/e2e/smoke.spec.ts`; uploads the report on failure | Any smoke-test failure |
| G5 | Performance budget | `npm run build`, then Lighthouse CI against `lighthouserc.json` | Any budget in `lighthouserc.json` being exceeded |
| G6 | Contract snapshot | `scripts/export_openapi.py`, `scripts/generate_types.sh`, then `git diff --exit-code` on `docs/contracts/openapi.json` and `frontend/lib/api/types.generated.ts` | The committed OpenAPI snapshot or the generated frontend types drifting from the routers. Any router change requires regenerating both and committing them. |
| G7 | Supply chain | `detect-secrets-hook --baseline .secrets.baseline`, `pip-audit -r requirements.txt`, `npm audit --audit-level=high` | A detected secret, a known CVE in a pinned Python dependency, or a high-severity npm advisory. Currently blocked: `.secrets.baseline` does not exist, so the first step errors. |

G2 does not run migrations before pytest. The Postgres service container is empty, so `test_rls_and_auth.py` fails on a missing relation as soon as it seeds. Adding `alembic upgrade head` before the pytest step would fix that part; the vacuous RLS assertion is a separate problem described in `SECURITY.md`.

`make verify` (`Makefile:41`) runs G1, G2, G6 and G7 locally. `make verify-full` (`Makefile:48`) adds G3, G4 and G5.

## Regenerating the API contract

```bash
python scripts/export_openapi.py
bash scripts/generate_types.sh
```

or `make contract` (`Makefile:31`). Commit both outputs. G6 fails on any drift.

The prose in the current snapshot predates the implementation; `frontend/lib/api/types.generated.ts:470` still describes `/scans/trigger` as queuing a Celery task. Regenerating will not fix that, because the text comes from the docstrings in the routers.
