# 08: Implementation Methodology

This document defines how Qelvix gets built. It is the philosophy layer of the AI Development Operating System (AI DevOS): the strategy, the sequencing rules, the invariants that must survive every implementation session, and the gates that decide whether work is finished.

It is written for a build where the code is produced primarily by **Gemini 3.6 Flash High** (daily implementation) and **Gemini 3.1 Pro** (deep reasoning and architecture) inside **Antigravity IDE**, with a human engineer acting as architect, reviewer, and integrator. Every rule below exists because it either prevents a specific failure mode of that setup or makes a specific model output more reliable.

**Documents `README.md` and `01`–`07` are frozen.** This document never redesigns them. Where a rule here looks new, it is an operational rule about *how* to implement what those documents already decided — not a change to the decision.

| Document | Role in the DevOS |
|---|---|
| `08` (this) | Philosophy, invariants, gates, definition of done |
| `09_IMPLEMENTATION_ROADMAP.md` | Capability phases, in dependency order |
| `10_SPRINT_PLANNING.md` | Time-boxed execution units inside each phase |
| `11_TASK_BREAKDOWN.md` | Atomic task cards — one AI session each |
| `12_AI_DEVELOPMENT_WORKFLOW.md` | Model routing, prompt construction, review, continuation |

---

## 1. The Problem This Methodology Solves

A capable coding model, given a clear task, produces good code. The same model, given three hundred clear tasks over eight weeks with no shared memory between them, produces a codebase that slowly stops being one codebase.

The observed failure modes, in order of cost:

| Failure mode | What it looks like in Qelvix specifically |
|---|---|
| **Silent contract drift** | A model adds a field to `GET /findings/{id}`, the frontend hook isn't regenerated, and the mismatch surfaces as an undefined render three sessions later |
| **Invariant erosion** | A model instantiates an Anthropic client inside `risk_scoring.py` because that is where the summary is needed — structurally breaking Rules-before-LLM (`04` §1) |
| **Duplicated logic** | A second `SeverityBadge`-shaped component appears under `components/dashboard/` because the model never saw `components/findings/` |
| **Reinvented patterns** | An endpoint written with a hand-rolled `org_id` filter instead of `get_current_org`, producing a tenant-isolation bug that RLS masks in dev and reveals under the service-role bypass |
| **Spec substitution** | The model implements what it infers the screen should do rather than what `01_PRODUCT_BLUEPRINT.md` says it does — usually shipping the happy path and dropping three specified states |
| **Test inversion** | Tests written after code, asserting the code's actual behaviour rather than the spec's required behaviour, converting a bug into a permanent guarantee |

None of these are model-quality problems. All are context problems. The methodology's single organising idea follows from that:

> **Every implementation session must receive the same architectural truth, in the same form, without depending on the model having seen a previous session.**

That truth is delivered by three mechanisms defined in this document and operationalised in `11` and `12`:

1. **The Invariant Registry** (§8) — thirty numbered, non-negotiable rules extracted from `01`–`07`, cited by ID in every prompt and every review.
2. **Context Packs** (§9) — named, fixed bundles of document sections, so context selection is a lookup rather than a judgement call made freshly under pressure.
3. **Contract-first sequencing** (§3–§6) — the order of work is arranged so that a contract exists in machine-checkable form *before* anything depends on it.

---

## 2. Non-Negotiable Framing

Three framings apply to every decision in this methodology.

**The specification is the source of truth, not the code.** When generated code and `01`–`07` disagree, the code is wrong. There is exactly one exception path, and it is an ADR (§16), never an inline edit.

**The human is the architect and the last reviewer, not the typist.** Time spent writing task cards and context packs is not overhead ahead of the real work — it *is* the real work. A well-specified task card is worth more than the code it produces, because it is reusable, reviewable, and survives a bad generation.

**Small, verifiable, complete.** Every unit of work at every level of granularity — task, sprint, phase — ends in a state that is runnable, tested, and mergeable. Nothing is left "to be wired up next session." A half-finished vertical slice is the single most expensive artifact in an AI-assisted build, because the next session has no reliable way to discover what was left undone.

---

## 3. Development Strategy: Contract-First Vertical Slices

### 3.1 The three candidate strategies

| Strategy | Shape | Behaviour under AI implementation |
|---|---|---|
| **Layer-first** | All models → all endpoints → all UI | Long integration debt. Nothing is demonstrable for weeks. Fatal weakness: a model implementing UI in week 5 against an API written in week 2 has no live contract to check against, so drift is discovered only at integration |
| **Pure vertical slice** | One feature end-to-end (schema → API → UI → test), repeat | Fast feedback, always demonstrable. Weakness under AI: the second slice re-derives foundations the first slice invented ad hoc, and the two derivations differ. Tenancy, error envelopes, and query-key conventions get reinvented per slice |
| **Hybrid: thin foundation, then contract-first vertical slices** | Build the smallest complete horizontal spine first, then slice vertically on top of it | Retains vertical-slice feedback while removing the "reinvent the foundation" failure |

### 3.2 The chosen strategy

**A thin, complete horizontal foundation (phases F0–F3), followed by strictly contract-first vertical slices (F4 onward).**

The foundation is deliberately thin. It contains only what more than one vertical slice would otherwise invent independently:

- Repository skeleton, toolchain, CI gates, and the AI DevOS control files (F0)
- Full database schema and RLS policies for every table in `03` §4.1 and §4.2 — all of it, in one phase, not incrementally (F1)
- Auth, `get_current_org`, `require_role`, JWT handling, app shell, route-group layouts (F2)
- Design tokens from `05` §3 materialised into Tailwind config, plus the shared components every screen needs: `EmptyState`, `Skeleton`, `SeverityBadge`, `DataChart`, `MarkdownViewer`, `CodeBlock` (F3)

