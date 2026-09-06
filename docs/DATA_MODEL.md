# Data model

Scope: the tables, columns, types, foreign keys, indexes and RLS policies as defined by the Alembic migrations, cross-checked against the live database, with a statement of whether each policy actually enforces.

Derived from `backend/migrations/versions/`, not from ORM docstrings. Live values were read with read-only queries against `pg_class`, `pg_indexes`, `pg_policies` and `pg_roles` using the application's own `DATABASE_URL`.

## Migration chain

| Revision | File | What it does |
|---|---|---|
| `f5312e8d14c4` | `f5312e8d14c4_initial_schema.py` | Creates all 8 tables |
| `d3e0543d1ed1` | `d3e0543d1ed1_add_rls_policies.py` | Enables RLS and creates the tenant-isolation policies |
| `551ce8261afa` | `551ce8261afa_grant_authenticated_role_permissions.py` | Grants ALL PRIVILEGES on every table to the `authenticated` role |
| `f52ef683fdf4` | `f52ef683fdf4_fix_rls_performance_and_alembic_version_.py` | Re-creates every policy wrapping `auth.jwt()` in a scalar subquery; enables RLS on `alembic_version` |
| `b7c1a9d2e4f8` | `b7c1a9d2e4f8_onboarding_state.py` | Adds 5 onboarding columns to `organizations`; makes `primary_domain` nullable |

The live database reports `alembic_version = b7c1a9d2e4f8`, so all five are applied.

Every table gets its `id` from the declarative base (`backend/app/models/base.py:24`): `UUID` primary key, `server_default gen_random_uuid()`. Constraint names follow the convention map at `backend/app/models/base.py:10`.

## organizations

`f5312e8d14c4_initial_schema.py:23`, extended by `b7c1a9d2e4f8_onboarding_state.py:24`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK `pk_organizations` |
| `name` | text | no | | |
| `primary_domain` | text | yes | | Unique `uq_organizations_primary_domain`. Made nullable by `b7c1a9d2e4f8:74`. Postgres allows many NULLs under a unique constraint. |
| `plan` | text | no | `'freemium'` | Never read or written by application code |
| `whatsapp_number` | text | yes | | Read by the notification agent |
| `notification_email` | text | yes | | Read by the notification agent and the DPDP S8.6 check |
| `onboarded_at` | timestamptz | no | `NOW()` | Surfaced as `created_at` by `GET /org/me` |
| `settings` | jsonb | no | `'{}'` | Only key used is `industry` |
| `onboarding_completed` | boolean | no | `false` | Gate read by `get_onboarded_org` |
| `onboarding_step` | text | no | `'business'` | One of the 8 steps in `backend/app/schemas/onboarding.py:31` |
| `onboarding_data` | jsonb | no | `'{}'` | Wizard payload plus the server-owned `verification_token` |
| `domain_verified` | boolean | no | `false` | Hard gate for `POST /scans/trigger` |
| `onboarding_updated_at` | timestamptz | yes | | |

`b7c1a9d2e4f8:69` backfills every pre-existing row with `onboarding_completed = true`, `onboarding_step = 'done'` and `domain_verified = true` where `primary_domain IS NOT NULL`. Those rows are marked domain-verified without ever having passed a DNS check.

## members

`f5312e8d14c4_initial_schema.py:62`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `org_id` | uuid | no | | FK `fk_members_org_id_organizations` to `organizations.id`, ON DELETE CASCADE |
| `user_id` | uuid | no | | The Supabase auth user id. No FK; `auth.users` is in another schema. |
| `role` | text | no | `'owner'` | No CHECK constraint. `require_role` compares against `owner`, `admin`, `member`. |
| `invited_at` | timestamptz | no | `NOW()` | |
| `joined_at` | timestamptz | yes | | Never written |

Unique `uq_members_org_id` on `(org_id, user_id)`.

There is no `created_at` column. `backend/app/routers/members.py:28` orders by `Member.created_at` and `backend/app/schemas/org.py:57` requires it.

## assets

`f5312e8d14c4_initial_schema.py:35`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `org_id` | uuid | no | | FK to `organizations.id`, ON DELETE CASCADE |
| `asset_type` | text | no | | Written as `subdomain` or `ip` by the worker. No CHECK constraint. |
| `value` | text | no | | |
| `metadata` | jsonb | no | `'{}'` | Mapped as `metadata_` in Python (`backend/app/models/org.py:73`). Never written. |
| `whitelisted` | boolean | no | `false` | Never read or written |
| `first_seen` | timestamptz | no | `NOW()` | Never updated after insert |
| `last_seen` | timestamptz | no | `NOW()` | Never updated after insert |

Unique `uq_assets_org_id` on `(org_id, value)`.

There is no `source`, `verified` or `created_at` column. `backend/app/routers/org.py:176` passes `source` and `verified` to the constructor, `org.py:131` orders by `created_at`, and `backend/app/schemas/org.py:35-37` requires all three.

