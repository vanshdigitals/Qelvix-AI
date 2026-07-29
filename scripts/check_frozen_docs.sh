#!/usr/bin/env bash
# docs/README.md and docs/01–07 are frozen (08 §16.1). A contradiction between
# implementation and a frozen document produces an ADR under
# docs/impl/DECISIONS/, never an edit to the document.

set -euo pipefail

if [[ $# -eq 0 ]]; then
  exit 0
fi

echo "error: frozen document(s) modified:" >&2
for path in "$@"; do
  echo "  ${path}" >&2
done
cat >&2 <<'MSG'

Frozen documents are never edited. If implementation contradicts one:
  1. Record an ADR in docs/impl/DECISIONS/
  2. Record the erratum in docs/impl/AMENDMENTS.md
  3. Revert the change to the frozen file
See 08_IMPLEMENTATION_METHODOLOGY.md §16.2.
MSG
exit 1
