# 02: Frontend Architecture

Implements the screens, navigation model, and component inventory defined in `01_PRODUCT_BLUEPRINT.md`. Visual tokens (color, type, spacing, motion values) live in `05_DESIGN_SYSTEM.md`; this document covers structure and mechanism, not visual design. Coding standards and CI wiring are in `06_DEVELOPMENT_GUIDE.md`.

## 1. Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14, App Router | Server Components by default |
| Language | TypeScript, strict mode | No `any` without an inline justification comment |
| Styling | Tailwind CSS + shadcn/ui | Tokens sourced from `05_DESIGN_SYSTEM.md` |
| Animation | Framer Motion | Scoped usage; see §10 |
| Charts | Recharts | Wrapped, never used raw in feature code; see §9 |
| Client state | Zustand | UI-only ephemeral state; see §4 |
| Server state | TanStack Query | Fetching, caching, polling; see §5 |
| Forms | react-hook-form + zod | Schema colocated with the form; see §7 |
| Theming | next-themes | Dark/light switch mechanism; see §8 |
| i18n | next-intl | Static UI strings only; see §13 |
| Testing | Vitest + React Testing Library, Playwright | See §16 |

## 2. Folder Structure

```text
frontend/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx                 # Landing
│   │   ├── pricing/page.tsx
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── legal/[slug]/page.tsx
│   │   └── layout.tsx               # Marketing nav + footer
│   │
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── verify-email/page.tsx
│   │   └── layout.tsx               # No persistent nav, single CTA per screen
│   │
│   ├── (onboarding)/
│   │   ├── organization/page.tsx
│   │   ├── domain-verification/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── first-scan/page.tsx
│   │   ├── first-report/page.tsx
│   │   └── layout.tsx               # Linear step guard, see §3
│   │
│   ├── (app)/
│   │   ├── dashboard/page.tsx
│   │   ├── findings/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── scans/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── assets/page.tsx
│   │   ├── compliance/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── team/page.tsx
│   │   ├── profile/page.tsx
│   │   └── layout.tsx               # Sidebar + header shell, role-aware
│   │
│   ├── not-found.tsx                # 404
│   ├── maintenance/page.tsx
│   └── layout.tsx                   # Root: theme provider, query client
│
├── components/
│   ├── ui/                          # shadcn primitives, unmodified except tokens
│   ├── layout/                      # Sidebar, Header, Breadcrumb, OrgSwitcher
│   ├── findings/                    # FindingCard, SeverityBadge, FindingStatusControl
│   ├── scans/                       # AgentStatusList, ScanProgressIndicator
│   ├── dashboard/                   # SecurityHealthStatus, RiskScoreGauge, TrendSparkline
│   ├── onboarding/                  # DomainVerificationInstruction, ConsentCheckbox
│   └── shared/                      # EmptyState, Skeleton, DataChart, MarkdownViewer
│
├── lib/
│   ├── api/                         # Typed fetch clients, one module per resource
│   ├── queries/                     # TanStack Query hooks (useFindings, useScan, ...)
│   ├── stores/                      # Zustand stores
│   ├── schemas/                     # zod schemas, colocated by feature
│   └── utils/
│
├── middleware.ts                    # Auth redirect, locale detection
└── package.json
```

Screen-to-route mapping follows `01_PRODUCT_BLUEPRINT.md` §3 exactly; the four route groups correspond to the four navigation contexts defined in §4 of that document. Component names in `components/` match the inventory in §11 one-to-one so a developer can go from spec to file without translation.

## 3. Routing & Layouts

Each route group owns its layout, matching the distinct navigation contexts from `01` §4: `(marketing)` renders the sticky nav and footer; `(auth)` renders no persistent chrome; `(app)` renders the role-aware sidebar and header.

`(onboarding)` layout enforces the linear sequence (Organization → Domain Verification → Notifications → First Scan → First Report) with a server-side redirect guard: each page checks the org's onboarding state and redirects forward or backward as needed. This prevents a user from deep-linking into `first-scan` before domain verification has actually passed, without maintaining separate client-side step logic.

Every route uses Next.js's file convention for state, not a custom wrapper:

- `loading.tsx` per route renders that screen's specific skeleton (per `01`'s per-screen loading state spec), never a generic spinner.
- `error.tsx` per route renders a retry action, consistent with the error-state behavior specified per screen in `01`.
- Detail routes (`findings/[id]`, `scans/[id]`) are real server-rendered pages, satisfying the deep-linking requirement from `01` §4 without client-only modal state.