Everything after that is a vertical slice: Domain Verification, Scan Execution, Findings, Dashboard, Notifications. Each slice cuts through schema use → API → contract snapshot → generated types → query hook → UI → tests, and lands merged and demonstrable.

### 3.3 Why this specific split

**Why the schema is horizontal and complete up front.** `03` §4.1 gives the entire schema in one authoritative block, and `07` §6 gives the RLS policies over it. Building it incrementally means a model writes migration 7 without seeing migrations 1–6, and re-derives conventions (nullable choices, cascade behaviour, index placement) inconsistently. Worse, `INV-04` requires RLS in the same migration as table creation — a rule that is easy to hold when writing all tables once and easy to forget on the fourteenth incremental migration. The schema is small, fully specified, and has zero product uncertainty. It is the cheapest thing in the project to get completely right, once.

**Why auth and tenancy are horizontal.** `INV-03` (every authenticated route depends on `get_current_org`; `org_id` is never client-supplied) is the most important rule in the codebase per `06` §18. It must exist as a working dependency that a model can *copy the shape of* before the first tenant-scoped endpoint is written. Handing a model a task card that says "add tenant scoping" is strictly worse than handing it a codebase where every neighbouring endpoint already demonstrates it.

**Why the design system is horizontal.** `02` §6 and `06` §21 both treat a duplicated component as a bug. Duplication happens when a model needs `SeverityBadge` and cannot find one. The countermeasure is to make it already exist before the Findings slice starts, and to make the component inventory (`01` §11) a mandatory pre-flight lookup (§10, and `12` §7).

**Why everything else is vertical.** Once the spine exists, each slice is small enough to fit in a handful of AI sessions, ends in something demonstrable, and — critically — exercises the full stack, so contract drift is discovered within the slice rather than at the end of the project.

**Why contract-first inside each slice.** This is the load-bearing rule. See §6.

### 3.4 Slice sizing rule

A vertical slice is correctly sized when it satisfies all four:

1. It corresponds to one screen or one coherent screen group from `01` §3.
2. It is deliverable in 4–12 task cards.
3. It ends in a state a non-engineer could be shown.
4. Its API surface is a contiguous, nameable group in `03` §5 (e.g. all of `SCANS`, all of `FINDINGS`).

A slice that violates (2) upward is split at its API-group boundary. A slice that violates it downward is merged with an adjacent slice rather than being run as its own phase — phase overhead is real.

---

## 4. Implementation Order and Dependency Management

### 4.1 The dependency ordering rule

Work is ordered by **dependency depth**, not by product priority. A dependency exists in one of four forms, and all four are treated identically for ordering:

| Dependency type | Example in Qelvix |
|---|---|
| **Data** | Findings API depends on `findings` table and `assets` table existing |
| **Contract** | `useFindingsQuery` depends on `GET /findings` having a frozen response shape |
| **Pattern** | The Findings router depends on the Org router existing as the reference implementation of `get_current_org` + `require_role` |
| **Verification** | The a11y gate depends on the design tokens existing, since contrast pairs are defined in `05` §3.1 |

Pattern dependencies are the ones AI-assisted builds routinely ignore, and they are the ones that produce drift. They are tracked explicitly: every phase in `09` names its **reference implementation** — the file a model should be pointed at as the shape to copy.

### 4.2 The three hard ordering constraints

These come directly from the frozen documents and cannot be reordered for convenience:

1. **Migration before endpoint** (`06` §8 step 3, `06` §10 step 1). A schema change ships as an Alembic migration before the code that reads it. A migration-less schema change is a review block.
2. **Rules before agent node** (`06` §11 steps 1–3). The pure rules function and its unit tests are written and green before the service fetch, which is written before the LangGraph node. This ordering exists because the rules function has no dependencies at all and is therefore the fastest correct thing to produce — and because it is the highest-leverage test category in the codebase (`06` §12).
3. **Endpoint tests alongside or before the endpoint** (`06` §8 step 5). API contract bugs are the most expensive class in this codebase because the frontend, the agents, and the notification path all depend on the contract holding.

### 4.3 Dependency declaration and enforcement

Every task card in `11` declares `Dependencies:` as a list of task IDs. Two rules govern them:

- **No forward references.** A task may only depend on tasks with a lower ID within the same or an earlier sprint. A discovered backward dependency is resolved by splitting the task, never by reordering the sprint mid-flight.
- **Blocked means blocked.** A task whose dependencies are not merged does not start. The temptation under AI assistance is to "stub it and come back" — the stub then becomes permanent, because nothing tracks it. If a stub is genuinely necessary, it is filed as its own task card with its own ID, not left as a `TODO`. `06` §5 already establishes that a TODO without a linked issue documents nothing.

### 4.4 Handling discovered dependencies mid-session

When a model reports that a task cannot be completed without something not yet built, the session stops. It does not improvise the missing piece. The engineer either:

- pulls the dependency forward as its own task card (preferred, if it is genuinely small and well-specified), or
- re-scopes the current task to exclude the dependent portion and files the remainder as a new card.

This is enforced by the **BLOCKER protocol** in `12` §6.4: the model is instructed to emit a structured blocker report rather than to guess, and guessing where a blocker was warranted is treated as a failed generation.

---

## 5. Module Sequencing

Within any given phase, modules are built in this fixed order. The order is derived from "fewest dependencies first, most-referenced first":

