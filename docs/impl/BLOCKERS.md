# Blockers

Open blockers with owning task IDs. A blocker is emitted rather than guessed when the authority documents are silent on something a task needs (`08` §16.2, `11` §2).

| ID | Owning task | Blocker | Raised | Status |
|---|---|---|---|---|
| B-01 | T-S01-06 | The seven deliberate gate failures required by the card's DoD cannot be demonstrated: no git remote exists, so no trial PR can run. Gates are implemented and locally runnable; only the adversarial proof is outstanding. | 2026-07-28 | Open |
| B-02 | T-S01-07 | The trial Antigravity session confirming `AGENTS.md` auto-loads has not been run. | 2026-07-28 | Open |
| B-03 | T-S01-04 | `make dev` is unverified end-to-end: Docker is not installed in the current environment, so the Postgres/Redis half of the stack could not be booted. | 2026-07-28 | Open |
| B-04 | T-S01-06 | **Gate G7 cannot pass as specified while Next.js 14 is frozen.** `02` §1 pins Next.js 14; every 14.x release (latest 14.2.35) carries high-severity advisories — `next`, its bundled `postcss`, and the `eslint-config-next` → `glob`/`brace-expansion` chain — fixed only in Next 16. G7 runs `npm audit --audit-level=high` and blocks merge. Everything outside the Next 14 chain was resolved (vitest 4, vite 8, Playwright 1.62, openapi-typescript 7.13). Needs a human decision: waive these advisories in G7 via an allowlist, or raise an ADR to move off Next 14. Do not resolve by force-overriding transitive versions — that was attempted and broke ESLint at runtime. | 2026-07-28 | Open |
| B-05 | T-S01-05 | `docs/contracts/openapi.json` and `frontend/lib/api/types.generated.ts` have not been generated: backend dependencies are not installed in this environment (venv creation declined; system Python is 3.14, outside the 3.11 target). `make contract` must be run once deps are installed, before G6 can pass. | 2026-07-28 | Open |

Closing a blocker means editing its Status here and noting the resolution in `LEDGER.md` against the owning task.