## 4. State Management

| State category | Owner | Example | Notes |
|---|---|---|---|
| Server data | TanStack Query (client) or direct fetch (Server Component) | Findings list, scan detail, org profile | Initial page load fetches server-side; client interactions refetch via Query |
| Live/polling data | TanStack Query, `refetchInterval` | Live scan agent status | Interval stops once `scans.status` is terminal; see §5 |
| Ephemeral UI state | Zustand | Sidebar collapsed, command palette open, filter draft before apply | Never persisted server-side, never duplicated into URL |
| Shareable/filterable state | URL search params | Findings list filters, pagination | Required by `01`'s deep-linking rule; a filtered view must be a bookmarkable link |
| Form state | react-hook-form (component-local) | Signup, Domain Verification, Settings forms | Not lifted to Zustand; forms own their own state |

Zustand stores are scoped narrowly (`useSidebarStore`, `useCommandPaletteStore`) rather than one global store. A store that mixes server data and UI state is a sign the boundary above has been violated.

## 5. Data Fetching Conventions

Query keys follow `[resource, orgId, ...params]`, e.g. `['findings', orgId, { severity, status, page }]`. Org ID is always part of the key so a query never serves cached data across a tenant switch (relevant once the Phase 3 org switcher is live).

**Polling.** The live Scan view (`01` §7) polls `GET /scans/{id}` with an interval that backs off as the scan progresses (2s while `running`, stopped entirely on `completed` or `failed`). This is implemented as a `refetchInterval` function on the query, not a manual `setInterval`.

**Mutations.** Finding status changes (`PUT /findings/{id}/status`) use optimistic updates: the UI reflects the new status immediately, rolls back on error, and invalidates the `findings` list query on success so counts and sort order stay correct without a manual patch.

**Partial failure.** A scan response with a non-empty `error_log` is rendered as partial, never as a clean success, matching the principle established in `04_AGENT_PIPELINE.md`. This is enforced at the query's `select` function so no component can accidentally read `status: completed` and skip the check.

## 6. Component Architecture

Server Components are the default. A component becomes a Client Component only when it needs interactivity, browser APIs, or a hook that requires one (`useState`, TanStack Query hooks, Zustand). Data fetching for a page's initial render happens in the Server Component; client components receive data as props or fetch their own updates via Query.

Rules for `components/`:

- Feature components (`findings/`, `scans/`, `dashboard/`) contain no direct `fetch` calls; they receive data via props or a Query hook from `lib/queries/`, keeping them testable in isolation.
- `components/ui/` (shadcn primitives) are never edited for one-off cases; a variant that doesn't exist yet is added to the primitive, not patched at the call site.
- Every component in the `01` §11 inventory has exactly one implementation. A second `FindingCard`-shaped component appearing in a different feature folder is a signal to extract and reuse, not to duplicate.

## 7. Forms & Validation

Every form pairs a zod schema with react-hook-form's resolver, colocated in `lib/schemas/`. Client-side validation is a UX convenience; the API is the authoritative validator (see `03_BACKEND.md`), so client validation errors must never diverge from what the API actually rejects.

```ts
// lib/schemas/domain-verification.ts
export const domainVerificationSchema = z.object({
  method: z.enum(["dns_txt", "well_known_file"]),
});

// lib/schemas/notification-setup.ts
export const notificationSetupSchema = z.object({
  whatsappNumber: z.string().regex(E164_REGEX).optional(),
  whatsappConsent: z.boolean(),
  email: z.string().email(),
}).refine(
  (data) => !data.whatsappNumber || data.whatsappConsent,
  { message: "Consent is required to enable WhatsApp delivery", path: ["whatsappConsent"] }
);
```

## 8. Theming

`next-themes` drives a `data-theme` attribute on `<html>`, with Tailwind's `dark:` variant reading from it. Dark is the default theme (consistent with the security-dashboard convention referenced in `01`'s Dashboard Blueprint); light is available as an explicit toggle in the user menu, not auto-detected from system preference at MVP, to keep the first-run experience predictable. Token values (colors, elevation, contrast pairs for both themes) are defined once in `05_DESIGN_SYSTEM.md` as CSS custom properties; this document only owns the switching mechanism.

## 9. Charts

