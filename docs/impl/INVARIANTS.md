# Invariant Registry

The thirty rules extracted from `01`–`07`, canonical machine-readable copy. Cited by ID in every implementation prompt (`12` §5) and checked by ID in every review (`12` §11). Source of truth: `08_IMPLEMENTATION_METHODOLOGY.md` §8.

A violation is never accepted with a follow-up promise. It is regenerated (`12` §12).

## Architecture & AI boundary

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

## Backend

| ID | Invariant | Source |
|---|---|---|
| **INV-09** | All request/response shapes are Pydantic models colocated in the router file. A router never returns a bare dict. | `03` §3, `06` §5 |
| **INV-10** | Backend I/O is async. Synchronous I/O inside `async def` is a review block. Rules engines are the sole exception and are deliberately synchronous. | `06` §5 |
| **INV-11** | List endpoints are paginated and return `{ items, total, limit, offset }`. Filter params match `01`'s filter-bar names one-to-one. | `03` §5.1 |
| **INV-12** | Mutation endpoints return the updated resource, not a bare 204. | `03` §5.1 |
| **INV-13** | An external service integration is one module under `services/` returning a plain dict; no provider-specific type crosses that boundary. | `03` §8, `06` §10.3 |
| **INV-14** | Python is fully type-hinted and `mypy`-clean; no untyped `def`. | `06` §5 |
| **INV-15** | Per-org configurable values live in `organizations.settings` JSONB, not in new ad-hoc columns. | `03` §4.1, `06` §15, §21 |

## Frontend

| ID | Invariant | Source |
|---|---|---|
| **INV-16** | Server Components by default. A component becomes a Client Component only under the conditions in `02` §6. | `02` §6, `06` §5 |
| **INV-17** | Feature components contain no `fetch`. Data arrives as props from a Server Component or from a `lib/queries/` hook. | `02` §6, `06` §9.4 |
| **INV-18** | Query keys are `[resource, orgId, ...params]`. `orgId` is always present. | `02` §5 |
| **INV-19** | No hand-written TypeScript interface describes an API response. API types are generated from the OpenAPI snapshot. | `08` §6.1, enforcing `03` §5.1 |
| **INV-20** | Filter and pagination state lives in URL search params. Ephemeral UI state lives in narrowly-scoped Zustand stores. Forms own their own state via react-hook-form. | `02` §4 |
| **INV-21** | `components/ui/` shadcn primitives are never patched at a call site. A missing variant is added to the primitive. | `02` §6 |
| **INV-22** | Every component in the `01` §11 inventory has exactly one implementation. A second component of the same shape is a bug. | `02` §6, `06` §21 |
| **INV-23** | Colour, spacing, radius, elevation, and motion values come from `05` §3 tokens. No hardcoded hex or arbitrary pixel values in feature code. | `05` §3 |
| **INV-24** | Recharts is used only through `components/shared/DataChart.tsx`, dynamically imported. | `02` §9 |
| **INV-25** | Every state specified in a screen's `01` table — loading, error, empty, success — is implemented before the PR opens. Route-level `loading.tsx` renders that screen's specific skeleton, never a generic spinner. | `01` per-screen tables, `02` §3, `06` §9.5, §20 |
| **INV-26** | `strict` TypeScript; no `any` without an inline justification comment. | `02` §1, `06` §5 |

## Security, accessibility, operations

| ID | Invariant | Source |
|---|---|---|
| **INV-27** | Claude-generated content is untrusted output: rendered through `MarkdownViewer`, never as raw HTML, and subject to the output validation and prompt-injection defences in `07` §14 and §20. | `07` §14, §20, `02` §13 |
| **INV-28** | Accessibility is WCAG 2.1 AA. Severity is never signalled by colour alone. Every route passes `axe-core` in CI. | `05` §8, `02` §12 |
| **INV-29** | No secret is committed. Environment configuration lives only in the variables defined in `03` §11. Webhook endpoints validate the provider signature before processing. | `03` §11, `06` §18, `07` §8 |
| **INV-30** | Logs are structured JSON and carry `org_id` where the context has one. Claude prompts and responses are never logged in full above `DEBUG`. | `03` §10, `06` §13 |
