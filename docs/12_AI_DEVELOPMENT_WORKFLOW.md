# 12: AI Development Workflow

The operational core of the AI DevOS. `08` sets the philosophy, `09`–`11` set what gets built and in what order. This document sets **how a session is actually run**: which model, what context, what prompt, what review, what to do when it goes wrong, and how quality holds across hundreds of sessions.

Everything here is written for **Gemini 3.6 Flash High** and **Gemini 3.1 Pro** inside **Antigravity IDE**. The templates are meant to be copied and filled, not paraphrased.

---

## 1. The Session Model

One session = one task card = one reviewable diff.

```
  TASK CARD (11)
       │
       ▼
  ROUTE ──────────► Flash High  or  Pro          §3
       │
       ▼
  ASSEMBLE CONTEXT (CTX packs + card)            §4
       │
       ▼
  PROMPT (universal template)                    §5
       │
       ▼
  PRE-FLIGHT REPORT ──► BLOCKER? ──► stop, resolve at spec level   §6, §7
       │ no
       ▼
  IMPLEMENT
       │
       ▼
  make verify ──► fail ──► correction prompt (≤2) ──► fail again ──► escalate to Pro   §9
       │ pass
       ▼
  SELF-REVIEW (same session)                     §12.1
       │
       ▼
  ADVERSARIAL REVIEW (fresh Pro session, if card requires)   §12.2
       │
       ▼
  HUMAN REVIEW (06 §19)
       │
       ▼
  LEDGER + SESSION_LOG + commit + PR             §17
```

Two rules govern the whole loop:

- **One card per session.** A session that completes its card and starts the next one has lost the property that makes the diff reviewable.
- **The session ends when the card is done or blocked** — never in an ambiguous middle state. If a session must end mid-card, it ends by writing a handoff (§11), not by trailing off.

---

## 2. The Two Models

Routing is not about capability ranking. It is about matching the failure mode you can afford to the work in front of you.

### Gemini 3.6 Flash High

Fast, high-throughput, excellent at executing a well-specified plan. It is the right default for most of this build, because most of this build is well-specified — that is what `01`–`07` and the task cards are for.

| Strength | Failure mode |
|---|---|
| Executes a complete spec accurately and quickly | Fills gaps with plausible invention rather than stopping, when the spec is incomplete |
| Copies a named reference pattern faithfully | Optimises locally in ways that break a global invariant |
| Produces consistent code across many similar tasks | Loses the earliest instruction in a long prompt |
| Mechanical refactors, test writing, CRUD | Under-explores when the first approach is wrong; commits to it |

**Use Flash High when the answer is already decided and the task is to render it in code.**

### Gemini 3.1 Pro

Slower and more expensive, materially better at holding multiple constraints simultaneously and at reasoning about consequences that are not local to the diff.

| Strength | Failure mode |
|---|---|
| Holds several interacting constraints at once | Over-engineers when a simple answer was correct |
| Traces second-order consequences of a change | Produces more code than the card asked for |
| Finds root causes rather than symptoms | Can rationalise a deviation persuasively — which is why ADRs get an independent review |
| Designs a pattern others will copy | Slower, so it is wasted on mechanical work |

**Use Pro when the task decides something, rather than implements something already decided.**

---

## 3. Model Routing

### 3.1 Routing table

| Work | Model | Reason |
|---|---|---|
| Card with a complete spec and a named reference implementation | **Flash** | Rendering a decided answer |
| CRUD endpoint following the `routers/org.py` pattern | **Flash** | Pattern exists |
| Screen from a `01` spec using existing components | **Flash** | Fully specified |
| Rules engine from a `04` §6 table | **Flash → Pro** | Mechanical, but a wrong threshold is a silent correctness bug — escalate on any ambiguity |
| Test writing from a spec table | **Flash** | Mechanical |
| Mechanical refactor with a named target | **Flash** | Mechanical |
| Fixture creation, seed data, config | **Flash** | Mechanical |
| Documentation sync, Ledger entries | **Flash** | Mechanical |
| **Anything establishing a pattern others copy** | **Pro** | Its quality propagates to every later card |
| `get_current_org`, `require_role`, RLS policies | **Pro** | Highest-consequence code in the repository |
| `claude_service.py`, prompts, injection defence | **Pro** | LLM-boundary design; `INV-01`, `INV-02` |
| LangGraph DAG, `AgentState`, partial-failure semantics | **Pro** | Interacting constraints across `03`, `04`, `02` |
| Risk scoring | **Pro** | The number the product is organised around |
| Contract tooling, CI gates | **Pro** | Infrastructure everything depends on |
| Cross-cutting refactor | **Pro** | Consequences are non-local |
| Debugging after two failed Flash attempts | **Pro** | See §9 |
| Adversarial review of security-sensitive code | **Pro** | Needs consequence reasoning |
| Phase architecture audit (CP-Phase) | **Pro** | Whole-phase drift detection |
| ADR authoring and ADR review | **Pro** | Deciding, not implementing |
| Expanding an indexed task into a card (`11` §2) | **Pro** | The card determines the diff's quality |

### 3.2 Escalation triggers — Flash to Pro

Switch mid-task when **any** of these occur. Do not persist with Flash out of momentum; the second and third attempts are where invented plausibility enters the codebase.

