# 10: Sprint Planning

Every phase in `09_IMPLEMENTATION_ROADMAP.md` converted into time-boxed execution units. A sprint is the unit at which work is committed, verified, and closed. Below it sits the task card (`11_TASK_BREAKDOWN.md`), which is the unit of a single AI implementation session.

---

## 1. What a Sprint Is Here

A sprint is **1.5–2 working days** containing **4–10 task cards**. It is not a two-week ceremony; the cadence is set by how long a coherent group of AI sessions takes to produce, verify, and merge.

| Property | Value | Reason |
|---|---|---|
| Duration | 1.5–2 working days | Long enough to complete a coherent capability, short enough that drift is caught within days |
| Task cards | 4–10 | Below 4, the sprint is really a task; above 10, the exit review stops being meaningful |
| Ends on | `main`, green, merged | A sprint that ends on a branch has not ended |
| Carry-over | **Zero** | See §3 |

Sprints are numbered `S01`–`S35` and map to phases as fixed in `09` §0. Task IDs are `T-<sprint>-<nn>`, e.g. `T-S08-03`.

## 2. Complexity Scale

Estimated in **task cards and session count**, not hours — hours are unpredictable when a generation either lands first-pass or needs three attempts, and the count of discrete verifiable units is the thing that actually predicts risk.

| Rating | Task cards | AI sessions | Pro-model share | Character |
|---|---|---|---|---|
| **XS** | 1–3 | 1–4 | 0% | Mechanical; spec is complete and unambiguous |
| **S** | 4–5 | 4–8 | ~10% | Routine; one reference implementation to copy |
| **M** | 6–8 | 8–14 | ~25% | Some novel structure; at least one contract change |
| **L** | 9–10 | 14–22 | ~40% | New architectural surface; multiple contracts; adversarial review mandatory on most cards |
| **XL** | — | — | — | **Not permitted.** Split the sprint |

The Pro-model share is a planning signal, not a quota: it estimates how much of the sprint needs Gemini 3.1 Pro rather than Flash High (`12` §3). A sprint estimated at 0% Pro that in practice needed 50% is a signal the specification was thinner than it looked, and is worth recording at sprint close.

## 3. The No-Carry Rule

**Unfinished work never crosses a sprint boundary as unfinished work.**

When a task is not done at sprint close, exactly one of these happens — never a fourth option:

1. **The sprint extends** by up to half a day to finish it. Permitted once per sprint, never twice.
2. **The task is split.** The completed part is closed and merged; the remainder becomes a **new card with a new ID** in the next sprint, with its own acceptance criteria. The original card is closed as `split → T-Sxx-yy`.
3. **The task is cancelled** and the partial work reverted.

What is prohibited is the fourth option everyone reaches for: leaving the card open, half-merged, and "picking it up next sprint." Under AI-assisted development this is uniquely destructive, because the next session has no reliable way to discover what was left undone. A human remembers; a fresh context window does not. `docs/impl/SESSION_LOG.md` mitigates interruption *within* a task (`12` §10), but it is not a substitute for closing one.

## 4. Sprint Ritual

Four steps. Roughly 40 minutes of overhead per sprint, which buys back multiples of itself.

**Open (~15 min).** Confirm the previous sprint closed clean and `main` is green on `make verify-full`. Read the sprint's objectives and its task cards end to end. Confirm every card's dependencies are merged. Confirm every card names its Context Packs and invariants. Any card failing that check is rewritten before the sprint starts, not during it.

**Execute.** The `08` §19 loop, one card at a time. Cards run in ID order unless the sprint states otherwise. Merge on green.

**Verify.** Run the sprint's Validation block. Demonstrate the success criteria — run it, do not assert it.

**Close (~20 min).** Confirm zero carry. Append the sprint summary to `docs/impl/LEDGER.md`. Update `09` where reality diverged. Record the actual Pro-model share against the estimate. Reset `SESSION_LOG.md`.

## 5. Standing Requirements

These apply to every sprint below and are not repeated in each entry.

- **Required documentation** always includes `CTX-CORE` (`08` §9.2). Sprint entries list only the *additional* packs.
- **Every sprint's validation** includes `make verify-full` green on `main`.
- **Every sprint's review** includes `06` §19's checklist and the Task DoD (`08` §14.1) for each card.
- **Adversarial review (`12` §11.2) is mandatory** for any card touching auth, tenancy, RLS, `claude_service.py`, a rules engine, or the DAG.
- **Contract regeneration** (`make contract`) is required in any sprint changing an endpoint's request or response shape, and gate G6 blocks without it.

---

# Phase F0 — Bootstrap

## S01 — Repository, Toolchain & DevOS Bootstrap

**Objectives.** Produce a repository where a task card can be executed and verified with zero setup improvisation. Establish strict typing and all seven CI gates before any product code exists.

**Complexity.** M — 8 cards, ~10 sessions, ~20% Pro (CI and contract tooling are novel structure; the rest is mechanical).

**Deliverables.**
- Monorepo skeleton matching `06` §1 / `03` §2 / `02` §2 exactly
- `docker-compose.yml` (postgres, redis); `.env.example` covering all of `03` §11
- Backend toolchain: `ruff`, `mypy` strict, `pytest` with `unit`/`tenancy`/`contract` markers
- Frontend toolchain: Next.js 14, TS strict, Tailwind, shadcn init, ESLint strict, Prettier, Vitest + RTL, Playwright
- `Makefile`: `verify`, `verify-full`, `contract`, `migrate`, `dev`, `test`
- CI workflow with gates G1–G7 (`08` §12.1)
- Contract tooling: OpenAPI export + TS type generation + snapshot diff
- DevOS control files: `AGENTS.md`, `docs/impl/*`
- Pre-commit hooks including `detect-secrets`

**Required documentation.** `06` §1–§4, §16; `03` §2, §11; `02` §2; `08` §8, §9, §17.

**Expected files.**
```
AGENTS.md · Makefile · docker-compose.yml · .env.example · .gitignore
.pre-commit-config.yaml · .github/workflows/ci.yml
backend/{requirements.txt,pyproject.toml,Dockerfile,app/{main.py,config.py},tests/conftest.py}
frontend/{package.json,tsconfig.json,tailwind.config.ts,.eslintrc.json,vitest.config.ts,playwright.config.ts,app/layout.tsx}
scripts/{export_openapi.py,generate_types.sh,check_agents_md_length.sh}
docs/impl/{INVARIANTS.md,CONTEXT_PACKS.md,LEDGER.md,SESSION_LOG.md,AMENDMENTS.md,BLOCKERS.md,DECISIONS/.gitkeep}
docs/contracts/openapi.json
```

