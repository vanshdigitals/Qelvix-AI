# 11: Task Breakdown

The task card is the atomic unit of this build: **one card, one focused AI implementation session, one reviewable diff.** This document defines the card format, provides fully-expanded cards for the sprints that establish the codebase's reference patterns, and indexes every remaining task with enough detail to expand on demand.

Cards are executed via the loop in `08` §19 and prompted using the template in `12` §5.

---

## 1. The Task Card Format

Every card carries these fields. A card missing any of them is not run until it is completed — a thin card produces a thin diff, and the cost of fixing it after generation is an order of magnitude higher than the cost of writing one more line of the card.

| Field | Purpose |
|---|---|
| **ID** | `T-<sprint>-<nn>`. Immutable. Referenced in commits, the Ledger, and ADRs |
| **Title** | What this produces, in under ten words |
| **Model** | `Flash High`, `Pro`, or `Flash High → Pro on escalation` (`12` §3) |
| **Purpose** | Why this exists and what breaks without it. One or two sentences, not restated from the title |
| **Input documents** | Frozen documents and sections that are the authority for this task |
| **Required context** | Context Packs (`08` §9.2) plus any additional named sections |
| **Invariants in force** | 4–8 IDs from `08` §8. Not all thirty — the relevant ones, so they stay operative |
| **Reference implementation** | An existing file whose shape this task copies. `—` only when the task is establishing a pattern |
| **Files to create** | Exact paths |
| **Files to modify** | Exact paths. Anything not listed is off limits |
| **Must not touch** | Explicit where a model would plausibly wander |
| **Expected output** | What exists when this is done, concretely |
| **Acceptance criteria** | Checkable statements. Every one must be objectively true or false |
| **Definition of Done** | Task DoD (`08` §14.1) plus card-specific additions |
| **Dependencies** | Task IDs that must be merged first |
| **Verification steps** | Exact commands, plus any manual check |
| **Scope** | `XS` ≤80 LOC · `S` 80–200 · `M` 200–400 · `L` 400–700. Above `L`, split |

### Scope discipline

`L` is the ceiling for a single card, and an `L` card should be rare. The size rule is not about lines — it is about **how much of the diff a reviewer can hold in their head at once**. A 700-line card that is nine near-identical CRUD handlers is fine. A 300-line card that touches four architectural layers is not, and should have been three cards.

### The must-not-touch field

This field exists because of a specific, repeated behaviour: a model asked to add an endpoint will helpfully "fix" an unrelated file it read along the way. The fix is often correct and always unwanted — it makes the diff unreviewable and couples the change to something nobody asked for. Listing the files that are off limits costs one line and eliminates the behaviour.

---

## 2. How to Expand an Indexed Task

Sprints S01–S03, S07, S09, S11, plus one representative frontend card, are expanded in full below. They cover every card shape in the project: toolchain, schema, dependency, router, rules engine, service client, LLM boundary, agent node, DAG, and screen. Every other task in the project is a variation on one of them.

Everything else is indexed in §10 with the fields that cannot be derived. Expand an indexed row into a full card at the start of its sprint — not earlier, because a card written three weeks ahead is written against a codebase that no longer exists.

Expansion is itself an AI task. Use a Gemini 3.1 Pro session with this prompt:

```
Expand the indexed task below into a full task card using the format in
11_TASK_BREAKDOWN.md §1.

Indexed row:
<paste row>

Authority documents: <the frozen sections named in the row>
Reference card: <the closest fully-expanded card from §3-§9>
Current repository state: <output of `tree -L 3 backend/app frontend/app frontend/components`>
Ledger entries for this area: <relevant docs/impl/LEDGER.md entries>

Rules:
- Every acceptance criterion must be objectively checkable.
- File paths must match the existing repository structure exactly.
- Invariants must be cited by ID from docs/impl/INVARIANTS.md.
- Verification steps must be runnable commands.
- If the indexed row is too large for one session, output TWO cards instead of one.
- Do not invent requirements not present in the authority documents. If the
  documents are silent on something the card needs, emit a BLOCKER instead.
```

Review the expanded card against `12` §11 before running it. A bad card produces a bad diff, and the card is cheaper to fix.

---

## 3. Sprint S01 — Repository, Toolchain & DevOS Bootstrap

### T-S01-01 · Monorepo skeleton and workspace configuration
- **Model** Flash High
- **Purpose** Establish the exact directory structure every later task writes into. Without this, each session invents its own file locations and the repository has no discoverable shape.
- **Input documents** `06` §1, §4; `03` §2; `02` §2
- **Required context** `CTX-CORE` + the three structure blocks above, verbatim
- **Invariants** INV-29
- **Reference implementation** —
- **Files to create** Full tree per `03` §2, `02` §2, `06` §1, with `.gitkeep` in empty directories; `.gitignore`; `README.md` at root pointing to `docs/`
- **Files to modify** —
- **Must not touch** `docs/` frozen files
- **Expected output** A directory tree matching the three specifications exactly, with no invented folders and none omitted.
- **Acceptance criteria**
  - Every path in `03` §2's tree exists
  - Every path in `02` §2's tree exists
  - No directory exists that is absent from all three specs
  - `.gitignore` covers `.env`, `.venv`, `node_modules`, `__pycache__`, `.next`, `dist`, `.pytest_cache`
- **DoD** Task DoD + `tree` output diffed against the specs and attached to the PR
- **Dependencies** —
- **Verification** `tree -a -L 4 -I '.git|node_modules'` compared line by line against the three specs
- **Scope** S

### T-S01-02 · Backend toolchain: dependencies, ruff, mypy strict, pytest
- **Model** Flash High
- **Purpose** Strict typing and linting from the first commit. Retrofitting strictness later means a mass refactor across every file already written (`09` F0 risk 1).
- **Input documents** `03` §1, §11; `06` §5, §12
- **Required context** `CTX-CORE` + the above
- **Invariants** INV-10, INV-14
- **Reference implementation** —
- **Files to create** `backend/requirements.txt`, `backend/requirements-dev.txt`, `backend/pyproject.toml` (ruff + mypy strict + pytest config with `unit`/`tenancy`/`contract` markers), `backend/tests/conftest.py`, `backend/app/main.py` (`create_app()` factory per `03` §3), `backend/app/config.py` stub
- **Files to modify** —
- **Must not touch** `frontend/`
- **Expected output** `uvicorn app.main:create_app --factory` boots. `mypy` runs strict and rejects an untyped `def`. `pytest` collects with markers registered.
- **Acceptance criteria**
  - `mypy` config sets `strict = true` and `disallow_untyped_defs = true`
  - A deliberately untyped function fails `mypy`
  - `main.py` exposes a factory, not a module-level `app` (`03` §3)
  - Pytest markers `unit`, `tenancy`, `contract` registered; unknown markers error
  - `requirements.txt` pins every package in `03` §1
- **DoD** Task DoD + the deliberate failure demonstrated in the PR description
- **Dependencies** T-S01-01
- **Verification** `cd backend && mypy app && pytest --collect-only && uvicorn app.main:create_app --factory --port 8000`
- **Scope** S