1. **Two failed attempts** at the same acceptance criterion.
2. **The model asks an architectural question.** If it is asking, the card was incomplete — Pro to resolve, then update the card.
3. **The diff exceeds the card's declared scope** by roughly 50%, or touches files outside the declared list.
4. **The model proposes changing a frozen document.** Stop. Pro session, ADR path (`08` §16.2).
5. **Type errors cascade.** More than three rounds of type fixing means the shape is wrong, not the annotations.
6. **The model writes a test that asserts current behaviour** rather than the spec. It has stopped reading the spec.
7. **The model proposes a new abstraction** not named in the card — a new base class, a new service module, a new hook layer.
8. **A cross-layer consequence appears** — a backend card that wants to touch the frontend, or vice versa.
9. **The model expresses uncertainty** about which of two documents governs. Document precedence is `01` > later documents (`README`), and the resolution belongs in an ADR, not in a guess.

### 3.3 De-escalation — Pro back to Flash

Once Pro has produced the design, hand the **implementation** back to Flash. A Pro session that outputs a precise plan and a Flash session that executes it is usually better and cheaper than Pro doing both, because the plan becomes a written artifact that can be reviewed before code exists.

```
Pro session output:  a precise implementation plan (files, signatures,
                     edge cases, tests) — no code
       │
       ▼
Update the task card with the plan
       │
       ▼
Flash session: implement exactly this plan, no deviation
```

---

## 4. Context Preparation

### 4.1 The assembly checklist

Before any prompt, confirm all six. This takes about ninety seconds and is the highest-leverage ninety seconds in the loop.

- [ ] `AGENTS.md` is loaded (automatic in Antigravity; verify it is present)
- [ ] The task card is in context, complete
- [ ] Every Context Pack named on the card is loaded
- [ ] The card's invariants are listed by ID **with their text**, not just IDs
- [ ] The reference implementation file is loaded, if the card names one
- [ ] Relevant `LEDGER.md` entries are loaded — this is how the session learns what already exists

### 4.2 How much

| Session | Target | Ceiling | Over the ceiling means |
|---|---|---|---|
| Flash implementation | 8k–15k | 25k | Split the task, not the ceiling |
| Flash test / refactor | 5k–10k | 15k | Same |
| Pro architecture / debugging | 25k–50k | 80k | Reduce scope of the question |

Both models degrade recognisably when over-fed: they begin summarising instead of implementing, lose the middle of the input, and satisfy the most recent instruction rather than the most important. When output quality drops without the task getting harder, suspect context bloat first.

### 4.3 Verbatim versus pointer

| Supply verbatim | Supply as a pointer |
|---|---|
| Severity threshold tables (`04` §6) | Background product reasoning (`01` §1, §2) |
| The screen's own `01` section | Other screens' sections |
| `03` §4.1 schema when writing models | The full API list when writing one endpoint |
| `03` §3's dependency table for any endpoint | `07`'s compliance mapping unless it is the task |
| The card's invariants | The other twenty-two invariants |
| The reference implementation file | The whole directory it lives in |

**Rule of thumb: anything the model must reproduce exactly goes in verbatim. Anything it must merely respect goes in as an invariant.**

### 4.4 What to actively exclude

Say so on the card:

- **The implementation, when writing its tests.** Otherwise the tests encode the code (`08` §11.1).
- **Full product documents for narrow tasks.** `01` in full for a rules engine displaces the severity table with product framing the model will try to satisfy.
- **Unrelated prior session transcripts.** Stale reasoning is worse than no reasoning.
- **Other screens' specs when building one screen.** A reliable source of blended, wrong UI.

### 4.5 Context Packs

Defined in `08` §9.2, stored at `docs/impl/CONTEXT_PACKS.md`, referenced by name on every card. Cards name packs; they never describe context in prose. "Load the relevant backend docs" means the selection is made freshly, differently, each time.

---

## 5. The Universal Prompt Template

Every implementation session uses this. Nine blocks, always in this order. The ordering matters: role and task first (framing), invariants and constraints in the middle (operative during generation), output contract and stop conditions last (most recent, therefore most salient at the moment of writing).