**Success criteria.** `git clone && make dev` boots all four services after filling `.env` only. `make verify` green in under 90s. A deliberate lint error, a fake secret, and a hand-edited contract snapshot each fail CI on the correct gate.

**Validation.**
- [ ] Directory tree matches `03` §2, `02` §2, `06` §1 with no invented folders
- [ ] `mypy` strict and TS strict both confirmed by a failing test case
- [ ] All seven gates present, blocking, and demonstrated failing
- [ ] `AGENTS.md` under 150 lines, enforced by CI
- [ ] `INVARIANTS.md` contains INV-01..INV-30 verbatim from `08` §8

**Review.** No secrets committed; `.env` gitignored in the initial commit; frozen docs committed unmodified; no toolchain leniency accepted "for now" (`09` F0 risk 1).

---

# Phase F1 — Data Layer & Tenancy

## S02 — Schema, Migrations, RLS & Tenancy Harness

**Objectives.** The complete database from `03` §4.1 and §4.2 exists with RLS, and cross-tenant access is provably impossible at both layers independently.

**Complexity.** M — 7 cards, ~11 sessions, ~35% Pro (RLS policy authoring is Pro work; models are Flash work).

**Deliverables.**
- SQLAlchemy 2.0 async models for all seven tables, including `members`
- `findings.previous_status`, `findings.false_positive_reason`
- Alembic migrations with `ENABLE ROW LEVEL SECURITY` in the same migration as each table
- RLS policies per `07` §6, including the Celery service-role bypass
- `app/database.py`, `get_db_session`, `app/config.py`
- Tenancy suite (`pytest -m tenancy`) testing both layers independently
- Two-org seed script

**Required documentation.** `03` §4.1, §4.2, §3; `07` §5, §6, §9, §10; `06` §6, §10.

**Expected files.**
```
backend/app/database.py · backend/app/config.py
backend/app/models/{organization,member,asset,scan,finding,compliance,notification}.py
backend/migrations/versions/*_initial_schema.py · *_rls_policies.py
backend/tests/tenancy/test_isolation.py · backend/tests/conftest.py
backend/scripts/seed.py
```

**Success criteria.** `alembic upgrade head` produces a schema with an empty diff against `03` §4.1. The tenancy suite passes, and dropping any single RLS policy makes it fail.

**Validation.**
- [ ] Every column, type, default, and `UNIQUE` constraint matches `03` §4.1 exactly
- [ ] Every `ENABLE ROW LEVEL SECURITY` line has a corresponding `CREATE POLICY`
- [ ] Application-layer isolation tested with RLS disabled; RLS tested with the app filter bypassed
- [ ] Negative assertions present (Org A reading Org B returns zero rows)
- [ ] `alembic downgrade base && alembic upgrade head` clean
- [ ] Service-role bypass unusable from an API session — tested

**Review.** Hand-verified migrations (`06` §10.1); no table beyond `03` §4 without an ADR; CP-Security run.

---

# Phase F2 — Auth & Shell

## S03 — Authentication, Authorization & Application Shell

**Objectives.** Signup through login works; `get_current_org` and `require_role` exist and are the reference implementation every later endpoint copies; the role-aware shell renders.

**Complexity.** L — 9 cards, ~16 sessions, ~40% Pro (JWT claim population and the RBAC matrix are Pro work).

**Deliverables.**
- `POST /auth/register`, `/auth/login`, `/auth/refresh`
- `get_current_org` per `03` §3 — identity from `sub`, `org_id` from the custom claim populated after `members` validation, **never parsed from `sub`**
- `require_role(*roles)` from `07` §4's matrix
- Session management (`07` §7), auth-route rate limiting (`07` §17)
- `routers/org.py` with `GET /org/me` as the reference router
- `(auth)` route group: Login, Signup, Forgot Password, Reset Password, Verify Email
- `middleware.ts` auth redirect + locale detection
- `(app)` layout: role-aware Sidebar (`01` §4 groups), Header with inert OrgSwitcher, notification bell, user menu
- `next-themes`, dark default, explicit light toggle, no system auto-detect
- Root layout with theme provider and Query client; typed API client base

**Required documentation.** `03` §3, §5 (AUTH, ORGANISATION); `07` §3, §4, §7, §12, §17; `01` §4, §7 (Signup, Login, Forgot/Reset, Email Verification); `02` §2, §3, §8; `05` §4.19.

**Expected files.**
```
backend/app/routers/{auth.py,org.py} · backend/app/dependencies/{auth.py,roles.py}
backend/tests/api/{test_auth.py,test_org_me.py,test_role_gating.py}
frontend/middleware.ts · frontend/app/layout.tsx
frontend/app/(auth)/{layout.tsx,login,signup,forgot-password,reset-password,verify-email}/page.tsx
frontend/app/(app)/layout.tsx
frontend/components/layout/{Sidebar.tsx,Header.tsx,OrgSwitcher.tsx,UserMenu.tsx}
frontend/lib/api/client.ts · frontend/lib/schemas/auth.ts
```

**Success criteria.** Signup → verification → login → `/dashboard` shell renders with role-appropriate navigation. An unauthenticated `(app)` request redirects. `GET /org/me` with Org A's token cannot read Org B.

**Validation.**
- [ ] 401 without a token on every authenticated route — tested
- [ ] `require_role` tested in both directions for every role in `07` §4
- [ ] Client-supplied `org_id` ignored, not honoured — tested
- [ ] Sidebar hides unavailable controls rather than disabling them (`01` §4)
- [ ] One primary CTA and at most one secondary link per auth screen
- [ ] Auth rate limits enforced and tested
- [ ] Every auth screen implements loading, error, empty, success (`INV-25`)

**Review.** Adversarial review mandatory on the `get_current_org` card. No hand-rolled `org_id` filter anywhere. CP-Security run.

---

# Phase F3 — Design System

## S04 — Tokens, Primitives & Shared Components

**Objectives.** `05_DESIGN_SYSTEM.md` exists as code, with a gallery route that makes every component discoverable — the countermeasure to `INV-22` duplication.

**Complexity.** M — 8 cards, ~13 sessions, ~15% Pro.