```
1. Types / schemas          — SQLAlchemy models, Pydantic models, zod schemas, TypedDict state
2. Pure functions           — rules engines, formatters, transforms (no I/O, fully testable)
3. Data access              — migrations, repository/query helpers
4. Service clients          — external API wrappers returning plain dicts (03 §8)
5. Orchestration            — routers, Celery tasks, LangGraph nodes and edges
6. Contract snapshot        — OpenAPI export + generated TS types (§6)
7. Client data layer        — lib/api clients, lib/queries hooks
8. Presentation             — Server Components, Client Components, states
9. Tests at each level      — written per 06 §12, not deferred to the end
10. Documentation sync      — LEDGER entry, ADR if a decision was made (§16)
```

Two sequencing rules that override convenience:

**Pure functions before anything that calls them.** A rules engine (`04` §5) is a pure, synchronous, side-effect-free function. It is the single easiest thing in this codebase for a model to get exactly right, because the spec in `04` §6 gives the thresholds in table form and the tests write themselves from that table. Building it first means the agent node that consumes it is assembled against something already proven.

**Service clients before nodes, with fixtures committed.** Per `06` §12, external-service fixture responses live alongside the service module and are versioned. The fixture is created in the same task as the service client — never later, because a fixture created later is created by reading the client's code rather than the provider's actual response shape, which defeats its purpose.

---

## 6. Frontend / Backend Coordination

This is where AI-assisted builds fail most reliably, and it gets the most structural support.

### 6.1 The contract handshake

The API contract is a **generated artifact**, not a prose agreement. The sequence within any slice:

```
BE-1  Pydantic request/response models defined in the router file (03 §3)
BE-2  Endpoint implemented, dependencies applied (get_current_org, require_role)
BE-3  Endpoint tests green (auth, role, validation, response shape)
      ↓
CONTRACT  make contract
          → exports FastAPI's OpenAPI JSON to docs/contracts/openapi.json
          → generates frontend/lib/api/types.generated.ts from it
          → fails CI if the committed snapshot differs from a fresh export
      ↓
FE-1  lib/api/<resource>.ts typed client, importing ONLY generated types
FE-2  lib/queries/use<Resource>Query.ts hook (02 §5 conventions, INV-10 key shape)
FE-3  Component consumes the hook
```

**No hand-written interface ever describes an API response.** If a model writes `interface Finding { ... }` in frontend code, that is a review block — the type exists already, generated, and a hand-written duplicate is guaranteed to drift. This single rule eliminates the largest category of frontend/backend mismatch, and it eliminates it in a way that a model cannot silently violate, because the generated file is the only one that exists and CI diffs the snapshot.

### 6.2 Coordination rules

- **The frontend never leads the contract.** A UI task whose endpoint is not merged and snapshotted does not start. `06` §8 step 1 already forbids undocumented endpoints; this extends it to "unsnapshotted" as well.
- **Contract change is its own task.** Adding a field to a response is a backend task, a contract-regeneration step, and a frontend task — three cards, in that order — even when trivially small. `06` §7 permits a cross-boundary PR only for exactly this case (a single API contract change requiring both sides to move together), and this is how that permission is exercised without it becoming a habit.
- **Filter names are copied, not translated.** `03` §5.1 already fixes this: `GET /findings` query params match the Findings List filter names one-to-one, so the frontend's URL-search-param state maps directly. Any translation layer appearing between them is a review block.
- **Envelope shapes are never re-derived.** `{ items, total, limit, offset }` for lists (`03` §5.1); the standard error envelope from `03` §10. A model writing a second envelope shape has not read the pack.

### 6.3 Parallelisation

Frontend and backend work on the same slice can proceed in parallel only after the contract is snapshotted. Before that point, parallel work means the frontend is building against an imagined shape. In practice, for a small team, sequential within a slice and parallel across slices is the better arrangement: while the Findings UI is being built, the next backend slice's rules engines can be written, since rules engines depend on nothing.

---

## 7. AI Agent Pipeline Rollout

The 13-agent pipeline gets its own rollout discipline because `04` establishes constraints no other part of the system has.

### 7.1 Build order is fixed

`04` §12 sets it, matching TRD §13. It is not re-planned here:

| Phase | Agents activated |
|---|---|
| Phase 1 (MVP) | 1 (domain/subdomain only), 3, 4, 9 (3-input simplified), 12, 13 |
| Phase 2 | 2, 5, 6, 7, 10, 11 |
| Phase 3 | 8 |

MVP therefore runs the reduced graph: Asset Discovery → SSL/TLS Analysis → DNS Analysis → Risk Scoring → Recovery Recommendation → Notification.

### 7.2 The reduced graph is a subset, never a variant

`04` §3 is explicit: Phase 1 agents wire directly to `risk_scoring`, and a Phase 2 agent is later *inserted into an existing edge*, not grafted onto a new structure. The operational consequence for implementation:

- `pipeline.py` is written once, in F6, with the MVP node set and MVP edges.
- Adding an agent later is a two-line edit to `pipeline.py` plus a new node module. It is never a rewrite.
- There is no `build_mvp_pipeline()` alongside a `build_full_pipeline()`. Two graph builders is exactly the divergence `04` §3 was written to prevent.
- `AgentState` (`04` §4) is implemented **complete** in F6, including fields only Phase 2/3 agents populate. A `TypedDict` with unused optional keys costs nothing; a state schema that grows per phase forces every existing node to be revisited.

### 7.3 The four-step agent build, per agent

From `06` §11, restated as the mandatory task decomposition. Each numbered step is a separate task card:

1. **Rules function + unit tests.** Pure, synchronous, no LangGraph, no service layer, no live scan. Every severity branch in that agent's `04` §6 table gets a test case. This is where correctness is established.
2. **Service client + committed fixture.** One module under `services/`, returning a plain dict, no provider type leaking past the boundary (`06` §10 step 3). Fixture committed alongside.
3. **Agent node.** Wires fetch → rules → `Finding` construction, with the try/except-per-item pattern. Node tests assert that a raising service does not propagate past the node (`INV-06`).
4. **DAG registration + playbook.** Edge placement verified against the agent's phase; if the agent introduces a new `finding_type`, its IR playbook lands in the same PR (`INV-08`).

Never collapse steps 1 and 3 into one card. The rules function is the deterministic, auditable core of the product's claim (`README`: "severity and findings are decided by rules, before any LLM is invoked"). It deserves its own session, its own review, and its own test file.

### 7.4 The Claude boundary is built once and never widened

`claude_service.py` is implemented in a single phase (F7) containing exactly the four functions from `04` §7. After that phase, **no task card ever authorises a new Anthropic client instantiation.** A task that needs LLM output extends one of the four existing functions or it does not happen. This is `INV-01`, and it is checked in every review because `06` §21 names it the first common pitfall.

Prompt text lives in `claude_service.py` (or a `prompts/` module it owns), never inline in an agent node — an agent node with a prompt string in it is one refactor away from having a client in it.

### 7.5 Partial-failure semantics are tested, not assumed

`04` §11 draws a distinction the whole system keys off: `failed` is a pipeline-level catastrophe; `completed` with a populated `error_log` is a normal partial result. Three tests enforce it, and they are written in F6, not later:

- A node whose service raises appends to `state["errors"]` and the pipeline still reaches `notification`.
- A scan completing with a non-empty `error_log` persists as `status: completed`.
- The frontend query `select` function (`02` §5) surfaces partial state, so no component can read `status: completed` and skip the check (`INV-07`).

---

## 8. The Invariant Registry

Thirty rules, extracted from `01`–`07`, each traceable to its source. These are cited **by ID in every implementation prompt** (`12` §5) and **checked by ID in every review** (`12` §11). They are the compressed form of the frozen documents — small enough to fit in every context window, specific enough to be checkable.

The canonical machine-readable copy lives at `docs/impl/INVARIANTS.md` and is loaded into every Antigravity session via `AGENTS.md` (§17).

### Architecture & AI boundary

| ID | Invariant | Source |
|---|---|---|
| **INV-01** | The Anthropic API is called only from `claude_service.py`, and only through its four defined functions. No other module instantiates a client or holds prompt text. | `03` §9, `04` §1, `06` §11.6 |
| **INV-02** | Rules decide, the LLM explains. No LLM output determines a finding's existence, severity, `raw_data`, a risk score, or a DPDP clause status. | `04` §1 |
| **INV-03** | Every authenticated route depends on `get_current_org`. `org_id` is never accepted as a client-supplied parameter on a tenant-scoped route. | `03` §3, §5.1, `06` §18 |
| **INV-04** | Every new tenant-scoped table has RLS enabled in the same migration that creates it. Never retrofitted. | `03` §4.1, `06` §18, `07` §6 |
| **INV-05** | A schema change ships as a hand-verified Alembic migration before the code that depends on it. | `06` §8.3, §10.1 |
| **INV-06** | An agent node never raises. Per-item failures are caught and appended to `state["errors"]`. | `04` §5, §11, `06` §11.3 |
| **INV-07** | `status: completed` with a non-empty `error_log` is a partial result and is never presented as a clean success. Enforced in the frontend query `select`, not per-component. | `03` §6.2, `04` §11, `02` §5 |
| **INV-08** | A `finding_type` is snake_case and matches exactly between the rules engine that emits it and the IR playbook trigger that consumes it. New `finding_type` and its playbook land in the same PR. | `04` §9, `06` §6, §11.5 |

### Backend

| ID | Invariant | Source |
|---|---|---|
| **INV-09** | All request/response shapes are Pydantic models colocated in the router file. A router never returns a bare dict. | `03` §3, `06` §5 |
| **INV-10** | Backend I/O is async. Synchronous I/O inside `async def` is a review block. Rules engines are the sole exception and are deliberately synchronous. | `06` §5 |
| **INV-11** | List endpoints are paginated and return `{ items, total, limit, offset }`. Filter params match `01`'s filter-bar names one-to-one. | `03` §5.1 |
| **INV-12** | Mutation endpoints return the updated resource, not a bare 204. | `03` §5.1 |
| **INV-13** | An external service integration is one module under `services/` returning a plain dict; no provider-specific type crosses that boundary. | `03` §8, `06` §10.3 |
| **INV-14** | Python is fully type-hinted and `mypy`-clean; no untyped `def`. | `06` §5 |
| **INV-15** | Per-org configurable values live in `organizations.settings` JSONB, not in new ad-hoc columns. | `03` §4.1, `06` §15, §21 |

### Frontend

| ID | Invariant | Source |
|---|---|---|
| **INV-16** | Server Components by default. A component becomes a Client Component only under the conditions in `02` §6. | `02` §6, `06` §5 |
| **INV-17** | Feature components contain no `fetch`. Data arrives as props from a Server Component or from a `lib/queries/` hook. | `02` §6, `06` §9.4 |
| **INV-18** | Query keys are `[resource, orgId, ...params]`. `orgId` is always present. | `02` §5 |
| **INV-19** | No hand-written TypeScript interface describes an API response. API types are generated from the OpenAPI snapshot. | This document §6.1, enforcing `03` §5.1 |
| **INV-20** | Filter and pagination state lives in URL search params. Ephemeral UI state lives in narrowly-scoped Zustand stores. Forms own their own state via react-hook-form. | `02` §4 |
| **INV-21** | `components/ui/` shadcn primitives are never patched at a call site. A missing variant is added to the primitive. | `02` §6 |
| **INV-22** | Every component in the `01` §11 inventory has exactly one implementation. A second component of the same shape is a bug. | `02` §6, `06` §21 |
| **INV-23** | Colour, spacing, radius, elevation, and motion values come from `05` §3 tokens. No hardcoded hex or arbitrary pixel values in feature code. | `05` §3 |
| **INV-24** | Recharts is used only through `components/shared/DataChart.tsx`, dynamically imported. | `02` §9 |
| **INV-25** | Every state specified in a screen's `01` table — loading, error, empty, success — is implemented before the PR opens. Route-level `loading.tsx` renders that screen's specific skeleton, never a generic spinner. | `01` per-screen tables, `02` §3, `06` §9.5, §20 |
| **INV-26** | `strict` TypeScript; no `any` without an inline justification comment. | `02` §1, `06` §5 |