```
════════════════════════════════════════════════════════════
1 · ROLE
You are implementing a single task card in the Qelvix codebase.
Qelvix is a multi-tenant cybersecurity SaaS. Its core architectural
principle is Rules-before-LLM: deterministic Python rules decide every
security finding and severity; Claude only explains decisions already made.

Documents docs/README.md and docs/01–07 are FROZEN. Never edit them.
Never contradict them. If this task appears to require contradicting one,
stop and emit a BLOCKER.

2 · TASK
ID:        T-Sxx-nn
Title:     <card title>
Objective: <one sentence>
Scope:     <XS|S|M|L>

3 · AUTHORITY DOCUMENTS
These are the specification. Where they and your instincts differ,
they win.
<paste the exact sections — verbatim for anything to be reproduced exactly>

4 · INVARIANTS IN FORCE
Every one of these must hold in your output. Cite them by ID in your
self-review.
INV-03: Every authenticated route depends on get_current_org; org_id is
        never a client-supplied parameter on a tenant-scoped route.
INV-09: All request/response shapes are Pydantic models colocated in the
        router file. A router never returns a bare dict.
<...4–8 total, with full text>

5 · REFERENCE IMPLEMENTATION
Copy the shape of this file. Do not improve on it — consistency across
the codebase is worth more here than a local improvement.
<file path + contents>

6 · FILE BOUNDARIES
CREATE:        <exact paths>
MODIFY:        <exact paths>
MUST NOT TOUCH: <exact paths>
Do not create, modify, or delete any file outside these lists. If the
task cannot be completed within them, emit a BLOCKER.

7 · OUTPUT CONTRACT
Step 1 — Emit a PRE-FLIGHT REPORT (format in block 9). No code yet.
Step 2 — Wait for nothing; proceed to implementation unless the
         pre-flight surfaced a blocker.
Step 3 — Emit complete file contents for every created file and precise
         diffs for every modified file. No elisions, no "... rest
         unchanged", no placeholder comments.
Step 4 — Emit a SELF-REVIEW: each acceptance criterion and each invariant
         ID, marked PASS or FAIL with one line of evidence.

8 · ACCEPTANCE CRITERIA
<the card's criteria, verbatim>

9 · PRE-FLIGHT REPORT FORMAT
EXISTING CODE I WILL TOUCH:  <file: current exports/shape>
SEARCH FOR DUPLICATES:       <what I searched for; what I found; why it
                             does or does not already cover this>
PATTERN I AM COPYING:        <reference file, and which aspects>
AMBIGUITIES OR CONFLICTS:    <or "none">
PLAN:                        <3–8 bullets>

10 · STOP CONDITIONS
Emit a BLOCKER instead of proceeding if:
 · the specification is ambiguous on something this task must decide
 · the task requires a file outside the boundaries in block 6
 · the task requires contradicting a frozen document
 · a dependency this task needs does not exist in the codebase

BLOCKER format:
BLOCKER: <one-line summary>
NEEDED:  <what is missing>
OPTIONS: <2–3, with trade-offs>
IMPACT:  <what cannot proceed without it>

Guessing where a blocker was warranted is a failed generation. Emitting a
blocker is never a failure.

11 · VERIFICATION
After implementing, these must pass:
<exact commands from the card>
════════════════════════════════════════════════════════════
```

### 5.1 Worked example — T-S13-01

```
1 · ROLE
[standard block, as above]

2 · TASK
ID: T-S13-01 · Title: GET /findings with filters and pagination
Objective: Implement the findings list endpoint with the exact filter
           parameters and pagination envelope the frontend consumes.
Scope: M

3 · AUTHORITY DOCUMENTS
--- 03_BACKEND.md §5 (FINDINGS block) ---
GET /findings   # all findings (filter: severity, status, type, asset)
--- 03_BACKEND.md §5.1 (verbatim) ---
List endpoints are paginated with limit/offset query params and a
consistent { items[], total, limit, offset } envelope. Filterable
endpoints (GET /findings) accept filters as query params matching the
filter names in 01's Findings List filter bar one-to-one...
--- 01_PRODUCT_BLUEPRINT.md §9, Findings List (filter bar rows) ---
[paste]

4 · INVARIANTS IN FORCE
INV-03: Every authenticated route depends on get_current_org; org_id is
        never a client-supplied parameter on a tenant-scoped route.
INV-09: All request/response shapes are Pydantic models colocated in the
        router file. A router never returns a bare dict.
INV-10: Backend I/O is async. Synchronous I/O inside async def is a
        review block.
INV-11: List endpoints are paginated and return
        { items, total, limit, offset }. Filter params match 01's
        filter-bar names one-to-one.
INV-14: Fully type-hinted; mypy clean; no untyped def.

5 · REFERENCE IMPLEMENTATION
backend/app/routers/org.py  [full contents]

6 · FILE BOUNDARIES
CREATE:  backend/app/routers/findings.py
MODIFY:  backend/app/main.py (register router only)
MUST NOT TOUCH: backend/app/models/*, backend/app/dependencies/*,
                frontend/**, docs/**

7 · OUTPUT CONTRACT   [standard]

8 · ACCEPTANCE CRITERIA
 · Filters accepted: severity, status, finding_type, asset_id — names
   matching 01's filter bar exactly
 · Response envelope exactly { items, total, limit, offset }
 · get_current_org applied; no hand-rolled org_id filter
 · org_id rejected if supplied as a query parameter
 · Pydantic response model colocated in findings.py
 · Async throughout; no synchronous DB call
 · Default limit 50, maximum 200; invalid values return 422
 · Sort order deterministic and documented

9 · PRE-FLIGHT REPORT FORMAT   [standard]
10 · STOP CONDITIONS           [standard]

11 · VERIFICATION
cd backend && mypy app/routers/findings.py && \
  pytest tests/api/test_findings.py -v && cd .. && make contract
```

---

## 6. Prompt Types

### 6.1 Implementation prompt
The universal template. Default for every card.

### 6.2 Continuation prompt (same session, more scope)
Only when the card explicitly has sequential parts. Re-state the invariants — they decay across turns faster than anything else in the prompt.

```
Continue T-Sxx-nn. Part 1 is complete and verified.

STILL IN FORCE: INV-03, INV-09, INV-11 [full text again]
FILE BOUNDARIES: unchanged from the original prompt.

PART 2: <objective>
ACCEPTANCE CRITERIA: <criteria>
Do not revisit Part 1's files except where Part 2 requires it. If Part 2
reveals a defect in Part 1, report it — do not silently fix it.
```

### 6.3 Targeted correction prompt (a criterion failed)

Correct one thing. Do not re-open the diff.

```
T-Sxx-nn: acceptance criterion <N> failed.

CRITERION: <verbatim>
OBSERVED:  <exact failure output — test name, assertion, error>
EXPECTED:  <what the spec requires, quoted from the authority document>

Fix ONLY this. Do not refactor, rename, reformat, or improve anything
else. Do not touch files outside the original boundaries.
Output only the changed hunks.
```

The narrowness is deliberate. An open-ended "please fix" invites a rewrite, which discards the parts that were already correct and reviewed.

