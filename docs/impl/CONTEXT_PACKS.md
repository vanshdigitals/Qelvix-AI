# Context Packs

A Context Pack is a named, fixed list of file sections, referenced by name in every task card. Defined once here so the "what do I load for this task" judgement is a lookup rather than a decision made dozens of times a week. Source: `08_IMPLEMENTATION_METHODOLOGY.md` §9.2.

| Pack | Contents | Typical use |
|---|---|---|
| `CTX-CORE` | `docs/impl/INVARIANTS.md`, repo map (`06` §1, §4), naming conventions (`02` §15, `06` §6) | Loaded in **every** session, without exception |
| `CTX-DB` | `03` §4.1, §4.2; `07` §6 | Migrations, models, RLS policies |
| `CTX-API` | `03` §3, §5, §5.1, §10; `06` §8; `07` §4, §12, §19, §20 | Any endpoint |
| `CTX-RULES` | `04` §5, plus the specific agent's table from §6 | A rules engine |
| `CTX-AGENT` | `04` §3, §4, §5, §11; `03` §6; `06` §11 | An agent node or DAG change |
| `CTX-CLAUDE` | `04` §7; `03` §9; `07` §13, §14, §16 | Anything touching `claude_service.py` |
| `CTX-FE-SCREEN` | the screen's `01` section; `02` §2–§7; `05` §4 entries for the components used; `06` §9 | Building a screen |
| `CTX-FE-COMPONENT` | `01` §11; the component's `05` §4 entry; `05` §3 tokens; `02` §6 | Building or extending a component |
| `CTX-NOTIFY` | `03` §7; `04` §7.4; `07` consent sections | WhatsApp / email delivery |
| `CTX-TEST` | `06` §12; the spec section under test | Test-only tasks |
| `CTX-SECURITY` | `07` §33, §34; `06` §19 | Security review passes |

## Budget targets

| Session type | Target context | Hard ceiling |
|---|---|---|
| Flash High implementation task | 8k–15k tokens of spec + invariants | 25k |
| Flash High test / refactor task | 5k–10k | 15k |
| Pro architecture or debugging session | 25k–50k | 80k |

Exceeding the ceiling is a signal the task is too large, not a signal to raise the ceiling. See `12` §9 for the splitting procedure.