**Deliverables.**
- All `05` §3 tokens as CSS custom properties + Tailwind theme; `05` §1.1 type scale
- shadcn primitives in `components/ui/`, token-sourced, per `05` §4.1–§4.19
- Shared components: `EmptyState`, `Skeleton`, `DataChart`, `MarkdownViewer`, `JSONViewer`, `CodeBlock`, `SeverityBadge`, `RoleBadge`
- `ConsentCheckbox` per `05` §4.9
- Dev-only component gallery route
- `axe-core` in CI against the gallery

**Required documentation.** `05` §1, §3, §4, §7, §8; `02` §6, §8, §9, §10, §12; `01` §11.

**Expected files.**
```
frontend/app/globals.css · frontend/tailwind.config.ts
frontend/components/ui/*.tsx
frontend/components/shared/{EmptyState,Skeleton,DataChart,MarkdownViewer,JSONViewer,CodeBlock}.tsx
frontend/components/findings/SeverityBadge.tsx · frontend/components/org/RoleBadge.tsx
frontend/components/onboarding/ConsentCheckbox.tsx
frontend/app/(dev)/gallery/page.tsx
frontend/tests/components/*.test.tsx
```

**Success criteria.** The gallery renders every primitive in every variant in both themes, axe-clean, with zero hex literals or arbitrary pixel values outside the token definitions.

**Validation.**
- [ ] Token values match `05` §3 exactly
- [ ] Contrast pairs meet WCAG 2.1 AA in both themes
- [ ] No status or severity signalled by colour alone (`INV-28`)
- [ ] `DataChart` is the only Recharts import site, dynamically imported (`INV-24`)
- [ ] `MarkdownViewer` renders a hostile markdown fixture safely (`INV-27`)
- [ ] `prefers-reduced-motion` respected by every animated primitive

**Review.** No feature-specific component built here; every primitive covers the variants in its `05` §4 subsection; automated no-hex check passes.

---

# Phase F4 — Org, Onboarding & Domain Verification

## S05 — Organization API & Domain Verification

**Objectives.** Domain ownership can be proven by both methods, and the API refuses to let anything downstream proceed without it.

**Complexity.** M — 7 cards, ~12 sessions, ~25% Pro.

**Deliverables.**
- `PUT /org/me`, `DELETE /org/me` (DPDP erasure workflow, owner-gated)
- `POST /org/me/domain/verify-token`, `POST /org/me/domain/verify-check`
- `POST /org/me/assets`, `GET /org/me/assets`
- Organization Setup and Domain Verification screens per `01` §7
- `DomainVerificationInstruction` + `CodeBlock` with thumb-reachable mobile copy
- Contract regenerated; typed clients and query hooks

**Required documentation.** `03` §3, §5 (ORGANISATION), §5.1; `01` §7 (Organization Setup, Domain Verification); `02` §3, §5, §7; `07` §10, §19; `05` §4.2, §4.12.

**Expected files.**
```
backend/app/routers/org.py (extend) · backend/app/services/domain_verification.py
backend/tests/api/test_domain_verification.py
frontend/app/(onboarding)/{organization,domain-verification}/page.tsx
frontend/components/onboarding/DomainVerificationInstruction.tsx
frontend/lib/{api/org.ts,queries/useOrg.ts,schemas/domain-verification.ts}
docs/contracts/openapi.json (regenerated)
```

**Success criteria.** Both verification methods complete end to end. An unverified org cannot proceed past this step, enforced at the API.

**Validation.**
- [ ] DNS TXT and well-known-file paths both work
- [ ] Verification-pending is presented distinctly from verification-failed (`09` F4 risk 4)
- [ ] Mobile copy action is thumb-reachable per `01` §7 / `02` §11
- [ ] `DELETE /org/me` is owner-gated and triggers the erasure workflow
- [ ] No hand-written response interface (`INV-19`)
- [ ] All specified screen states implemented

**Review.** No client-supplied `org_id`; zod schemas in `lib/schemas/`; contract regenerated.

## S06 — Notification Setup, Consent & Onboarding Guard

**Objectives.** WhatsApp consent is captured as a legally-weighted event, and the onboarding chain is linear and server-enforced.

**Complexity.** S — 6 cards, ~9 sessions, ~20% Pro (consent lifecycle semantics are Pro work).

**Deliverables.**
- Consent lifecycle written to `organizations.settings` as `{ whatsapp_consent, whatsapp_consent_at }` (`03` §4.2), with `07`'s semantics
- Notification Setup screen per `01` §7 using `ConsentCheckbox` and `PhoneInput`
- `notificationSetupSchema` with the `refine` requiring consent when a number is present (`02` §7)
- API-layer consent validation mirroring the client schema
- `(onboarding)` layout server-side linear step guard (`02` §3)
- First Scan and First Report Reveal screen shells, completed in S12/S15

**Required documentation.** `01` §7 (Notification Setup, First Scan, First Report Reveal); `02` §3, §7; `03` §4.2, §5; `05` §4.9; `07` consent sections.

**Expected files.**
```
backend/app/routers/org.py (extend) · backend/tests/api/test_consent.py
frontend/app/(onboarding)/layout.tsx
frontend/app/(onboarding)/{notifications,first-scan,first-report}/page.tsx
frontend/lib/schemas/notification-setup.ts
frontend/tests/e2e/onboarding.spec.ts
```

**Success criteria.** A WhatsApp number cannot be saved without consent, at both layers. Deep-linking to `first-scan` before verification redirects backward, server-side.

**Validation.**
- [ ] Consent bypass rejected by client schema **and** API
- [ ] Consent stored with timestamp in `settings`, not a new column (`INV-15`)
- [ ] Legal copy is real body text (`05` §4.9), not a tooltip
- [ ] Step guard is server-side; forward deep-link redirects
- [ ] E2E covers the full onboarding chain

**Review.** Adversarial review on the consent card; atomic settings write; guard logic in the layout, not duplicated per page.

---

# Phase F5 — Rules Engines

## S07 — Deterministic Rules Engines

**Objectives.** The product's security judgement exists as pure functions with effectively 100% branch coverage, and nothing in `rules/` can reach an LLM or an I/O boundary.

**Complexity.** M — 6 cards, ~10 sessions, ~30% Pro (risk scoring is Pro work; the threshold engines are Flash work).

