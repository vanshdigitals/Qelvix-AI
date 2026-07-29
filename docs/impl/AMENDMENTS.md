# Amendments

Errata against the frozen set (`docs/README.md`, `docs/01`–`docs/07`). The frozen documents are never edited; a correction is recorded here and, where it changes a decision rather than a fact, as an ADR under `DECISIONS/` (`08` §16.2).

| # | Against | Nature | Recorded | Status |
|---|---|---|---|---|
| A-01 | `02` §2 | `frontend/app/page.tsx` exists during F0–F13 but is absent from `02` §2's tree, which puts the Landing Page at `app/(marketing)/page.tsx`. Both claim `/`, so they cannot coexist. T-S01-03's card explicitly requires the former as the bootstrap index; the F14 landing-page task deletes it. Not a conflict with `02` — a temporary file with a scheduled removal. | 2026-07-28 | Open until F14 |

No other amendment recorded. Frozen documents are byte-identical to their uploaded versions.