`GET /dashboard/assets` counts `domain`, `subdomain` and `ip` (`backend/app/routers/dashboard.py:97`), but the worker only ever inserts `subdomain` and `ip` (`backend/app/worker.py:139`, `worker.py:150`), so `total_domains` is always 0.

## scans

`f5312e8d14c4_initial_schema.py:73`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `org_id` | uuid | no | | FK to `organizations.id`, ON DELETE CASCADE |
| `status` | text | no | `'queued'` | Values written: `queued`, `running`, `completed`, `failed`. The response schema also allows `pending`, which nothing writes. No CHECK constraint. |
| `scan_type` | text | no | `'full'` | Only `full` is ever written |
| `risk_score` | integer | yes | | 0-100 from `calculate_risk` |
| `findings_summary` | jsonb | yes | | `{critical, high, medium, low}` counts, `backend/app/worker.py:117` |
| `langgraph_state` | jsonb | yes | | The entire final `AgentState`. Source of `risk_band`, `risk_executive_summary`, the DPDP block and `degraded_providers` for the report endpoint. |
| `started_at` | timestamptz | yes | | Set at row creation so the stale reaper can age a queued scan |
| `completed_at` | timestamptz | yes | | Set on both success and failure |
| `triggered_by` | text | no | `'scheduled'` | Always written as `manual`; the default is never used |
| `error_log` | text | yes | | Timeout reason, exception string truncated to 2000 chars, or the reaper's message |

`langgraph_state` stores the full pipeline state including every finding's raw evidence, so scan-related data is written twice: once denormalized here and once as `findings` rows.

## findings

`f5312e8d14c4_initial_schema.py:100`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `org_id` | uuid | no | | FK to `organizations.id`, ON DELETE CASCADE |
| `scan_id` | uuid | yes | | FK `fk_findings_scan_id_scans` to `scans.id`, no ON DELETE clause |
| `asset_id` | uuid | yes | | FK to `assets.id`, no ON DELETE clause. Never written by the worker, so always NULL. |
| `finding_type` | text | no | | The rule's `type` value. See `RULES.md` for the full enumeration. |
| `agent_source` | text | no | | The producing agent's module name |
| `severity` | text | no | | `critical`, `high`, `medium` or `low`. No CHECK constraint; the response schema also permits `info`, which no rule emits. |
| `title` | text | no | | |
| `raw_data` | jsonb | no | | The rule's `evidence` dict |
| `plain_explanation` | text | yes | | LLM output from `explain_finding` |
| `remediation_steps` | text | yes | | LLM output. Always NULL in practice because of the key mismatch described in `ARCHITECTURE.md`. |
| `status` | text | no | `'open'` | `open`, `acknowledged`, `resolved`, `false_positive` |
| `previous_status` | text | yes | | Never written |
| `false_positive_reason` | text | yes | | Set only when status becomes `false_positive` |
| `discovered_at` | timestamptz | no | `NOW()` | Sort key for `GET /findings` |
| `resolved_at` | timestamptz | yes | | |

Because `findings.scan_id` and `findings.asset_id` have no `ON DELETE` clause, deleting a scan or an asset with dependent findings raises a foreign-key violation. Deleting an organization works because the `org_id` cascade removes the findings first.

## compliance_reports

`f5312e8d14c4_initial_schema.py:88`. Created, never written.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `org_id` | uuid | no | FK to `organizations.id`, CASCADE |
| `scan_id` | uuid | yes | FK to `scans.id`, no ON DELETE |
| `clauses` | jsonb | no | |
| `overall_status` | text | yes | |
| `narrative` | text | yes | |
| `generated_at` | timestamptz | no | `NOW()` |

`backend/app/schemas/compliance.py:7` declares `framework`, `is_compliant`, `dpdp_narrative` and `created_at`. None of those are columns.

## notifications

`f5312e8d14c4_initial_schema.py:122`. Created, never written.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `org_id` | uuid | no | FK to `organizations.id`, CASCADE |
| `scan_id` | uuid | yes | FK to `scans.id`, no ON DELETE |
| `channel` | text | no | |
| `content` | text | no | |
| `status` | text | no | `'sent'` |
| `sent_at` | timestamptz | no | `NOW()` |
| `meta` | jsonb | no | `'{}'` (mapped as `meta_`) |

`backend/app/schemas/notifications.py:8` declares `recipient` and `created_at`. Neither is a column.

## audit_log

`f5312e8d14c4_initial_schema.py:48`. Created, never written.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `org_id` | uuid | no | FK to `organizations.id`, CASCADE |
| `actor_type` | text | no | |
| `actor_id` | uuid | yes | |
| `action` | text | no | |
| `resource_type` | text | no | |
| `resource_id` | uuid | yes | |
| `metadata` | jsonb | no | `'{}'` (mapped as `metadata_`) |
| `ip_address` | inet | yes | |
| `occurred_at` | timestamptz | no | `NOW()` |

## Indexes

Read from `pg_indexes` on the live database. Every index is a constraint-backing index. There are no additional indexes.

