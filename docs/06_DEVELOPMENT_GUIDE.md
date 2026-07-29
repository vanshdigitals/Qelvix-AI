# 06: Development Guide

Onboarding and day-to-day engineering reference. Product decisions live in `01_PRODUCT_BLUEPRINT.md`, frontend structure in `02_FRONTEND.md`, backend/API in `03_BACKEND.md`, the agent pipeline in `04_AGENT_PIPELINE.md`, and visual/component specification in `05_DESIGN_SYSTEM.md`. This document assumes all five and does not restate their content — it covers how to set up, build, test, ship, and troubleshoot against what they've already specified.

## 1. Repository Structure

Single monorepo. Full `backend/` tree is specified in `03_BACKEND.md` §2, `frontend/` tree in `02_FRONTEND.md` §2. Top level:

```text
qelvix/
├── backend/            # FastAPI + LangGraph — see 03_BACKEND.md, 04_AGENT_PIPELINE.md
├── frontend/           # Next.js — see 02_FRONTEND.md
├── playbooks/          # IR playbook YAML — see 04_AGENT_PIPELINE.md §9
├── docs/               # This documentation set (README + 01–07)
├── docker-compose.yml  # Local dev: postgres + redis
├── .env.example
├── .github/
│   └── workflows/      # CI — see §16
└── README.md
```

No `packages/` or shared-library split at current scope — frontend and backend share nothing at the code level (they communicate only over the HTTP API specified in `03_BACKEND.md` §5), so a shared-types package would be premature structure for a two-service product at this size.

## 2. Local Development Setup

Prerequisites: Python 3.11+, Node 20+, Docker (for local Postgres/Redis via `docker-compose.yml`), a Supabase project (free tier sufficient per `03_BACKEND.md` §12), and API keys for the external services listed in `03_BACKEND.md` §11 — free-tier registration is sufficient for local development against every one of them.

```bash
# 1. Clone and install
git clone <repo-url> qelvix && cd qelvix

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env          # fill in per §3 below
alembic upgrade head              # apply migrations
docker compose up -d postgres redis   # if not using hosted Supabase/Upstash locally
uvicorn app.main:create_app --factory --reload --port 8000

# 3. Celery worker (separate terminal, same venv)
celery -A celery_worker.celery_app worker --loglevel=info

# 4. Frontend (separate terminal)
cd ../frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Frontend at `http://localhost:3000`, API at `http://localhost:8000` (OpenAPI docs auto-generated at `/docs` per FastAPI default, per `03_BACKEND.md` §1). A scan triggered locally runs the real pipeline against real external APIs (Shodan, SSL Labs, etc.) unless those calls are mocked — see §9's agent-development workflow for the recommended local pattern that avoids burning free-tier quota on every reload.

## 3. Environment Configuration

Backend variables are the full list in `03_BACKEND.md` §11, loaded via `pydantic-settings` (`config.py`) — never read from `os.environ` directly outside that module. Frontend needs its own `.env.local`:

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Only `NEXT_PUBLIC_*`-prefixed variables are ever added to the frontend env file — this prefix is what Next.js exposes to the browser bundle, so anything without it silently fails to reach client code rather than leaking a secret; conversely, nothing secret (a service key, an API key with write access) is ever given this prefix. `ENVIRONMENT` (backend) and `NEXT_PUBLIC_API_URL` (frontend) are the two variables that change per deploy target (local/staging/production); every other variable is environment-specific by value, not by name, across all three.

## 4. Folder Architecture — Ownership Summary

Full detail in `02_FRONTEND.md` §2 and `03_BACKEND.md` §2; the table below exists so a new engineer knows which document to open before touching a given folder, without re-deriving it from two separate trees.

| Folder | Owning document | Touch when... |
|---|---|---|
| `frontend/app/` | `02_FRONTEND.md` §3 | Adding/changing a screen or route |
| `frontend/components/` | `02_FRONTEND.md` §6, `05_DESIGN_SYSTEM.md` §4 | Building or modifying a UI component |
| `frontend/lib/queries/` | `02_FRONTEND.md` §5 | Adding a new data-fetching hook |
| `backend/app/routers/` | `03_BACKEND.md` §5 | Adding/changing an endpoint |
| `backend/app/models/` | `03_BACKEND.md` §4 | Schema changes (always via Alembic, never hand-edited) |
| `backend/app/agents/` | `04_AGENT_PIPELINE.md` §5–6 | Adding/changing a pipeline node |
| `backend/app/rules/` | `04_AGENT_PIPELINE.md` §5–6 | Adding/changing a deterministic rule |
| `backend/app/services/` | `03_BACKEND.md` §8–9 | Adding/changing an external integration |
| `playbooks/` | `04_AGENT_PIPELINE.md` §9 | Adding/changing an IR playbook |