**Deliverables.**
- `rules/ssl_rules.py`, `rules/dns_rules.py`, `rules/asset_rules.py`, `rules/scoring_rules.py`
- Unit tests covering every severity branch in the `04` §6 tables for Agents 1, 3, 4, 9
- `finding_type` registry test: exact documented set, snake_case, no duplicates
- Import-boundary lint rule forbidding service, ORM, LangGraph, and `anthropic` imports from `rules/`

**Required documentation.** `04` §1, §5, §6 (Agents 1, 3, 4, 9 tables verbatim), §13; `06` §5, §10.4, §12.

**Expected files.**
```
backend/app/rules/{__init__,ssl_rules,dns_rules,asset_rules,scoring_rules}.py
backend/tests/rules/{test_ssl_rules,test_dns_rules,test_asset_rules,test_scoring_rules}.py
backend/tests/rules/test_finding_type_registry.py
backend/pyproject.toml (import-linter config)
```

**Success criteria.** `pytest -m unit backend/tests/rules` green with effectively 100% branch coverage. Every threshold in the spec tables has a named test case.

**Validation.**
- [ ] Test cases derived from the `04` §6 tables, not from the implementation (`08` §11.1)
- [ ] All rules functions synchronous and side-effect-free — no clock, no randomness, no I/O
- [ ] Import-boundary rule fails CI on a deliberate `anthropic` import
- [ ] Security Health band is a transform of `RiskScore.band`, not a second algorithm (`04` §13)
- [ ] Emitted `finding_type` values recorded in the LEDGER (`08` §16.3)

**Review.** Adversarial review mandatory on every card in this sprint — a wrong threshold is a silent product-correctness bug (`06` §10.4).

---

# Phase F6 — Service Clients

## S08 — External Service Clients & Fixtures

**Objectives.** Every external dependency sits behind a plain-dict boundary with a committed fixture, so no test ever reaches the network.

**Complexity.** M — 6 cards, ~10 sessions, ~15% Pro.

**Deliverables.**
- `services/`: asset discovery sources, `ssl_labs_service.py`, DNS resolution, `whatsapp_service.py`, `email_service.py`
- Committed fixtures captured from real responses
- Timeout/retry/rate-limit handling with the `06` §14 retryable-vs-auth distinction
- Structured logging with `org_id` (`06` §13)
- **Long-lead item:** WhatsApp template submitted to Meta for approval in this sprint (`09` F12 risk 1)

**Required documentation.** `03` §7, §8, §10, §11; `06` §10.3, §12, §13, §14; `07` §8, §12.

**Expected files.**
```
backend/app/services/{ssl_labs_service,dns_service,asset_discovery_service,whatsapp_service,email_service}.py
backend/tests/services/*.py · backend/tests/services/fixtures/*.json
backend/app/logging_config.py
```

**Success criteria.** Full test suite passes with networking disabled. Every client returns a plain dict.

**Validation.**
- [ ] No provider SDK type in any signature outside `services/` (`INV-13`)
- [ ] Fixtures captured from real responses, with the capture noted in the LEDGER
- [ ] Timeout/rate-limit → `WARNING` + retry; auth failure → `ERROR`, no retry (`06` §14)
- [ ] No credential in code; no credential in logs
- [ ] WhatsApp template submitted, with the submission date recorded

**Review.** One module per provider; fixture pattern enforced; no live calls in CI (`06` §21).

---

# Phase F7 — Claude Boundary

## S09 — `claude_service.py` and the LLM Boundary

**Objectives.** Close the Claude boundary permanently and make `INV-01` mechanically enforced rather than review-dependent.

**Complexity.** M — 6 cards, ~11 sessions, ~50% Pro (prompt design and injection defence are Pro work).

**Deliverables.**
- `services/claude_service.py` with the `04` §7 functions: `explain_finding`, `generate_remediation`, `generate_whatsapp_summary`, executive summary. DPDP narrative declared, activated in S25
- Prompts owned by this module; none inline in a node
- Finding-shape cache key per `04` §7.1 and §13
- Prompt-injection defences (`07` §14); output validation (`07` §20)
- Graceful degradation: a Claude failure never fails a scan
- Logging per `INV-30`
- CI check that `anthropic` is imported nowhere else

**Required documentation.** `04` §1, §7 (all subsections), §13; `03` §9, §10; `07` §13, §14, §15, §16, §20, §31; `06` §17.

**Expected files.**
```
backend/app/services/claude_service.py · backend/app/services/prompts/*.py
backend/app/services/llm_cache.py
backend/tests/services/test_claude_service.py
backend/tests/services/fixtures/injection_payloads.json
.github/workflows/ci.yml (extend: anthropic import check)
```

**Success criteria.** Four callable functions, cached, defended, tested against mocks. `grep -r "anthropic" backend/app` returns only this module, and CI enforces it.

**Validation.**
- [ ] No prompt string outside this module
- [ ] Cache key derived from finding shape, not `org_id`; two orgs with identical shapes hit the same entry
- [ ] Cached content carries no tenant-identifying data
- [ ] Injection fixtures do not alter behaviour
- [ ] Output validation rejects malformed responses without raising into the pipeline
- [ ] Pipeline completes with the Claude client hard-failing
- [ ] No full prompt or response logged above `DEBUG`

**Review.** Adversarial review mandatory on every card. No function accepts a parameter that could let it influence severity (`INV-02`). CP-Security run.

---

# Phase F8 — Pipeline & Scan Execution

## S10 — Agent State & MVP Nodes

**Objectives.** The six MVP agent nodes exist, each following the `04` §5 pattern, each absorbing its own failures.

**Complexity.** L — 7 cards, ~14 sessions, ~35% Pro.

**Deliverables.**
- `agents/state.py` — `AgentState` **complete** per `04` §4, including Phase 2/3 fields
- Nodes: `asset_discovery`, `ssl_analyzer`, `dns_analyzer`, `risk_scoring`, `recovery_recommendation`, `notification`
- Each wires fetch → rules → `Finding` construction with try/except per item
- Node tests asserting a raising service is absorbed into `state["errors"]`

**Required documentation.** `04` §3, §4, §5, §6 (Agents 1, 3, 4, 9, 12, 13), §11; `03` §6; `06` §11.

**Expected files.**
```
backend/app/agents/{state,asset_discovery,ssl_analyzer,dns_analyzer,risk_scoring,recovery_recommendation,notification}.py
backend/tests/agents/test_*.py
```