### 6.4 BLOCKER protocol

When a model emits a blocker, resolve it **at the specification level**, never inside the session:

1. Read the blocker. If it is real, the card was incomplete.
2. Resolve: pull a dependency forward as its own card, clarify the spec, or write an ADR (`08` §16.2).
3. Update the card with the resolution.
4. Re-run the session from the top with the corrected card.

Record every blocker in `docs/impl/BLOCKERS.md` with its owning task ID. A blocker that recurs across cards is a documentation gap, and the fix is an amendment, not repeated ad-hoc resolution.

---

## 7. The Pre-Flight Report

Mandatory before any code, in every implementation session. A session that produces code without it is discarded and re-run — not because the code is necessarily wrong, but because the check that would have caught the most common structural defect never happened.

It costs roughly two hundred tokens and catches:

- **Duplication.** The search step is the countermeasure to `INV-22` (`08` §10).
- **Pattern divergence.** Naming the reference file forces the model to actually look at it.
- **Spec ambiguity.** Surfaced before code exists, when it is cheap.
- **Scope creep.** The plan reveals an over-large task before the diff does.

**Reading it takes fifteen seconds.** Three specific things to check:

1. Did the duplicate search actually search, or did it assert "no duplicates found" without naming what was searched for? The latter is a non-answer.
2. Is the named pattern the one the card specified?
3. Does the plan match the card's scope, or has it grown a step nobody asked for?

---

## 8. Refactor Prompts

Refactoring is the highest-risk operation in an AI-assisted codebase, because the diff is large, the intent is "no behaviour change," and a subtle behaviour change is exactly what a large diff hides.

**Three preconditions, all mandatory:**

1. Tests covering the current behaviour exist and are green. If they do not exist, writing them is a separate card that runs first.
2. The target state is described precisely — not "clean this up."
3. The refactor is its own PR, containing no behaviour change whatsoever.

```
REFACTOR — T-Sxx-nn
Model: Pro if cross-cutting; Flash if mechanical with a named target.

CURRENT STATE: <files, what is wrong, why it matters now>
TARGET STATE:  <precisely what the code should look like after>
MOTIVATION:    <the concrete problem this solves — not "cleaner">

CONSTRAINTS
 · Behaviour must not change. Every existing test must pass unmodified.
 · If a test must change, that is a behaviour change — STOP and report.
 · Public signatures unchanged unless listed below.
 · Invariants in force: <IDs + text>
 · Boundaries: CREATE/MODIFY/MUST NOT TOUCH <paths>

SIGNATURES PERMITTED TO CHANGE: <or "none">

OUTPUT
 1. Pre-flight report, including every call site of anything you will move
 2. The refactor
 3. Confirmation that every existing test passes unmodified
 4. A list of anything you noticed but deliberately did not change

VERIFICATION: make verify  (unmodified test suite)
```

The fourth output item matters. A model that notices an unrelated problem will otherwise fix it silently. Asking it to report instead converts an unwanted diff into a useful backlog item.

---

## 9. Bug-Fixing Prompts

### 9.1 The two-attempt rule

Two failed fix attempts on the same bug means the model is pattern-matching to a symptom rather than reasoning to a cause. Escalate to Pro with a diagnostic prompt (§9.3) before attempting a third fix. This one rule prevents most of the "three fixes, four new bugs" spirals in AI-assisted debugging.

### 9.2 Standard bug fix (Flash)

Use when the cause is understood.

```
BUG FIX
SYMPTOM:      <exactly what happens — the actual error, not a paraphrase>
REPRODUCTION: <exact steps or the failing test>
EXPECTED:     <what should happen, quoted from the spec>
SUSPECTED CAUSE: <if known — say "unknown" rather than inventing one>

CONTEXT: <the file(s) plus the relevant spec section>
INVARIANTS: <IDs + text>
BOUNDARIES: <paths>

REQUIREMENTS
 1. Explain the root cause before fixing. If you cannot explain it, say so
    and stop.
 2. Fix the cause, not the symptom.
 3. Add a regression test that fails before your fix and passes after.
 4. Change nothing unrelated.
 5. If the root cause is a specification defect rather than a code defect,
    emit a BLOCKER.

VERIFICATION: <command>; the new regression test must fail on the pre-fix
code — demonstrate this.
```

Requirement 5 matters more than it looks. A meaningful share of "bugs" in a spec-driven build are specification defects, and patching the code makes the code and the spec disagree permanently.

### 9.3 Diagnostic prompt (Pro, after two failed attempts)

Note that this prompt asks for **no code at all**. Separating diagnosis from repair is what breaks the spiral.

```
DIAGNOSTIC — do not write a fix yet.

SYMPTOM: <exact behaviour>
ATTEMPTS THAT FAILED:
  1. <what was tried> → <what happened>
  2. <what was tried> → <what happened>

RELEVANT CODE: <files>
RELEVANT SPEC: <sections>
SYSTEM CONTEXT: <the layers involved — e.g. request → get_current_org →
                 RLS → query; or Celery → LangGraph node → rules → Finding>

TASKS
 1. List every hypothesis consistent with the symptom, including ones the
    failed attempts would not have addressed.
 2. For each: how would you confirm or eliminate it? Give the exact
    command, log line, or query.
 3. Rank by likelihood, with reasoning.
 4. Identify the cheapest experiment that eliminates the most hypotheses.

Output analysis only. No code.
```

Run the recommended experiment, feed the result back, then hand the confirmed fix to Flash via §9.2.