### Security, accessibility, operations

| ID | Invariant | Source |
|---|---|---|
| **INV-27** | Claude-generated content is untrusted output: rendered through `MarkdownViewer`, never as raw HTML, and subject to the output validation and prompt-injection defences in `07` §14 and §20. | `07` §14, §20, `02` §13 |
| **INV-28** | Accessibility is WCAG 2.1 AA. Severity is never signalled by colour alone. Every route passes `axe-core` in CI. | `05` §8, `02` §12 |
| **INV-29** | No secret is committed. Environment configuration lives only in the variables defined in `03` §11. Webhook endpoints validate the provider signature before processing. | `03` §11, `06` §18, `07` §8 |
| **INV-30** | Logs are structured JSON and carry `org_id` where the context has one. Claude prompts and responses are never logged in full above `DEBUG`. | `03` §10, `06` §13 |

### Using the registry

- Every task card lists the invariants **in force** for that task — typically 4–8 of them, not all thirty. A prompt carrying all thirty dilutes attention; a prompt carrying the relevant eight makes them operative.
- Every review prompt asks the model to check the same list, by ID, and to answer per-ID.
- A violation is never accepted with a follow-up promise. It is regenerated (`12` §12).

---

## 9. Context Discipline

### 9.1 The principle

Context is a budget, not a resource to fill. Both target models degrade in a specific and recognisable way when over-fed: they begin summarising rather than implementing, they lose the middle of the input, and they start satisfying the most recently-read instruction rather than the most important one.

The rule: **give the model the smallest set of document sections that makes the correct implementation the obvious one, plus the invariants that make the incorrect implementation identifiable.**

### 9.2 Context Packs

A Context Pack is a named, fixed list of file sections. Packs are defined once, in `docs/impl/CONTEXT_PACKS.md`, and referenced by name in every task card. This converts a recurring judgement call into a lookup — which matters because the judgement is being made dozens of times a week, often late, often by whoever is at the keyboard.

| Pack | Contents | Typical use |
|---|---|---|
| `CTX-CORE` | `docs/impl/INVARIANTS.md`, repo map (`06` §1, §4), naming conventions (`02` §15, `06` §6) | Loaded in **every** session, without exception |
| `CTX-DB` | `03` §4.1, §4.2; `07` §6 | Migrations, models, RLS policies |
| `CTX-API` | `03` §3, §5, §5.1, §10; `06` §8; `07` §4, §12, §19, §20 | Any endpoint |
| `CTX-RULES` | `04` §5, plus the specific agent's table from §6 | A rules engine |
| `CTX-AGENT` | `04` §3, §4, §5, §11; `03` §6; `06` §11 | An agent node or DAG change |
| `CTX-CLAUDE` | `04` §7; `03` §9; `07` §13, §14, §16 | Anything touching `claude_service.py` |
| `CTX-FE-SCREEN` | the screen's `01` section; `02` §2–§7; `05` §4 entries for the components used; `06` §9 | Building a screen |
| `CTX-FE-COMPONENT` | `01` §11; the component's `05` §4 entry; `05` §3 tokens; `02` §6 | Building or extending a component |
| `CTX-NOTIFY` | `03` §7; `04` §7.4; `07` consent sections | WhatsApp / email delivery |
| `CTX-TEST` | `06` §12; the spec section under test | Test-only tasks |
| `CTX-SECURITY` | `07` §33, §34; `06` §19 | Security review passes |

### 9.3 Budget targets

| Session type | Target context | Hard ceiling |
|---|---|---|
| Flash High implementation task | 8k–15k tokens of spec + invariants | 25k |
| Flash High test / refactor task | 5k–10k | 15k |
| Pro architecture or debugging session | 25k–50k | 80k |

Exceeding the ceiling is a signal the task is too large, not a signal to raise the ceiling. See `12` §9 for the splitting procedure.

### 9.4 What is deliberately excluded

Task cards state a **must-not-read** list where relevant. Loading `01_PRODUCT_BLUEPRINT.md` in full (642 lines of product reasoning) into a task that implements one rules engine does not help; it introduces product framing the model will try to satisfy, and it displaces the severity table that actually matters. Precision beats generosity.

---

## 10. Preventing Duplication and Reinvention

Duplication is a search failure, so the countermeasure is a mandatory search step, not an instruction to "reuse where possible."

**Every implementation session begins with a Pre-Flight Report** (`12` §7), in which the model must, before writing any code:

1. List the existing files it will touch and their current exports.
2. Report the result of an explicit search for existing implementations of what it is about to create — by name, and by shape.
3. State which existing pattern it is copying (naming the reference file).
4. Declare any invariant it believes conflicts with the task.

A session that produces code without the Pre-Flight Report is discarded and re-run. The report costs perhaps two hundred tokens and catches the single most common structural defect in AI-assisted codebases.

