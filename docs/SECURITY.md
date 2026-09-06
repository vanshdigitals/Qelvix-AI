# Security

Scope: the authentication flow, session handling, domain-ownership verification, tenant isolation as actually enforced, secret handling, and the personal data stored. Ends with the gaps between what the code does and what the product claims.

## Authentication flow

Identity lives in Supabase Auth. The backend never stores a password hash.

Two paths create an account:

1. Frontend-driven. `signUpWithPassword` calls `supabase.auth.signUp` in the browser (`frontend/lib/auth/actions.ts:68`), then `ensureOrgProvisioned` posts to `POST /auth/provision-org` with the fresh access token (`frontend/lib/auth/actions.ts:104`). Provisioning is idempotent, creates an organization shell with a null `primary_domain`, creates an owner membership, and writes `app_metadata.org_id` on the Supabase user with the service key (`backend/app/routers/auth.py:135-191`). The client must refresh its session for the new claim to appear in a token.
2. Backend-driven. `POST /auth/register` performs the Supabase signup itself with the service key, creates the org and membership, and writes the claim (`backend/app/routers/auth.py:25`). A failure to write the claim is swallowed (`auth.py:80-82`), leaving an account whose tokens carry no `org_id` and which is therefore 401 on every org-scoped route.

The OAuth callback route is `frontend/app/auth/callback/route.ts`.

### Token verification

`get_current_user_token`, `backend/app/dependencies.py:22`.