### 9.4 Qelvix-specific diagnostic starting points

From `06` §22, worth reaching for before generic debugging:

| Symptom | Check first |
|---|---|
| Scan stuck in `running` | Celery worker alive; a raise outside a node's try/except (`INV-06`) |
| Stale UI after a mutation | Missing query invalidation (`02` §5) |
| Unexpected 403 | Missing `members` row for the active org (`03` §4.2) |
| Finding has no explanation | Expected degradation — the bug is if evidence and remediation are also missing (`01` §9) |
| RLS blocks a legitimate query | Service-role bypass not used by a worker path, or a predicate mismatch (`07` §6) |
| A new agent's findings vanish | DAG edges skip `analysis_join` (`04` §3) |
| WhatsApp never arrives | Consent flag unset, or template not approved for that environment |

---

## 10. Splitting Large Features Across Sessions

### 10.1 Split at contract boundaries, not by file count

The wrong split produces sessions that each need the others' context. The right split produces sessions that are independently verifiable. The boundary is a **contract**: a schema, an API shape, a component interface, a rules-function signature.

Canonical split for a vertical slice (`08` §6.1):

```
S1  Schema + migration + models          → verifiable: alembic upgrade, schema test
S2  Rules engine + tests                 → verifiable: branch coverage
S3  Service client + fixtures            → verifiable: fixture tests
S4  Endpoint + endpoint tests            → verifiable: pytest, contract export
S5  Contract regeneration                → verifiable: make contract, G6
S6  Query hook + hook tests              → verifiable: vitest
S7  Screen + state tests                 → verifiable: vitest, axe
S8  E2E                                  → verifiable: playwright
```

Each session's output is the next session's input, and each is independently green.

### 10.2 Anti-patterns

| Bad split | Why it fails |
|---|---|
| "Backend today, frontend tomorrow" | Too coarse. The backend session spans schema, rules, and endpoints, and the diff is unreviewable |
| "One file per session" | Too fine. A model without the endpoint's context cannot write its test |
| "Happy path now, error states later" | The error states never come. `INV-25` requires all states in the same card |
| "Implementation now, tests later" | Tests then encode the code (`08` §11.1) |
| Split by developer convenience | Produces sessions with circular context needs |

### 10.3 The handoff between splits

Each session ends by writing to `docs/impl/SESSION_LOG.md` (§11). The next session's prompt loads that entry and the reference implementation of the previous step, nothing more. A session does not need its predecessor's reasoning — only its output.

---

## 11. Continuing an Interrupted Session

Interruptions happen: context limits, a discovered blocker, the end of the day. The cost is only high if the state was not written down.

### 11.1 `SESSION_LOG.md` format

Written at the end of **every** session, complete or not. Kept short — this is a handoff, not a diary.

```markdown
# Current Session

TASK:        T-S12-06 — Scan Detail screen (live + completed + partial)
MODEL:       Flash High
STARTED:     2026-08-11 09:20
STATUS:      IN PROGRESS

DONE:
 - app/(app)/scans/[id]/page.tsx — Server Component shell, initial fetch
 - loading.tsx — skeleton matching the agent-list shape
 - AgentStatusList wired to useScan, polling confirmed stopping on terminal

NOT DONE:
 - partial-failure banner (INV-07) — select() enforcement is in the hook
   from T-S12-04, but the banner component is not built
 - error.tsx
 - component tests for the partial and failed states

NEXT STEP:
 Build the partial-failure banner. It reads scan.isPartial from the hook's
 select() output — do NOT re-derive partial state in the component.

VERIFY STATE: npm run test -- scans → 4 passing, 2 not yet written
              npx tsc --noEmit → clean

DECISIONS MADE:
 - Agent status rows are keyed by agent name, not index, so a Phase 2 agent
   insertion does not remount the list.

OPEN QUESTIONS: none

INVARIANTS IN FORCE: INV-07, INV-16, INV-17, INV-18, INV-25, INV-28
```

### 11.2 Resumption prompt

```
Resume T-S12-06. You have no memory of the previous session; everything
you need is below.

TASK CARD: <full card>
SESSION LOG: <paste the entry above>
LEDGER (relevant): <entries for scans, findings, query hooks>
CURRENT FILE STATE: <contents of every file listed under DONE>
INVARIANTS IN FORCE: <IDs + full text>
BOUNDARIES: <unchanged from the card>

Start from NEXT STEP. Do not redo completed work. Do not revisit decisions
recorded under DECISIONS MADE — they were made deliberately.

Emit a pre-flight report first, confirming your understanding of the
current state.
```

The pre-flight on resumption is doubly important: it is where a misunderstanding of prior state surfaces before it produces a contradictory diff.

### 11.3 Never resume into ambiguity

If `SESSION_LOG` is missing, stale, or unclear, **do not resume**. Read the actual diff, rewrite the log from what is on disk, then resume. A resumption based on a wrong belief about current state produces work that must be thrown away entirely — more expensive than the five minutes of reconstruction.

---

## 12. Review Prompts

### 12.1 Pass 1 — Self-review (same session, Flash)

Built into the universal template's output contract. Because the card is still in context and the model has switched from producing to evaluating, it catches a useful amount: missed states, forgotten error paths, a stray hardcoded value.