**Success criteria.** Each node runs against fixtures and produces `Finding` objects. No node raises under any service failure.

**Validation.**
- [ ] `AgentState` matches `04` §4 field for field, including unused Phase 2/3 fields (`08` §7.2)
- [ ] Per-item try/except in every node; failure appends to `state["errors"]` (`INV-06`)
- [ ] Nodes consume `rules/` functions; none reimplements a rule
- [ ] No Claude call outside `claude_service.py` (`INV-01`)
- [ ] Per-agent duration logged

**Review.** Adversarial review on every node card. Node responsibilities match `04` §6 exactly.

## S11 — Pipeline, Celery Execution & Partial Failure

**Objectives.** A scan runs end to end, persists correctly, and behaves exactly as `04` §11 specifies under partial failure.

**Complexity.** L — 7 cards, ~15 sessions, ~40% Pro.

**Deliverables.**
- `agents/pipeline.py` — one builder, MVP node set, edges as a subset of the `04` §3 DAG
- `celery_worker.py` with `run_full_scan` and the Sunday 02:00 IST schedule (`03` §6.1)
- Scan persistence: `langgraph_state`, `findings_summary`, `risk_score`, timestamps, `error_log`
- Partial-failure tests (`08` §7.5), all three
- Five MVP IR playbooks (`04` §9)
- `finding_type` ↔ playbook contract test (`INV-08`)
- Worker session using the service-role bypass from S02 only

**Required documentation.** `04` §3, §9, §11, §12; `03` §6, §6.1, §6.2; `06` §11, §13, §17, §22.

**Expected files.**
```
backend/app/agents/pipeline.py · backend/celery_worker.py
backend/app/services/scan_persistence.py
playbooks/{ssl_expired,open_database_port,email_breach,no_spf_dmarc,dpdp_violation}.yaml
backend/tests/agents/{test_pipeline.py,test_partial_failure.py,test_playbook_contract.py}
```

**Success criteria.** A triggered scan completes, persists findings and a risk score, and reaches `notification` even with an agent failing.

**Validation.**
- [ ] Exactly one graph builder exists (`09` F8 risk 1)
- [ ] Phase 1 agents wire directly to `risk_scoring` per `04` §3's subset rule
- [ ] `completed` + non-empty `error_log` persists as `completed`, not `failed` (`INV-07`)
- [ ] `failed` occurs only for failures outside a node's try/except
- [ ] Every `finding_type` from S07 has a matching playbook trigger
- [ ] Worker uses the service-role session; tenancy suite still green
- [ ] Scan-level timeout writes `failed` with an `error_log` rather than hanging (`06` §22)

**Review.** Adversarial review on the pipeline and Celery cards. Edge placement matches each agent's phase. CP-Security run (worker credentials).

---

# Phase F9 — Scans API & Live Scan UI

## S12 — Scans Endpoints, Live Scan & Scan History

**Objectives.** The live-scan moment works — the product's first real moment of value (`01` §3) — and partial results are visibly partial.

**Complexity.** L — 8 cards, ~15 sessions, ~25% Pro.

**Deliverables.**
- `POST /scans/trigger` (rejects unverified domains; enforces plan quota), `GET /scans`, `GET /scans/{id}`, `GET /scans/{id}/report`
- `POST /webhooks/scan-status`, signature-validated
- Scan Detail (live + completed) per `01` §9
- `AgentStatusList`, `ScanProgressIndicator` with Framer Motion, gated by `useReducedMotion`
- Polling via `refetchInterval` function, 2s running, stopped on terminal (`02` §5)
- Partial-failure enforcement in the query `select` (`INV-07`)
- Scans History screen
- First Scan onboarding screen completed against the real pipeline

**Required documentation.** `03` §5 (SCANS, WEBHOOKS), §5.1, §6.2; `01` §7 (First Scan), §9 (Scans Detail, Scans History); `02` §3, §5, §10, §12; `04` §11; `05` §4.21, §7.7.

**Expected files.**
```
backend/app/routers/{scans.py,webhooks.py} · backend/tests/api/test_scans.py
frontend/app/(app)/scans/{page.tsx,[id]/page.tsx,[id]/loading.tsx,[id]/error.tsx}
frontend/components/scans/{AgentStatusList,ScanProgressIndicator}.tsx
frontend/lib/{api/scans.ts,queries/useScan.ts,queries/useScans.ts}
frontend/tests/e2e/first-scan.spec.ts
docs/contracts/openapi.json (regenerated)
```

**Success criteria.** Triggering a scan shows live per-agent progress and resolves to a readable result. A partial scan reads as partial, never as clean success.

**Validation.**
- [ ] Polling stops on `completed` and `failed`; no `setInterval`
- [ ] Partial state enforced in `select`, so no component can skip the check
- [ ] All scan states implemented: queued, running, completed, partial, failed
- [ ] `/scans/:id` is a server-rendered deep link; back returns to the list's filtered state
- [ ] Quota Exceeded and Permission Denied render as designed states
- [ ] `aria-live="polite"` on progress; motion respects `prefers-reduced-motion`
- [ ] `loading.tsx` renders this screen's skeleton, not a spinner
- [ ] Progress derived from persisted agent state, never choreographed (`09` F9 risk 3)

**Review.** Query key `['scans', orgId, ...]`; no `fetch` in feature components; webhook signature validated.

---

# Phase F10 — Findings

## S13 — Findings API & Lifecycle

**Objectives.** The findings contract, including the regression and false-positive semantics `03` §4.2 introduced.

**Complexity.** S — 5 cards, ~8 sessions, ~20% Pro.

**Deliverables.**
- `GET /findings` with filters matching `01`'s filter-bar names one-to-one, paginated
- `GET /findings/{id}` with joined asset context via explicit eager loading
- `PUT /findings/{id}/status` returning the updated resource, requiring `false_positive_reason`
- `previous_status` maintenance; `regressed` computed at the API layer, never stored

**Required documentation.** `03` §4.2, §5 (FINDINGS), §5.1; `01` §12 (Finding Lifecycle); `04` §10; `06` §17.

**Expected files.**
```
backend/app/routers/findings.py · backend/app/services/finding_lifecycle.py
backend/tests/api/{test_findings.py,test_finding_status.py}
docs/contracts/openapi.json (regenerated)
```

**Success criteria.** Every lifecycle transition in `01` §12 works, with regression and false-positive paths covered.