### T-S01-03 · Frontend toolchain: Next.js 14, TS strict, Tailwind, shadcn, ESLint
- **Model** Flash High
- **Purpose** Same rationale as T-S01-02 for the frontend. TS strict and `typescript-eslint` strict from commit one.
- **Input documents** `02` §1, §17; `06` §5
- **Required context** `CTX-CORE` + the above
- **Invariants** INV-26
- **Files to create** `frontend/package.json`, `tsconfig.json` (strict), `next.config.mjs`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.json` (`next/core-web-vitals` + `typescript-eslint` strict), `.prettierrc`, `components.json` (shadcn), `app/layout.tsx`, `app/page.tsx` placeholder
- **Must not touch** `backend/`
- **Expected output** `npm run dev` serves. `tsc --noEmit` rejects an implicit `any`. ESLint rejects an unjustified `any`.
- **Acceptance criteria**
  - `strict: true` and `noUncheckedIndexedAccess: true` in `tsconfig.json`
  - Absolute imports via `@/` configured (`02` §17)
  - A deliberate implicit `any` fails `tsc`
  - shadcn initialised with the `components/ui/` path from `02` §2
  - Tailwind content paths cover `app/`, `components/`, `lib/`
- **DoD** Task DoD + deliberate failure demonstrated
- **Dependencies** T-S01-01
- **Verification** `cd frontend && npm i && npx tsc --noEmit && npm run lint && npm run dev`
- **Scope** S

### T-S01-04 · Local environment: docker-compose, .env.example, Makefile
- **Model** Flash High
- **Purpose** One command brings the full stack up, so no session begins with environment archaeology.
- **Input documents** `README` Quick Start; `06` §2, §3; `03` §11
- **Required context** `CTX-CORE` + the above
- **Invariants** INV-29
- **Files to create** `docker-compose.yml` (postgres 15, redis 7), `.env.example` (every variable in `03` §11, no real values), `frontend/.env.local.example`, `Makefile` (`dev`, `verify`, `verify-full`, `contract`, `migrate`, `test`, `seed`)
- **Expected output** `make dev` brings up Postgres, Redis, backend, and frontend after `.env` is filled.
- **Acceptance criteria**
  - Every variable in `03` §11 appears in `.env.example`
  - No real credential in any committed file
  - `make verify` completes in under 90 seconds on an empty codebase
  - Postgres 15 and Redis 7 specifically, matching `03` §1
- **DoD** Task DoD + a clean-clone bootstrap performed and timed
- **Dependencies** T-S01-02, T-S01-03
- **Verification** Fresh clone → fill `.env` → `make dev` → all four services respond
- **Scope** S

### T-S01-05 · Contract tooling: OpenAPI export, type generation, snapshot diff
- **Model** Pro
- **Purpose** Gate G6 — the mechanism that makes frontend/backend drift structurally impossible (`08` §6.1). Built now, against a placeholder endpoint, because retrofitting it means rewriting every hook already written.
- **Input documents** `08` §6.1; `03` §5.1
- **Required context** `CTX-CORE` + `08` §6.1 verbatim
- **Invariants** INV-19
- **Reference implementation** —
- **Files to create** `scripts/export_openapi.py`, `scripts/generate_types.sh`, `docs/contracts/openapi.json`, `frontend/lib/api/types.generated.ts`, `frontend/lib/api/README.md` (one paragraph: this directory is generated, do not hand-edit)
- **Files to modify** `Makefile` (add `contract`), `backend/app/main.py` (placeholder `GET /health`)
- **Expected output** `make contract` exports the OpenAPI schema and regenerates TS types. A hand-edit to either file fails CI.
- **Acceptance criteria**
  - `make contract` is idempotent — running twice produces no diff
  - Generated types carry a "do not edit" header
  - A manual edit to `openapi.json` fails the contract check
  - Adding a field to a Pydantic model and re-running produces a corresponding TS change
  - The check runs offline, with no server required
- **DoD** Task DoD + adversarial review (`12` §11.2)
- **Dependencies** T-S01-02, T-S01-03
- **Verification** `make contract && git diff --exit-code` then hand-edit and confirm failure
- **Scope** M

### T-S01-06 · CI pipeline with gates G1–G7
- **Model** Pro
- **Purpose** Make the quality gates in `08` §12.1 mechanical. Gates that exist only as a documented intention are not gates.
- **Input documents** `06` §16; `08` §12.1; `07` §26, §28
- **Required context** `CTX-CORE` + the above
- **Invariants** INV-29
- **Files to create** `.github/workflows/ci.yml`, `.pre-commit-config.yaml`, `.secrets.baseline`, `scripts/check_agents_md_length.sh`
- **Files to modify** `Makefile` (`verify`, `verify-full`)
- **Expected output** Seven gates, each independently blocking, each demonstrated failing.
- **Acceptance criteria**
  - G1 lint + type-check both stacks; G2 unit tests; G3 `axe-core`; G4 Playwright; G5 Lighthouse budget; G6 contract snapshot; G7 secret scan + dependency audit
  - Each gate fails independently when given a deliberate violation — all seven demonstrated
  - No gate is skippable via a commit message or label
  - `AGENTS.md` line-count check present (`09` F0 risk 3)
  - `make verify` runs G1+G2+G6+G7 locally
- **DoD** Task DoD + all seven deliberate failures recorded in the PR
- **Dependencies** T-S01-02, T-S01-03, T-S01-05
- **Verification** Seven trial PRs, or one PR with seven sequential deliberate violations
- **Scope** M

### T-S01-07 · DevOS control files
- **Model** Pro
- **Purpose** Make the AI DevOS load automatically in every Antigravity session rather than depending on someone remembering to paste it.
- **Input documents** `08` §8, §9, §16.3, §17
- **Required context** `08` §8 (all thirty invariants verbatim), §9.2, §17
- **Invariants** —
- **Files to create** `AGENTS.md` (under 150 lines), `docs/impl/INVARIANTS.md`, `docs/impl/CONTEXT_PACKS.md`, `docs/impl/LEDGER.md`, `docs/impl/SESSION_LOG.md`, `docs/impl/AMENDMENTS.md`, `docs/impl/BLOCKERS.md`, `docs/impl/DECISIONS/.gitkeep`
- **Must not touch** `docs/README.md`, `docs/01`–`docs/07`
- **Expected output** Antigravity loads `AGENTS.md` in every session; the invariant registry is machine-readable and greppable by ID.
- **Acceptance criteria**
  - `AGENTS.md` under 150 lines and contains exactly the six items in `08` §17
  - `INVARIANTS.md` contains INV-01..INV-30, each with its ID, one-line text, and source reference
  - `CONTEXT_PACKS.md` defines all eleven packs from `08` §9.2
  - `LEDGER.md` includes the entry template from `08` §16.3
  - Frozen documents byte-identical to their uploaded versions
- **DoD** Task DoD + a trial Antigravity session confirms `AGENTS.md` loads
- **Dependencies** T-S01-01
- **Verification** `wc -l AGENTS.md` under 150; `grep -c "^| \*\*INV-" docs/impl/INVARIANTS.md` equals 30; `git diff --stat` shows no change to frozen docs
- **Scope** M

### T-S01-08 · Test harness placeholders and gate proof
- **Model** Flash High
- **Purpose** Prove every gate runs against real (if trivial) test files, so the first product task inherits a working harness rather than debugging one.
- **Input documents** `06` §12; `02` §16
- **Required context** `CTX-CORE`, `CTX-TEST`
- **Invariants** INV-28
- **Files to create** `backend/tests/test_health.py`, `frontend/tests/components/placeholder.test.tsx`, `frontend/tests/e2e/smoke.spec.ts`, `frontend/tests/e2e/a11y.spec.ts`, `lighthouserc.json`
- **Files to modify** `.github/workflows/ci.yml` if wiring is needed
- **Expected output** `make verify-full` green with real tests in every category.
- **Acceptance criteria**
  - One passing test per category: pytest, Vitest, Playwright, axe, Lighthouse
  - `axe-core` runs against a real rendered route
  - Lighthouse thresholds match `02` §14 (LCP 2.5s, INP 200ms, CLS 0.1)
  - No test reaches the network
- **DoD** Task DoD
- **Dependencies** T-S01-06
- **Verification** `make verify-full`
- **Scope** S

---

## 4. Sprint S02 — Schema, Migrations, RLS & Tenancy

### T-S02-01 · SQLAlchemy models for all seven tables
- **Model** Flash High
- **Purpose** The ORM layer that `04` and `07` both build against. Built complete in one task so conventions cannot diverge across incremental additions.
- **Input documents** `03` §4.1 (verbatim), §4.2; `06` §6
- **Required context** `CTX-CORE`, `CTX-DB`
- **Invariants** INV-14, INV-15
- **Reference implementation** —
- **Files to create** `backend/app/models/__init__.py`, `organization.py`, `member.py`, `asset.py`, `scan.py`, `finding.py`, `compliance.py`, `notification.py`
- **Must not touch** `backend/app/routers/`, `backend/app/agents/`
- **Expected output** Async SQLAlchemy 2.0 models matching `03` §4.1 exactly, plus `members` and the two `findings` extensions from §4.2.
- **Acceptance criteria**
  - Every column, type, default, nullability, and `UNIQUE` constraint matches `03` §4.1
  - `findings.previous_status` and `findings.false_positive_reason` present and nullable
  - `members` has `UNIQUE(org_id, user_id)` and defaults `role` to `owner`
  - `ON DELETE CASCADE` on every `org_id` foreign key, per the spec
  - Class names PascalCase singular; table names plural (`06` §6)
  - JSONB used for `settings`, `metadata`, `findings_summary`, `langgraph_state`, `raw_data`, `clauses`, `meta`
  - No column added beyond `03` §4
- **DoD** Task DoD + column-by-column diff against `03` §4.1 attached
- **Dependencies** T-S01-02
- **Verification** `mypy app/models` clean; manual diff against `03` §4.1
- **Scope** M

### T-S02-02 · Database engine, session dependency, settings
- **Model** Flash High
- **Purpose** The single async session dependency every router will use. Establishing it once prevents each router inventing its own connection handling.
- **Input documents** `03` §3, §11; `07` §9
- **Required context** `CTX-CORE`, `CTX-DB`
- **Invariants** INV-10, INV-29
- **Files to create** `backend/app/database.py`, `backend/app/dependencies/__init__.py`
- **Files to modify** `backend/app/config.py`
- **Expected output** `get_db_session` yields one async session per request and closes on response (`03` §3). `config.py` reads only `03` §11's variables via `pydantic-settings`.
- **Acceptance criteria**
  - Session closed on response, including on exception paths
  - Two session factories: request-scoped, and a service-role factory for the Celery worker
  - No credential in code; all from settings
  - Connection pool sized and documented
  - `config.py` fails fast at startup on a missing required variable
- **DoD** Task DoD
- **Dependencies** T-S02-01
- **Verification** `pytest backend/tests/test_database.py`; confirm session closure under a raised exception
- **Scope** S

### T-S02-03 · Initial Alembic migration with RLS enabled
- **Model** Pro
- **Purpose** Create the schema with RLS enabled in the same migration, per `INV-04`. Autogenerated migrations miss constraints, so this one is hand-verified.
- **Input documents** `03` §4.1, §4.2; `06` §6, §10.1; `07` §6
- **Required context** `CTX-CORE`, `CTX-DB`
- **Invariants** INV-04, INV-05
- **Files to create** `backend/migrations/env.py`, `backend/alembic.ini`, `backend/migrations/versions/<ts>_initial_schema.py`
- **Expected output** `alembic upgrade head` creates all seven tables with `ENABLE ROW LEVEL SECURITY` on the six tenant-scoped ones plus `members`.
- **Acceptance criteria**
  - Migration hand-verified against `03` §4.1, not accepted as autogenerated (`06` §10.1)
  - Every `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` from `03` §4.1 present
  - `members` RLS enabled
  - `downgrade()` implemented and tested
  - Filename matches `06` §6's convention
  - Indexes on every foreign key and on `findings(org_id, status, severity)` for the list endpoint's filter shape
- **DoD** Task DoD + adversarial review
- **Dependencies** T-S02-01, T-S02-02
- **Verification** `alembic upgrade head && alembic downgrade base && alembic upgrade head`; `\d+` each table in psql
- **Scope** M

### T-S02-04 · RLS policies and service-role bypass
- **Model** Pro
- **Purpose** The database-layer half of the two-layer tenant isolation described in `README` and `07` §5. This is the highest-consequence task in the sprint.
- **Input documents** `07` §5, §6 (verbatim); `03` §4.1
- **Required context** `CTX-CORE`, `CTX-DB` + `07` §6 verbatim
- **Invariants** INV-03, INV-04
- **Reference implementation** —
- **Files to create** `backend/migrations/versions/<ts>_rls_policies.py`
- **Must not touch** the initial schema migration
- **Expected output** `CREATE POLICY` statements per `07` §6, with the tenant-isolation predicate and the Celery service-role bypass.
- **Acceptance criteria**
  - Every table with RLS enabled has at least one policy; no table left enabled-but-policyless (which silently denies everything)
  - The predicate matches `07` §6 exactly
  - The service-role bypass is available only to the worker credential
  - A request-scoped session cannot assume the service role — tested
  - Policies cover SELECT, INSERT, UPDATE, DELETE, not SELECT alone
- **DoD** Task DoD + adversarial review + CP-Security
- **Dependencies** T-S02-03
- **Verification** `pytest -m tenancy`; manually drop one policy and confirm the suite fails
- **Scope** M

### T-S02-05 · Tenancy test harness
- **Model** Pro
- **Purpose** Prove isolation at both layers independently. Testing only the application layer would pass with RLS entirely absent (`08` §11.3).
- **Input documents** `07` §5, §6; `06` §12; `08` §11.3
- **Required context** `CTX-CORE`, `CTX-DB`, `CTX-TEST`
- **Invariants** INV-03, INV-04
- **Files to create** `backend/tests/tenancy/__init__.py`, `test_rls_isolation.py`, `test_app_layer_isolation.py`, `backend/tests/tenancy/conftest.py`
- **Files to modify** `backend/pyproject.toml` (register the `tenancy` marker in the default run)
- **Expected output** `pytest -m tenancy` covering every tenant-scoped table, at both layers, with negative assertions.
- **Acceptance criteria**
  - Per table: Org A cannot SELECT, UPDATE, or DELETE Org B's rows
  - Negative assertions are explicit — a cross-org read returns exactly zero rows, not merely "no error"
  - RLS tested with the application filter bypassed
  - Application filter tested with RLS disabled
  - Suite fails when any single policy is dropped — demonstrated in the PR
  - Service-role session tested as permitted; request session tested as denied
- **DoD** Task DoD + adversarial review + the drop-policy demonstration recorded
- **Dependencies** T-S02-04
- **Verification** `pytest -m tenancy -v`; drop a policy, rerun, confirm failure, restore
- **Scope** M

### T-S02-06 · Two-organization seed script
- **Model** Flash High
- **Purpose** Deterministic fixture data for tenancy tests and local development.
- **Input documents** `03` §4.1; `06` §2
- **Required context** `CTX-CORE`, `CTX-DB`
- **Invariants** INV-15
- **Files to create** `backend/scripts/seed.py`
- **Files to modify** `Makefile` (`seed`)
- **Expected output** Two orgs with disjoint assets, scans, findings, and members, including one multi-member org.
- **Acceptance criteria**
  - Idempotent — running twice does not duplicate
  - Findings span all four severities and all four statuses
  - One finding has `previous_status = 'resolved'` and `status = 'open'` (the regression case for S13)
  - One scan is `completed` with a non-empty `error_log` (the partial case for S12)
  - One org has multiple members with distinct roles
  - No real domains or personal data
- **DoD** Task DoD
- **Dependencies** T-S02-05
- **Verification** `make seed && make seed && pytest -m tenancy`
- **Scope** S

### T-S02-07 · Schema conformance test
- **Model** Flash High
- **Purpose** Detect drift between the live schema and `03` §4.1 mechanically, so a later migration cannot silently diverge from the frozen spec.
- **Input documents** `03` §4.1
- **Required context** `CTX-CORE`, `CTX-DB`, `CTX-TEST`
- **Invariants** INV-05
- **Files to create** `backend/tests/test_schema_conformance.py`, `backend/tests/fixtures/expected_schema.json`
- **Expected output** A test asserting the live schema's tables, columns, types, and constraints match the expected fixture derived from `03` §4.1.
- **Acceptance criteria**
  - Fixture derived from `03` §4.1, not introspected from the live database (otherwise it asserts nothing)
  - Test fails on an added, removed, or retyped column
  - Test fails when RLS is disabled on any listed table
  - Failure message names the specific divergence
- **DoD** Task DoD
- **Dependencies** T-S02-06
- **Verification** `pytest backend/tests/test_schema_conformance.py`; add a stray column and confirm failure
- **Scope** S

---

## 5. Sprint S03 — Auth, Authorization & Shell (selected cards)

Nine cards. The three that establish patterns are expanded; the remainder are indexed in §10.

### T-S03-02 · `get_current_org` dependency
- **Model** Pro
- **Purpose** The single most important function in the codebase for preventing cross-tenant access (`06` §18). Every later authenticated endpoint depends on it, and every later task card points at it as the reference.
- **Input documents** `03` §3 (verbatim); `07` §3, §4, §7; `03` §4.2 (`members`)
- **Required context** `CTX-CORE`, `CTX-API` + `03` §3's dependency table verbatim
- **Invariants** INV-03, INV-09, INV-14
- **Reference implementation** —
- **Files to create** `backend/app/dependencies/auth.py`, `backend/tests/api/test_get_current_org.py`
- **Files to modify** —
- **Must not touch** `backend/app/models/`, `backend/app/routers/` (T-S03-04 wires it)
- **Expected output** A FastAPI dependency that validates the Supabase JWT, takes identity from `sub`, reads the active `org_id` from the custom claim, and raises 401 when the token is invalid or the claim is absent.
- **Acceptance criteria**
  - `org_id` read from the custom JWT claim, **never parsed from `sub`** (`03` §3)
  - The claim is populated only after validating membership via the `members` table
  - 401 on invalid signature, expired token, or absent claim — three separate tests
  - No code path accepts `org_id` from a query param, path param, header, or body
  - Returns a typed object, not a raw dict
  - Failure messages do not leak whether an org exists
- **DoD** Task DoD + adversarial review + CP-Security
- **Dependencies** T-S03-01 (Supabase client and JWT verification)
- **Verification** `pytest backend/tests/api/test_get_current_org.py -v`; manually attempt an `org_id` override in every request position
- **Scope** M

### T-S03-03 · `require_role` dependency and the RBAC matrix
- **Model** Pro
- **Purpose** Role enforcement at the API layer, where it cannot be bypassed by calling the API directly (`06` §15).
- **Input documents** `07` §4 (verbatim); `03` §3, §4.2
- **Required context** `CTX-CORE`, `CTX-API` + `07` §4's matrix verbatim
- **Invariants** INV-03, INV-09
- **Reference implementation** `backend/app/dependencies/auth.py`
- **Files to create** `backend/app/dependencies/roles.py`, `backend/tests/api/test_require_role.py`
- **Expected output** A parameterized dependency raising 403 when the user's role in the org is outside the allowed set.
- **Acceptance criteria**
  - Role read from the `members` row for the active org, not from a JWT claim that a client could influence
  - 403, distinguishable from 401, when authenticated but under-privileged
  - Every role in `07` §4 tested both authorised and unauthorised
  - Composable with `get_current_org`, never a replacement for it
  - A user with no `members` row for the active org gets 403, not a 500
- **DoD** Task DoD + adversarial review
- **Dependencies** T-S03-02
- **Verification** `pytest backend/tests/api/test_require_role.py -v`
- **Scope** S

### T-S03-04 · Reference router: `GET /org/me`
- **Model** Flash High
- **Purpose** The canonical endpoint shape. Every later API card names this file as its reference implementation, so its quality propagates through the whole backend.
- **Input documents** `03` §3, §5 (ORGANISATION), §5.1, §10; `06` §8
- **Required context** `CTX-CORE`, `CTX-API`
- **Invariants** INV-03, INV-09, INV-10, INV-12
- **Reference implementation** —
- **Files to create** `backend/app/routers/org.py`, `backend/tests/api/test_org_me.py`
- **Files to modify** `backend/app/main.py` (register the router)
- **Expected output** `GET /org/me` returning the current org profile, using both dependencies, with Pydantic response models colocated in the router file.
- **Acceptance criteria**
  - Pydantic request/response models colocated in the router file (`03` §3)
  - `get_current_org` applied; no hand-rolled `org_id` filter anywhere
  - Async throughout; no synchronous I/O in the handler
  - Error envelope matches `03` §10
  - Tests cover: authorised 200, unauthenticated 401, cross-org access returning Org A's data only
  - Router registered by domain, matching `routers/` one-to-one (`03` §3)
- **DoD** Task DoD + this file recorded in the Ledger as the API reference implementation
- **Dependencies** T-S03-03
- **Verification** `pytest backend/tests/api/test_org_me.py && make contract`
- **Scope** S

---

## 6. Sprint S07 — Rules Engines

### T-S07-01 · SSL/TLS rules engine
- **Model** Flash High → Pro on escalation
- **Purpose** Deterministic SSL/TLS severity decisions. This is where the product's core claim — that severity is decided by auditable rules, not model judgement — becomes real code.
- **Input documents** `04` §5 (verbatim), §6 Agent 3's table (verbatim), §1
- **Required context** `CTX-CORE`, `CTX-RULES` + Agent 3's table verbatim
- **Invariants** INV-02, INV-08, INV-10, INV-14
- **Reference implementation** `04` §5's `ssl_rules.py` example is the exact shape
- **Files to create** `backend/app/rules/__init__.py`, `backend/app/rules/ssl_rules.py`
- **Must not touch** `backend/app/services/`, `backend/app/agents/`
- **Expected output** Pure synchronous functions taking a plain dict of SSL data and returning a list of findings with `finding_type`, `severity`, `title`, and `raw_data`.
- **Acceptance criteria**
  - Every threshold in `04` §6 Agent 3's table implemented exactly
  - No import of any service module, SQLAlchemy, LangGraph, or `anthropic`
  - Synchronous, side-effect-free: no clock read, no randomness, no I/O
  - Same input always produces identical output, including list ordering
  - Every `finding_type` snake_case and documented in the module docstring
  - `raw_data` carries the evidence the rule fired on, so the decision is auditable
  - Fully type-hinted, `mypy` clean
- **DoD** Task DoD + adversarial review + emitted `finding_type` values recorded in the Ledger
- **Dependencies** T-S02-01
- **Verification** `mypy app/rules && pytest backend/tests/rules/test_ssl_rules.py`
- **Scope** S

### T-S07-02 · SSL/TLS rules tests
- **Model** Flash High
- **Purpose** Branch coverage on the highest-leverage test category in the codebase (`06` §10.4). Prompted with the spec table and **not** the implementation, so the tests encode the spec rather than the code (`08` §11.1).
- **Input documents** `04` §6 Agent 3's table (verbatim); `06` §12
- **Required context** `CTX-CORE`, `CTX-TEST` + Agent 3's table verbatim. **Do not load `ssl_rules.py`** beyond its function signatures.
- **Invariants** INV-02
- **Files to create** `backend/tests/rules/test_ssl_rules.py`
- **Must not touch** `backend/app/rules/ssl_rules.py` — if a test fails, that is a finding to report, not a file to edit
- **Expected output** One or more test cases per severity branch, each named for the spec row it covers.
- **Acceptance criteria**
  - Every row of Agent 3's table has at least one test
  - Boundary values tested on both sides of every threshold
  - Test names reference the spec condition, e.g. `test_expires_in_under_7_days_is_critical`
  - Effectively 100% branch coverage on `ssl_rules.py`
  - Determinism test: the same input twice produces identical output
  - A failing test is reported, not fixed by changing the implementation
- **DoD** Task DoD + coverage report attached
- **Dependencies** T-S07-01
- **Verification** `pytest backend/tests/rules/test_ssl_rules.py --cov=app.rules.ssl_rules --cov-branch --cov-report=term-missing`
- **Scope** S

### T-S07-03 · DNS rules engine + tests
- **Model** Flash High
- **Purpose** SPF, DMARC, DKIM, and the rest of the deterministic DNS checks from `04` §6 Agent 4.
- **Input documents** `04` §5, §6 Agent 4's table (verbatim)
- **Required context** `CTX-CORE`, `CTX-RULES` + Agent 4's table verbatim
- **Invariants** INV-02, INV-08, INV-10, INV-14
- **Reference implementation** `backend/app/rules/ssl_rules.py`
- **Files to create** `backend/app/rules/dns_rules.py`, `backend/tests/rules/test_dns_rules.py`
- **Expected output** Same shape as `ssl_rules.py`, covering every branch in Agent 4's table.
- **Acceptance criteria** As T-S07-01 and T-S07-02, applied to Agent 4's table. Additionally: `no_spf` and `no_dmarc` `finding_type` values match the `no_spf_dmarc.yaml` playbook trigger exactly (`INV-08`).
- **DoD** Task DoD + adversarial review
- **Dependencies** T-S07-02
- **Verification** `pytest backend/tests/rules/test_dns_rules.py --cov-branch`
- **Scope** M

### T-S07-04 · Asset classification rules + tests
- **Model** Flash High
- **Purpose** Asset typing and classification per `04` §6 Agent 1, MVP scope only (domain/subdomain per `04` §12).
- **Input documents** `04` §6 Agent 1's table; §12
- **Required context** `CTX-CORE`, `CTX-RULES`
- **Invariants** INV-02, INV-10, INV-14
- **Reference implementation** `backend/app/rules/ssl_rules.py`
- **Files to create** `backend/app/rules/asset_rules.py`, `backend/tests/rules/test_asset_rules.py`
- **Acceptance criteria** MVP scope only — no IP, cloud-service, or email-domain classification beyond what `04` §12 activates in Phase 1. `asset_type` values match the `assets.asset_type` comment in `03` §4.1 exactly. Deduplication is deterministic and order-independent.
- **DoD** Task DoD
- **Dependencies** T-S07-03
- **Verification** `pytest backend/tests/rules/test_asset_rules.py --cov-branch`
- **Scope** S

### T-S07-05 · Risk scoring engine (3-input simplified) + tests
- **Model** Pro
- **Purpose** The number the entire product is organised around. Simplified 3-input form per `04` §6 Agent 9 and `04` §12's Phase 1 scope.
- **Input documents** `04` §6 Agent 9 (verbatim), §12, §13; `01` §8
- **Required context** `CTX-CORE`, `CTX-RULES` + Agent 9's specification verbatim + `04` §13's first bullet
- **Invariants** INV-02, INV-10, INV-14
- **Reference implementation** `backend/app/rules/ssl_rules.py`
- **Files to create** `backend/app/rules/scoring_rules.py`, `backend/tests/rules/test_scoring_rules.py`
- **Expected output** A function taking findings and producing a `RiskScore` with its band, per Agent 9's 3-input simplified specification.
- **Acceptance criteria**
  - Score and band computed exactly per `04` §6 Agent 9
  - **No second scoring algorithm.** The Security Health band is a presentation transform of `RiskScore.band` and belongs in the API/frontend layer, not here (`04` §13)
  - Deterministic and order-independent: shuffling the findings list does not change the score
  - Boundary tests at every band edge
  - Empty findings list produces a defined score, not a crash or a null
  - Score range and band mapping documented in the module docstring
- **DoD** Task DoD + adversarial review specifically checking for a second scoring path
- **Dependencies** T-S07-04
- **Verification** `pytest backend/tests/rules/test_scoring_rules.py --cov-branch`; shuffle-invariance test included
- **Scope** M

### T-S07-06 · `finding_type` registry test and rules import boundary
- **Model** Pro
- **Purpose** Make `INV-08` and rules purity mechanically enforced rather than review-dependent. `INV-08` is a string contract with no compiler behind it (`06` §6).
- **Input documents** `04` §6, §9; `06` §6, §11.5; `08` §8
- **Required context** `CTX-CORE`, `CTX-RULES`, `CTX-TEST`
- **Invariants** INV-02, INV-08
- **Files to create** `backend/tests/rules/test_finding_type_registry.py`, `backend/app/rules/registry.py`
- **Files to modify** `backend/pyproject.toml` (import-linter contract)
- **Expected output** A registry of every emitted `finding_type`, a test asserting the set is exactly as documented, and an import rule forbidding `services`, `models`, `agents`, and `anthropic` imports from `rules/`.
- **Acceptance criteria**
  - Every `finding_type` emitted by any rules module appears in the registry
  - All snake_case; no duplicates; no unregistered value emitted anywhere
  - Import-linter fails CI on a deliberate `anthropic` import inside `rules/`
  - Import-linter fails on a deliberate `app.services` import inside `rules/`
  - The registry is what S11's playbook contract test asserts against
- **DoD** Task DoD + adversarial review + both deliberate failures demonstrated
- **Dependencies** T-S07-05
- **Verification** `pytest backend/tests/rules/ && lint-imports`; add a forbidden import, confirm failure
- **Scope** S

---

## 7. Sprint S09 — Claude Boundary

### T-S09-01 · `claude_service.py` skeleton, client and configuration
- **Model** Pro
- **Purpose** Establish the single boundary module. After this task, no other file in the codebase may ever import `anthropic` (`INV-01`).
- **Input documents** `03` §9 (verbatim), §11; `04` §1, §7; `07` §13, §16
- **Required context** `CTX-CORE`, `CTX-CLAUDE`
- **Invariants** INV-01, INV-02, INV-14, INV-30
- **Reference implementation** `03` §9's module sketch
- **Files to create** `backend/app/services/claude_service.py`, `backend/app/services/prompts/__init__.py`
- **Files to modify** `backend/app/config.py` (Anthropic settings)
- **Must not touch** `backend/app/agents/`, `backend/app/rules/`
- **Expected output** The module with a configured client, the four function signatures from `04` §7, timeout and retry handling, and structured logging.
- **Acceptance criteria**
  - Exactly one `anthropic` client instantiation in the entire codebase
  - Model string `claude-sonnet-4-6` sourced from config, not hardcoded
  - Function signatures match `04` §7's four calls; the DPDP narrative is declared and raises `NotImplementedError` until S25
  - No parameter on any function could let a caller influence severity, score, or clause status (`INV-02`)
  - Logs record that a call was made, its duration, and its outcome — never the prompt or response above `DEBUG`
  - A Claude failure raises a typed exception the caller can absorb, never propagating a raw SDK error
- **DoD** Task DoD + adversarial review + CP-Security
- **Dependencies** T-S02-02
- **Verification** `grep -rn "import anthropic\|from anthropic" backend/app` returns exactly one file
- **Scope** M

### T-S09-02 · Prompt implementations for the four calls
- **Model** Pro
- **Purpose** The prompts from `04` §7, implemented where they belong. A prompt living in an agent node is one refactor away from a client living there too (`08` §7.4).
- **Input documents** `04` §7.1, §7.2, §7.3, §7.4 (all verbatim); §1
- **Required context** `CTX-CORE`, `CTX-CLAUDE` + all of `04` §7 verbatim
- **Invariants** INV-01, INV-02, INV-27
- **Files to create** `backend/app/services/prompts/{explain_finding,remediation,executive_summary,whatsapp_summary}.py`
- **Files to modify** `backend/app/services/claude_service.py`
- **Expected output** Four prompt builders, each matching its `04` §7 specification, with the scanned-content boundary clearly delimited.
- **Acceptance criteria**
  - Each prompt matches its `04` §7 specification in intent and constraints
  - Every prompt states the LLM's boundary explicitly: explain, do not decide (`04` §1's "Never does" column)
  - `generate_whatsapp_summary` is instructed to add no finding absent from the report (`04` §7.4)
  - `generate_remediation` is instructed to invent no fix not implied by the finding's evidence (`04` §1)
  - Scanned content is delimited and labelled as untrusted data, never as instruction
  - No prompt string exists outside this package
- **DoD** Task DoD + adversarial review
- **Dependencies** T-S09-01
- **Verification** `grep -rn "You are\|system=" backend/app --include=*.py` returns only `services/prompts/`
- **Scope** M

### T-S09-03 · Finding-shape response cache
- **Model** Pro
- **Purpose** The mechanism behind `01` §1's commitment that the product gets cheaper per-org as shared indicators are cached across tenants (`04` §13).
- **Input documents** `04` §7.1, §13; `06` §17; `07` §10
- **Required context** `CTX-CORE`, `CTX-CLAUDE`
- **Invariants** INV-01, INV-30
- **Files to create** `backend/app/services/llm_cache.py`, `backend/tests/services/test_llm_cache.py`
- **Files to modify** `backend/app/services/claude_service.py`
- **Expected output** A Redis-backed cache keyed by finding shape, shared safely across tenants.
- **Acceptance criteria**
  - Key derived from `finding_type` plus the shape-defining fields of `raw_data`, **never** from `org_id` — otherwise cross-tenant reuse, the entire point, cannot happen
  - Two orgs with an identical finding shape hit the same cache entry — tested explicitly
  - No tenant-identifying data is stored in a cached value — tested with a hostile fixture
  - Cache miss falls through to a live call and populates
  - A cache failure degrades to a live call, never to an error
  - TTL configured and documented
- **DoD** Task DoD + adversarial review + CP-Security (cross-tenant data in cache is a leak path)
- **Dependencies** T-S09-02
- **Verification** `pytest backend/tests/services/test_llm_cache.py -v`
- **Scope** M

### T-S09-04 · Prompt injection defence and output validation
- **Model** Pro
- **Purpose** Scanned content is attacker-controllable — an attacker who controls a DNS TXT record controls text that reaches a prompt. `07` §14 and §20 apply directly.
- **Input documents** `07` §14 (verbatim), §15, §20, §31; `04` §1
- **Required context** `CTX-CORE`, `CTX-CLAUDE` + `07` §14 and §20 verbatim
- **Invariants** INV-01, INV-02, INV-27
- **Files to create** `backend/app/services/llm_guard.py`, `backend/tests/services/test_llm_guard.py`, `backend/tests/services/fixtures/injection_payloads.json`
- **Files to modify** `backend/app/services/claude_service.py`
- **Expected output** Input sanitisation and delimiting per `07` §14, output validation per `07` §20, with a hostile-payload fixture suite.
- **Acceptance criteria**
  - Scanned content delimited and never interpolated as instruction
  - At least ten distinct injection payloads in the fixture, including instruction override, delimiter escape, role confusion, and exfiltration attempts
  - No payload alters the model's task — asserted per payload
  - Output validated for length, format, and absence of markup that `MarkdownViewer` would treat as executable
  - Invalid output degrades to no explanation, never to a raised error reaching the pipeline
  - Output containing an apparent severity claim is rejected (`INV-02` — the LLM never decides severity)
- **DoD** Task DoD + adversarial review + CP-Security
- **Dependencies** T-S09-03
- **Verification** `pytest backend/tests/services/test_llm_guard.py -v`
- **Scope** M

### T-S09-05 · Graceful degradation and service tests
- **Model** Flash High
- **Purpose** A Claude failure must never fail a scan. `01` §9 already specifies that a finding with no explanation still renders its evidence and remediation (`06` §22).
- **Input documents** `01` §9; `04` §11; `06` §22; `03` §10
- **Required context** `CTX-CORE`, `CTX-CLAUDE`, `CTX-TEST`
- **Invariants** INV-01, INV-06, INV-30
- **Files to create** `backend/tests/services/test_claude_service.py`
- **Files to modify** `backend/app/services/claude_service.py`
- **Acceptance criteria**
  - Every function tested with a mocked client; no live API call in CI
  - Timeout, rate limit, auth failure, and malformed response each tested
  - Auth failure logged at `ERROR` and not retried; timeout logged at `WARNING` and retried (`06` §14)
  - An invalid API key produces `CRITICAL` per `06` §13
  - Every failure mode returns `None` or an empty result the caller can absorb, never raises into the pipeline
  - No full prompt or response logged above `DEBUG` — asserted by inspecting captured log output
- **DoD** Task DoD
- **Dependencies** T-S09-04
- **Verification** `pytest backend/tests/services/test_claude_service.py -v --no-network`
- **Scope** S

### T-S09-06 · CI enforcement of the Claude boundary
- **Model** Flash High
- **Purpose** Convert `INV-01` from a review item into a mechanical gate. `06` §21 names calling Claude outside this module as the first common pitfall, and pitfalls that depend on reviewer memory eventually happen.
- **Input documents** `03` §9; `04` §1; `06` §21; `08` §8
- **Required context** `CTX-CORE`
- **Invariants** INV-01
- **Files to create** `scripts/check_claude_boundary.sh`
- **Files to modify** `.github/workflows/ci.yml`, `Makefile`, `backend/pyproject.toml` (import-linter contract)
- **Acceptance criteria**
  - CI fails when `anthropic` is imported anywhere except `claude_service.py`
  - CI fails when a prompt-shaped string literal appears outside `services/prompts/`
  - Both failures demonstrated in the PR
  - The check runs inside `make verify`, so it is caught locally before review
  - The failure message names the invariant (`INV-01`) and the offending file
- **DoD** Task DoD + both deliberate failures recorded
- **Dependencies** T-S09-05
- **Verification** Add a forbidden import to an agent stub, run `make verify`, confirm the failure names INV-01
- **Scope** XS

---

## 8. Sprint S11 — Pipeline, Celery & Partial Failure (selected cards)

### T-S11-01 · `pipeline.py` — the single graph builder
- **Model** Pro
- **Purpose** The DAG. Built once as a subset of `04` §3's full graph, so that adding a Phase 2 agent later is an edge insertion rather than a rewrite (`04` §3, `08` §7.2).
- **Input documents** `04` §3 (verbatim, including the Python block and the MVP paragraph), §12
- **Required context** `CTX-CORE`, `CTX-AGENT` + `04` §3 verbatim
- **Invariants** INV-01, INV-02, INV-06, INV-14
- **Reference implementation** `04` §3's `build_pipeline()` — the MVP graph is this with a subset of nodes
- **Files to create** `backend/app/agents/pipeline.py`, `backend/tests/agents/test_pipeline.py`
- **Must not touch** `backend/app/agents/<node>.py` files (S10 owns them)
- **Expected output** One `build_pipeline()` function registering the six MVP nodes with edges wiring Phase 1 agents directly to `risk_scoring`, per `04` §3's subset rule.
- **Acceptance criteria**
  - **Exactly one graph builder function exists.** No `build_mvp_pipeline` alongside a `build_full_pipeline` (`09` F8 risk 1)
  - Node names match `04` §3's registration names exactly, so Phase 2 insertion needs no rename
  - Entry point `asset_discovery`; terminal edge to `END` from `notification`
  - Adding a Phase 2 node later requires only `add_node` plus an edge change — demonstrated by a commented example in the test file, not by building it
  - Compiled graph is module-level, matching `04` §3
  - A test asserts the compiled node set equals the expected MVP set exactly
- **DoD** Task DoD + adversarial review specifically checking for a second builder
- **Dependencies** T-S10-07 (all six nodes merged)
- **Verification** `pytest backend/tests/agents/test_pipeline.py -v`; `grep -c "def build_" backend/app/agents/pipeline.py` equals 1
- **Scope** S

### T-S11-03 · Partial failure semantics and tests
- **Model** Pro
- **Purpose** Enforce the `failed`-versus-`completed`-with-`error_log` distinction that `02` §5, `03` §6.2, and `04` §11 all key off. Getting this wrong makes the product lie about its own coverage.
- **Input documents** `04` §11 (verbatim); `03` §6.2; `02` §5; `08` §7.5
- **Required context** `CTX-CORE`, `CTX-AGENT` + `04` §11 verbatim
- **Invariants** INV-06, INV-07, INV-30
- **Files to create** `backend/tests/agents/test_partial_failure.py`
- **Files to modify** `backend/app/agents/pipeline.py`, `backend/celery_worker.py`, `backend/app/services/scan_persistence.py`
- **Expected output** The three tests from `08` §7.5, green, plus the persistence logic that distinguishes the two outcomes.
- **Acceptance criteria**
  - A node whose service raises appends to `state["errors"]` and does not propagate (`INV-06`)
  - The pipeline reaches `notification` even with an agent failing — tested with each of the six nodes failing in turn
  - A scan completing with a non-empty `error_log` persists as `status: completed`, never `failed`
  - `status: failed` occurs only when the pipeline invocation itself raises before any node completes (`04` §11)
  - Agent-level errors logged at `WARNING`; pipeline-level at `ERROR` (`06` §13)
  - `error_log` content identifies which agent failed and why
- **DoD** Task DoD + adversarial review
- **Dependencies** T-S11-02 (Celery task)
- **Verification** `pytest backend/tests/agents/test_partial_failure.py -v`
- **Scope** M

### T-S11-05 · IR playbooks and the `finding_type` contract test
- **Model** Flash High
- **Purpose** Close the string contract between rules engines and playbooks that no compiler checks (`06` §6, `INV-08`). An orphaned `finding_type` silently degrades remediation quality (`06` §21).
- **Input documents** `04` §9 (verbatim, including the YAML example), §6; `06` §11.5
- **Required context** `CTX-CORE`, `CTX-AGENT` + `04` §9 verbatim + the registry from T-S07-06
- **Invariants** INV-08
- **Files to create** `playbooks/{ssl_expired,open_database_port,email_breach,no_spf_dmarc,dpdp_violation}.yaml`, `backend/app/agents/playbook_loader.py`, `backend/tests/agents/test_playbook_contract.py`
- **Expected output** The five MVP playbooks per `04` §9, a loader with schema validation at startup, and a test asserting every registered `finding_type` has a matching trigger.
- **Acceptance criteria**
  - All five MVP playbooks present with the exact filenames in `04` §9
  - Each `triggers[].finding_type` matches a value in the T-S07-06 registry exactly
  - The contract test fails when a `finding_type` is added without a playbook
  - The contract test fails when a playbook references an unknown `finding_type`
  - A malformed playbook fails at startup, not silently at scan time
  - Playbooks for Phase 2/3 `finding_type` values are absent, not stubbed — the file for a rule that does not exist yet is noise
- **DoD** Task DoD + both contract failures demonstrated
- **Dependencies** T-S11-04, T-S07-06
- **Verification** `pytest backend/tests/agents/test_playbook_contract.py -v`; add an unregistered trigger, confirm failure
- **Scope** S

---

## 9. Representative Frontend Card

Every frontend screen card follows this shape. Expand the indexed frontend tasks against it.

### T-S14-02 · Findings List screen
- **Model** Flash High
- **Purpose** The primary action queue (`01` §3). The screen a user spends most of their time in, and the one where every filter and state decision from `01` has to hold exactly.
- **Input documents** `01` §9 (Findings List, verbatim including the state table), §4, §11; `02` §3, §4, §5, §6; `05` §4.14, §4.16, §4.20, §7.10
- **Required context** `CTX-CORE`, `CTX-FE-SCREEN` + `01`'s Findings List section verbatim
- **Invariants** INV-16, INV-17, INV-18, INV-19, INV-20, INV-22, INV-23, INV-25, INV-28
- **Reference implementation** `frontend/app/(app)/scans/page.tsx` (list screen pattern from S12)
- **Files to create** `frontend/app/(app)/findings/{page.tsx,loading.tsx,error.tsx}`, `frontend/components/findings/{FindingCard.tsx,FilterBar.tsx}`
- **Files to modify** `frontend/lib/queries/useFindings.ts`
- **Must not touch** `frontend/components/ui/`, `frontend/components/findings/SeverityBadge.tsx` (exists from S04), `frontend/lib/api/types.generated.ts`
- **Expected output** A Server Component page with a client filter slice, rendering findings from the S13 contract, with all four states and URL-backed filters.
- **Acceptance criteria**
  - Server Component for the page shell and initial data; client slice only for the filter bar and pagination (`INV-16`)
  - No `fetch` in any component — data via `useFindings` (`INV-17`)
  - Query key `['findings', orgId, { severity, status, finding_type, asset_id, page }]` (`INV-18`)
  - Filter state in URL search params; a copied URL reproduces the view (`INV-20`, `01` §4)
  - Filter names match `01`'s filter bar and the S13 query params one-to-one — no translation layer
  - Loading state is this screen's specific skeleton, matching the card grid's real shape, not a spinner (`INV-25`)
  - Empty state uses the shared `EmptyState` with a real next action, not a blank grid
  - Error state renders the shared error component with a retry (`02` §3)
  - `SeverityBadge` imported from S04; no new severity component created (`INV-22`)
  - Severity carries text or icon, never colour alone (`INV-28`)
  - No hex literal or arbitrary pixel value anywhere in the diff (`INV-23`)
  - Every state in `01`'s Findings List table implemented
- **DoD** Task DoD + a component test per specified state
- **Dependencies** T-S13-05 (contract merged and snapshotted), T-S14-01 (`useFindings` hook)
- **Verification** `npm run test -- findings && npm run lint && npx tsc --noEmit && npx playwright test findings`; manual check: copy a filtered URL into a fresh incognito session
- **Scope** M

---

## 10. Complete Task Index

Every remaining task, with the fields that cannot be derived from the sprint entry in `10`. Expand per §2 at the start of the sprint.

**Legend.** Model: `F` = Flash High, `P` = Pro, `F→P` = Flash with escalation. Scope per §1. Adversarial review (`12` §11.2) is mandatory wherever marked **AR**.

### S03 — Auth & Shell (remaining)

| ID | Title | Model | Authority | Key files | Deps | Scope |
|---|---|---|---|---|---|---|
| T-S03-01 | Supabase client + JWT verification | P **AR** | `07` §3, §7; `03` §3 | `app/services/supabase_auth.py` | T-S02-02 | M |
| T-S03-05 | Auth endpoints: register, login, refresh | F | `03` §5 (AUTH); `07` §3, §17 | `app/routers/auth.py` | T-S03-04 | M |
| T-S03-06 | Auth screens: Login, Signup | F | `01` §7; `02` §7; `05` §4.1, §4.2, §4.4 | `app/(auth)/{login,signup}/page.tsx`, `lib/schemas/auth.ts` | T-S03-05 | M |
| T-S03-07 | Auth screens: Forgot/Reset Password, Verify Email | F | `01` §7 | `app/(auth)/{forgot-password,reset-password,verify-email}/page.tsx` | T-S03-06 | S |
| T-S03-08 | `middleware.ts` auth redirect + locale | F | `02` §2, §13 | `middleware.ts` | T-S03-05 | S |
| T-S03-09 | App shell: role-aware Sidebar + Header | F | `01` §4, §11, §12 (Role-Based Navigation); `05` §4.19 | `app/(app)/layout.tsx`, `components/layout/*` | T-S03-08 | M |

### S04 — Design System

| ID | Title | Model | Authority | Key files | Deps | Scope |
|---|---|---|---|---|---|---|
| T-S04-01 | Design tokens → CSS variables + Tailwind theme | F | `05` §1.1, §3 (all) | `app/globals.css`, `tailwind.config.ts` | T-S01-03 | M |
| T-S04-02 | shadcn primitives: Button, Input, Textarea, Password, Search | F | `05` §4.1–§4.5 | `components/ui/*` | T-S04-01 | M |
| T-S04-03 | shadcn primitives: Select, Combobox, Checkbox, Radio, Switch, Tabs, Accordion | F | `05` §4.7, §4.8, §4.10, §4.11 | `components/ui/*` | T-S04-02 | M |
| T-S04-04 | shadcn primitives: Card, Tooltip, Table, Badge, Alert, Toast, Dialog, Drawer, Pagination | F | `05` §4.12–§4.14, §4.16–§4.19 | `components/ui/*` | T-S04-03 | L |
| T-S04-05 | Shared: EmptyState, Skeleton, error state | F | `05` §4.20–§4.23; `01` §11 | `components/shared/*` | T-S04-04 | S |
| T-S04-06 | Shared: DataChart (Recharts wrapper, dynamic) | F | `02` §9; `05` §4.15, §7 | `components/shared/DataChart.tsx` | T-S04-05 | M |
| T-S04-07 | Shared: MarkdownViewer, JSONViewer, CodeBlock | F **AR** | `01` §11; `07` §20 | `components/shared/*` | T-S04-05 | M |
| T-S04-08 | SeverityBadge, RoleBadge, ConsentCheckbox, gallery route | F | `05` §4.9, §4.16; `01` §11 | `components/{findings,org,onboarding}/*`, `app/(dev)/gallery/page.tsx` | T-S04-07 | M |

### S05 — Organization API & Domain Verification

| ID | Title | Model | Authority | Key files | Deps | Scope |
|---|---|---|---|---|---|---|
| T-S05-01 | `PUT /org/me` + settings update | F | `03` §5, §5.1; `01` §9 (Settings) | `app/routers/org.py` | T-S03-04 | S |
| T-S05-02 | Domain verification token issuance | P | `03` §5; `01` §7; `07` §19 | `app/services/domain_verification.py` | T-S05-01 | M |
| T-S05-03 | Domain verification check (both methods) | P **AR** | `03` §5; `01` §7 | `app/services/domain_verification.py`, `app/routers/org.py` | T-S05-02 | M |
| T-S05-04 | `DELETE /org/me` + DPDP erasure workflow | P **AR** | `03` §5; `07` (erasure) | `app/routers/org.py`, `app/services/erasure.py` | T-S05-03 | M |
| T-S05-05 | Assets endpoints: add + list | F | `03` §5, §5.1 | `app/routers/org.py` | T-S05-01 | S |
| T-S05-06 | Organization Setup screen | F | `01` §7; `02` §7 | `app/(onboarding)/organization/page.tsx` | T-S05-01 | S |
| T-S05-07 | Domain Verification screen + instruction component | F | `01` §7; `02` §11; `05` §4.12 | `app/(onboarding)/domain-verification/page.tsx`, `components/onboarding/DomainVerificationInstruction.tsx` | T-S05-03, T-S04-08 | M |

### S06 — Notification Setup & Onboarding Guard

| ID | Title | Model | Authority | Key files | Deps | Scope |
|---|---|---|---|---|---|---|
| T-S06-01 | Consent lifecycle storage + API validation | P **AR** | `03` §4.2; `07` (consent) | `app/services/consent.py`, `app/routers/org.py` | T-S05-04 | M |
| T-S06-02 | Notification Setup screen + PhoneInput | F | `01` §7; `02` §7; `05` §4.9 | `app/(onboarding)/notifications/page.tsx`, `lib/schemas/notification-setup.ts` | T-S06-01 | M |
| T-S06-03 | Onboarding layout step guard (server-side) | P | `02` §3; `01` §7 | `app/(onboarding)/layout.tsx` | T-S06-02 | M |
| T-S06-04 | First Scan screen shell | F | `01` §7 | `app/(onboarding)/first-scan/page.tsx` | T-S06-03 | S |
| T-S06-05 | First Report Reveal screen shell | F | `01` §7 | `app/(onboarding)/first-report/page.tsx` | T-S06-04 | S |
| T-S06-06 | Onboarding E2E (both verification methods, consent) | F | `06` §12; `02` §16 | `tests/e2e/onboarding.spec.ts` | T-S06-05 | M |

### S08 — Service Clients

| ID | Title | Model | Authority | Key files | Deps | Scope |
|---|---|---|---|---|---|---|
| T-S08-01 | Service module pattern + shared HTTP client | P | `03` §8; `06` §10.3, §14 | `app/services/base.py` | T-S02-02 | M |
| T-S08-02 | Asset discovery sources + fixtures | F | `03` §8; `04` §6 Agent 1 | `app/services/asset_discovery_service.py`, fixtures | T-S08-01 | M |
| T-S08-03 | SSL Labs client + fixtures | F | `03` §8; `04` §6 Agent 3 | `app/services/ssl_labs_service.py`, fixtures | T-S08-01 | M |
| T-S08-04 | DNS resolution client + fixtures | F | `03` §8; `04` §6 Agent 4 | `app/services/dns_service.py`, fixtures | T-S08-01 | S |
| T-S08-05 | WhatsApp client + template submission | P **AR** | `03` §7.1, §7.2; `07` §12 | `app/services/whatsapp_service.py`, fixtures | T-S08-01 | M |
| T-S08-06 | Resend email client + fixtures | F | `03` §7.3 | `app/services/email_service.py`, fixtures | T-S08-01 | S |

### S10 — Agent State & Nodes

| ID | Title | Model | Authority | Key files | Deps | Scope |
|---|---|---|---|---|---|---|
| T-S10-01 | `AgentState` complete per `04` §4 | P | `04` §4 (verbatim), §12 | `app/agents/state.py` | T-S02-01 | M |
| T-S10-02 | Agent node pattern + `asset_discovery` node | P **AR** | `04` §5, §6 Agent 1 | `app/agents/asset_discovery.py` | T-S10-01, T-S08-02, T-S07-04 | M |
| T-S10-03 | `ssl_analyzer` node | F | `04` §5, §6 Agent 3 | `app/agents/ssl_analyzer.py` | T-S10-02 | S |
| T-S10-04 | `dns_analyzer` node | F | `04` §5, §6 Agent 4 | `app/agents/dns_analyzer.py` | T-S10-03 | S |
| T-S10-05 | `risk_scoring` node + executive summary call | F **AR** | `04` §6 Agent 9, §7.2, §13 | `app/agents/risk_scoring.py` | T-S10-04, T-S09-05 | M |
| T-S10-06 | `recovery_recommendation` node + remediation call | F **AR** | `04` §6 Agent 12, §7.1, §7.3, §9 | `app/agents/recovery_recommendation.py` | T-S10-05 | M |
| T-S10-07 | `notification` node + WhatsApp summary call | F **AR** | `04` §6 Agent 13, §7.4; `03` §7 | `app/agents/notification.py` | T-S10-06, T-S08-05 | M |

### S11 — Pipeline & Celery (remaining)

| ID | Title | Model | Authority | Key files | Deps | Scope |
|---|---|---|---|---|---|---|
| T-S11-02 | Celery worker + `run_full_scan` + schedule | P **AR** | `03` §6.1, §6.3; `06` §13 | `celery_worker.py` | T-S11-01 | M |
| T-S11-04 | Scan persistence + `langgraph_state` snapshot | F | `03` §4.1, §6; `04` §4 | `app/services/scan_persistence.py` | T-S11-03 | M |
| T-S11-06 | Worker service-role session isolation | P **AR** | `07` §6; `03` §3 | `app/database.py`, `celery_worker.py` | T-S11-05 | S |
| T-S11-07 | End-to-end pipeline integration test | F | `04` §3, §11; `06` §12 | `tests/agents/test_pipeline_e2e.py` | T-S11-06 | M |

### S12 — Scans API & Live Scan UI

| ID | Title | Model | Authority | Key files | Deps | Scope |
|---|---|---|---|---|---|---|
| T-S12-01 | `POST /scans/trigger` + verification + quota gating | P **AR** | `03` §5, §6.1; `06` §15 | `app/routers/scans.py` | T-S11-07, T-S05-03 | M |
| T-S12-02 | `GET /scans`, `GET /scans/{id}`, `/report` | F | `03` §5, §5.1 | `app/routers/scans.py` | T-S12-01 | M |
| T-S12-03 | `POST /webhooks/scan-status` + signature validation | P **AR** | `03` §5; `07` §12 | `app/routers/webhooks.py` | T-S12-02 | S |
| T-S12-04 | Scans query hooks + polling + partial-failure `select` | P **AR** | `02` §5; `04` §11 | `lib/queries/useScan.ts`, `useScans.ts` | T-S12-03 | M |
| T-S12-05 | AgentStatusList + ScanProgressIndicator | F | `01` §9; `02` §10, §12; `05` §7.7 | `components/scans/*` | T-S12-04, T-S04-08 | M |
| T-S12-06 | Scan Detail screen (live + completed + partial) | F | `01` §9 (verbatim); `02` §3 | `app/(app)/scans/[id]/*` | T-S12-05 | L |
| T-S12-07 | Scans History screen | F | `01` §9 | `app/(app)/scans/page.tsx` | T-S12-06 | M |
| T-S12-08 | First Scan onboarding screen completion + E2E | F | `01` §7; `06` §12 | `app/(onboarding)/first-scan/page.tsx`, `tests/e2e/first-scan.spec.ts` | T-S12-07 | M |

### S13 — Findings API

| ID | Title | Model | Authority | Key files | Deps | Scope |
|---|---|---|---|---|---|---|
| T-S13-01 | `GET /findings` with filters + pagination | F | `03` §5, §5.1; `01` §9 | `app/routers/findings.py` | T-S12-02 | M |
| T-S13-02 | `GET /findings/{id}` with joined asset context | F | `03` §5.1; `06` §17 | `app/routers/findings.py` | T-S13-01 | S |
| T-S13-03 | Finding lifecycle service + `previous_status` | P **AR** | `03` §4.2; `01` §12; `04` §10 | `app/services/finding_lifecycle.py` | T-S13-02 | M |
| T-S13-04 | `PUT /findings/{id}/status` + false-positive reason | P **AR** | `03` §4.2, §5, §5.1 | `app/routers/findings.py` | T-S13-03 | M |
| T-S13-05 | Contract regeneration + findings API tests | F | `03` §5.1; `06` §12 | `tests/api/test_findings.py`, `docs/contracts/openapi.json` | T-S13-04 | S |

### S14 — Findings UI (remaining)

| ID | Title | Model | Authority | Key files | Deps | Scope |
|---|---|---|---|---|---|---|
| T-S14-01 | `useFindings` / `useFinding` hooks + optimistic mutation | P **AR** | `02` §5 | `lib/queries/useFindings.ts`, `useFinding.ts` | T-S13-05 | M |
| T-S14-03 | FilterBar with URL search-param state | F | `01` §9; `02` §4 | `components/findings/FilterBar.tsx` | T-S14-02 | M |
| T-S14-04 | Finding Detail screen | F | `01` §9 (verbatim) | `app/(app)/findings/[id]/*` | T-S14-03 | L |
| T-S14-05 | FindingStatusControl + optimistic update | F | `01` §9, §12; `02` §5 | `components/findings/FindingStatusControl.tsx` | T-S14-04 | M |
| T-S14-06 | False-positive reason dialog | F | `03` §4.2; `01` §13; `05` §4.18 | `components/findings/FalsePositiveDialog.tsx` | T-S14-05 | S |
| T-S14-07 | Findings E2E: filter, deep-link, lifecycle | F | `06` §12; `02` §16 | `tests/e2e/finding-lifecycle.spec.ts` | T-S14-06 | M |

### S15 — Dashboard

| ID | Title | Model | Authority | Key files | Deps | Scope |
|---|---|---|---|---|---|---|
| T-S15-01 | `GET /dashboard/summary` + `/assets` | F **AR** | `03` §5; `04` §13 | `app/routers/dashboard.py` | T-S13-05 | M |
| T-S15-02 | Security Health band presentation transform | P **AR** | `04` §13; `01` §8 | `app/routers/dashboard.py` | T-S15-01 | S |
| T-S15-03 | RiskScoreGauge + SecurityHealthStatus | F | `01` §8, §11; `02` §10; `05` §7.7 | `components/dashboard/*` | T-S15-02, T-S04-06 | M |
| T-S15-04 | TrendSparkline | F | `01` §11; `05` §7.1 | `components/dashboard/TrendSparkline.tsx` | T-S15-03 | S |
| T-S15-05 | Dashboard screen + mobile priority stack | F | `01` §8 (verbatim); `05` §6; `02` §11 | `app/(app)/dashboard/*` | T-S15-04 | L |
| T-S15-06 | First Report Reveal completion + perf budget | F | `01` §7; `02` §14 | `app/(onboarding)/first-report/page.tsx` | T-S15-05 | M |

### S16 — Notification Delivery

| ID | Title | Model | Authority | Key files | Deps | Scope |
|---|---|---|---|---|---|---|
| T-S16-01 | Notification dispatch service + consent gate | P **AR** | `03` §7; `07` (consent) | `app/services/notification_dispatch.py` | T-S08-06, T-S06-01 | M |
| T-S16-02 | WhatsApp delivery + template + logging | P **AR** | `03` §7.1, §7.2 | `app/services/notification_dispatch.py` | T-S16-01 | M |
| T-S16-03 | Email delivery + schedule | F | `03` §7.3 | `app/services/notification_dispatch.py` | T-S16-02 | S |
| T-S16-04 | `POST /webhooks/whatsapp` inbound replies | P **AR** | `03` §5, §7.1; `07` §12 | `app/routers/webhooks.py` | T-S16-03 | M |
| T-S16-05 | `GET /notifications`, `POST /notifications/test` | F | `03` §5, §5.1 | `app/routers/notifications.py` | T-S16-04 | S |
| T-S16-06 | Notifications Log screen | F | `01` §9 | `app/(app)/notifications/page.tsx` | T-S16-05 | M |
| T-S16-07 | Summary-content assertion test | F **AR** | `04` §1, §7.4 | `tests/services/test_summary_fidelity.py` | T-S16-06 | S |

### S17 — Settings, Assets, Team, Profile

| ID | Title | Model | Authority | Key files | Deps | Scope |
|---|---|---|---|---|---|---|
| T-S17-01 | Members endpoints: list, invite | P **AR** | `03` §5 (MEMBERS); `07` §4 | `app/routers/org.py` | T-S16-05 | M |
| T-S17-02 | Members: role change + removal + sole-owner guard | P **AR** | `03` §4.2, §5; `07` §4 | `app/routers/org.py` | T-S17-01 | M |
| T-S17-03 | Settings screen + Danger Zone | F | `01` §9; `05` §4.18 | `app/(app)/settings/page.tsx`, `components/org/DangerZone.tsx` | T-S17-02 | L |
| T-S17-04 | Assets screen + whitelisting | F | `01` §9; `03` §4.1 | `app/(app)/assets/page.tsx` | T-S17-03 | M |
| T-S17-05 | Team & Roles screen | F | `01` §9, §11 | `app/(app)/team/page.tsx`, `components/org/*` | T-S17-04 | M |
| T-S17-06 | Profile screen | F | `01` §9 | `app/(app)/profile/page.tsx` | T-S17-05 | S |
| T-S17-07 | Permission Denied + Quota Exceeded states | F | `01` §3, §4 | `components/shared/*` | T-S17-06 | S |
| T-S17-08 | Settings + team E2E | F | `06` §12 | `tests/e2e/org-admin.spec.ts` | T-S17-07 | M |

### S18 — Marketing & System

| ID | Title | Model | Authority | Key files | Deps | Scope |
|---|---|---|---|---|---|---|
| T-S18-01 | `(marketing)` layout, nav, footer | F | `01` §4, §6; `05` §2 | `app/(marketing)/layout.tsx`, `components/layout/*` | T-S04-08 | M |
| T-S18-02 | Landing Page | F | `01` §6 (verbatim); `05` §2, §6 | `app/(marketing)/page.tsx` | T-S18-01 | L |
| T-S18-03 | Pricing, About, Contact | F | `01` §3 | `app/(marketing)/{pricing,about,contact}/page.tsx` | T-S18-02 | M |
| T-S18-04 | Legal pages (Privacy, Terms, Scanning Policy, DPA) | F | `01` §3; `07` §10 | `app/(marketing)/legal/[slug]/page.tsx` | T-S18-03 | M |
| T-S18-05 | 404 + Maintenance | F | `01` §3 | `app/not-found.tsx`, `app/maintenance/page.tsx` | T-S18-04 | S |
| T-S18-06 | `next-intl` wiring, `en` locale extraction | F | `02` §13 | `i18n.ts`, `messages/en.json` | T-S18-05 | M |
| T-S18-07 | Landing performance budget pass | F | `02` §14; `06` §16 | `lighthouserc.json`, `app/(marketing)/page.tsx` | T-S18-06 | S |

### S19–S20 — Hardening

| ID | Title | Model | Authority | Key files | Deps | Scope |
|---|---|---|---|---|---|---|
| T-S19-01 | `07` §33 security review execution | P **AR** | `07` §33, §30 | `docs/impl/audits/security-review-mvp.md` | T-S18-07 | L |
| T-S19-02 | Rate limiting + DDoS verification | P **AR** | `07` §17, §18 | `app/middleware/rate_limit.py`, `tests/security/` | T-S19-01 | M |
| T-S19-03 | Dependency + supply-chain audit | F | `07` §25, §26 | `docs/impl/audits/`, CI | T-S19-02 | S |
| T-S19-04 | Performance audit: pagination, N+1, Claude cost | P | `06` §17 | `docs/impl/audits/perf-audit-mvp.md` | T-S19-03 | M |
| T-S19-05 | Accessibility sweep + keyboard walkthrough | F | `02` §12; `05` §8 | `tests/e2e/a11y.spec.ts` | T-S19-04 | M |
| T-S19-06 | Full-MVP architecture audit (CP-Phase) | P **AR** | `08` §8, §13 | `docs/impl/audits/architecture-audit-mvp.md` | T-S19-05 | L |
| T-S20-01 | Monitoring + alerting + agent duration tracking | P | `07` §22; `06` §17 | `backend/monitoring/*` | T-S19-06 | M |
| T-S20-02 | Backup + DR with verified restore | P **AR** | `07` §24 | `docs/impl/runbooks/disaster-recovery.md` | T-S20-01 | M |
| T-S20-03 | Incident response runbook | P | `07` §23 | `docs/impl/runbooks/incident-response.md` | T-S20-02 | S |
| T-S20-04 | Load test on the scan path | P | `06` §17; `03` §12 | `docs/impl/audits/load-test-mvp.md` | T-S20-03 | M |
| T-S20-05 | Deployment pipeline + migration gating + rollback | P **AR** | `06` §16; `03` §12 | `.github/workflows/deploy.yml`, `docs/impl/runbooks/rollback.md` | T-S20-04 | M |
| T-S20-06 | `07` §34 production readiness execution | P **AR** | `07` §34 | `docs/impl/audits/production-readiness.md` | T-S20-05 | M |

### S21–S35 — Phase 2 and Phase 3

Indexed at sprint level in `10` §Phase 2 / §Phase 3. Expand to task cards at the start of each phase, using the four-step agent build (`08` §7.3) as the decomposition for every agent sprint:

| Step | Card shape | Reference card |
|---|---|---|
| 1 | Rules engine + branch tests | T-S07-01, T-S07-02 |
| 2 | Service client + fixtures | T-S08-03 |
| 3 | Agent node with try/except-per-item | T-S10-03 |
| 4 | DAG registration + playbook + contract test | T-S11-01, T-S11-05 |

Screen work in Phase 2/3 expands against T-S14-02. Endpoint work expands against T-S03-04 and T-S13-01.

---

## 11. Task Card Anti-Patterns

Encountered often enough to be worth naming. Each is a card defect, not a model defect.

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| "Implement the Findings feature" | Not a task, a sprint. Produces an unreviewable diff spanning six layers | Split at contract boundaries per `08` §6.1 |
| Acceptance criteria like "works correctly" | Not checkable, so the review has nothing to check against | Every criterion must be objectively true or false |
| No `Files to modify` list | The model touches whatever it read and the diff becomes unreviewable | Enumerate paths; add `Must not touch` where a wander is likely |
| Context pack listed as "the relevant docs" | The model picks, and picks differently each time | Name packs and sections explicitly |
| No reference implementation on a card that has an obvious one | The model re-derives an existing pattern, slightly differently | Name the file. This is the cheapest consistency mechanism available |
| Invariants omitted because "they're in `AGENTS.md`" | Present but not operative. A relevant invariant on the card gets applied; a global one gets skimmed | List the 4–8 that bear on this task |
| Test card that loads the implementation | Tests then encode the code rather than the spec (`08` §11.1) | Supply the spec table; exclude the implementation |
| Verification step that says "run the tests" | Ambiguous about which and against what | Give the exact command |

---

Owner: Qelvix Engineering Team
Status: Living document — cards are expanded per §2 at sprint start