```
Now self-review your implementation.

For EACH acceptance criterion: state PASS or FAIL, with one line of
evidence (a file and line, or a test name). Do not restate the criterion.

For EACH invariant in force, by ID: state PASS or FAIL with evidence.

Then answer:
 · Did you create, modify, or delete any file outside the declared
   boundaries?
 · Did you duplicate logic that already exists elsewhere?
 · Is there any spec requirement you implemented partially?
 · Is there anything you would flag to a reviewer?

Be accurate rather than reassuring. A FAIL reported here is cheap; the
same FAIL found in review is not.
```

### 12.2 Pass 2 — Adversarial review (fresh Pro session)

Mandatory for anything touching auth, tenancy, RLS, `claude_service.py`, rules engines, or the DAG. **A fresh session, given the diff and the spec but not the generating session's reasoning** — a model shown its own reasoning trace defends it; a model shown only the artifact evaluates the artifact.

```
You are reviewing a diff in the Qelvix codebase. You did not write it.
Your job is to find what is wrong with it. A review that finds nothing is
a review that did not look.

DIFF: <full diff>
TASK CARD: <full card>
AUTHORITY DOCUMENTS: <the sections the card cited>
INVARIANTS: docs/impl/INVARIANTS.md <full>
EXISTING CODEBASE MAP: <tree -L 3 of the relevant directories>
LEDGER (relevant): <entries>

Check, in this order:

1 · SPEC CONFORMANCE
    Does the diff do what the authority documents specify? Quote the
    document and the code where they diverge. Partial implementation of a
    specified behaviour is a divergence.

2 · INVARIANT VIOLATIONS
    Go through every invariant ID that could apply — not only the ones the
    card listed. Report violations with file and line.

3 · DUPLICATION
    Does this reimplement something that exists? Check the component
    inventory (01 §11), services/, rules/, and lib/queries/.

4 · PATTERN DIVERGENCE
    Does this look like the rest of the codebase? Naming, structure, error
    handling, test style.

5 · UNTESTED FAILURE MODES
    What can fail here that has no test? Be specific: name the failure and
    the missing test.

6 · SECURITY
    Tenant isolation, authorization, input validation, secret handling,
    untrusted-content handling. Assume an attacker controls any scanned
    content that reaches this code.

7 · WHAT THIS MAKES HARDER
    What future change does this diff make more expensive, and why?

OUTPUT
 BLOCKING:     must be fixed before merge — with file, line, and reason
 NON-BLOCKING: should be fixed, with rationale
 QUESTIONS:    what you could not determine from the material given

Do not comment on formatting — Prettier and ruff own that.
```

### 12.3 Pass 3 — Phase architecture audit (Pro, at CP-Phase)

Not a code review. A drift audit across a whole phase, which is the only thing that catches slow structural decay (`08` §13).

```
You are auditing an entire implementation phase for architectural drift.

PHASE: F<n> — <name>
PHASE SPEC: 09_IMPLEMENTATION_ROADMAP.md F<n> <full section>
INVARIANTS: docs/impl/INVARIANTS.md <full>
FROZEN DOCUMENTS: <the sections governing this phase>
FULL PHASE DIFF: <git diff <phase-start>..HEAD --stat, plus full diffs of
                 files touched by more than one task>
LEDGER: <all entries for this phase>
ADRs: <any written during this phase>

Answer these six questions:

1 · Where has the implementation diverged from 01–07? Cite document,
    section, file, and line.
2 · Which invariants are weakening? Not only outright violations — look
    for places where the invariant technically holds but the pattern
    around it has shifted.
3 · What has been duplicated across tasks in this phase? Tasks were run in
    separate sessions and could not see each other.
4 · What is inconsistent between tasks in this phase? Naming, error
    handling, test structure, module organisation.
5 · What is specified but not built, and what is built but not specified?
    The second list is more interesting — unspecified code is usually
    either a duplicate or scope creep.
6 · What is the cheapest correction for each finding, and what does it
    cost to defer?

OUTPUT
 For each finding: severity (CRITICAL / HIGH / MEDIUM / LOW), evidence,
 recommended correction, cost of deferral.
 Then: an overall drift assessment — is this phase's output consistent
 with the phases before it?
```

Findings go into `docs/impl/LEDGER.md` and become either remediation cards or ADRs. A CRITICAL finding blocks the next phase.

---

## 13. Verifying an Implementation

Four layers, cheapest first. Do not skip to layer four.

### Layer 1 — Mechanical (every session)

```bash
make verify        # G1 lint/type, G2 unit, G6 contract, G7 secrets/deps  (<90s)
```

### Layer 2 — Card-specific

The card's own verification command. This is why every card must name one; "check that it works" makes this layer unrunnable.

### Layer 3 — Behavioural

Run the thing. For a screen: open it, exercise every specified state including the empty and error ones. For an endpoint: call it authorised, unauthorised, and cross-tenant. For an agent: run a scan against fixtures and inspect the persisted `langgraph_state`.

This layer catches what tests do not: a screen that technically renders every state but renders the wrong one first, an endpoint that returns correct data in a shape the UI cannot consume.

### Layer 4 — Full gate (before opening a PR)

```bash
make verify-full   # adds G3 axe, G4 playwright, G5 lighthouse
```

### The verification traps

| Trap | Countermeasure |
|---|---|
| Test passes because it asserts what the code does | Tests written from the spec table, implementation excluded from context (`08` §11.1) |
| Mocked so thoroughly nothing real is exercised | Mock the external boundary only — never the code under test |
| Only the happy path verified | Card lists every state; one test per state (`INV-25`) |
| "It compiles" treated as verification | Layer 3 is not optional |
| Coverage percentage treated as quality | `06` §12: meaningful coverage over a gamed number |

---

