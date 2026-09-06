# API

Scope: every route registered by `create_app`, derived by reading the router modules. Method, path, auth dependency, request and response schema, org scoping, and error cases.

Routers are registered in `backend/app/main.py:61-69`. There is no global auth dependency; each route declares its own. Requests with no `Authorization` header are rejected by `HTTPBearer` with **403**, not 401 (`backend/app/dependencies.py:17`); this is asserted by `backend/tests/test_rls_and_auth.py:37`.

Dependency shorthand used below:

| Name | Definition | Effect |
|---|---|---|
| `token` | `get_current_user_token`, `backend/app/dependencies.py:22` | Verifies the Supabase JWT. Returns the raw payload. |
| `org` | `get_current_org`, `backend/app/dependencies.py:81` | Requires `sub` and an `org_id` claim, both UUIDs. |
| `onboarded` | `get_onboarded_org`, `backend/app/dependencies.py:109` | `org` plus a DB read of `organizations.onboarding_completed`. 403 `onboarding_incomplete` if false. |
| `role(...)` | `require_role(...)`, `backend/app/dependencies.py:130` | Reads the caller's `members.role` for the active org. 403 `Insufficient permissions` on mismatch. |
| `limit(name,n,w)` | `org_rate_limit`, `backend/app/rate_limit.py:38` | In-process sliding window keyed by `name:org_id`. 429 with `Retry-After`. |

Common auth errors on any route carrying `org` or stricter:

| Status | Detail | Source |
|---|---|---|
| 403 | `Not authenticated` | Missing bearer header, `HTTPBearer` |
| 401 | `Token has expired` | `dependencies.py:57` |
| 401 | `Could not validate credentials` | JWKS failure, `dependencies.py:50` |
| 401 | `Invalid authentication credentials` | Any other decode failure, `dependencies.py:64` |
| 401 | `Subject missing in token` | `dependencies.py:96` |
| 401 | `No active org_id found in token` | `dependencies.py:98` |
| 401 | `Invalid UUID format in token claims` | `dependencies.py:104` |

## System

### GET /health

`backend/app/main.py:71`. No auth. Response `HealthResponse`: `status`, `environment`, `commit` (from the `RENDER_GIT_COMMIT` environment variable, null off Render). No org scoping; returns no tenant data.

## auth

`backend/app/routers/auth.py`, prefix `/auth`. None of these routes are org-scoped.

### POST /auth/register

`auth.py:25`. No auth dependency.

Request `RegisterRequest` (`backend/app/schemas/auth.py:4`): `email` (EmailStr), `password` (min length 12), `company_name`, `domain`.

Behaviour: posts to Supabase `/auth/v1/signup` using the service key, creates an `organizations` row with the submitted name and domain, creates a `members` row with role `owner`, then PUTs `app_metadata.org_id` onto the Supabase user. If the signup response carried no session it performs a password login to obtain tokens.

Response `AuthResponse`: `access_token`, `refresh_token`, `token_type` (`"bearer"`), `user_id`, `org_id`.

Errors: the Supabase status code with detail from its `msg` field on signup failure (`auth.py:46`); 500 `Failed to retrieve user ID from Auth provider` (`auth.py:54`); 409 `Domain already registered` on the unique constraint (`auth.py:68`).

Note: a failure to write `app_metadata.org_id` is swallowed (`auth.py:80-82`), so a user can be created whose tokens carry no `org_id` claim and who is therefore 401 on every org-scoped route.

### POST /auth/login

`auth.py:108`. No auth dependency. Request `LoginRequest`: `email`, `password`. Proxies Supabase password grant. Response `AuthResponse`, with `org_id` read from `user.app_metadata.org_id` and defaulting to the empty string. Errors: 401 `Invalid email or password`.

### POST /auth/provision-org

`auth.py:135`. Depends on `token` only, deliberately not `org`, so it is reachable before the `org_id` claim exists.

Request: none. Response `ProvisionResponse`: `org_id`, `created`.