## 5. Coding Standards

**Backend.** Python 3.11+, type-hinted throughout (`mypy` clean, no untyped `def`). Async by default for any I/O — a synchronous DB call or HTTP request inside an `async def` route handler is a review-blocking error, since it blocks the event loop for every concurrent request. Pydantic models for all request/response shapes, never a bare dict returned from a router. Rules engine functions (`04_AGENT_PIPELINE.md` §5) are the one place synchronous, side-effect-free code is preferred over async — they're pure functions and gain nothing from async, and marking them `async` would misleadingly imply they do I/O.

**Frontend.** TypeScript strict mode, no `any` without an inline justification comment (`02_FRONTEND.md` §1). Server Components by default; a component only becomes a Client Component when `02_FRONTEND.md` §6's stated conditions are met (interactivity, browser API, a hook requiring one). ESLint (`next/core-web-vitals` + `typescript-eslint` strict) and Prettier run pre-commit and in CI (`02_FRONTEND.md` §17) — formatting is never a code-review discussion because it's not a human decision to begin with.

**Both.** No commented-out code committed. No `console.log`/`print` debugging left in a PR — use the logging strategy in §13. A TODO comment without a linked issue is treated the same as no comment at all during review; it documents nothing actionable.

## 6. Naming Conventions

Frontend conventions are the full table in `02_FRONTEND.md` §15. Backend, not previously specified:

| Item | Convention | Example |
|---|---|---|
| Python module | snake_case | `ssl_analyzer.py` |
| Python class | PascalCase | `AgentState` |
| Python function/variable | snake_case | `evaluate_ssl` |
| FastAPI router file | snake_case, matches resource | `findings.py` |
| SQLAlchemy model class | PascalCase, singular | `Finding` (table: `findings`) |
| Alembic migration | `<timestamp>_<snake_case_description>.py` | `20260315_add_members_table.py` |
| Environment variable | SCREAMING_SNAKE_CASE | `ANTHROPIC_API_KEY` |
| Celery task name | snake_case, verb-first | `run_full_scan` |

A `finding_type` string value (e.g. `ssl_expired`, `no_spf`) is always snake_case and always matches exactly between the rules engine that emits it (`04_AGENT_PIPELINE.md` §5–6) and the IR playbook `triggers[].finding_type` that consumes it (`04_AGENT_PIPELINE.md` §9) — this pairing is a string contract with no compiler to catch a typo, so it's covered by the test requirement in §12.

## 7. Git Workflow

