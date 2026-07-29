#!/usr/bin/env bash
# AGENTS.md is paid for in every session's context window, so its size is a
# hard limit rather than a guideline (08 §17, 09 F0 risk 3).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${REPO_ROOT}/AGENTS.md"
LIMIT=150

if [[ ! -f "${TARGET}" ]]; then
  echo "error: AGENTS.md not found at ${TARGET}" >&2
  exit 1
fi

LINES="$(wc -l < "${TARGET}" | tr -d '[:space:]')"

if (( LINES > LIMIT )); then
  echo "error: AGENTS.md is ${LINES} lines, ceiling is ${LIMIT}." >&2
  echo "Move per-task detail into a Context Pack (docs/impl/CONTEXT_PACKS.md)." >&2
  exit 1
fi

echo "AGENTS.md: ${LINES}/${LIMIT} lines"