Behaviour: idempotent. If any `members` row exists for `sub`, returns that org with `created: false`. Otherwise creates an organization whose name is derived from the email local part and whose `primary_domain` is null, creates an owner membership, and writes `app_metadata.org_id`. Callers must refresh the Supabase session for the claim to appear in a token.

Errors: 401 `Subject missing in token`; 409 `Could not provision organization`; 502 `Provisioned org but failed to set token claim`.

### POST /auth/refresh

`auth.py:194`. No auth dependency. Request `RefreshRequest`: `refresh_token`. Response `AuthResponse`. Errors: 401 `Invalid refresh token`.

## org

`backend/app/routers/org.py`, prefix `/org/me`. Every handler loads the organization by `current_org.org_id`, so scoping is by primary key rather than a filter.

### GET /org/me

`org.py:38`. Depends on `org`.

Response `OrgProfileResponse` (`backend/app/schemas/org.py:8`): `id`, `name`, `primary_domain`, `whatsapp_number`, `notification_email`, `industry` (read from `settings->>industry`), `domain_verified`, `created_at` (populated from `organizations.onboarded_at`).

Errors: 404 `Organization not found`.

Known defect: `primary_domain` is declared non-nullable on the schema (`schemas/org.py:13`) while the column is nullable after migration `b7c1a9d2e4f8`. A freshly provisioned org has `primary_domain = NULL`, so this route raises a response-validation error and returns 500 until a domain is set.

### PUT /org/me

`org.py:60`. Depends on `org` and `role("owner","admin")`.

Request `OrgSettingsUpdate`: `name`, `whatsapp_number`, `notification_email`, `industry`, all optional. `industry` is merged into the `settings` JSONB with an explicit `flag_modified`. Response `OrgProfileResponse`. Errors: 404, plus the same nullable-domain 500 as above.

### DELETE /org/me

`org.py:102`. Depends on `org` and `role("owner")`. Status 202. Hard-deletes the organization row; every child table cascades on `org_id`. Response is a bare dict `{"message": "Organization deletion workflow initiated"}`, which does not match a declared response model. Errors: 404.

### GET /org/me/assets

`org.py:120`. Depends on `org`. Query: `limit` (1-100, default 20), `offset` (>=0). Scoped by `Asset.org_id == current_org.org_id`. Response `PaginatedResponse[AssetResponse]`.

Broken. The query orders by `Asset.created_at` (`org.py:131`), and the `Asset` model has no such attribute; the `assets` table has `first_seen` and `last_seen` instead. This raises `AttributeError: type object 'Asset' has no attribute 'created_at'`, verified by direct attribute access. Even with the ordering fixed, `AssetResponse` requires `source`, `verified` and `created_at`, none of which exist on the model or the table.

### GET /org/me/assets/{asset_id}

`org.py:149`. Depends on `org`. Loads by primary key then compares `asset.org_id` to the caller's org, returning 404 rather than 403 on mismatch (`org.py:157`). Response `AssetResponse`, which cannot validate for the reason above.

### POST /org/me/assets

`org.py:163`. Depends on `org` and `role("owner","admin")`. Request `AssetCreate`: `asset_type` (`domain` | `subdomain` | `ip`), `value`.

Broken. The constructor passes `source="user"` and `verified=True` (`org.py:176-177`), which are not columns on `Asset`. This raises `TypeError: 'source' is an invalid keyword argument for Asset`, verified by direct construction. Errors that would otherwise apply: 409 `Asset already exists` on the `(org_id, value)` unique constraint.

### POST /org/me/domain/verify-token

`org.py:190`. Depends on `org` and `role("owner","admin")`.

Generates `qelvix-verify-<16 url-safe bytes>` and stores the full expected record `qelvix-verification=<token>` under `organizations.onboarding_data.verification_token`. Response `VerifyTokenResponse`: `token`, `txt_record`. Errors: 404; 400 `Set your primary domain before generating a token.`

### POST /org/me/domain/verify-check

`org.py:220`. Depends on `limit("verify_check", 30, 300)`, `org` and `role("owner","admin")`.