- The credential is extracted by `HTTPBearer` (`dependencies.py:17`). A missing header produces 403, not 401.
- The unverified header is inspected for the algorithm (`dependencies.py:27`). `HS256` is verified against `SECRET_KEY`; anything else is verified against a signing key resolved from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` by a cached `PyJWKClient` (`dependencies.py:19`).
- `audience="authenticated"` is required in both branches. Expiry is checked with 30 seconds of leeway.
- Failures map to 401 with `WWW-Authenticate: Bearer`.

The asymmetric branch passes `algorithms=["RS256", "ES256", "HS256"]` (`dependencies.py:45`). Including `HS256` there is harmless in practice because the key material comes from the JWKS document rather than from the token, but it widens the accepted algorithm set beyond what that branch needs.

### Org resolution

`get_current_org`, `backend/app/dependencies.py:81`, reads `org_id` from the token root, then `app_metadata`, then `user_metadata` (`dependencies.py:91-93`). Reading from `user_metadata` is the weak link: in Supabase, `user_metadata` is writable by the user through `supabase.auth.updateUser`, while `app_metadata` is writable only with the service key. A user who sets `user_metadata.org_id` to another organization's UUID would, for a token that carries no `org_id` in the root or in `app_metadata`, be resolved into that organization by this dependency. Every provisioned user does receive an `app_metadata.org_id`, which is checked first and would win. The exposure is limited to accounts where the claim write failed. This was reasoned from the precedence order in the code and Supabase's documented metadata semantics; it was not exploited against a running instance. Not verified: the check is to issue a token with only `user_metadata.org_id` set and call `GET /org/me`.

### Authorization

- `get_onboarded_org` (`dependencies.py:109`) reads `organizations.onboarding_completed` and returns 403 with the machine-readable detail `onboarding_incomplete`. Applied to `POST /scans/trigger`, `GET /dashboard/summary` and `GET /dashboard/assets`, and to nothing else. `GET /scans`, `GET /findings` and the org routes are reachable pre-onboarding.
- `require_role(*roles)` (`dependencies.py:130`) queries the caller's `members.role` for the active org and compares against the allowed set, returning 403 `Insufficient permissions` on a miss. Called with no arguments it is a no-op; every live call site passes roles.

Role assignments in the code: `owner` only for `DELETE /org/me`; `owner, admin` for org settings, assets creation, domain routes, onboarding writes, member management and `POST /notifications/test`; `owner, admin, member` for `POST /scans/trigger` and `PUT /findings/{id}/status`. `role` is a free-text column with no CHECK constraint, so a value outside the three simply fails every role check.

## Session handling

Sessions are Supabase cookie sessions managed by `@supabase/ssr`.

`frontend/middleware.ts:8` runs on every non-static request and delegates to `updateSession` (`frontend/lib/supabase/middleware.ts:13`), which:

- Rebuilds the request and response cookie jars so refreshed tokens propagate (`middleware.ts:36-49`).
- Calls `supabase.auth.getUser()`, which revalidates against Supabase rather than trusting cookie contents. The code comments on this choice at `middleware.ts:52-53`, and it is the correct one; `getSession()` alone would trust a forgeable cookie.
- Redirects unauthenticated requests for the 13 protected prefixes at `frontend/lib/supabase/config.ts:21` to `/login` with a `redirectTo` parameter.
- Redirects authenticated requests for `/login`, `/signup` and `/forgot-password` to `/dashboard`.
- If Supabase is not configured, protected routes still redirect to login rather than rendering unguarded (`middleware.ts:24-32`).

The browser sends the access token to the API as a bearer header (`frontend/lib/api/client.ts:127`). There is no server-side proxy, so the token is present in browser memory and the API is called cross-origin. CORS allows exactly one origin, `settings.frontend_url`, with credentials, six methods and two headers (`backend/app/main.py:41-47`).

`OnboardingGuard` caches a completed onboarding check in `sessionStorage` under `qelvix_onboarded` (`frontend/components/onboarding/OnboardingGuard.tsx:26`). It is a UX cache only; the backend re-checks on every gated request. On a transient backend error the guard fails open in the UI (`OnboardingGuard.tsx:48`), relying on the backend 403 for the actual gate.

## Domain ownership verification

Scanning is gated on proving control of the domain.

1. `POST /org/me/domain/verify-token` generates `qelvix-verify-<secrets.token_urlsafe(16)>` and stores the expected TXT value `qelvix-verification=<token>` under `organizations.onboarding_data.verification_token` (`backend/app/routers/org.py:208-215`). The token uses `secrets`, so it is cryptographically random, and 16 bytes of entropy is sufficient.
2. `POST /org/me/domain/verify-check` resolves TXT records for the apex domain and requires an exact match against the stored value (`org.py:246-253`). On success it sets `domain_verified = True`.
3. `POST /scans/trigger` refuses with 403 unless `domain_verified` is true (`backend/app/routers/scans.py:117`).
4. `POST /org/me/onboarding/complete` refuses unless `domain_verified` is true (`org.py:426`).
5. Changing the domain resets `domain_verified` to false and deletes the stored token (`org.py:384-390`), so verification cannot be inherited by a different domain.

The client cannot inject a token: `verification_token` is not on the `PATCH /org/me/onboarding` allowlist (`backend/app/schemas/onboarding.py:16`), and the validator drops unknown keys before the merge (`schemas/onboarding.py:88`).

Two weaknesses:

- The token is never expired or rotated. Once issued it remains valid in `onboarding_data` indefinitely, and re-checking is rate-limited to 30 attempts per 5 minutes rather than being single-use.
- Migration `b7c1a9d2e4f8:69` backfilled `domain_verified = true` for every pre-existing organization with a non-null `primary_domain`. Those rows can scan without ever having passed a DNS check.

The domain itself is validated before storage by a strict label regex that rejects schemes, paths, spaces and bare IP addresses (`backend/app/schemas/onboarding.py:10`, `schemas/onboarding.py:104-113`), and the unique constraint on `organizations.primary_domain` prevents two tenants claiming the same domain.

## Tenant isolation as actually enforced

There is one enforcing layer, not two.

### Layer 1: per-query org scoping. Enforcing.

Every handler that touches tenant data either filters on `org_id` or loads by primary key and then compares `org_id`, returning 404 on mismatch. Verified by reading all nine routers:

| Router | Pattern |
|---|---|
| `org.py` | Loads `Organization` by `current_org.org_id`; assets filtered on `Asset.org_id` (`org.py:130`) or PK plus check (`org.py:157`) |
| `members.py` | Filtered on `Member.org_id` (`members.py:27`); PK plus check on mutations (`members.py:82`, `members.py:109`) |
| `scans.py` | Filtered on `Scan.org_id` (`scans.py:164`, `scans.py:174`); PK plus check (`scans.py:188`, `scans.py:203`); findings filtered on both `org_id` and `scan_id` (`scans.py:208-209`) |
| `findings.py` | Filtered on `Finding.org_id` (`findings.py:30`, `findings.py:48`); PK plus check (`findings.py:73`, `findings.py:97`) |
| `compliance.py` | Filtered on `ComplianceReport.org_id` (`compliance.py:24`, `compliance.py:46`) |
| `dashboard.py` | Every aggregate filtered on `org_id` (`dashboard.py:26`, `dashboard.py:48`, `dashboard.py:55`, `dashboard.py:65`, `dashboard.py:90`) |
| `notifications.py` | Filtered on `Notification.org_id` (`notifications.py:26`, `notifications.py:36`) |
| `auth.py` | Not tenant-scoped by design; creates or looks up the caller's own org |
| `webhooks.py` | Not scoped, and not authenticated. See gaps. |

No raw SQL string with a tenant table appears in `backend/app/routers/`. The scan worker writes with an explicit `org_id` taken from the scan record (`backend/app/worker.py:134`, `worker.py:160`).

### Layer 2: row-level security. Not enforcing.

RLS is enabled on all 9 tables and 22 policies exist, but they do not apply to the application's database connection. Verified with read-only queries against the configured `DATABASE_URL`:

- `current_user` is `postgres`, with `rolsuper = false` and `rolbypassrls = true`.
- That role owns all 9 tables, and `relforcerowsecurity` is false on every one of them.
- `SELECT auth.jwt()` returns NULL on that connection, and no code anywhere in `backend/app/` issues `SET LOCAL request.jwt.claims`, `set_config` or `SET ROLE`.
- `SELECT count(*) FROM organizations` on that connection returned 11 rows, spanning every tenant.

Either the `BYPASSRLS` attribute or table ownership without `FORCE ROW LEVEL SECURITY` is sufficient on its own to skip every policy. Both are true.

The consequence is not that isolation is broken today. It is that isolation rests on a single layer: a missing `.where(X.org_id == ...)` in one future handler leaks tenant data, with no database backstop. The `README.md` claim of two independent layers is not currently true.

The check that would make RLS enforce is to connect as a role that is neither the table owner nor `BYPASSRLS`, and to set the JWT claims GUC that `auth.jwt()` reads on every session. Migration `551ce8261afa` already grants the `authenticated` role the necessary privileges for exactly that. Adding `ALTER TABLE ... FORCE ROW LEVEL SECURITY` would additionally cover the ownership case.

The existing test does not detect this. `backend/tests/test_rls_and_auth.py:96` opens a separate connection, issues `SET ROLE authenticated`, sets the GUC `request.jwt.claim.org_id`, and asserts that org B sees zero rows. Supabase's `auth.jwt()` reads `request.jwt.claims` as a JSON document, not `request.jwt.claim.org_id`, so under that setup `auth.jwt()` is NULL, the predicate is false for every row, and the assertion passes whether or not the policy discriminates between tenants. The test also never exercises the role the application actually uses.

## Secret handling

`backend/app/config.py` is the only module that reads the environment. Every credential field is typed `SecretStr`, so values do not appear in a repr or an accidental log line. `get_settings` is `lru_cache`d.

Required, with no default, so the process refuses to start without them (`config.py:34`, `config.py:43-45`, `config.py:66-67`): `NVIDIA_API_KEY`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SECRET_KEY`, `FRONTEND_URL`.