Three standing search obligations:

- Before creating any component: check `01` §11 inventory and `components/` for an existing one or an existing primitive that needs a variant (`INV-21`, `INV-22`).
- Before creating any service module: check `services/` — `03` §2 already enumerates the expected set.
- Before creating any rules function: check `rules/` and the `finding_type` values already emitted, since a duplicate `finding_type` silently breaks the playbook contract (`INV-08`).

---

## 11. Testing Philosophy

`06` §12 owns the testing strategy. This section adds only what is specific to AI-generated code.

### 11.1 Tests encode the spec, not the code

The dominant failure of AI-written tests is that they are written *from the implementation*, and therefore assert whatever the implementation happens to do — converting a bug into a guarantee and making the test suite worthless as a regression net.

Countermeasures, applied per test category:

- **Rules engines.** Test cases are derived from the severity threshold tables in `04` §6, and the prompt supplies **the table, not the code**. Where practical the test task runs before the implementation task, giving genuine spec-first tests on the highest-leverage category in the codebase.
- **API endpoints.** Auth and role gating tests are generated from `07` §4's authorization matrix, and every endpoint is tested both as an authorised and an unauthorised role (`06` §12).
- **Components.** Test cases are derived from the screen's state table in `01` — one test per specified state, which is also how `INV-25` gets enforced mechanically rather than by reviewer memory.

### 11.2 The two categories with no tolerance

Per `06` §12, two categories require effectively 100% branch coverage, because a gap there is a product-correctness or tenant-isolation bug rather than a missed edge case:

1. Rules engines — every severity branch.
2. API endpoint auth and role gating — every endpoint, both directions.

Everywhere else, meaningful coverage of stated behaviour beats a coverage percentage. A number gamed with trivial assertions is worse than an honest gap because it conceals where the risk actually is.

### 11.3 Tenancy testing

A dedicated suite (`pytest -m tenancy`) asserts, for every tenant-scoped table, that a session authenticated as Org A cannot read or write Org B's rows — tested at both layers independently, since `README` and `07` §5 describe the isolation as two independent enforcement layers. Testing only the application layer means RLS could be entirely absent and the suite would still pass.

### 11.4 Fixtures

External-service fixtures are committed alongside their service module and never regenerated live in CI (`06` §12, §21). When a provider's response shape changes, updating the fixture is its own task card with its own review — because a silently updated fixture is a silently changed contract.

---

## 12. Quality Gates

Two gate families: **CI gates** (mechanical, per PR) and **checkpoints** (human, per phase).

### 12.1 CI gates

Gates G1–G5 are `06` §16's required gate, unchanged. G6 and G7 are additions consistent with `07` §26 and §28, not modifications to the existing five.

| Gate | Check | Blocks merge |
|---|---|---|
| **G1** | Lint + type-check, `backend/` and `frontend/` (`ruff`/`mypy`, ESLint/`tsc --noEmit`) | Yes |
| **G2** | Unit tests. Rules-engine and endpoint auth tests are non-overridable | Yes |
| **G3** | `axe-core` accessibility pass on every route | Yes |
| **G4** | Playwright E2E on the flows in `06` §12 | Yes |
| **G5** | Performance budget (Lighthouse CI) on Landing Page and Dashboard against `02` §14 thresholds | Yes |
| **G6** | **Contract snapshot.** `docs/contracts/openapi.json` matches a fresh export, and `types.generated.ts` matches a fresh generation | Yes |
| **G7** | **Supply chain.** Secret scan (`detect-secrets`) and dependency audit (`pip-audit`, `npm audit`) | Yes |

`06` §16's rule holds without exception: a red run is never merged past with "I'll fix it in a follow-up." The follow-up PR *is* the fix, and it opens before the original merges.

### 12.2 Gate placement in the AI loop

The gates run locally, before review, via a single command. This matters more under AI assistance than under human authorship, because the cost of a regeneration is minutes and the cost of a review cycle is hours:

```bash
make verify          # G1 + G2 + G6 + G7 — under 90 seconds, run every session
make verify-full     # adds G3 + G4 + G5 — run before opening a PR
```

Every task card's **Verification steps** field names the exact command that proves that task done. A task card whose verification is "check that it works" is an incomplete card and gets rewritten before it is run.

---

## 13. Checkpoints

Checkpoints are human decision points. They exist because the mechanical gates cannot detect the failure modes that matter most: drift from product intent, and accumulating structural compromise.

| Checkpoint | When | Question answered | Owner |
|---|---|---|---|
| **CP-Task** | End of every task | Does the diff match the card, and only the card? | Reviewing engineer (assisted, `12` §11) |
| **CP-Sprint** | End of every sprint | Are all sprint deliverables merged, gates green, and nothing carried? | Engineer |
| **CP-Phase** | End of every phase | Are exit criteria met, and has drift accumulated? | Engineer + Pro-model architecture audit |
| **CP-Security** | End of F1, F2, F7, F13, and any phase touching auth, RLS, or the Claude boundary | Does `07` §33's checklist pass? | Engineer, `CTX-SECURITY` |
| **CP-Release** | Before any production deploy | Does `07` §34's production readiness checklist pass? | Engineer |

**The phase-end architecture audit** is a distinct, scheduled Gemini 3.1 Pro session, not a code review. Its prompt is in `12` §11.3. It is given the phase's full diff and the invariant registry, and it answers one question: *where has this phase's implementation diverged from `01`–`07`, and what is the cheapest correction?* Its output goes into `docs/impl/LEDGER.md` and generates either remediation task cards or an ADR. This is the primary mechanism by which drift is detected before it compounds — the mechanical gates cannot see it, and a per-PR human reviewer sees too narrow a window.