Resolves TXT records for `organizations.primary_domain` with `dns.asyncresolver` and compares against the stored expected record. On a match it sets `domain_verified = True` and advances `onboarding_step` past `verify`. Response `MessageResponse`.

Errors: 404 `Organization not found`; 400 `No verification token generated yet.`; 400 `No primary domain set.`; 400 on mismatch, whose detail includes the hostname, every TXT record found and the expected value (`org.py:264`); 400 for `NoAnswer`, `NXDOMAIN`, `NoNameservers` and `LifetimeTimeout`, each including the raw resolver error string; 502 for anything else, with a generic message.

Note: the mismatch and resolver errors echo raw DNS data and resolver internals back to the caller. That is diagnostic detail rather than tenant data, but it is more than the generic 502 branch was written to allow.

### GET /org/me/onboarding

`org.py:305`. Depends on `org`. Response `OnboardingState` (`backend/app/schemas/onboarding.py:56`): `onboarding_completed`, `onboarding_step`, `onboarding_data`, `primary_domain`, `domain_verified`, `name`, `industry`, `notification_email`, `whatsapp_number`. Errors: 404.

### PATCH /org/me/onboarding

`org.py:317`. Depends on `org` and `role("owner","admin")`.

Request `OnboardingStepUpdate`: `step` (must be one of the 8 steps at `schemas/onboarding.py:31`), `data` (object). `data` is filtered to a 9-key allowlist (`schemas/onboarding.py:16`), so a client cannot inject server-owned keys such as `verification_token`; string values are capped at 254 characters, `invites` at 50 entries, and the serialized payload at 8192 bytes.

Recognised keys are mirrored onto real columns (`name`, `notification_email`, `whatsapp_number`, and `industry` into `settings`), and the whole payload is merged into `onboarding_data`. The step pointer only ever moves forward (`org.py:359`). If onboarding is already complete the current state is returned unchanged. Response `OnboardingState`. Errors: 404; 422 from the validators.

### PUT /org/me/domain

`org.py:368`. Depends on `org` and `role("owner","admin")`.

Request `DomainUpdate`: `domain`. The validator lowercases, strips scheme, path and trailing dot, rejects bare IPs, and enforces a strict label regex (`schemas/onboarding.py:10`). Changing the domain resets `domain_verified` to false and drops the stored verification token. Response `OnboardingState`. Errors: 404; 409 `That domain is already registered to another organization.`; 422 from the validator.

### POST /org/me/onboarding/complete

`org.py:407`. Depends on `org` and `role("owner","admin")`. Hard-gated: requires `name`, `primary_domain` and `domain_verified`. Sets `onboarding_completed = True` and `onboarding_step = "done"`. Response `OnboardingState`. Errors: 404; 400 listing exactly which of the three is still missing.

## members

`backend/app/routers/members.py`, prefix `/org/me/members`.

### GET /org/me/members

`members.py:17`. Depends on `org`. Query: `limit`, `offset`. Scoped by `Member.org_id`. Response `PaginatedResponse[MemberResponse]`.

Broken. Orders by `Member.created_at` (`members.py:28`), which does not exist; the table has `invited_at` and `joined_at`. `MemberResponse` also requires `created_at`.

### POST /org/me/members/invite

`members.py:45`. Depends on `org` and `role("owner","admin")`. Request `InviteMemberRequest`: `email`, `role`. Stub: returns `MessageResponse` with `Invite sent to {email}` and performs no Supabase call and no insert (`members.py:56-59`).

### PUT /org/me/members/{member_id}/role

`members.py:69`. Depends on `org` and `role("owner","admin")`. Request `UpdateRoleRequest`: `role` (`owner` | `admin` | `member`). Loads by primary key then checks `member.org_id`, 404 on mismatch. Refuses to demote the last owner with 400 `Cannot demote the sole owner`. Response `MemberResponse`, which cannot validate because of the missing `created_at`.

### DELETE /org/me/members/{member_id}

