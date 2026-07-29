# `lib/api/`

`types.generated.ts` is generated from `docs/contracts/openapi.json` by `make contract` and must never be hand-edited — gate G6 diffs it against a fresh generation and fails the build on any manual change. Typed fetch clients in this directory import their request and response types from that file only; a hand-written interface describing an API shape is a review block (INV-19), because the generated type already exists and a second copy is guaranteed to drift.