---

## 14. Definition of Done

`06` §20 defines DoD for a change. It applies unchanged. The DevOS makes it operable at three levels.

### 14.1 Task DoD

A task is done when **every** item holds:

- [ ] Implementation matches the task card's Expected Output exactly — no more, no less
- [ ] No file outside the card's declared create/modify list was touched
- [ ] Every invariant listed on the card is satisfied, verified by ID
- [ ] Tests required by the card's category (`06` §12) are written and green
- [ ] `make verify` passes locally
- [ ] No `TODO` without a linked task ID; no commented-out code; no `console.log`/`print` (`06` §5)
- [ ] `docs/impl/LEDGER.md` has an entry for the task
- [ ] Any decision not already in `01`–`07` is recorded as an ADR (§16)

### 14.2 Sprint DoD

- [ ] Every task in the sprint is Task-DoD complete and merged to `main`
- [ ] Sprint success criteria in `10` are demonstrated, not asserted
- [ ] `make verify-full` passes on `main`
- [ ] Zero carried work. Genuinely unfinished work is re-scoped into a new card in the next sprint, with the original card closed as split (§15.3)

### 14.3 Phase DoD

- [ ] Every sprint in the phase is Sprint-DoD complete
- [ ] The phase's exit criteria in `09` are met item by item
- [ ] The phase's validation checklist in `09` is executed and recorded
- [ ] CP-Phase architecture audit is complete, with findings either resolved or filed as tracked cards
- [ ] CP-Security has run if the phase is on its list
- [ ] `09` and `10` are updated where reality diverged from plan — these documents are living, and an out-of-date roadmap is worse than none

---

## 15. Review Workflow

Three passes. Each catches a different class of defect, and the ordering puts the cheapest first.

### 15.1 Pass 1 — Self-review, same session (Flash High)

Immediately after generation, in the same session, the model reviews its own diff against the task card's acceptance criteria and the invariants in force. Prompt template in `12` §11.1.

This is cheap and catches a surprising amount: forgotten states, missed error paths, a stray hardcoded token value. It works because the model still has the card in context and is now being asked to evaluate rather than produce — a different mode with different failure characteristics.

### 15.2 Pass 2 — Adversarial review, fresh session (Gemini 3.1 Pro)

A **new** session, given the diff, the task card, and `CTX-CORE` — but deliberately **not** the generating session's reasoning. The instruction is adversarial: find where this diff violates the specification, duplicates existing logic, or breaks an invariant.

The fresh-context requirement is the point. A model asked to critique its own reasoning trace tends to defend it. A model shown only the artifact and the spec evaluates the artifact.

Pass 2 is mandatory for: anything touching auth, tenancy, RLS, the Claude boundary, rules engines, or the DAG. It is optional for pure presentation work already covered by G3 and component tests.

### 15.3 Pass 3 — Human review

The engineer runs `06` §19's checklist. The AI passes reduce the human's load; they do not replace the human. Three things a human must judge that neither model reliably will:

- **Is this the right thing to have built?** Both passes check conformance to the card. Neither questions the card.
- **Does this feel like the rest of the codebase?** Structural consistency across files that were never in the same context window.
- **What did this make harder?** The cost a change imposes on future changes is not visible in the diff.

### 15.4 Handling review failures

| Outcome | Action |
|---|---|
| Invariant violation | **Regenerate**, do not patch. A patched violation leaves the wrong pattern in the model's demonstrated history of the codebase, and the next session copies it. Add the violated invariant to the card's list explicitly and re-run |
| Missing acceptance criterion | Continue the same session with a targeted correction prompt (`12` §6.3) |
| Spec ambiguity discovered | Stop. Resolve at the spec level — ADR or clarification — before any code is written. Never resolve an ambiguity inside an implementation |
| Task larger than believed | Close the card as split; write two cards; run them in order. Never let a card silently expand |

---

## 16. Documentation Update Workflow

### 16.1 Two classes of document

| Class | Documents | Change policy |
|---|---|---|
| **Frozen** | `README.md`, `01`–`07`, `Qelvix_TRD_transcribed.md` | Never edited during implementation. A required change is an ADR plus an amendment appendix entry |
| **Living** | `08`–`12`, `docs/impl/*` | Updated continuously as reality is learned |

### 16.2 When implementation contradicts a frozen document

This will happen — a spec meets reality and reality wins occasionally. The path:

1. **Stop implementing.** Do not encode the deviation in code and document it later; that ordering never completes.
2. **Write an ADR** at `docs/impl/DECISIONS/ADR-NNN-<slug>.md`: context, the frozen document and section in conflict, options considered, decision, consequences, invariants affected.
3. **Get it reviewed** by a Gemini 3.1 Pro session given the ADR plus the affected frozen sections, asked specifically what else in `01`–`07` this breaks. This catches the second-order consequence — the frozen set is heavily cross-referential, and a change to `03` §4 ripples into `04`, `06`, and `07`.
4. **Record the amendment** in `docs/impl/AMENDMENTS.md`, keyed by frozen document and section. The frozen file itself stays byte-identical; the amendments file is the errata sheet read alongside it.
5. **Update `docs/impl/INVARIANTS.md`** if an invariant changed, and note the ADR number against it.
6. **Then implement.**

`01_PRODUCT_BLUEPRINT.md` wins conflicts with later documents unless a critical architectural issue is found (`README`, Documentation Index). An ADR asserting a critical architectural issue against `01` requires the Pro review in step 3 to concur explicitly.

### 16.3 The Ledger

`docs/impl/LEDGER.md` is append-only, one entry per completed task:

```markdown
## T-S06-03 — SSL rules engine  ·  2026-08-04  ·  Flash High
Files: backend/app/rules/ssl_rules.py, backend/tests/rules/test_ssl_rules.py
Invariants checked: INV-02, INV-08, INV-14
Emits finding_type: ssl_expired, ssl_expiring_soon, ssl_weak_cipher, ssl_self_signed
Notes: expiry thresholds taken verbatim from 04 §6 Agent 3 table.
Deviation: none.
Follow-ups: T-S06-07 (playbook for ssl_weak_cipher)
```

The Ledger's purpose is **continuity across sessions**, not history. It is the first thing loaded when resuming after any interruption (`12` §10), and it is the searchable answer to "does something already exist for X" that no model can answer from its own memory. The `Emits finding_type` line specifically exists because `INV-08` is a string contract with no compiler behind it.

### 16.4 Keeping docs in sync mechanically

Three sync obligations are automated rather than remembered:

- **API reference** — FastAPI generates it. No manual reference exists to drift (`06` §8.6).
- **API types** — generated from the OpenAPI snapshot, gate G6.
- **Screen/component coverage** — a script cross-references `01` §3's screen inventory and `01` §11's component inventory against the filesystem, reporting what is specified but unbuilt and what is built but unspecified. Run at CP-Phase. The second column is the interesting one: an unspecified component is usually a duplicate (`INV-22`).

---

## 17. Repository Control Files

The DevOS is not a set of documents someone remembers to consult. It is a set of files in the repository that load into every session.

```text
qelvix/
├── AGENTS.md                      # Auto-loaded workspace rules for Antigravity
├── docs/
│   ├── README.md … 07_*.md        # FROZEN
│   ├── 08_*.md … 12_*.md          # LIVING — this DevOS
│   ├── contracts/
│   │   └── openapi.json           # Snapshot, gate G6
│   └── impl/
│       ├── INVARIANTS.md          # INV-01..INV-30, machine-readable
│       ├── CONTEXT_PACKS.md       # CTX-* definitions
│       ├── LEDGER.md              # Append-only task record
│       ├── SESSION_LOG.md         # Current/last session handoff state
│       ├── AMENDMENTS.md          # Errata against the frozen set
│       ├── BLOCKERS.md            # Open blockers with owning task IDs
│       └── DECISIONS/ADR-*.md
```

### `AGENTS.md`

Kept under 150 lines, because everything in it is paid for in every single session. It contains, and only contains:

1. One paragraph on what Qelvix is and the Rules-before-LLM principle.
2. The repository map with ownership (from `06` §4).
3. The thirty invariant IDs with one-line text each.
4. Naming conventions (`02` §15, `06` §6).
5. The standing rules: read the task card first; produce a Pre-Flight Report before code; never touch files outside the declared list; emit a BLOCKER rather than guessing; never edit `docs/README.md` or `docs/01`–`07`.
6. The verification commands.

Everything else is loaded per-task via Context Packs.

---

## 18. Known Failure Modes and Their Countermeasures

The table is the compressed form of this document. It is the thing to re-read when something has gone wrong and the cause is not obvious.

| Failure mode | Countermeasure | Where enforced |
|---|---|---|
| Model invents an endpoint not in `03` §5 | Task card's Expected Output enumerates endpoints; `06` §8.1 makes an undocumented endpoint a doc gap to raise, not code to write | Card + review Pass 2 |
| Hand-written API types drift from the backend | Generated types only; snapshot diff in CI | INV-19, gate G6 |
| Second `SeverityBadge` appears | Mandatory Pre-Flight search; `01` §11 inventory as the authority | INV-22, `12` §7 |
| Claude client instantiated in an agent | Single-module boundary; explicitly checked every review; named first pitfall in `06` §21 | INV-01, review Pass 2 |
| New table ships without RLS | RLS in the same migration; tenancy suite would fail | INV-04, §11.3 |
| Endpoint missing `get_current_org` | Auth test required for every endpoint, both directions | INV-03, gate G2 |
| Happy path only | Card lists every state from `01`; one component test per state | INV-25, gate G2 |
| Tests assert the code | Test tasks are prompted with the spec table, not the implementation | §11.1 |
| Context lost mid-feature | SESSION_LOG handoff, contract-boundary splits | `12` §9, §10 |
| Model rewrites `pipeline.py` to add an agent | `04` §3 subset rule stated in `CTX-AGENT`; card declares `pipeline.py` as modify-two-lines-only | INV-06 context, §7.2 |
| Drift accumulates invisibly | Phase-end Pro architecture audit against the invariant registry | CP-Phase, §13 |
| Fixture quietly regenerated to match a bug | Fixture updates are their own reviewed task card | §11.4 |
| Partial scan renders as success | Enforced in the query `select`, not per component | INV-07 |

---

## 19. How to Use This System, Day to Day

The loop, once F0 is complete:

1. Open `10_SPRINT_PLANNING.md`; identify the current sprint and its next task.
2. Open the task card in `11_TASK_BREAKDOWN.md`.
3. Route to Flash High or Pro per `12` §3.
4. Assemble the prompt from the card using the template in `12` §5 — `CTX-CORE` plus the card's named packs, plus the card's invariants.
5. Require the Pre-Flight Report before code.
6. Run `make verify`.
7. Run review Pass 1 in-session; Pass 2 in a fresh Pro session if the card requires it.
8. Human review against `06` §19.
9. Append to `LEDGER.md`; update `SESSION_LOG.md`; commit per `06` §7; open the PR.
10. Merge on green.

The system is working when a task card can be handed to a model that has never seen this codebase and the resulting diff is indistinguishable from the previous forty.

---

Owner: Qelvix Engineering Team
Status: Living document — amend as the build teaches you something
