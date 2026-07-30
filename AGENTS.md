# Qelvix — Workspace Rules

Qelvix is an AI-powered cybersecurity platform for Indian SMBs: a LangGraph pipeline scans an organisation's public attack surface and reports findings in plain language. The governing principle is **rules decide, the LLM explains** — deterministic rules engines determine whether a finding exists, its severity, and its risk score; Claude is called only to explain and remediate, only from `claude_service.py`, and never to make a security judgement.

## Repository map

| Path | Owning document | Touch when... |
|---|---|---|
| `frontend/app/` | `02` §3 | Adding/changing a screen or route |
| `frontend/components/` | `02` §6, `05` §4 | Building or modifying a UI component |
| `frontend/lib/queries/` | `02` §5 | Adding a data-fetching hook |
| `frontend/lib/api/` | `08` §6.1 | Never by hand — generated from the OpenAPI snapshot |
| `backend/app/routers/` | `03` §5 | Adding/changing an endpoint |
| `backend/app/models/` | `03` §4 | Schema changes — always via Alembic |
| `backend/app/agents/` | `04` §5–6 | Adding/changing a pipeline node |
| `backend/app/rules/` | `04` §5–6 | Adding/changing a deterministic rule |
| `backend/app/services/` | `03` §8–9 | Adding/changing an external integration |
| `playbooks/` | `04` §9 | Adding/changing an IR playbook |

## Invariants

Full text and sources: `docs/impl/INVARIANTS.md`. Your task card lists which are in force.

- **INV-01** NVIDIA NIM API called only from `claude_service.py`, only via its four functions.
- **INV-02** Rules decide, the LLM explains. No LLM output sets existence, severity, `raw_data`, risk, or DPDP status.
- **INV-03** Every authenticated route depends on `get_current_org`. `org_id` is never client-supplied.
- **INV-04** Every tenant-scoped table enables RLS in the migration that creates it.
- **INV-05** A schema change ships as a hand-verified Alembic migration before the code using it.
- **INV-06** An agent node never raises. Per-item failures append to `state["errors"]`.
- **INV-07** `completed` with a non-empty `error_log` is a partial result, never a clean success.
- **INV-08** `finding_type` is snake_case and matches its playbook trigger exactly; both land in one PR.
- **INV-09** Request/response shapes are Pydantic models in the router file. Never a bare dict.
- **INV-10** Backend I/O is async. Rules engines are the sole deliberate exception.
- **INV-11** List endpoints paginate and return `{ items, total, limit, offset }`.
- **INV-12** Mutation endpoints return the updated resource, not a bare 204.
- **INV-13** One module per external service under `services/`, returning a plain dict.
- **INV-14** Python fully type-hinted and `mypy`-clean; no untyped `def`.
- **INV-15** Per-org configurable values live in `organizations.settings` JSONB.
- **INV-16** Server Components by default; Client only under `02` §6's conditions.
- **INV-17** Feature components contain no `fetch`. Data arrives as props or from `lib/queries/`.
- **INV-18** Query keys are `[resource, orgId, ...params]`; `orgId` always present.
- **INV-19** No hand-written interface describes an API response. Types are generated.
- **INV-20** Filter/pagination state in URL params; ephemeral UI state in scoped Zustand; forms in react-hook-form.
- **INV-21** `components/ui/` primitives are never patched at a call site.
- **INV-22** Every `01` §11 component has exactly one implementation.
- **INV-23** Colour, spacing, radius, elevation, motion come from `05` §3 tokens. No hardcoded values.
- **INV-24** Recharts only through `components/shared/DataChart.tsx`, dynamically imported.
- **INV-25** Loading, error, empty, success all implemented before the PR opens.
- **INV-26** `strict` TypeScript; no `any` without an inline justification comment.
- **INV-27** Claude output is untrusted: rendered via `MarkdownViewer`, never raw HTML.
- **INV-28** WCAG 2.1 AA. Severity never signalled by colour alone. Every route passes `axe-core`.
- **INV-29** No secret is committed. Config only from `03` §11's variables. Webhooks verify signatures.
- **INV-30** Logs are structured JSON carrying `org_id`. Claude prompts/responses never logged above `DEBUG`.

## Naming

| Item | Convention | Example |
|---|---|---|
| Component file | PascalCase | `FindingCard.tsx` |
| Hook file | camelCase, `use` prefix | `useFindingsQuery.ts` |
| Zustand store | camelCase, `use...Store` | `useSidebarStore.ts` |
| Route folder | kebab-case | `domain-verification/` |
| Zod schema file | kebab-case | `domain-verification.ts` |
| Non-component util | camelCase | `formatRiskBand.ts` |
| Python module | snake_case | `ssl_analyzer.py` |
| Python class | PascalCase | `AgentState` |
| Python function/variable | snake_case | `evaluate_ssl` |
| SQLAlchemy model | PascalCase, singular | `Finding` (table: `findings`) |
| Alembic migration | `<timestamp>_<snake_case_description>.py` | `20260315_add_members_table.py` |
| Environment variable | SCREAMING_SNAKE_CASE | `NVIDIA_API_KEY` |
| Celery task | snake_case, verb-first | `run_full_scan` |

## Standing rules

1. **Read the task card first.** It is the authority for scope; this file is the authority for how.
2. **Produce a Pre-Flight Report before writing code** — files you will create, files you will modify, invariants in force, and anything the card leaves ambiguous.
3. **Never touch a file outside the card's declared create/modify list.** An unrelated "while I was here" fix makes the diff unreviewable and is reverted regardless of correctness.
4. **Emit a BLOCKER rather than guessing.** If the authority documents are silent on something the task needs, append to `docs/impl/BLOCKERS.md` and stop. A plausible invention is more expensive than a paused task.
5. **Never edit `docs/README.md` or `docs/01`–`docs/07`.** They are frozen. A contradiction produces an ADR under `docs/impl/DECISIONS/`, never an edit.
6. **Append a `docs/impl/LEDGER.md` entry** when the task completes. It is how the next session knows what exists.

## Verification

```bash
make verify        # G1 lint+types, G2 unit tests, G6 contract snapshot, G7 supply chain
make verify-full   # adds G3 axe-core, G4 Playwright, G5 Lighthouse budget
make contract      # regenerate the OpenAPI snapshot and frontend types
```

`make verify` must be green before review. A red gate is never merged past with a follow-up promise.