`members.py:97`. Depends on `org` and `role("owner","admin")`. Status 202. Refuses to remove the last owner with 400 `Cannot remove the sole owner`. Returns a bare dict, not the declared model. Errors: 404 `Member not found`.

## scans

`backend/app/routers/scans.py`, prefix `/scans`.

### POST /scans/trigger

`scans.py:95`. Depends on `limit("scan_trigger", 20, 3600)`, `role("owner","admin","member")` and `onboarded`.

Preconditions, in order: the org must exist and have a `primary_domain` (400 `Set a primary domain before scanning.`), and `domain_verified` must be true (403 `Verify domain ownership before scanning.`). Stale scans past 600 seconds are reaped to `failed` first (`scans.py:122`), then a single-active-scan lock rejects with 409 `A scan is already in progress.`

Inserts a `scans` row with `status="queued"`, `scan_type="full"`, `triggered_by="manual"` and `started_at` set at creation so the reaper can age it. Then schedules `execute_and_save` on `BackgroundTasks`.

Response `ScanTriggerResponse`: `message`, `scan_id`. The response returns before the scan runs.

### GET /scans

`scans.py:154`. Depends on `org`. Query: `limit` (1-100, default 20), `offset`. Scoped by `Scan.org_id`. Ordered by `started_at` descending, nulls last. Response `PaginatedResponse[ScanResponse]`: `id`, `org_id`, `status`, `risk_score`, `started_at`, `completed_at`, `error_log`, `findings_summary`.

Note: this route depends on `org`, not `onboarded`, so a pre-onboarding caller with an `org_id` claim gets an empty list rather than a 403.

### GET /scans/{scan_id}

`scans.py:180`. Depends on `org`. Loads by primary key then compares `scan.org_id`, 404 on mismatch (`scans.py:188`). Response `ScanResponse`. Errors: 404 `Scan not found`.

### GET /scans/{scan_id}/report

`scans.py:194`. Depends on `org`. Loads the scan with the same 404-on-mismatch pattern, then selects findings filtered on both `Finding.org_id` and `Finding.scan_id` (`scans.py:206-210`).

Response `ScanReportResponse` (`backend/app/schemas/scans.py:43`):

| Field | Source |
|---|---|
| `scan_id`, `status`, `risk_score`, `started_at`, `completed_at` | `scans` columns |
| `risk_band` | `langgraph_state->>risk_band` |
| `summary` | `findings_summary`, coerced to the four severity keys |
| `executive_summary` | `langgraph_state->>risk_executive_summary` |
| `findings` | `findings` rows for this scan |
| `recommendations` | `_derive_recommendations`, `scans.py:61` |
| `compliance` | `langgraph_state` keys `dpdp_overall_status`, `dpdp_clauses`, `dpdp_narrative` |
| `degraded_providers` | `langgraph_state->errors`, the list built by the `resilient` wrapper |

`_derive_recommendations` deduplicates by `finding_type`, then picks an action in priority order: the finding's own `remediation_steps`; a fixed "provider unavailable on the free tier" note when the title contains "not yet configured", "not configured" or "unavailable"; the plain explanation; otherwise a generic review line built from the real severity and title. Results are sorted by severity. Because `remediation_steps` is never populated (see `ARCHITECTURE.md`), the first branch is currently unreachable.

Errors: 404 `Scan not found`.

### GET /scans/{scan_id}/report.pdf

`scans.py:235`. Depends on `org`. Always raises 501 `PDF generation not implemented yet (Phase 2)`.

## findings

`backend/app/routers/findings.py`, prefix `/findings`.

### GET /findings

`findings.py:18`. Depends on `org`. Query: `severity`, `status`, `finding_type`, `asset_id`, `limit` (1-100, default 20), `offset`. All filters are optional and applied to both the page query and the count query. Scoped by `Finding.org_id`. Ordered by `discovered_at` descending. Response `PaginatedResponse[FindingResponse]`.

`severity` and `status` are accepted as free-form strings on input, while `FindingResponse` constrains them to literals on output (`backend/app/schemas/findings.py:18`). An unknown filter value returns an empty page rather than a 422.