| Table | Index | Definition |
|---|---|---|
| `organizations` | `pk_organizations` | unique btree (`id`) |
| `organizations` | `uq_organizations_primary_domain` | unique btree (`primary_domain`) |
| `members` | `pk_members` | unique btree (`id`) |
| `members` | `uq_members_org_id` | unique btree (`org_id`, `user_id`) |
| `assets` | `pk_assets` | unique btree (`id`) |
| `assets` | `uq_assets_org_id` | unique btree (`org_id`, `value`) |
| `scans` | `pk_scans` | unique btree (`id`) |
| `findings` | `pk_findings` | unique btree (`id`) |
| `compliance_reports` | `pk_compliance_reports` | unique btree (`id`) |
| `notifications` | `pk_notifications` | unique btree (`id`) |
| `audit_log` | `pk_audit_log` | unique btree (`id`) |
| `alembic_version` | `alembic_version_pkc` | unique btree (`version_num`) |

There is no index on `findings.org_id`, `findings.scan_id`, `findings.severity`, `findings.status`, `findings.discovered_at`, `scans.org_id`, `scans.status` or `notifications.org_id`. Every tenant-scoped list query is a sequential scan filtered on an unindexed `org_id`. The `assets` and `members` composite unique indexes lead with `org_id`, so those two tables are covered incidentally.

No migration issues a `CREATE INDEX`; the string does not appear anywhere under `backend/migrations/`.

## Row-level security

### What the migrations declare

`d3e0543d1ed1_add_rls_policies.py:22` enables RLS on `assets`, `scans`, `findings`, `compliance_reports` and `notifications`, and creates SELECT, INSERT and UPDATE policies on each with the predicate `org_id = (auth.jwt() ->> 'org_id')::uuid`. `audit_log` gets SELECT only. `organizations` gets SELECT and UPDATE keyed on `id`. `members` gets SELECT, INSERT, UPDATE and DELETE, where UPDATE and DELETE additionally require the caller to hold `owner` or `admin` in that org.

`f52ef683fdf4` re-creates every policy with `auth.jwt()` wrapped in a scalar subquery, which is a planner optimization only; the predicate is unchanged. It also enables RLS on `alembic_version`.

`551ce8261afa:24` grants `ALL PRIVILEGES ON ALL TABLES IN SCHEMA public` to the `authenticated` role, plus matching default privileges.

### What the live database reports

Read from `pg_class`, `pg_policies` and `pg_roles`:

| Table | `relrowsecurity` | `relforcerowsecurity` | Owner |
|---|---|---|---|
| `organizations` | true | **false** | `postgres` |
| `members` | true | **false** | `postgres` |
| `assets` | true | **false** | `postgres` |
| `scans` | true | **false** | `postgres` |
| `findings` | true | **false** | `postgres` |
| `compliance_reports` | true | **false** | `postgres` |
| `notifications` | true | **false** | `postgres` |
| `audit_log` | true | **false** | `postgres` |
| `alembic_version` | true | **false** | `postgres` |

All 22 policies exist and are applied to the `public` role (that is, all roles). Policy coverage by command:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `organizations` | yes | no | yes | no |
| `members` | yes | yes | yes | yes |
| `assets` | yes | yes | yes | no |
| `scans` | yes | yes | yes | no |
| `findings` | yes | yes | yes | no |
| `compliance_reports` | yes | yes | yes | no |
| `notifications` | yes | yes | yes | no |
| `audit_log` | yes | no | no | no |

Where a command has no policy, an RLS-subject role is denied that command outright. `DELETE /org/me`, for example, would fail for such a role because `organizations` has no DELETE policy.

### Whether RLS enforces

It does not, for the application's connection.

The configured `DATABASE_URL` connects as `postgres.<project-ref>`, which resolves to the Postgres role `postgres`. A live query returned `current_user = postgres`, `rolsuper = false`, `rolbypassrls = true`. That role also owns every table, and `relforcerowsecurity` is false on all of them. Either fact alone is sufficient to skip RLS: Postgres exempts `BYPASSRLS` roles and table owners without `FORCE ROW LEVEL SECURITY`.

Two further observations confirm it empirically:

- `SELECT auth.jwt()` on the application's connection returns NULL. The backend never issues `SET LOCAL request.jwt.claims` or an equivalent; a grep for `set_config`, `SET LOCAL` and `SET ROLE` across `backend/app/` returns nothing. If the policies were applied to this connection, every predicate would compare against NULL and every query would return zero rows.
- `SELECT count(*) FROM organizations` on the application's connection returned 11, spanning every tenant in the database.

RLS is therefore a defense-in-depth layer that is currently inert for the API. Tenant isolation is enforced entirely by the per-query `org_id` filters in the routers. See `SECURITY.md` for the full statement and the fix.

`backend/tests/test_rls_and_auth.py:96` does test the policies, but it does so by issuing `SET ROLE authenticated` on a separate connection, which is a role the application never uses. It also sets the GUC `request.jwt.claim.org_id`, whereas Supabase's `auth.jwt()` reads `request.jwt.claims` as a JSON document. Under that setup `auth.jwt()` is NULL, the predicate is false, and the assertion that org B sees zero rows passes without demonstrating that the predicate discriminates between tenants.