**Validation.**
- [ ] Filter param names match `01`'s filter bar exactly; no translation layer
- [ ] `false_positive` without a reason rejected by the API
- [ ] `previous_status = resolved` + `status = open` returns the regressed label
- [ ] `regressed` never persisted as a status value (`09` F10 risk 1)
- [ ] No N+1 on detail; explicit `joinedload`/`selectinload`
- [ ] Paginated envelope `{ items, total, limit, offset }` (`INV-11`)

**Review.** Adversarial review on the lifecycle card; mutation returns the updated resource.

## S14 — Findings List & Finding Detail

**Objectives.** The primary action queue: filterable, deep-linkable, readable, actionable.

**Complexity.** M — 7 cards, ~12 sessions, ~15% Pro.

**Deliverables.**
- Findings List per `01` §9: `FilterBar`, `FindingCard`, `SeverityBadge`, `Pagination`, `EmptyState`
- Filter and pagination state in URL search params (`INV-20`)
- Finding Detail per `01` §9: `MarkdownViewer` explanation, `JSONViewer` raw evidence, ordered-list remediation, `FindingStatusControl`
- Optimistic status updates with rollback and list invalidation (`02` §5)
- False-positive reason capture flow
- Graceful degradation when `plain_explanation` is absent

**Required documentation.** `01` §9 (Findings List, Finding Detail), §11, §12; `02` §4, §5, §6; `05` §4.14, §4.16, §4.20; `06` §22.

**Expected files.**
```
frontend/app/(app)/findings/{page.tsx,[id]/page.tsx,loading.tsx,error.tsx}
frontend/components/findings/{FindingCard,FindingStatusControl,FilterBar,FalsePositiveDialog}.tsx
frontend/lib/{api/findings.ts,queries/useFindings.ts,queries/useFinding.ts,schemas/finding-status.ts}
frontend/tests/e2e/finding-lifecycle.spec.ts
```

**Success criteria.** A user filters to critical open findings, opens one, reads the explanation, follows remediation, and resolves it — with the list reflecting it immediately and correctly.

**Validation.**
- [ ] A copied filtered URL reproduces the view in a fresh session — E2E tested
- [ ] Back from detail returns to the filtered list state (`01` §4)
- [ ] Optimistic update rolls back on error, invalidates the list on success
- [ ] Missing `plain_explanation` still renders evidence and remediation
- [ ] Remediation uses ordered-list markup
- [ ] Severity never colour-only
- [ ] Single `FindingCard` and `SeverityBadge` implementation (`INV-22`)
- [ ] All specified states implemented for both screens

**Review.** Claude content rendered only via `MarkdownViewer`; query keys include `orgId` and all filter params.

---

# Phase F11 — Dashboard

## S15 — Dashboard & First Report Reveal

**Objectives.** The daily-use home screen and the first-value moment, framed as `01` §8 specifies — calm, not dramatic.

**Complexity.** M — 6 cards, ~10 sessions, ~20% Pro.

**Deliverables.**
- `GET /dashboard/summary`, `GET /dashboard/assets`
- Dashboard per `01` §8 and `05` §6: `SecurityHealthStatus`, `RiskScoreGauge`, `TrendSparkline`
- Priority-ordered single-column mobile stack (`01` §8, `02` §11)
- First Report Reveal screen with its guided next action
- Security Health band as a presentation transform of `RiskScore.band` (`04` §13)

**Required documentation.** `01` §7 (First Report Reveal), §8; `02` §9, §10, §11, §14; `03` §5 (DASHBOARD); `04` §13; `05` §6, §7.1, §7.7.

**Expected files.**
```
backend/app/routers/dashboard.py · backend/tests/api/test_dashboard.py
frontend/app/(app)/dashboard/{page.tsx,loading.tsx,error.tsx}
frontend/app/(onboarding)/first-report/page.tsx (complete)
frontend/components/dashboard/{SecurityHealthStatus,RiskScoreGauge,TrendSparkline}.tsx
frontend/lib/queries/useDashboard.ts
docs/contracts/openapi.json (regenerated)
```

**Success criteria.** A returning user knows their state in one glance. LCP < 2.5s, INP < 200ms, CLS < 0.1 on Dashboard.

**Validation.**
- [ ] The risk score does not animate or count up (`02` §10 — a deliberate product decision)
- [ ] No second scoring path anywhere in the API or frontend
- [ ] `05` §6's dashboard rules followed
- [ ] Mobile stack is priority-ordered, not a naive reflow
- [ ] Zero-findings empty state is designed, not a blank grid
- [ ] Recharts only inside `DataChart`, dynamically imported
- [ ] Gate G5 green on Dashboard

**Review.** No new scoring logic; performance budget green; all states present.

---

# Phase F12 — Notification Delivery

## S16 — WhatsApp, Email, Webhook & Notifications Log

**Objectives.** Close the WhatsApp-first alerting loop with an auditable log and no send without consent.

**Complexity.** M — 7 cards, ~12 sessions, ~25% Pro.

**Deliverables.**
- WhatsApp delivery per `03` §7.1 with the §7.2 template, gated on stored consent
- Email delivery per `03` §7.3
- `POST /webhooks/whatsapp` handling inbound replies, signature-validated
- `GET /notifications`, `POST /notifications/test`
- Notifications Log screen per `01` §9
- Every send persisted with channel, content, status, and provider `meta`
- Delivery-failure recording and retry policy

**Required documentation.** `03` §5 (NOTIFICATIONS, WEBHOOKS), §7; `04` §7.4; `01` §9 (Notifications Log), §12 (Notification Delivery Flow); `07` consent and webhook sections.

**Expected files.**
```
backend/app/routers/notifications.py · backend/app/routers/webhooks.py (extend)
backend/app/services/notification_dispatch.py
backend/tests/api/{test_notifications.py,test_whatsapp_webhook.py}
frontend/app/(app)/notifications/page.tsx
frontend/lib/queries/useNotifications.ts
```

**Success criteria.** A completed scan produces a WhatsApp message generated by `generate_whatsapp_summary`, containing no finding absent from the report.

**Validation.**
- [ ] No send without stored consent — tested at the service boundary, not the caller
- [ ] Summary content asserted against report finding IDs (`04` §1)
- [ ] Inbound webhook signature validated before processing
- [ ] Every send logged, including failures
- [ ] `POST /notifications/test` role-gated, sends both channels
- [ ] Template matches the Meta-approved version exactly
- [ ] Opt-out honoured immediately and permanently