### GET /findings/{finding_id}

`findings.py:65`. Depends on `org`. Loads by primary key then compares `finding.org_id`, 404 on mismatch. Response `FindingResponse`. Errors: 404 `Finding not found`.

### PUT /findings/{finding_id}/status

`findings.py:79`. Depends on `org` and `role("owner","admin","member")`.

Request `FindingStatusUpdate`: `status` (`open` | `acknowledged` | `resolved` | `false_positive`), `false_positive_reason` (optional, max 500). A `false_positive` without a reason is rejected with 422 before the row is loaded (`findings.py:91`). Setting `resolved` stamps `resolved_at`; any other status clears it and clears the false-positive reason. Response `FindingResponse`. Errors: 422; 404 `Finding not found`.

`findings.previous_status` exists as a column and is never written by this route.

## compliance

`backend/app/routers/compliance.py`, prefix `/compliance`. Both routes are scoped by `ComplianceReport.org_id` and both are currently unreachable in practice: nothing in the codebase inserts a `compliance_reports` row, so both always 404.

### GET /compliance/latest

`compliance.py:16`. Depends on `org`. Orders by `ComplianceReport.created_at` descending (`compliance.py:25`), an attribute the model does not have; the table has `generated_at`. Errors: 404 `No compliance report found`.

### GET /compliance/{scan_id}

`compliance.py:37`. Depends on `org`. Filters on `org_id` and `scan_id`. Errors: 404 `Compliance report not found for this scan`.

Both declare `ComplianceReportResponse` (`backend/app/schemas/compliance.py:7`), which requires `framework`, `is_compliant`, `dpdp_narrative` and `created_at`. None of those exist on the model or the table, whose columns are `clauses`, `overall_status`, `narrative` and `generated_at`.

The live DPDP data is served instead by the `compliance` block of `GET /scans/{scan_id}/report`.

## dashboard

`backend/app/routers/dashboard.py`, prefix `/dashboard`. Both routes depend on `onboarded`.

### GET /dashboard/summary

`dashboard.py:16`. Scoped by `org_id` on all three aggregates. Reads the most recent `completed` scan for `risk_score`, defaulting to 100 when there is no completed scan or the score is falsy (`dashboard.py:32`). Counts assets, then open critical findings, then open high findings.

Response `DashboardSummaryResponse`: `security_health_band` (a letter), `risk_score`, `total_assets`, `open_critical_findings`, `open_high_findings`.

Known defect: the band ladder treats a high risk score as good. `risk_score >= 90` yields `A` and `< 30` yields `F` (`dashboard.py:35-44`), while `calculate_risk` treats 100 as the worst possible score and 0-30 as `Low` (`backend/app/rules/risk_rules.py:21-28`). A brand-new org with no scan is reported as band `A` with risk 100.

### GET /dashboard/assets

`dashboard.py:82`. Scoped by `Asset.org_id`. Groups assets by `asset_type`. Response `DashboardAssetsResponse`: `total_domains`, `total_subdomains`, `total_ips`. Only these three types are counted; any other `asset_type` is dropped.

## notifications

`backend/app/routers/notifications.py`, prefix `/notifications`.

### GET /notifications

`notifications.py:16`. Depends on `org`. Query: `limit`, `offset`. Scoped by `Notification.org_id`. Response `PaginatedResponse[NotificationResponse]`.

Broken, and moot. Orders by `Notification.created_at` (`notifications.py:28`), which does not exist; the table has `sent_at`. `NotificationResponse` also requires `recipient` and `created_at`, neither of which is a column. Nothing writes the `notifications` table, so the list would be empty regardless.

### POST /notifications/test

`notifications.py:44`. Depends on `org` and `role("owner","admin")`. Request `TestNotificationRequest`: `channel` (`email` | `whatsapp`), `recipient`. Stub: returns `Test {channel} sent to {recipient}` and sends nothing (`notifications.py:52`). It does not even take a DB session.

## webhooks

`backend/app/routers/webhooks.py`, prefix `/webhooks`. Neither route has an auth dependency and neither is org-scoped.