**Branch strategy.** Trunk-based off `main`. Feature branches: `<type>/<short-description>`, where `<type>` matches the commit-convention prefix below (`feat/domain-verification-flow`, `fix/scan-partial-failure-badge`). No long-lived `develop` branch — a solo/small-team build target (per TRD's stated build context) doesn't benefit from the merge overhead of a Gitflow-style parallel branch, and `main` is kept deployable at all times via CI gating (§16), not via a staging branch.

**Commit conventions.** Conventional Commits: `<type>(<scope>): <description>`. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`. Scope matches the folder-ownership table in §4 where practical (`feat(agents): add fraud detection rules`, `fix(findings): correct regression badge state`). Body explains *why* for anything non-obvious; the diff already shows *what*.

**PR size.** One logical change per PR — a new agent node and its rules engine together (they're one unit of work per `04_AGENT_PIPELINE.md` §5's pattern), not bundled with an unrelated frontend change. A PR that touches both `backend/` and `frontend/` is acceptable only when the change is a single API contract change requiring both sides to move together (e.g. adding a field to `GET /findings/{id}` and the component that reads it).

**Merge strategy.** Squash-merge to `main`, so `main`'s history is one commit per shipped change, matching the PR-scoping rule above.

## 8. API Development Workflow

1. Confirm the endpoint is in `03_BACKEND.md` §5's list. If it isn't, that's a documentation gap to raise before writing code — an undocumented endpoint means `02_FRONTEND.md`'s data-fetching layer has nothing to point at and no other engineer can discover it exists.
2. Define/extend the Pydantic request/response models colocated in the router file (`03_BACKEND.md` §3).
3. Implement against the schema in `03_BACKEND.md` §4 — a new field requires an Alembic migration first, the endpoint second, never the reverse (a migration-less schema change is undoable in review).
4. Apply `get_current_org` and, where the endpoint is role-gated, `require_role(...)` per `03_BACKEND.md` §3 — every authenticated route uses both dependencies; a route missing `get_current_org` is a tenant-isolation bug, not a style nit.
5. Write the endpoint's test (§10) before or alongside the implementation, not after — this is the one place in the workflow where "after" is explicitly discouraged, since API contract bugs caught post-merge are the most expensive class of bug in this codebase (frontend, agents, and notifications all depend on the contract holding).
6. Update the OpenAPI-derived docs are automatic (FastAPI); no manual API reference to maintain separately.

## 9. Frontend Workflow

1. Locate the screen's spec in `01_PRODUCT_BLUEPRINT.md` (Tier 1 screens have full field-by-field detail; Tier 2/3 have the working spec). Do not start building from a Figma-less assumption — the wireframe hierarchy, states, and edge cases are already decided.
2. Build against `05_DESIGN_SYSTEM.md`'s component inventory first — check §4 for an existing component before creating a new one. A new component is justified only when no existing one, even with a new variant, covers the need.
3. Server Component for the page shell and initial data (`02_FRONTEND.md` §6); Client Component only for the interactive slice.
4. Data fetching via a `lib/queries/` hook (`02_FRONTEND.md` §5), never a raw `fetch` inside a feature component.
5. Every state specified in `01_PRODUCT_BLUEPRINT.md`'s per-screen table (loading, error, empty, success) is implemented before the PR is opened — a screen with only the happy path is not done, per the Definition of Done in §20.
6. Run `axe-core` locally (or rely on CI, §16) before requesting review.

## 10. Backend Workflow

1. Schema change → Alembic migration (`alembic revision --autogenerate -m "<description>"`, then hand-verify the generated migration — autogenerate misses constraint changes and data backfills).
2. New endpoint → §8 above.
3. New service integration (`03_BACKEND.md` §8) → one module under `services/`, returning a plain dict, no provider-specific type leaking past the module boundary — this is what keeps rules engines pure functions per `04_AGENT_PIPELINE.md` §5.
4. Every rules-engine function ships with unit tests covering each branch (every severity threshold in `04_AGENT_PIPELINE.md` §6's tables gets at least one test case) — this is cheap to do given the pure-function shape and is the highest-leverage test category in the codebase, since a wrong severity threshold is a silent product-correctness bug, not a crash.

## 11. Agent Development Workflow

Specific to the pattern in `04_AGENT_PIPELINE.md` §5, since an agent node has a stricter shape than a general backend function:

1. Write the rules function first, in isolation, with unit tests — it has no dependency on LangGraph, the service layer, or a live scan, so it's the fastest thing to get correct.
2. Write the service-layer fetch function (`03_BACKEND.md` §8) second, mocked in tests against a fixture response shaped like the real API's output — never hitting the real external API in CI (rate limits, cost, and flakiness all argue against it).
3. Write the agent node last, wiring fetch → rules → `Finding` construction, with the try/except-per-item pattern from `04_AGENT_PIPELINE.md` §5 — a new agent that raises instead of appending to `state["errors"]` breaks the partial-failure contract for the entire pipeline, not just that agent.
4. Register the node in `pipeline.py`'s DAG (`04_AGENT_PIPELINE.md` §3) — confirm the edge placement matches the agent's phase (Discovery/Analysis/Aggregation/Action); a Phase 2 agent wired directly into Phase 4 skips the `analysis_join` merge and silently drops other parallel agents' findings from the aggregate.
5. If the agent introduces a new `finding_type`, add or update the matching IR playbook (`04_AGENT_PIPELINE.md` §9) in the same PR — an orphaned `finding_type` with no playbook means Recovery Recommendation falls back to unguided Claude generation for that finding, a silent quality regression easy to miss without the naming-convention test in §6.
6. Never add a Claude call anywhere in this workflow except by extending one of the four functions in `claude_service.py` (`03_BACKEND.md` §9, `04_AGENT_PIPELINE.md` §7) — a new agent that calls the Anthropic client directly breaks the Rules-before-LLM enforcement boundary and is a design-review blocker, not a style preference.

## 12. Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Rules engines | pytest | Every severity branch per `04_AGENT_PIPELINE.md` §6's tables — the highest-priority test category, per §10 above |
| Agent nodes | pytest, mocked services | Try/except-per-item behavior; a service raising doesn't propagate past the node |
| API endpoints | pytest + `httpx.AsyncClient` | Auth/role gating (every endpoint tested both as an authorized and an unauthorized role), request validation, response shape |
| Frontend components/hooks | Vitest + React Testing Library | Per `02_FRONTEND.md` §16 |
| E2E | Playwright | Signup → first scan, domain verification (both methods), finding status transitions, WhatsApp consent capture — the exact flow list in `02_FRONTEND.md` §16 |
| Accessibility | `axe-core` in CI | Every route, per `02_FRONTEND.md` §12 |

**Coverage expectation.** Rules engines and API endpoint auth/role gating: effectively 100% branch coverage — these are the two categories where a silent gap is a product-correctness or tenant-isolation bug, not a missed edge case. Everything else: meaningful coverage of stated behavior over a numeric target; a coverage percentage gamed with trivial assertions is worse than an honest gap, since it hides where the real risk is.

**Fixture data.** External-service fixture responses (Shodan, SSL Labs, VirusTotal, etc.) live alongside the service module they mock, versioned in the repo — not regenerated live against the real API on each test run.

## 13. Logging Strategy

Extends `03_BACKEND.md` §10's structured JSON logging. Log levels used consistently:

| Level | Usage |
|---|---|
| `DEBUG` | Local development only; disabled by default in staging/production |
| `INFO` | Request lifecycle (route, status, latency, `org_id`), scan lifecycle transitions, notification send attempts |
| `WARNING` | Agent-level errors appended to `state["errors"]` (per-agent failure, pipeline continues), partial scan completion |
| `ERROR` | Application bugs — a 500, an unhandled exception, a Celery task that failed outside the pipeline's own try/except |
| `CRITICAL` | Reserved for conditions requiring immediate human attention (e.g. the Anthropic API key is invalid and every Claude call in the pipeline is failing) |

Every log line includes `org_id` where the context has one, so a support investigation ("why didn't org X's WhatsApp alert send") is a log-grep away rather than a code-reading exercise. Claude prompts/responses are never logged in full at `INFO` level (cost and PII exposure) — only that a call was made, its duration, and whether it succeeded; full request/response logging is a `DEBUG`-only, opt-in local setting.

## 14. Error Handling

Backend contract (error envelope, validation-error shape, agent-vs-application-bug distinction) is fully specified in `03_BACKEND.md` §10 — this section covers what's additionally expected of an engineer, not a new contract.

- A new endpoint that can fail in a way not covered by the standard 401/403/404/422/500 set documents the new status code and its envelope shape in the endpoint's own docstring (FastAPI surfaces this in `/docs` automatically).
- A new external-service integration (§8's service-layer step) always distinguishes a timeout/rate-limit (retryable, logged at `WARNING`, appended to `state["errors"]`) from an auth failure (not retryable, logged at `ERROR`, since a bad API key won't fix itself on retry and burying it as a per-agent warning would hide a systemic problem behind what looks like routine partial-failure noise).
- Frontend: every new query/mutation hook (`02_FRONTEND.md` §5) has an explicit error path rendered via the Error State component (`05_DESIGN_SYSTEM.md` §4.22) — a hook with no error handling silently shows stale or blank data on failure, which is worse than a visible error.

## 15. Feature Flags & Configuration Management

No dedicated feature-flag service at current scope (LaunchDarkly-class tooling is unjustified overhead for the team size implied by TRD's build target). Phase gating instead uses two existing mechanisms, deliberately not a third:

- **Plan-gated features** (scan frequency, DPDP reporting, PDF export) are gated by `organizations.plan` (`03_BACKEND.md` §4.1), checked at the API layer — the correct location, since a plan check is a business rule the frontend must never be trusted to enforce alone (a user could otherwise call the API directly and bypass a client-side gate).
- **Phase-gated features** (Phase 2/3 screens and agents not yet built) are gated by simply not existing in the codebase yet, per the phase columns in `01_PRODUCT_BLUEPRINT.md` §3 and the build order in `04_AGENT_PIPELINE.md` §12 — there's no flag to flip because there's no code behind it until that phase's PRs land.

If a genuine need for runtime-togglable flags emerges (e.g. a gradual rollout of a risky agent change), a simple `organizations.settings` JSONB key (`03_BACKEND.md` §4.1's existing catch-all) is the first thing to reach for before introducing a new system, consistent with that field's existing role for scan-schedule and consent-lifecycle data.

Configuration values that differ by environment (not by org) live exclusively in the environment variables specified in `03_BACKEND.md` §11 and §3 above — never hardcoded, never duplicated into a second config file that could drift from the canonical `.env`.

## 16. Deployment Workflow & CI/CD Expectations

Infrastructure targets are specified in `03_BACKEND.md` §12 (Railway/AWS ECS for backend, Vercel implied for frontend per `02_FRONTEND.md`). Deployment is git-triggered, not manual:

- **Frontend:** Vercel's native GitHub integration — every PR gets a preview deployment, `main` deploys to production on merge.
- **Backend:** GitHub Actions builds the Docker image (`03_BACKEND.md` §2's `Dockerfile`) and deploys to Railway (MVP) / ECS Fargate (scale) on merge to `main`, after the migration step below.
- **Migrations:** Alembic migrations run as a distinct CI/CD step before the new backend image receives traffic — a migration failure blocks the deploy rather than shipping code against a schema it doesn't match.

**CI gate (required to pass before merge, not just before deploy):**

1. Lint + type-check (both `backend/` and `frontend/`).
2. Unit tests (§12) — rules engines and endpoint auth tests are blocking; a failure here cannot be merged with an override.
3. `axe-core` accessibility pass on every route.
4. Playwright E2E suite on the flows listed in §12.
5. Performance budget check (Lighthouse CI or equivalent) against the thresholds in §17 on Landing Page and Dashboard specifically, per `02_FRONTEND.md` §14.

A red CI run is never merged past with "I'll fix it in a follow-up" — the follow-up PR is the fix, opened before the original merges, not after.

## 17. Performance Guidelines

Frontend targets (LCP < 2.5s, INP < 200ms, CLS < 0.1 on Landing Page and Dashboard) are set in `02_FRONTEND.md` §14 and enforced in CI per §16 above. Backend-specific guidance not previously stated:

- Every list endpoint (`03_BACKEND.md` §5.1) is paginated by default — an unpaginated `GET /findings` for an org with thousands of findings is both a performance and a memory-pressure problem, not just a slow response.
- N+1 query patterns are caught in review by checking that any endpoint returning joined display data (e.g. Finding Detail's asset context, per `03_BACKEND.md` §5.1) uses an explicit `joinedload`/`selectinload`, not a lazy-loaded relationship accessed inside a loop.
- Claude calls are the single most expensive operation per request in this system; the caching strategy in `04_AGENT_PIPELINE.md` §7.1 is not optional to implement when adding a new Claude-backed feature — a new explanation-generating endpoint without cache-key consideration is a cost regression, evaluated as such in review.
- Celery task duration is monitored per-agent (`03_BACKEND.md` §10); an agent whose typical duration regresses significantly after a change is flagged before merge, not discovered after a scan-timeout complaint.

## 18. Security Best Practices

Full policy detail (RLS, consent lifecycle, rate limiting, DPDP erasure) is `07_SECURITY_COMPLIANCE.md`'s scope. Engineering-workflow-level practices that apply regardless of that document's specifics:

- No secret, API key, or credential is ever committed — `.env` is gitignored from the repository's first commit, and a pre-commit hook (`detect-secrets` or equivalent) blocks accidental inclusion.
- Every new tenant-scoped table gets RLS enabled in the same migration that creates it (`03_BACKEND.md` §4.1's pattern) — never added retroactively as a follow-up.
- Every new authenticated endpoint uses `get_current_org`, never accepts `org_id` as a client-supplied parameter for tenant-scoped data (`03_BACKEND.md` §5.1) — this is the single most important rule in the codebase for preventing cross-tenant data access, and is checked explicitly in code review (§19).
- Dependencies (`requirements.txt`, `package.json`) are kept current against security advisories via Dependabot or equivalent, reviewed on a regular cadence rather than only when a CVE alert fires.
- Webhook endpoints (`POST /webhooks/whatsapp`, `03_BACKEND.md` §7.1) validate the provider's signature before processing — an unauthenticated route is not the same as an unvalidated one.

## 19. Code Review Checklist

- [ ] Change matches the relevant spec in `01`–`05` — a deviation is either a bug in the PR or a documented Design Decision in the owning document, never a silent divergence.
- [ ] New/changed endpoint: `get_current_org` and role gating present and correct (§18).
- [ ] Schema change: Alembic migration included, RLS enabled if a new tenant-scoped table.
- [ ] New agent/rule: unit tests cover every severity branch; `finding_type` matches an existing or newly-added IR playbook trigger (§11).
- [ ] New Claude call: goes through `claude_service.py` only, not a new direct client instantiation (§11, `03_BACKEND.md` §9).
- [ ] New UI: every state from the screen's `01_PRODUCT_BLUEPRINT.md` spec implemented; components sourced from `05_DESIGN_SYSTEM.md` §4 before a new one is introduced.
- [ ] No secrets, no `console.log`/`print` debugging, no commented-out code.
- [ ] Tests included and passing; CI green (§16).
- [ ] Accessibility: `axe-core` clean, keyboard-operable, no color-only signal (`05_DESIGN_SYSTEM.md` §8).

## 20. Definition of Done

A change is done when: it matches its owning spec document, ships with the test coverage its category requires (§12), passes the full CI gate (§16), has no unhandled state for a UI change or unhandled failure mode for a backend change, and has been reviewed against the checklist in §19 by someone other than its author. "Works on my machine" is not done. "Works for the happy path" is not done for anything in the screen inventory's Tier 1/2 set, per `01_PRODUCT_BLUEPRINT.md`'s per-screen state tables.

## 21. Common Pitfalls

- **Calling Claude outside `claude_service.py`.** Breaks Rules-before-LLM structurally, not just stylistically (`03_BACKEND.md` §9). Caught in review, but cheaper to avoid than to unwind.
- **Forgetting RLS on a new table.** Silent until a cross-tenant data leak is discovered, often much later. Always add it in the same migration.
- **Treating `status: completed` as "no errors."** A scan can be `completed` with a non-empty `error_log` (`03_BACKEND.md` §6.2, `04_AGENT_PIPELINE.md` §11) — any new code reading scan status must check both fields, not just status.
- **Adding a `finding_type` without a matching playbook.** Silently degrades remediation quality for that finding type; not caught by any type system, only by the workflow discipline in §11.
- **Building a new UI pattern instead of reusing `05_DESIGN_SYSTEM.md`'s inventory.** A second differently-shaped `FindingCard` is a bug per `02_FRONTEND.md` §6, not a valid design choice.
- **Hardcoding a org-specific value that should be `organizations.settings`.** Anything configurable per-org (notification prefs, scan schedule, consent) belongs in that JSONB field, not a new column added ad hoc for one feature.
- **Skipping the local-fixture pattern for external services in tests.** Hitting Shodan/VirusTotal/etc. live in CI burns free-tier quota shared across all developers and makes tests flaky against network conditions unrelated to the code being tested.

## 22. Troubleshooting Guide

| Symptom | Likely cause | Where to look |
|---|---|---|
| Scan stuck in `running` indefinitely | Celery worker not running, or a task raised outside an agent's own try/except and the pipeline never reached `notification` | Celery worker logs; confirm `run_full_scan` task completed or check for an unhandled exception outside the per-agent pattern (`04_AGENT_PIPELINE.md` §5, §11) |
| Frontend shows stale data after a mutation | Missing query invalidation | `02_FRONTEND.md` §5's mutation pattern — confirm the relevant list query key is invalidated on success |
| 403 on an endpoint that should be accessible | Role/permission mismatch, or `members` row missing for the user | `03_BACKEND.md` §3's `require_role` dependency and §4.2's `members` table; confirm the user has a `members` row for the org they're calling as |
| A finding has no `plain_explanation` | Claude call failed or is pending, which is expected to degrade gracefully | `01_PRODUCT_BLUEPRINT.md` §9's stated edge case — raw evidence and remediation should still render; if they don't, that's the actual bug, not the missing explanation |
| WhatsApp message never arrives in local/staging testing | Consent flag not set, or Meta template not yet approved for the environment's WhatsApp Business Account | `03_BACKEND.md` §4.2 (consent storage), §17 Pre-Launch Checklist context in the TRD for template approval status |
| RLS blocks a query that should succeed | Service-role bypass not used where the caller is a trusted backend process (e.g. Celery), or the policy predicate doesn't match the calling context | `07_SECURITY_COMPLIANCE.md`'s RLS policy definitions |
| A new agent's findings never appear in `all_findings` | DAG edge wiring skips the `analysis_join` merge node | `04_AGENT_PIPELINE.md` §3 — confirm the new node's edges match its phase |
| CI accessibility check fails on a new component | Missing `aria-label`, color-only status signal, or a non-keyboard-operable interaction | `05_DESIGN_SYSTEM.md` §8 and the component's own Accessibility subsection in §4 |

---

Owner: Qelvix Engineering Team