**Review.** Adversarial review on consent enforcement and the webhook. Summary generated only through `claude_service.py`. CP-Security run.

---

# Phase F13 — Remaining Application Screens

## S17 — Settings, Assets, Team & Roles, Profile

**Objectives.** The product becomes administrable. Role gating is enforced at the API for every member operation.

**Complexity.** L — 8 cards, ~13 sessions, ~20% Pro.

**Deliverables.**
- Settings per `01` §9 with Danger Zone
- Assets per `01` §9 with whitelisting
- `GET/POST/PUT/DELETE /org/me/members*`; Team & Roles with `MemberRow`, `RoleBadge`, `InviteForm`
- Application-layer sole-owner protection (`03` §4.2)
- Profile per `01` §9
- Permission Denied and Quota Exceeded as states

**Required documentation.** `01` §9 (Settings, Assets, Team & Roles, Profile), §3 (System); `03` §4.2, §5 (MEMBERS); `07` §4; `05` §4.14, §4.18; `06` §15.

**Expected files.**
```
backend/app/routers/org.py (extend: members) · backend/tests/api/test_members.py
frontend/app/(app)/{settings,assets,team,profile}/page.tsx
frontend/components/org/{MemberRow,InviteForm,DangerZone}.tsx
frontend/components/shared/{PermissionDenied,QuotaExceeded}.tsx
frontend/lib/queries/{useMembers.ts,useAssets.ts}
docs/contracts/openapi.json (regenerated)
```

**Success criteria.** An owner manages settings, assets, and members. Role gating holds at the API regardless of what the UI shows.

**Validation.**
- [ ] Sole-owner demotion and removal both rejected at the API with a clear error
- [ ] Every member endpoint tested in both role directions
- [ ] Scan-schedule changes written to `organizations.settings` (`INV-15`)
- [ ] Danger Zone uses a blocking Modal (`05` §4.18)
- [ ] A role that cannot act does not see a bare disabled button (`01` §4)
- [ ] Whitelisted assets honoured by the next scan
- [ ] All specified states implemented

**Review.** `require_role` on every member mutation; no ad-hoc settings columns; deletion only via the F4 erasure path.

---

# Phase F14 — Marketing & System

## S18 — Landing, Marketing, Legal & System Screens

**Objectives.** A public surface that describes what actually ships, plus the legal pages that domain verification lawfully requires.

**Complexity.** M — 7 cards, ~11 sessions, ~10% Pro.

**Deliverables.**
- Landing Page per `01` §6 with marketing nav and footer
- Pricing, About, Contact, Legal (Privacy, Terms, Scanning Policy, DPA)
- 404, Maintenance
- `(marketing)` layout with chrome that never leaks into `(app)`
- `next-intl` with `en` shipped and `hi` routing ready

**Required documentation.** `01` §3 (Marketing, System), §4, §6; `02` §2, §11, §13, §14; `05` §2, §4, §6.

**Expected files.**
```
frontend/app/(marketing)/{layout.tsx,page.tsx,pricing,about,contact,legal/[slug]}/page.tsx
frontend/app/{not-found.tsx,maintenance/page.tsx}
frontend/messages/en.json · frontend/i18n.ts
frontend/components/layout/{MarketingNav,Footer}.tsx
```

**Success criteria.** A visitor lands, understands the offer, and reaches signup. Legal pages are complete and linked from both the footer and onboarding.

**Validation.**
- [ ] Section order and CTA hierarchy match `01` §6
- [ ] Exactly one visually dominant CTA per section
- [ ] No marketing chrome inside `(app)`; no app chrome in `(marketing)`
- [ ] Legal content complete, not placeholder — a hard blocker (`09` F14 risk 2)
- [ ] Gate G5 green on Landing; routes axe-clean
- [ ] No hardcoded UI string bypassing `next-intl`
- [ ] Every product claim verified against what F8–F13 actually ship

**Review.** Claims cross-checked against `01` §3's phase column; images via `next/image`.

---

# Phase F15 — MVP Hardening

## S19 — Security, Performance & Accessibility Hardening

**Objectives.** Pass `07` §33 and the performance and accessibility budgets — on evidence, not assertion.

**Complexity.** M — 6 cards, ~12 sessions, ~50% Pro (audits are Pro work).

**Deliverables.**
- `07` §33 security review executed; `07` §30 OWASP mapping verified
- Rate limiting (`07` §17) and DDoS protection (`07` §18) verified in staging
- Dependency scan and supply-chain review (`07` §25, §26)
- Performance pass: pagination audit, N+1 audit, Claude cost review (`06` §17)
- Accessibility sweep: every route axe-clean, keyboard-only walkthrough of every Tier 1 flow
- Full-MVP CP-Phase architecture audit against the invariant registry

**Required documentation.** `07` §17, §18, §25, §26, §29, §30, §33; `06` §12, §17, §19; `02` §12, §14; `05` §8.

**Expected files.**
```
docs/impl/audits/{security-review-mvp.md,architecture-audit-mvp.md,a11y-sweep-mvp.md,perf-audit-mvp.md}
backend/tests/security/*.py · frontend/tests/e2e/a11y.spec.ts
```

**Success criteria.** `07` §33 complete with evidence per item. All seven gates green. Every Tier 1 flow completable by keyboard alone.

**Validation.**
- [ ] Every `07` §33 item evidenced, not asserted
- [ ] Rate limits verified under test load
- [ ] No secret in any repository, image, or log
- [ ] Every route axe-clean; Tier 1 flows keyboard-navigable end to end
- [ ] Screen/component coverage script reports no unbuilt MVP screen and no unspecified component (`08` §16.4)
- [ ] Architecture audit findings resolved or filed as tracked cards

**Review.** Adversarial review on every audit finding's remediation. No finding closed without evidence.

## S20 — Disaster Recovery, Load & Launch Readiness

**Objectives.** The system can be operated and recovered, with a known performance envelope. `07` §34 passes.

**Complexity.** M — 6 cards, ~10 sessions, ~40% Pro.

**Deliverables.**
- Monitoring and alerting (`07` §22); per-agent Celery duration monitoring (`06` §17)
- Backup and disaster recovery (`07` §24) — **verified by an actual restore into a clean environment**
- Incident response runbook (`07` §23)
- Load test on the scan path at realistic concurrency
- Deployment pipeline verified: Alembic step blocks the deploy on failure (`06` §16); rollback rehearsed
- `07` §34 production readiness checklist executed
- Ledger, Amendments, and Blockers reconciled