`extra="forbid"` (`config.py:30`) rejects any variable in `.env` without a matching field, which is a good default that `.env.example` currently violates; see `KNOWN_GAPS.md`.

The service key is used for Supabase Admin operations only: signup, the `app_metadata` write, login proxying and refresh (`backend/app/routers/auth.py:31`, `auth.py:114`, `auth.py:177`, `auth.py:199`). It is never sent to the browser. The frontend reads only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`frontend/lib/supabase/config.ts:8`); a grep for `SUPABASE_SERVICE_KEY` under `frontend/` returns nothing.

`backend/.env` exists in the working tree and holds live values for `GEMINI_PRIMARY_API_KEY`, `FALLBACK_BACKUP_GEMINI_PRIMARY_API_KEY`, `NVIDIA_API_KEY`, `DeepSeek_API_KEY`, `DATABASE_URL`, `SUPABASE_SERVICE_KEY`, `SHODAN_API_KEY`, `VIRUSTOTAL_API_KEY`, `NVD_API_KEY`, `GOOGLE_SAFE_BROWSING_API_KEY`, `ABUSEIPDB_API_KEY`, `RESEND_API_KEY` and `SECRET_KEY`. It is ignored by `.gitignore:2` and `git ls-files backend/.env` returns nothing, so it has never been committed.

The residual risk is not disclosure through git. It is that this file is the default source of a production `DATABASE_URL` for anything run from `backend/`, including `backend/tests/test_rls_and_auth.py`, which seeds and deletes rows, and the eleven loose scripts at the backend root.

The `NVIDIA_API_KEY` value in `backend/.env` carries the `nvapi-` prefix, which is the correct NVIDIA NIM format. The `sk-ant-` prefix reported in the older documentation does not appear in this file. `DeepSeek_API_KEY` holds an `sk-` value and is read by no code.

Secret scanning is configured in `.pre-commit-config.yaml:26` and in CI gate G7, both against a `.secrets.baseline` file that does not exist at the repository root.

