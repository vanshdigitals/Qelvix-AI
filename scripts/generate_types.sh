#!/usr/bin/env bash
# Generate frontend API types from the committed OpenAPI snapshot.
#
# Gate G6 (08 §6.1). No hand-written TypeScript interface ever describes an API
# response (INV-19) — this file is the only source of those types.
#
# Reads the snapshot from disk rather than a running server, so the check works
# offline and in CI without booting the backend.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SNAPSHOT="${REPO_ROOT}/docs/contracts/openapi.json"
OUTPUT="${REPO_ROOT}/frontend/lib/api/types.generated.ts"

if [[ ! -f "${SNAPSHOT}" ]]; then
  echo "error: ${SNAPSHOT} not found. Run scripts/export_openapi.py first." >&2
  exit 1
fi

HEADER="/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by scripts/generate_types.sh from docs/contracts/openapi.json.
 * Run \`make contract\` to regenerate. Hand edits fail gate G6.
 */
"

TMP="$(mktemp)"
trap 'rm -f "${TMP}"' EXIT

npx --yes openapi-typescript@7 "${SNAPSHOT}" --output "${TMP}"

mkdir -p "$(dirname "${OUTPUT}")"
printf '%s\n' "${HEADER}" > "${OUTPUT}"
cat "${TMP}" >> "${OUTPUT}"

echo "Wrote frontend/lib/api/types.generated.ts"