## 14. Regression Prevention

Five mechanisms, in descending order of effectiveness.

**1 · Generated types (`INV-19`, gate G6).** The frontend cannot hold a stale belief about an API shape, because it does not hold a belief — it holds a generated type. This eliminates the single largest regression category in a full-stack build, structurally rather than by discipline.

**2 · The contract snapshot (G6).** `docs/contracts/openapi.json` is committed. Any endpoint change that is not deliberate shows up as a snapshot diff in the PR, where a reviewer sees it. Accidental contract changes become visible instead of silent.

**3 · Spec-derived tests.** Tests written from `04` §6's tables and `01`'s state tables encode requirements, not current behaviour, so they still fail when the behaviour drifts. Tests written from code cannot detect regression at all — they move with it.

**4 · The tenancy suite.** `pytest -m tenancy` runs on every PR. It is the only mechanism that would catch a broadened RLS predicate, and it is the highest-severity regression the system can suffer.

**5 · Playwright on the costly flows.** Signup → first scan, domain verification (both methods), finding status transitions, WhatsApp consent capture (`06` §12). These are the flows where a regression is discovered by a user rather than a test.

**Standing rule.** Every bug fix ships with a regression test that fails on the pre-fix code — and the failure is demonstrated, not asserted (§9.2). A regression test that would have passed before the fix is not a regression test.

---

## 15. Maintaining Architectural Consistency

Six mechanisms, applied continuously rather than audited periodically.

| Mechanism | How it works | Where |
|---|---|---|
| **Invariant registry** | The same thirty rules, cited by ID, in every prompt and every review | `08` §8 |
| **Reference implementations** | Every card names the file whose shape it copies. Consistency propagates from a small number of carefully-built files | `11` card field |
| **Context Packs** | The same documents produce the same decisions across sessions | `08` §9.2 |
| **The Ledger** | The searchable answer to "does this already exist" that no model can answer from memory | `08` §16.3 |
| **Adversarial review** | Fresh eyes on pattern divergence a self-review will not see | §12.2 |
| **Phase audits** | The only mechanism that catches slow drift; mechanical gates cannot see it | §12.3 |

**The reference-implementation mechanism deserves particular attention.** It means the quality of `routers/org.py` (T-S03-04), `rules/ssl_rules.py` (T-S07-01), and `agents/ssl_analyzer.py` propagates into every router, rules engine, and agent node built afterward. Time spent perfecting those three files is worth more than time spent on any three files later in the project. Build them with Pro, review them adversarially, and name them explicitly on every downstream card.

---

## 16. Preventing Duplicated Logic

**The mechanism is the mandatory Pre-Flight search (§7).** Nothing else works reliably, because a model cannot know what it has not been shown, and instructions to "reuse where possible" are unactionable without a search.

Three standing search obligations, encoded in the relevant cards:

| Before creating | Search | Authority |
|---|---|---|
| A component | `01` §11 inventory; `components/`; the gallery route | `INV-21`, `INV-22` |
| A service module | `services/` | `03` §2 enumerates the expected set |
| A rules function or `finding_type` | `rules/`; the `finding_type` registry | `INV-08` |

Periodic detection, at CP-Phase:

```bash
# Components defined but never imported — often duplicates
comm -13 <(grep -rho "from '@/components/[^']*'" frontend --include=*.tsx | sort -u) \
         <(find frontend/components -name '*.tsx' | sort -u)

# Multiple implementations of an inventory component
for c in FindingCard SeverityBadge EmptyState Skeleton DataChart; do
  echo "$c: $(grep -rl "export.*function $c\|export const $c" frontend | wc -l)"
done   # anything above 1 is a violation of INV-22
```

**When a duplicate is found: delete, do not deprecate.** A deprecated duplicate is a duplicate that a future session will find and copy.

---

## 17. Keeping Documentation Synchronised

### Automatic (no discipline required)
- **API reference** — FastAPI generates it (`06` §8.6). No manual reference exists to drift.
- **API types** — generated from the OpenAPI snapshot; G6 blocks divergence.
- **Coverage report** — the screen/component script (`08` §16.4) at CP-Phase.

### Per session (30 seconds)
Append to `docs/impl/LEDGER.md`:

```markdown
## T-S13-01 — GET /findings with filters  ·  2026-08-09  ·  Flash High
Files: backend/app/routers/findings.py, backend/tests/api/test_findings.py
Invariants checked: INV-03, INV-09, INV-10, INV-11, INV-14
Contract: regenerated (adds FindingListResponse, FindingSummary)
Notes: filter params match 01's filter bar exactly — severity, status,
       finding_type, asset_id. Default limit 50, max 200.
Deviation: none.
Follow-ups: T-S14-01 consumes this contract.
```

The `Contract:` and `Deviation:` lines are the ones that pay for themselves. The first tells the next session what shape exists; the second is the only honest record of where the code and the frozen docs disagree.

### Per phase
- Update `09` where reality diverged from plan.
- Update `10` with actual versus estimated Pro-model share.
- Write ADRs for any decision not already in `01`–`07`.
- Record amendments in `docs/impl/AMENDMENTS.md`, keyed by frozen document and section. **The frozen files themselves stay byte-identical.**

---

## 18. Working Inside Antigravity

Practices specific to this IDE, given how these models behave in it.

**Workspace rules.** `AGENTS.md` loads automatically. Keep it under 150 lines (`08` §17) — everything in it is paid for in every session, so it holds only the invariant IDs, the repo map, naming conventions, and the standing rules. Everything else comes per-task from Context Packs.

