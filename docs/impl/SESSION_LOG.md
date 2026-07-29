# Session Log

Current and last session handoff state. Overwritten each session — the durable record is `LEDGER.md`.

## Current state

**Phase:** F0 — Repository, Toolchain & DevOS Bootstrap
**Sprint:** S01
**Last completed task:** T-S01-08
**Next task:** T-S02-01 — SQLAlchemy models for all seven tables

## Handoff notes

Sprint S01 is code-complete. Frontend is installed and verified: `tsc --noEmit`, `next lint`, `prettier`, `vitest`, and `next build` all pass.

Owed before F0's exit criteria formally hold:

1. `git init` has not been run — the repository is not under version control, so no gate depending on `git diff` or `git ls-files` has executed.
2. Backend dependencies are not installed (B-05). Run `python3.11 -m venv backend/.venv && pip install -r backend/requirements-dev.txt`, then `pytest`, `mypy app`, and `make contract` to produce the G6 artifacts.
3. B-01 through B-04 in `BLOCKERS.md`.

Note on Python: system Python here is 3.14; the project targets 3.11 (`03` §1, `pyproject.toml`). Use a 3.11 interpreter for the venv.

## Open blockers

See `BLOCKERS.md`.