### POST /webhooks/whatsapp

`webhooks.py:9`. Requires an `X-Hub-Signature-256` header to be present and rejects with 401 `Missing signature` if it is absent. The HMAC comparison itself is commented out (`webhooks.py:15-18`), so any value is accepted. Returns `{"status": "received"}` and processes nothing.

### POST /webhooks/scan-status

`webhooks.py:24`. No authentication at all; the shared-secret check is commented out (`webhooks.py:28-29`). Accepts any body and returns `{"status": "received"}`. Nothing calls it, since Celery is never enqueued.

## Route summary

| Method | Path | Auth | Org scoping | State |
|---|---|---|---|---|
| GET | `/health` | none | n/a | working |
| POST | `/auth/register` | none | creates org | working |
| POST | `/auth/login` | none | n/a | working |
| POST | `/auth/provision-org` | `token` | creates or returns org | working |
| POST | `/auth/refresh` | none | n/a | working |
| GET | `/org/me` | `org` | by PK | 500 when `primary_domain` is null |
| PUT | `/org/me` | `org` + role owner/admin | by PK | same |
| DELETE | `/org/me` | `org` + role owner | by PK | working |
| GET | `/org/me/assets` | `org` | `org_id` filter | 500, missing column |
| GET | `/org/me/assets/{id}` | `org` | PK + org check | 500, schema mismatch |
| POST | `/org/me/assets` | `org` + role owner/admin | insert with org_id | 500, invalid kwargs |
| POST | `/org/me/domain/verify-token` | `org` + role owner/admin | by PK | working |
| POST | `/org/me/domain/verify-check` | rate limit + `org` + role | by PK | working |
| GET | `/org/me/onboarding` | `org` | by PK | working |
| PATCH | `/org/me/onboarding` | `org` + role owner/admin | by PK | working |
| PUT | `/org/me/domain` | `org` + role owner/admin | by PK | working |
| POST | `/org/me/onboarding/complete` | `org` + role owner/admin | by PK | working |
| GET | `/org/me/members` | `org` | `org_id` filter | 500, missing column |
| POST | `/org/me/members/invite` | `org` + role owner/admin | none | stub |
| PUT | `/org/me/members/{id}/role` | `org` + role owner/admin | PK + org check | 500, schema mismatch |
| DELETE | `/org/me/members/{id}` | `org` + role owner/admin | PK + org check | working |
| POST | `/scans/trigger` | rate limit + role + `onboarded` | insert with org_id | working |
| GET | `/scans` | `org` | `org_id` filter | working |
| GET | `/scans/{id}` | `org` | PK + org check | working |
| GET | `/scans/{id}/report` | `org` | PK + org check, findings filtered | working |
| GET | `/scans/{id}/report.pdf` | `org` | n/a | 501 |
| GET | `/findings` | `org` | `org_id` filter | working |
| GET | `/findings/{id}` | `org` | PK + org check | working |
| PUT | `/findings/{id}/status` | `org` + role | PK + org check | working |
| GET | `/compliance/latest` | `org` | `org_id` filter | 500 or 404, never populated |
| GET | `/compliance/{scan_id}` | `org` | `org_id` filter | 404, never populated |
| GET | `/dashboard/summary` | `onboarded` | `org_id` filters | working, inverted band |
| GET | `/dashboard/assets` | `onboarded` | `org_id` filter | working |
| GET | `/notifications` | `org` | `org_id` filter | 500, never populated |
| POST | `/notifications/test` | `org` + role owner/admin | none | stub |
| POST | `/webhooks/whatsapp` | none | none | stub, signature unverified |
| POST | `/webhooks/scan-status` | none | none | stub, unauthenticated |

`docs/contracts/openapi.json` is a committed snapshot regenerated by `scripts/export_openapi.py` and enforced by CI gate G6. Its prose descriptions predate the implementation, for example describing `/scans/trigger` as queueing a Celery task (`frontend/lib/api/types.generated.ts:470`). The table above is derived from the routers, not from that snapshot.