**Required documentation.** `07` §21, §22, §23, §24, §27, §28, §34; `06` §16, §17; `03` §12.

**Expected files.**
```
docs/impl/runbooks/{incident-response.md,disaster-recovery.md,rollback.md}
docs/impl/audits/{load-test-mvp.md,production-readiness.md}
.github/workflows/deploy.yml · backend/monitoring/*.py
```

**Success criteria.** A restore into a clean environment succeeds. A deliberately failing migration blocks the deploy. `07` §34 passes item by item.

**Validation.**
- [ ] Restore performed and verified, not documented (`09` F15 risk 3)
- [ ] Rollback rehearsed end to end
- [ ] Migration failure blocks deployment — demonstrated
- [ ] Load test results recorded with a stated concurrency envelope
- [ ] Alerting fires on a simulated failure
- [ ] Zero open blockers without an owner

**Review.** `07` §34 evidenced item by item; documentation reconciled with the shipped system.

**Gate: MVP ships only when S20 closes clean.**

---

# Phase 2 Sprints (S21–S29)

Planned at lower resolution; each is expanded to full detail at the start of its phase, using the same template. Every agent sprint follows the four-step build in `08` §7.3, one step per card group.

| Sprint | Phase | Objectives | Complexity | Key deliverables | Success criteria | Critical validation |
|---|---|---|---|---|---|---|
| **S21** | F16 | Port Scanner (Agent 2): rules, service, node | M | `port_rules.py` + branch tests, `shodan_service.py` + fixtures, `port_scanner` node, playbooks | Open-port findings appear in a scan | Node inserted into an existing edge, not grafted (`04` §3); every new `finding_type` has a playbook |
| **S22** | F16 | Vulnerability Analysis (Agent 5) + risk-score extension | L | `vuln_rules.py`, `nvd_service.py`, `vuln_analysis` node in the parallel group, scoring extended past the 3-input form | CVE findings appear; scoring reflects new inputs | Reaches `analysis_join`; scoring change carries an ADR with before/after scores on fixtures |
| **S23** | F17 | Threat Intelligence (Agent 6) | M | `threat_rules.py`, `virustotal_service.py`, `threat_intel` node, breach-data PII handling | Breach findings appear | A VirusTotal timeout degrades to a partial scan, never a failed one (`04` §11's worked example) |
| **S24** | F17 | Phishing Detection (Agent 7) + filter extension | M | `phishing_rules.py`, `phishing_detection` node, playbooks, Findings filters extended | Phishing findings appear and filter correctly | New filter values need no translation layer (`03` §5.1) |
| **S25** | F18 | DPDP rules + Agent 10 + narrative activation | L | `dpdp_rules.py` covering every `04` §8 clause, `dpdp_compliance` node, `compliance_reports` persistence, DPDP narrative in `claude_service.py` | Clause-by-clause readiness report generated | Clause pass/fail decided by rules alone; narrative status terms asserted against computed statuses |
| **S26** | F18 | Compliance API & screen | M | `GET /compliance/latest`, `GET /compliance/{scan_id}`, Compliance screen, `ComplianceChecklistRow`, `05` §7.9 progress viz | Readiness report readable with per-clause evidence | Copy says readiness, never compliance or certification (`README`) |
| **S27** | F19 | Incident Response (Agent 11) + playbook expansion | M | `incident_response` node, playbooks for every `finding_type` from Agents 1–7 and 10, startup schema validation | No orphaned `finding_type` remains | Malformed playbook fails fast at startup; contract test covers the full set |
| **S28** | F20 | PDF reports + trend history | M | `pdf_service.py` (WeasyPrint), `GET /scans/{id}/report.pdf`, Reports screen, `TrendSparkline` history | A shareable PDF report downloads | Generation is async and never blocks a request thread |
| **S29** | F20 | Command palette, search, Docs/Status/Help, Accept Invite, MFA | M | Command Palette (`05` §4.6, dynamic import), global search, public Docs/Status, Help Center, Accept Invite, MFA Setup | Every Phase 2 screen in `01` §3 exists | Palette fully keyboard-operable, dispatches existing actions only, absent from first-paint bundle |

---

# Phase 3 Sprints (S30–S35)

| Sprint | Phase | Objectives | Complexity | Key deliverables | Success criteria | Critical validation |
|---|---|---|---|---|---|---|
| **S30** | F21 | Fraud Detection (Agent 8) | M | `fraud_rules.py`, `fraud_detection` node, playbooks | Fraud findings appear | Standard four-step agent build; full branch coverage |
| **S31** | F21 | Multi-org portfolio & org switcher activation | L | Portfolio-scoped scoring reusing Agent 9, OrgSwitcher activated, portfolio dashboard, cross-org `members` access | A CA firm views a client portfolio | Cache isolation on switch (`INV-18`); tenancy suite extended and re-verified; no second scoring path |
| **S32** | F22 | Billing (Razorpay) | M | Plan management, invoices, server-side plan enforcement | Plans purchasable and enforced | Limits enforced at the API, never trusted from the client (`06` §15) |
| **S33** | F22 | API keys | M | Scoped credential management, rotation, revocation | B2B API access works | Keys scoped to one org, revocable, never logged |
| **S34** | F22 | Audit log | M | `07` §21 audit logging, Audit Log screen | Privileged operations are traceable | Append-only; actor, action, target captured; coverage gap from earlier phases documented honestly |
| **S35** | F22 | SOC 2 readiness | L | `07` §32 control mapping, evidence collection, policy documentation | SOC 2 mapping evidenced | Every mapped control has real evidence, not a described intention |

---

## Sprint Planning Maintenance

- **Expand a Phase 2/3 sprint to full detail** at the start of its phase, using the S01–S20 template. Planning a sprint eight weeks out in full detail produces a plan that is wrong by the time it is read.
- **Record the actual Pro-model share** against the estimate at every close. A persistent gap means the specifications feeding the cards are thinner than assumed, and the fix is better cards, not more Pro sessions.
- **Re-estimate a sprint that overruns twice.** Two overruns is a sizing error, not bad luck.
- **A sprint that produces no demonstrable capability** is a planning defect. Merge it with an adjacent sprint at the next re-plan.

---

Owner: Qelvix Engineering Team
Status: Living document
