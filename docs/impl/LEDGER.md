# Ledger

Append-only, one entry per completed task. Purpose is **continuity across sessions**, not history — this is the first thing loaded when resuming after any interruption (`12` §10), and the searchable answer to "does something already exist for X" that no model can answer from its own memory.

The `Emits finding_type` line exists specifically because INV-08 is a string contract with no compiler behind it. Omit the line when a task emits none.

## Entry template

```markdown
## T-S06-03 — SSL rules engine  ·  2026-08-04  ·  Flash High
Files: backend/app/rules/ssl_rules.py, backend/tests/rules/test_ssl_rules.py
Invariants checked: INV-02, INV-08, INV-14
Emits finding_type: ssl_expired, ssl_expiring_soon, ssl_weak_cipher, ssl_self_signed
Notes: expiry thresholds taken verbatim from 04 §6 Agent 3 table.
Deviation: none.
Follow-ups: T-S06-07 (playbook for ssl_weak_cipher)
```

---

## T-S01-01 — Monorepo skeleton and workspace configuration · 2026-07-28 · Flash High
Files: .gitignore, README.md, full directory tree per 03 §2 / 02 §2 / 06 §1, docs/ populated
Invariants checked: INV-29
Notes: 45 .gitkeep files in empty directories. Frozen docs 01–07 + README copied byte-identical into docs/; living docs 08–12 and the TRD relocated there.
Deviation: none.
Follow-ups: —

## T-S01-02 — Backend toolchain: dependencies, ruff, mypy strict, pytest · 2026-07-28 · Flash High
Files: backend/requirements.txt, backend/requirements-dev.txt, backend/pyproject.toml, backend/app/main.py, backend/app/config.py, backend/tests/conftest.py, backend/app/**/__init__.py
Invariants checked: INV-09, INV-10, INV-14, INV-29
Notes: mypy strict + disallow_untyped_defs; ruff ANN/ASYNC/T20/S rule sets enforce INV-14, INV-10 and the no-print rule. Pytest markers unit/tenancy/contract registered with --strict-markers. create_app() is a factory taking optional Settings so tests never read the process environment.
Deviation: none.
Follow-ups: —

## T-S01-03 — Frontend toolchain: Next.js 14, TS strict, Tailwind, shadcn, ESLint · 2026-07-28 · Flash High
Files: frontend/package.json, tsconfig.json, next.config.mjs, tailwind.config.ts, postcss.config.js, .eslintrc.json, .prettierrc, .prettierignore, components.json, vitest.config.ts, playwright.config.ts, app/layout.tsx, app/page.tsx, app/globals.css, tests/setup.ts
Invariants checked: INV-19, INV-23, INV-26
Notes: tsconfig strict + noUncheckedIndexedAccess; @/ alias configured. tailwind.config.ts carries content paths and darkMode:'class' only — 05 §3 tokens are deliberately absent until F3. Theme provider and TanStack Query client are absent from the root layout until F2.
Deviation: app/page.tsx claims "/" and is deleted in F14 when app/(marketing)/page.tsx takes that route. Recorded in AMENDMENTS.md.
Follow-ups: F14 landing page task must delete frontend/app/page.tsx

## T-S01-04 — Local environment: docker-compose, .env.example, Makefile · 2026-07-28 · Flash High
Files: docker-compose.yml, .env.example, frontend/.env.local.example, Makefile
Invariants checked: INV-29
Notes: Postgres 15 and Redis 7 pinned to match 03 §1. .env.example carries every variable in 03 §11 with no values. Makefile migrate/seed targets reference Alembic config and a seed script that land in S02.
Deviation: none.
Follow-ups: —

## T-S01-05 — Contract tooling: OpenAPI export, type generation, snapshot diff · 2026-07-28 · Pro
Files: scripts/export_openapi.py, scripts/generate_types.sh, docs/contracts/openapi.json, frontend/lib/api/types.generated.ts, frontend/lib/api/README.md; modified Makefile, backend/app/main.py
Invariants checked: INV-09, INV-19
Notes: Export runs in-process against fixed non-secret settings so output depends only on code, never on the developer's environment. json.dumps(sort_keys=True) + trailing newline keeps the diff stable. Type generation reads the snapshot from disk, so G6 runs offline with no server.
Deviation: none.
Follow-ups: —

## T-S01-06 — CI pipeline with gates G1–G7 · 2026-07-28 · Pro
Files: .github/workflows/ci.yml, .pre-commit-config.yaml, .secrets.baseline, scripts/check_agents_md_length.sh; modified Makefile
Invariants checked: INV-28, INV-29
Notes: Seven gates, each a separate job, each independently blocking. AGENTS.md line-count check wired as part of G1.
Deviation: The seven deliberate-failure demonstrations required by the card's DoD have not been run — no git remote exists yet, so no trial PR is possible. Owed before F1 closes.
Follow-ups: run the seven deliberate gate failures once a remote exists

## T-S01-07 — DevOS control files · 2026-07-28 · Pro
Files: AGENTS.md, docs/impl/INVARIANTS.md, CONTEXT_PACKS.md, LEDGER.md, SESSION_LOG.md, AMENDMENTS.md, BLOCKERS.md, DECISIONS/.gitkeep
Invariants checked: —
Notes: INVARIANTS.md carries INV-01..INV-30 verbatim from 08 §8. CONTEXT_PACKS.md carries all eleven packs from 08 §9.2. Frozen docs untouched.
Deviation: The trial Antigravity session confirming AGENTS.md auto-loads has not been run.
Follow-ups: confirm AGENTS.md auto-loads in Antigravity

## T-S01-08 — Test harness placeholders and gate proof · 2026-07-28 · Flash High
Files: backend/tests/test_health.py, frontend/tests/components/placeholder.test.tsx, frontend/tests/e2e/smoke.spec.ts, frontend/tests/e2e/a11y.spec.ts, lighthouserc.json
Invariants checked: INV-28
Notes: One real test per category — pytest, Vitest, Playwright, axe, Lighthouse. Lighthouse thresholds are 02 §14's verbatim (LCP 2.5s, INP 200ms, CLS 0.1). No test reaches the network: the backend suite uses httpx ASGITransport in-process.
Deviation: none.
Follow-ups: —