## Personal data stored

In the application database:

| Data | Where |
|---|---|
| Organization name | `organizations.name` |
| Primary domain | `organizations.primary_domain` |
| Notification email | `organizations.notification_email` |
| WhatsApp number | `organizations.whatsapp_number` |
| Industry, company size, GST identifier, invitee email addresses | `organizations.onboarding_data` and `organizations.settings`, per the allowlist at `backend/app/schemas/onboarding.py:16` |
| Supabase user id | `members.user_id` |
| Discovered subdomains and IP addresses for the tenant's own domain | `assets` |
| Breached sentinel addresses for the tenant's own domain, and the breach names they appear in | `findings.raw_data` for `email_breached`, and a second copy inside `scans.langgraph_state` |

Email addresses and passwords live in Supabase Auth, not in these tables. `audit_log.ip_address` exists as a column and is never written.

Every scan writes its full state to `scans.langgraph_state`, which duplicates every finding's evidence, every LLM-generated explanation and the DPDP evidence strings. There is no retention policy, no scheduled deletion and no redaction. `DELETE /org/me` hard-deletes the organization and cascades to every child table, which is the only erasure path.

A GST identifier is collected. It is on the server-side allowlist (`backend/app/schemas/onboarding.py:16`) and is asked for by the wizard (`frontend/components/onboarding/OnboardingWizard.tsx`). It is stored in `organizations.onboarding_data` as plain JSONB, with no encryption at rest beyond whatever the Supabase instance provides, and no erasure path other than deleting the organization.

## Known gaps

Things the code does not do that the product or the older documents claim.

1. **RLS is not a second isolation layer.** `README.md` and `docs/07_SECURITY_COMPLIANCE.md` describe two independent layers. The application connects as `postgres`, which has `rolbypassrls = true` and owns every table, and `relforcerowsecurity` is false everywhere. All 22 policies are inert for the API. Tenant isolation is enforced only by the `org_id` filters in the routers.

2. **No test proves cross-tenant isolation for the path the application uses.** The one RLS test exercises a role the application never assumes, using a GUC name that `auth.jwt()` does not read, and passes vacuously.

3. **`POST /webhooks/scan-status` is unauthenticated.** The shared-secret check is commented out (`backend/app/routers/webhooks.py:28-29`). It currently returns a fixed response and mutates nothing, so the exposure is an open endpoint rather than a data path, but it is publicly reachable.

4. **`POST /webhooks/whatsapp` does not verify its signature.** The handler requires the `X-Hub-Signature-256` header to be present and accepts any value; the HMAC comparison is commented out (`webhooks.py:15-18`).

5. **`user_metadata` is trusted as a source for `org_id`.** `backend/app/dependencies.py:92` falls back to a user-writable metadata field after checking the two safe sources.

6. **No audit log is written.** The table, the model and the monitoring claims in `docs/07_SECURITY_COMPLIANCE.md` all exist; no code inserts a row. Member changes, role changes, org deletion and scan triggers leave no trace.

7. **Rate limiting is per process and in memory.** `backend/app/rate_limit.py:20` holds buckets in a module-level dict. Any horizontal scaling multiplies every limit by the instance count, and a restart clears them. The module documents this. Only two endpoints are limited at all; there is no general per-org request limit.

8. **The domain verification token never expires and is not single-use.**

9. **Pre-existing organizations were grandfathered as domain-verified** by migration `b7c1a9d2e4f8:69` without a DNS check.

10. **`.secrets.baseline` is missing**, so the pre-commit secret scan and CI gate G7 both fail on the step that would catch a committed credential.

11. **A live `backend/.env` with production credentials sits in the working tree.** It is git-ignored and untracked, so it has not leaked, but it makes production the default database for the test suite and for eleven loose scripts at the backend root.

12. **DPDP clause S8.6 always passes** because the org context is hardcoded (`backend/app/agents/dpdp_compliance.py:11`). A compliance readiness report is being produced from a check that cannot fail.

13. **DNS resolver failures are reported as security findings.** `backend/app/services/dns_service.py:88` swallows every exception and returns None, so a transient resolver problem produces high-severity "no SPF" and "no DMARC" findings that are indistinguishable from the real thing.

14. **Verification failure responses echo raw DNS data and resolver errors** back to the caller (`backend/app/routers/org.py:264-273`), including the full TXT record set for the domain.

15. **No CSRF consideration is documented or needed today**, because the API authenticates with a bearer header rather than a cookie. If a cookie-authenticated path is ever added, this changes.