All chart usage goes through `components/shared/DataChart.tsx`, which wraps Recharts and applies the design system's chart tokens (colors, gridlines, tooltip style) in one place. `RiskScoreGauge` and `TrendSparkline` (from `01` §11) are built on Recharts' `RadialBarChart` and `AreaChart` respectively. Recharts is dynamically imported (`next/dynamic`, `ssr: false`) wherever it's used, since it's a meaningful bundle cost that only the Dashboard and Scan Detail routes need.

## 10. Animation Guidelines

Framer Motion is used for: agent status transitions in the live Scan view (queued → running → done), finding card enter/exit when filters change, and drawer/dialog open-close. It is deliberately not used for: the risk score number, which never counts up or animates on load, consistent with `01`'s framing that the Dashboard should never manufacture drama around a number a business owner is already anxious about. All animation respects `prefers-reduced-motion`; Framer Motion's `useReducedMotion` hook gates every non-essential transition.

## 11. Responsive Design

Tailwind's default breakpoints (`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px), mobile-first. Specific mobile behaviors are defined per screen in `01_PRODUCT_BLUEPRINT.md` (Domain Verification's thumb-reachable copy action, the Dashboard's priority-ordered single-column stack, the sidebar's icon-only collapse) and implemented here as component-level responsive variants, not page-level breakpoint overrides.

## 12. Accessibility

Target: WCAG 2.1 AA. Specific requirements already established per screen in `01` (severity never colour-only, consent copy as real body text, ordered-list markup for remediation steps) are implementation constraints here, not new decisions. Additional mechanisms:

- Live-updating regions (scan progress, toasts) use `aria-live="polite"`.
- Dialogs and drawers trap focus and return it to the triggering element on close.
- The command palette (Phase 2) and all interactive controls are fully keyboard-operable; no action exists only behind a mouse hover.
- `axe-core` runs in CI against every route; see `06_DEVELOPMENT_GUIDE.md`.

## 13. Internationalization

`next-intl` manages static UI strings (buttons, labels, navigation, form copy), with `en` as the only shipped locale at MVP and the routing structure in place for `hi` to follow without a refactor.

This is a distinct system from the Hindi-English hybrid content Claude generates for finding explanations and remediation steps (`04_AGENT_PIPELINE.md`). That content is produced per-organization at generation time and rendered as-is through `MarkdownViewer`; it does not pass through next-intl, since it isn't a fixed string being translated but generated language chosen for the reader.

## 14. Performance

Server Components handle initial data for every list/detail page, so the first paint doesn't wait on a client-side fetch. Route-based code splitting is automatic under the App Router; Recharts, the command palette, and the PDF viewer (Phase 2) are additionally dynamic-imported since none are needed on first paint of their routes. Images go through `next/image`. Live-scan polling uses the backoff strategy in §5 specifically to avoid sustained request pressure from an open tab.

Targets: LCP under 2.5s, INP under 200ms, CLS under 0.1 on the Landing Page and Dashboard, measured in CI against the thresholds in `06_DEVELOPMENT_GUIDE.md`.

## 15. Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Component file | PascalCase | `FindingCard.tsx` |
| Hook file | camelCase, `use` prefix | `useFindingsQuery.ts` |
| Zustand store | camelCase, `use...Store` | `useSidebarStore.ts` |
| Route folder | kebab-case | `domain-verification/` |
| Zod schema file | kebab-case | `domain-verification.ts` |
| Non-component util | camelCase | `formatRiskBand.ts` |

## 16. Testing

Vitest + React Testing Library for component and hook unit tests; Playwright for end-to-end coverage of the flows where a regression is costly: signup through first scan, domain verification (both methods), finding status transitions, and WhatsApp consent capture. Full CI pipeline and coverage gates are defined in `06_DEVELOPMENT_GUIDE.md`.

## 17. Coding Standards

ESLint (`next/core-web-vitals` + `typescript-eslint` strict) and Prettier, enforced pre-commit and in CI. Absolute imports via the `@/` alias; no deep relative imports crossing more than one directory level. Full repository-wide standards, git workflow, and review checklist are in `06_DEVELOPMENT_GUIDE.md`.

## Design Decisions

Additions to the stack not previously specified in `README.md`, none conflicting with it:

- **Framer Motion** for animation, as scoped in §10.
- **react-hook-form + zod** for forms and validation, colocated per feature.
- **next-themes** as the dark/light switching mechanism, dark as default.
- **next-intl** for static-string i18n, distinct from Claude-generated content.
- **Vitest, React Testing Library, Playwright** as the frontend test stack.

---

Owner: Qelvix Engineering Team