**Model selection is per-session, not global.** Set it deliberately from §3 at the start of each session. The most common workflow error is running a Pro-class task on Flash because Flash was already selected from the previous card.

**Do not chain unrelated tasks in one thread.** Each card gets a fresh session. A thread carrying three completed cards has three sets of stale context competing for the model's attention, and the fourth card's output degrades measurably.

**Use the file-boundary discipline.** Antigravity will happily let a model touch anything in the workspace. The `MUST NOT TOUCH` block in the prompt is what prevents it, and it works — but only if it is actually in the prompt.

**Scratchpad discipline.** Use the scratchpad for the pre-flight report and verification checklists, not for specification content. Specification lives in `docs/`, and a spec fragment in a scratchpad is a fork of the spec.

**Verify in the terminal, not by reading.** `make verify` in the integrated terminal, every session, before review. Reading a diff and believing it works is the most common way an unverified change reaches review.

---

## 19. Quality Across Hundreds of Sessions

Quality does not degrade suddenly. It degrades one accepted compromise at a time, and each one looks reasonable in isolation. These are the signals and the countermeasures.

### 19.1 Decay signals

Watch for these; each has a specific meaning.

| Signal | What it means | Response |
|---|---|---|
| Reviews start finding the same class of defect repeatedly | An invariant is not reaching sessions | Add it to the relevant cards explicitly; check it is in `AGENTS.md` |
| Cards routinely need more Pro time than estimated | Specifications are thinner than assumed | Improve the cards, not the model budget |
| Sessions frequently exceed their file boundaries | Cards are scoped larger than they claim | Re-baseline scope estimates |
| Blockers recur on the same topic | A documentation gap, not a card gap | Amendment or ADR |
| "We'll fix it in a follow-up" appears in a PR | The gate has stopped being a gate | `06` §16: the follow-up PR opens **before** the original merges |
| Pre-flight reports become perfunctory | The step has become ritual | Spot-check three per week against the actual codebase |
| Duplicate components appear | The search obligation is being skipped | Run the §16 detection script; delete duplicates |
| New code stops looking like old code | Reference implementations are not being named on cards | Audit the last ten cards for the reference field |

### 19.2 Weekly health check (20 minutes)

```bash
# Claude boundary — must return exactly one file
grep -rln "import anthropic\|from anthropic" backend/app

# Endpoints missing tenant scoping — must return nothing
grep -rLn "get_current_org" backend/app/routers/*.py | grep -v auth.py

# Hardcoded design values in feature code — must return nothing
grep -rn "#[0-9a-fA-F]\{6\}" frontend/app frontend/components \
  --include=*.tsx | grep -v components/ui

# Hand-written API types — must return nothing
grep -rn "interface.*Response\|type.*Response =" frontend/lib/api \
  | grep -v types.generated

# Raw fetch in feature components — must return nothing
grep -rn "fetch(" frontend/components

# TODOs without a task ID
grep -rn "TODO" backend frontend | grep -v "TODO(T-S"

# Contract drift
make contract && git diff --exit-code docs/contracts/
```

Any non-empty result that should be empty is a finding, and it gets a card. Not a note.

### 19.3 Monthly

- Run the §12.3 architecture audit across the last month's diff, not only the last phase.
- Review `AMENDMENTS.md`: is the frozen set still accurate enough to be authoritative, or has it accumulated enough errata to warrant a versioned revision?
- Review `BLOCKERS.md`: recurring blockers indicate documentation gaps.
- Re-read `08` §18's failure-mode table against what actually went wrong. Add rows.

### 19.4 The three compromises that cost the most

1. **Merging with a red gate.** Every subsequent session inherits a codebase where the gate is advisory. `06` §16 is unambiguous: the follow-up PR is the fix, opened before the original merges.
2. **Accepting a diff that violates an invariant, with a promise to fix it.** The wrong pattern is now in the codebase's demonstrated history, and the next session copies it. Regenerate instead (`08` §15.4).
3. **Skipping the card and prompting from memory.** It works. It works the second time too. By the tenth time, three files have diverged from the specification and nobody knows which three.

### 19.5 What good looks like

The system is working when a task card can be handed to a model that has never seen this codebase, and the resulting diff is indistinguishable from the previous forty.

That is the whole objective. Every mechanism in `08`–`12` — the invariants, the packs, the reference implementations, the ledger, the gates, the audits — exists to make that true on session three hundred as reliably as on session three.

---

## 20. Quick Reference

**Route to Pro when:** the task decides something · establishes a pattern · touches auth, tenancy, RLS, `claude_service.py`, the DAG, or scoring · two Flash attempts have failed · the model asked an architectural question.

**Every prompt contains:** role + frozen-doc warning · task ID and objective · authority sections · 4–8 invariants **with text** · reference implementation · file boundaries including must-not-touch · output contract · acceptance criteria · pre-flight format · stop conditions · verification command.

**Every session produces:** a pre-flight report · the implementation · a self-review by criterion and invariant ID · a Ledger entry · a SESSION_LOG update.

**Never:** guess where a blocker was warranted · touch files outside the boundaries · patch an invariant violation instead of regenerating · write tests with the implementation in context · merge on a red gate · resume from an unclear session log · edit a frozen document.

**Always:** `make verify` before review · name the reference implementation · search before creating · one card per session · demonstrate a regression test failing on pre-fix code.

---

Owner: Qelvix Engineering Team
Status: Living document — the templates are meant to be edited as the build teaches you what works
