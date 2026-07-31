# 05: Design System

Visual and interaction foundation for every screen specified in `01_PRODUCT_BLUEPRINT.md` and structured in `02_FRONTEND.md`. This document owns tokens, typography, components, dashboard layout rules, and data visualization guidance. It does not own screen composition (which components appear on which screen — that's `01`), state/data-fetching mechanics (`02_FRONTEND.md` §4–5), or which agent/endpoint feeds a given widget (`03_BACKEND.md`, `04_AGENT_PIPELINE.md`). Component names below match the inventory in `01_PRODUCT_BLUEPRINT.md` §11 one-to-one.

**Canonical typography.** DM Sans (display/headings) / Inter (UI, body, navigation, forms, tables, data) is the single source of truth for Qelvix typography, superseding the earlier system. This document, and every document from this point forward, uses this system exclusively. Non-typography brand elements — squircle logo mark, Lucide icon set, Swiss/Apple/IBM/Stripe/Linear editorial style — carry forward unchanged; the color system below replaces the earlier near-black/Signal Blue palette with a more distinctive enterprise cybersecurity identity, detailed in §3.1.

## 1. Typography

Two typefaces, each scoped to a content category. Never substituted, never mixed within a category.

| Typeface | Scope | Never used for |
|---|---|---|
| **DM Sans** | Display/marketing headlines, product headings (H1–H6) | Body copy, tables, forms, code |
| **Inter** | Body text, tables, forms, navigation, buttons, labels, helper text, captions, data, code | Headings |

**Where each typeface belongs and doesn't:**

- **DM Sans** carries identity and hierarchy. It appears exactly where `01_PRODUCT_BLUEPRINT.md` calls out a screen's single largest element — the Landing Page hero line, the Risk Score gauge's headline number pairing, Finding Detail's title, Security Health status text. It is never used at body-copy sizes; DM Sans below 18px loses the geometric character that justifies using it over Inter at all, and using it for paragraph text would blur the visual boundary between "this is a heading" and "this is content," which matters on data-dense screens like Findings List and Scans Detail where that boundary is load-bearing.
- **Inter** is the workhorse. Everything a user reads to understand or act — plain-language explanations, remediation steps, table cells, form labels, nav items, and data — is Inter. Inter's numeral set is used with tabular figures (`font-variant-numeric: tabular-nums`) anywhere numbers appear in a column (Findings List age, Scans History risk score, Team & Roles timestamps), so digits align vertically and a scanning eye can compare rows without the layout shifting per-row. This includes IDs, IPs, and code outputs, which keep numbers visually aligned and "data-like" without a separate font file.

### 1.1 Type Scale

| Token | Size / Line-height | Typeface | Weight | Usage |
|---|---|---|---|---|
| `display-xl` | 56px / 64px | DM Sans | 700 | Landing Page hero only |
| `display-lg` | 40px / 48px | DM Sans | 700 | Marketing section headers |
| `heading-h1` | 32px / 40px | DM Sans | 700 | Screen title (Dashboard, Findings List) |
| `heading-h2` | 24px / 32px | DM Sans | 600 | Section header within a screen |
| `heading-h3` | 20px / 28px | DM Sans | 600 | Card/widget title |
| `heading-h4` | 16px / 24px | DM Sans | 600 | Subsection, table group header |
| `body-lg` | 16px / 24px | Inter | 400 | Primary reading copy (explanations, remediation) |
| `body-md` | 14px / 20px | Inter | 400 | Default UI text, table cells, form values |
| `body-sm` | 13px / 18px | Inter | 400 | Secondary/supporting text |
| `label` | 13px / 16px | Inter | 500 | Form labels, filter chips |
| `caption` | 12px / 16px | Inter | 400 | Timestamps, metadata, helper text |
| `mono-data` | 13px / 20px | Inter (tabular-nums) | 400 | Table/inline technical values (IDs, IPs, CVEs) |
| `mono-block` | 13px / 22px | Inter (tabular-nums) | 400 | CodeBlock, JSONViewer, raw evidence |
| `button` | 14px / 20px | Inter | 600 | All button labels |

Line-heights are fixed per token, not computed from a global multiplier, because dense tables (Findings List, Audit Log) need predictable row height independent of font metrics changing anywhere else in the system.

## 2. Design Principles

Five principles, in priority order when they conflict:

1. **Clarity over decoration.** Every visual choice must reduce the time to a correct decision. A gradient, animation, or illustration that doesn't do that is cut, regardless of how it looks in isolation.
2. **Low cognitive load, high information density.** These are not in tension if hierarchy is correct: density is fine when the eye is told what matters first (per `01_PRODUCT_BLUEPRINT.md`'s wireframe-hierarchy convention on every Tier 1 screen). Density becomes clutter only when hierarchy is missing.
3. **Consistency over local optimization.** A component's shape, spacing, and behavior are fixed once, everywhere. A screen that would look 5% better with a one-off variant doesn't get one; per `02_FRONTEND.md` §6, a second differently-shaped version of an existing component is a bug, not a design choice.
4. **Accessibility is a default state, not a mode.** WCAG 2.1 AA (per `02_FRONTEND.md` §12) is met by the base component, not by a separate accessible variant.
5. **Fast scanning beats exhaustive display.** Any screen with more than one plausible "most important thing" has a hierarchy bug. This is the same rule `01_PRODUCT_BLUEPRINT.md` applies per-screen; here it's the system-wide default every new component must satisfy before it ships.

These principles resolve conflicts between component-level guidance below when a Do/Don't and a dashboard rule appear to disagree — clarity and low cognitive load outrank density, and density outranks decoration, in every case.

## 3. Design Tokens

All tokens are CSS custom properties, consumed via Tailwind config per `02_FRONTEND.md` §1 (`next-themes` drives `data-theme`, `05` — this document — owns the values themselves).

### 3.1 Color

Primitive palette first, semantic tokens second. Components reference semantic tokens only; a component that reads `--ink-800` or `--signal-500` directly instead of `--color-accent-primary` is a review-blocking error, since it breaks the moment the primitive scale changes.

**Identity direction.** Generic SaaS dashboards default to slate-gray-plus-blue, which reads as interchangeable with any B2B tool and undersells a product whose entire pitch is deterministic, evidence-grade rigor. Qelvix's palette is built around **deep ink-navy** (not neutral gray — a cool, slightly desaturated blue-black that reads as "operations console," closer to a SOC terminal than a marketing dashboard) paired with **Signal Cyan** as the single accent hue used for interactive/informational emphasis, kept deliberately separate from the severity scale so accent and alert are never visually confusable. Severity colors are warm-shifted and higher-chroma than a typical muted enterprise palette specifically so critical/high findings read as urgent at a glance in a field that's otherwise cool and restrained — the palette's whole job is making the one thing that needs attention visually impossible to miss against a calm operational backdrop.

**Primitives**

| Token | Value | Character |
|---|---|---|
| `--ink-950` | `#080A10` | Canvas floor — near-black with a cold blue undertone, not true black |
| `--ink-900` | `#0F1420` | Base surface |
| `--ink-800` | `#161C2C` | Raised surface (cards, panels) |
| `--ink-700` | `#212940` | Border / divider on dark |
| `--ink-600` | `#323C58` | Strong border, disabled fill |
| `--ink-400` | `#6B7690` | Muted text, placeholder |
| `--ink-200` | `#AEB6C9` | Secondary text on dark |
| `--fog-50` | `#F4F5F8` | Canvas floor, light theme |
| `--fog-100` | `#E8EAF0` | Border, light theme |
| `--fog-600` | `#4B5468` | Secondary text, light theme |
| `--fog-900` | `#12151F` | Primary text, light theme |
| `--white` | `#FFFFFF` | Surface, light theme |
| `--signal-600` | `#0891B2` | Accent — pressed / light-theme text-on-white |
| `--signal-500` | `#06B6D4` | Accent — primary, dark-theme default |
| `--signal-300` | `#67E8F9` | Accent — high-emphasis on dark (active nav, focus glow) |
| `--breach-600` | `#DC2626` | Critical — text/icon |
| `--breach-500` | `#EF4444` | Critical — dark-theme text/icon |
| `--breach-100` | `#FEE2E2` | Critical — light-theme wash |
| `--flare-600` | `#D9480F` | High — text/icon (amber-red, distinct from critical's true red) |
| `--flare-500` | `#F0651E` | High — dark-theme text/icon |
| `--flare-100` | `#FEE4D6` | High — light-theme wash |
| `--caution-600` | `#B45309` | Medium — text/icon (deep amber, not yellow — reads as "caution," not "cheerful") |
| `--caution-500` | `#D97B1F` | Medium — dark-theme text/icon |
| `--caution-100` | `#FCEACB` | Medium — light-theme wash |
| `--verified-600` | `#0D9165` | Success/resolved/compliant |
| `--verified-500` | `#14B87F` | Success — dark-theme text/icon |
| `--verified-100` | `#D6F5E8` | Success — light-theme wash |

**Semantic — surface & text**

| Token | Dark value | Light value | Usage |
|---|---|---|---|
| `--color-bg-canvas` | `--ink-950` | `--fog-50` | App shell background |
| `--color-bg-surface` | `--ink-900` | `--white` | Card, table, panel background |
| `--color-bg-surface-raised` | `--ink-800` | `--white` (+ `--shadow-md`) | Modal, drawer, popover |
| `--color-bg-inset` | `--ink-950` at 60% over `--ink-900` | `--fog-50` | Recessed regions — code blocks, filter-bar background |
| `--color-border-default` | `--ink-700` | `--fog-100` | Default dividers, card borders |
| `--color-border-subtle` | `--ink-800` | `--fog-50` | Low-emphasis separators (table row lines) |
| `--color-border-strong` | `--ink-600` | `#D3D7E0` | Input default border, emphasis dividers |
| `--color-text-primary` | `--white` | `--fog-900` | Headings, primary body |
| `--color-text-secondary` | `--ink-200` | `--fog-600` | Supporting text, captions |
| `--color-text-muted` | `--ink-400` | `#8992A8` | Disabled, placeholder |
| `--color-accent-primary` | `--signal-500` | `--signal-600` | Primary CTA, active nav, links |
| `--color-accent-emphasis` | `--signal-300` | `--signal-600` | Active nav indicator, high-emphasis inline links |
| `--color-focus-ring` | `--signal-300` | `--signal-600` | Focus outline, all interactive elements |

Dark is the default theme (`02_FRONTEND.md` §8); the light scale is not a mechanical inversion — `--fog-*` and `--white` were tuned separately so text contrast and surface separation both independently clear §8's thresholds rather than inheriting dark-theme ratios by assumption.

**Semantic — status.** These are the tokens `01_PRODUCT_BLUEPRINT.md`'s SeverityBadge, Security Health status, and every severity-carrying component consume. Each status has a `-text`, `-bg`, `-border`, and `-solid` value: `-solid` is the flat fill used for chart segments and status dots, where a wash-plus-border treatment would be too light to read at small sizes.

| Status | `-text` (dark / light) | `-bg` (dark / light) | `-border` | `-solid` |
|---|---|---|---|---|
| `critical` | `--breach-500` / `--breach-600` | `--breach-600` at 16% / `--breach-100` | `--breach-600` at 40% | `--breach-600` |
| `high` | `--flare-500` / `--flare-600` | `--flare-600` at 16% / `--flare-100` | `--flare-600` at 40% | `--flare-600` |
| `medium` | `--caution-500` / `--caution-600` | `--caution-600` at 16% / `--caution-100` | `--caution-600` at 40% | `--caution-600` |
| `low` | `--ink-400` / `--fog-600` | `--ink-700` at 40% / `#EDEFF3` | `--ink-600` / `#D3D7E0` | `--ink-400` |
| `info` | `--signal-300` / `--signal-600` | `--signal-500` at 16% / `#DFF7FB` | `--signal-500` at 40% | `--signal-500` |
| `success` (resolved, compliant) | `--verified-500` / `--verified-600` | `--verified-600` at 16% / `--verified-100` | `--verified-600` at 40% | `--verified-600` |

The four finding severities are `critical`, `high`, `medium`, and `low`; `info` and `success` are UI notification/status styles (Alert, Toast, resolved/compliant states), not finding severities. Severity color is never the only signal — every status token pairs with a fixed text label and, where the component is a badge or icon, a fixed icon (§4.16). This is the token-level enforcement of the color-blind-safe rule in §8. `critical` and `high` are deliberately both warm (red vs. amber-red) rather than red-vs-orange-vs-yellow spaced evenly around the color wheel, because a true warm/cool split (e.g. red vs. blue-toned "high") would make `high` look calmer than `medium` to a portion of color-blind users — keeping the whole upper severity band in the same warm family and relying on the fixed icon+label pairing for disambiguation is the safer construction.

### 3.2 Spacing

Base-8 scale. Components reference the semantic row below it only where one exists; raw scale values are for one-off layout only.

| Token | Value | Semantic alias | Usage |
|---|---|---|---|
| `--space-1` | 4px | | Icon-to-label gap |
| `--space-2` | 8px | `--space-cell-y` | Table cell vertical padding (compact density) |
| `--space-3` | 12px | `--space-cell-x` | Table cell horizontal padding |
| `--space-4` | 16px | `--space-card-padding` | Card/widget internal padding |
| `--space-5` | 20px | | Form field vertical gap |
| `--space-6` | 24px | `--space-section-gap` | Gap between dashboard widget groups |
| `--space-8` | 32px | `--space-page-margin` | Page-level side margin (desktop) |
| `--space-12` | 48px | | Marketing section vertical rhythm |
| `--space-16` | 64px | | Marketing hero vertical padding |

### 3.3 Radius, Border, Elevation, Motion, Opacity, Z-index

| Category | Token | Value | Usage |
|---|---|---|---|
| Radius | `--radius-sm` | 4px | Badge, tag, input |
| Radius | `--radius-md` | 8px | Card, button, dropdown |
| Radius | `--radius-lg` | 12px | Modal, drawer panel |
| Radius | `--radius-full` | 9999px | Avatar, pill badge, switch |
| Border width | `--border-thin` | 1px | Default component border |
| Border width | `--border-thick` | 2px | Focus ring, Danger Zone container |
| Elevation | `--shadow-sm` | Dark: `0 1px 2px rgba(0,0,0,.4)` · Light: `0 1px 2px rgba(18,21,31,.08)` | Card resting state |
| Elevation | `--shadow-md` | Dark: `0 4px 12px rgba(0,0,0,.48)` · Light: `0 4px 12px rgba(18,21,31,.12)` | Dropdown, popover |
| Elevation | `--shadow-lg` | Dark: `0 12px 32px rgba(0,0,0,.56)` · Light: `0 12px 32px rgba(18,21,31,.16)` | Modal, drawer |
| Motion | `--duration-fast` | 120ms | Hover, focus transitions |
| Motion | `--duration-base` | 200ms | Drawer/dialog open-close |
| Motion | `--duration-slow` | 320ms | Agent status transition (per `02_FRONTEND.md` §10) |
| Motion | `--easing-standard` | `cubic-bezier(.2,0,0,1)` | All transitions |
| Opacity | `--opacity-disabled` | 0.4 | Disabled controls |
| Opacity | `--opacity-overlay` | 0.6 | Modal/drawer backdrop |
| Z-index | `--z-dropdown` | 20 | Dropdown, combobox popover |
| Z-index | `--z-sticky` | 30 | Sticky nav, table header |
| Z-index | `--z-drawer` | 40 | Drawer panel |
| Z-index | `--z-modal` | 50 | Modal, its backdrop |
| Z-index | `--z-toast` | 60 | Toast stack (always above modal) |

### 3.4 Layout

| Token | Value |
|---|---|
| `--breakpoint-sm` | 640px |
| `--breakpoint-md` | 768px |
| `--breakpoint-lg` | 1024px |
| `--breakpoint-xl` | 1280px |
| `--container-max` | 1440px (in-app), 1200px (marketing) |
| `--grid-columns` | 12 |
| `--grid-gutter` | 24px (desktop), 16px (mobile) |
| `--sidebar-width-expanded` | 240px |
| `--sidebar-width-collapsed` | 64px |

Breakpoints match `02_FRONTEND.md` §11 exactly; this table exists so a designer building a mockup doesn't need to cross-reference the frontend doc for a number.

### 3.5 Icon & Component Sizing

Icon set: **Lucide**, per Qelvix's locked brand system. One icon per semantic meaning across the entire product — the icon used for "critical" in a badge is the same icon used for "critical" in a toast, a table cell, and the WhatsApp message template.

| Token | Value | Usage |
|---|---|---|
| `--icon-xs` | 12px | Inline with `caption` text |
| `--icon-sm` | 16px | Inline with `body-sm`/`label`, table row icons |
| `--icon-md` | 20px | Buttons, nav items |
| `--icon-lg` | 24px | Section headers, empty-state |
| `--icon-xl` | 40px | Empty-state hero icon |
| `--control-height-sm` | 32px | Compact button/input (dense tables) |
| `--control-height-md` | 40px | Default button/input |
| `--control-height-lg` | 48px | Marketing CTA, hero input |

## 4. Component System

Every component below follows the same structure. Components not listed individually (e.g. `RiskScoreGauge`, `TrendSparkline`) are covered under their general pattern (Charts, §4.15) with only their deltas noted, since restating the full Chart template per named component adds no implementation value.

### 4.1 Button

**Purpose.** The single mechanism for triggering an action. Per `01_PRODUCT_BLUEPRINT.md`'s navigation contract, never more than one visually dominant (primary) button per screen.

**Variants and exact color mapping:**

| Variant | Background | Text | Border | Hover | Active |
|---|---|---|---|---|---|
| `primary` | `--color-accent-primary` | `--ink-950` (dark) / `--white` (light) — always the surface the button sits on, inverted, for max contrast against the cyan fill | none | background → `--signal-300` (dark) / `--signal-600` at 90% (light) | background darkens 8%, scale 98% |
| `secondary` | transparent | `--color-text-primary` | `1px solid --color-border-strong` | background → `--color-bg-surface-raised` | border → `--color-accent-primary` |
| `ghost` | transparent | `--color-text-secondary` | none | background → `--color-bg-surface-raised`, text → `--color-text-primary` | background darkens 4% further |
| `destructive` | `--breach-600` | `--white` | none | background → `--breach-500` (dark) / darken 8% (light) | scale 98% |
| `link` | transparent | `--color-accent-primary` | none | underline appears | text → `--signal-300` |

**Sizes:** `sm` (32px height, `--space-3` horizontal padding), `md` (40px, default, `--space-4`), `lg` (48px, marketing/hero only, `--space-5`). Icon-only buttons are square at their size token (32/40/48px) with no asymmetric padding.

**Typography:** `button` token, all variants and sizes.

**Icons:** Optional leading icon only (never trailing except a chevron on a menu-trigger button), sized `--icon-sm` at `sm`/`md`, `--icon-md` at `lg`. Icon-only buttons require an `aria-label` and a tooltip (§4.13) on hover/focus.

**States:** default, hover (per table above, `--duration-fast`), active/pressed (scale 98% + darken, per table), focus (visible `--color-focus-ring` outline, 2px offset, outline persists through hover), disabled (`--opacity-disabled`, no pointer events, no hover/active transform), loading (spinner — 16px, `currentColor` stroke — replaces label; button sets an explicit `min-width` equal to its own rendered label width before the swap, so it never shrinks and shifts adjacent layout).

**Accessibility:** Minimum 40×40px hit target even where the visual size is `sm` (achieved via padding, not a larger visual footprint). Loading state sets `aria-busy="true"`.

**Usage — Do:** Use `primary` for exactly one action per screen or per card. Use `destructive` only behind a confirmation step.
**Usage — Don't:** Don't use two `primary` buttons side by side — demote one to `secondary`. Don't use `ghost` for a screen's main CTA; it reads as disabled at a glance.

**Edge cases:** A button whose action is disabled due to a permission gap (not a form-validity gap) is either hidden or shown with a one-line reason on hover, per `01_PRODUCT_BLUEPRINT.md` §4's role-restriction rule — never a silently disabled button with no explanation.

### 4.2 Input (Text, Email, Number)

**Purpose.** Single-line data entry.

**Variants:** `default`, `with-icon` (leading icon, e.g. search), `with-suffix` (e.g. domain TLD hint).

**Sizes:** `sm` (32px), `md` (40px, default).

**Spacing:** Internal padding `--space-3` horizontal, `--space-2` vertical. Label-to-input gap `--space-1`. Helper/error text gap `--space-1` below input.

**Typography:** Value: `body-md`. Label: `label`. Helper/error: `caption`.

**States:** default, focus (`--color-focus-ring` border + ring), filled, error (`critical` status `-border`/`-text` tokens: border switches to `critical-border`, helper text switches to `critical-text`, icon optional), disabled (`--opacity-disabled`), read-only (no border, `--color-bg-canvas` background — used for Signup's pre-filled domain field).

**Accessibility:** `<label>` bound via `for`/`id`, never placeholder-as-label. Error text linked via `aria-describedby`, announced on appearance via `aria-live="polite"` region wrapping the field group.

**Usage — Do:** Validate on blur, not on every keystroke, except to clear an existing error once the field becomes valid.
**Usage — Don't:** Don't use placeholder text as the only field description — it disappears on input and fails the label requirement.

**Edge cases:** Autofill styling must not override the token-driven focus/error states (a common browser-default collision); autofilled fields get the `filled` state's border color explicitly re-applied via `:-webkit-autofill` override.

### 4.3 Textarea

Same token set as Input. Additional: resizable vertically only (`resize: vertical`), minimum 3 visible rows, character counter (`caption`, bottom-right) shown only when a max length is enforced (e.g. False Positive reason field, `01_PRODUCT_BLUEPRINT.md` §9).

### 4.4 Password Input

Input variant with a trailing visibility-toggle icon button (`--icon-sm`, `ghost` button styling) and, on Signup only, a strength meter below: four segments, filled left-to-right, colored `--breach-600` → `--flare-600` → `--caution-600` → `--verified-600` as strength increases, with a `caption`-level text label ("Weak"/"Fair"/"Strong") since color alone can't carry the signal (§8).

**Accessibility:** Visibility toggle is keyboard-reachable and exposes its current state via `aria-pressed`. Strength meter uses `aria-live="polite"` on the text label only, not the visual bar, to avoid announcing on every keystroke.

### 4.5 Search

**Purpose.** Two scopes: global (header, finds entities across the org by ID/domain/IP/name) and local (scoped to the current table — Findings List, Assets).

**Variants:** `global` (header-mounted, opens a results overlay), `local` (inline above a table, filters in place).

**Behavior:** Local search filters client-side against already-fetched page data for instant feedback, then triggers a server refetch (per `02_FRONTEND.md` §5's query-key pattern) debounced 300ms, so the visible list never freezes waiting on the network for a simple substring filter.

**States:** empty (magnifier icon only), typing (loading indicator replaces trailing icon after 150ms if no local match found yet), no-results (distinct from Findings List's filter-based empty state, §4.20).

### 4.6 Command Palette (Phase 2)

**Purpose.** Power-user navigation and action shortcut ("go to finding," "trigger scan," "invite member").

**Trigger:** `Cmd/Ctrl+K`, header search icon.

**Layout:** Centered modal-like overlay, `--z-modal`, input pinned to top, results grouped by category (Navigate / Actions / Recent) with `label`-styled group headers.

**Accessibility:** Full keyboard operation (arrow keys to navigate results, Enter to select, Esc to close) is mandatory, not optional — this is the one component in the system where mouse-only interaction is not an acceptable fallback path, since its entire purpose is a keyboard-first workflow.

**Do:** Keep primary novice tasks (e.g. "Run scan now") available via a normal visible button elsewhere too — the palette is an accelerator, never the only path to a common action.

### 4.7 Dropdown / Select / Combobox

**Purpose.** Constrained single or multi-choice from a list. `Dropdown` (menu of actions, e.g. row overflow menu), `Select` (single value from a fixed list, e.g. severity filter), `Combobox` (searchable, e.g. assigning to a team member in a large org).

**Sizes:** Matches Input sizing (`sm`/`md`).

**Behavior:** Opens on click/Enter/Space, closes on selection, outside click, or Esc. Positioned via collision detection (flips above the trigger if below-viewport space is insufficient) — this applies to every overlay component in this system (Dropdown, Select, Combobox, Popover, Tooltip), stated once here rather than per component.

**Accessibility:** `role="listbox"`/`combobox"` per the relevant ARIA pattern, arrow-key navigation, typeahead (typing jumps to the matching option) for `Select` and `Dropdown` with more than 8 options.

**Edge cases:** `Combobox` with zero matches shows an inline "No results" row, never an empty dropped panel.

### 4.8 Checkbox / Radio / Switch

**Purpose.** `Checkbox` (independent boolean or multi-select, e.g. bulk-select on Findings List), `Radio` (mutually exclusive choice, e.g. verification method), `Switch` (immediate-effect boolean setting, e.g. a notification channel toggle in Settings).

**Sizes:** 16px (Checkbox/Radio), 36×20px (Switch).

**States:** unchecked, checked, indeterminate (Checkbox only — bulk-select header when some but not all rows are selected), disabled, focus.

**Accessibility:** Minimum 40×40px hit target via padding around the 16px visual control. `Switch` exposes `role="switch"` and `aria-checked`; a Switch's effect must be reflected in an accompanying `caption` describing the resulting state, never relying on the toggle position alone for a consequential setting (e.g. "Weekly scans: On").

### 4.9 ConsentCheckbox

Distinct component, not a styled `Checkbox`, per `01_PRODUCT_BLUEPRINT.md`'s explicit call-out that WhatsApp consent is a legally-weighted capture. Structurally: a standard `Checkbox` paired with `body-md` (not `caption`) consent copy — real reading-weight text, unchecked by default, never pre-ticked. No visual variant may reduce this to checkbox-plus-caption; the type-scale difference from a normal field label is the point.

### 4.10 Segmented Control / Tabs

**Purpose.** `Segmented Control` (2–4 mutually exclusive views of the same data, e.g. Domain Verification's DNS TXT vs. well-known-file method toggle). `Tabs` (distinct content sections under one screen, e.g. Finding Detail's Explanation/Technical Details if expanded to a tabbed layout rather than a collapsible panel).

**Sizes:** `md` (40px) only — neither component appears in a context dense enough to need a compact variant.

**States:** active segment/tab uses `--color-accent-primary` underline (Tabs) or filled background (Segmented Control); inactive uses `--color-text-secondary`.

**Accessibility:** `Tabs` use `role="tablist"`/`"tab"`/`"tabpanel"` with arrow-key navigation between tabs and only the active panel in the tab order.

### 4.11 Accordion

**Purpose.** Collapsible single-section disclosure — the mechanism behind Finding Detail's "Technical details" panel (`01_PRODUCT_BLUEPRINT.md` §9).

**Behavior:** Collapsed by default when the content is secondary evidence (raw data); expanded by default when the content is the primary reading path. Icon (chevron, `--icon-sm`) rotates 180° on expand, `--duration-fast`.

**Accessibility:** Trigger is a real `<button>` with `aria-expanded`, content region has `aria-hidden` synced to collapsed state, not just `display:none` toggling without the ARIA attribute.

### 4.12 Card

**Purpose.** Grouped content container — the base unit of Dashboard widgets, FindingCard, and summary blocks generally.

**Spacing:** `--space-card-padding` (16px) internal, `--space-section-gap` (24px) between sibling cards in a grid.

**Elevation:** `--shadow-sm` resting; cards never elevate further on hover (that motion cue is reserved for genuinely interactive surfaces like buttons — a card that visually "lifts" on hover but isn't itself clickable is a common source of false affordance).

**Variants:** `default`, `interactive` (whole card is a link/button — cursor pointer, subtle background shift on hover, used for FindingCard), `status` (colored left border matching a severity/status token, used where the card itself represents one finding or one alert).

**Do:** Use Cards for summary metrics and grouped mini-views (Dashboard widgets).
**Don't:** Use Cards for long lists needing exact-value comparison — that's a Table's job (§4.14).

### 4.13 Tooltip / Popover

**Purpose.** `Tooltip` (single-line clarification on hover/focus, e.g. an icon-only button's label, a truncated table cell's full value). `Popover` (richer, potentially interactive content, e.g. a role-restriction explanation with a link).

**Behavior:** Tooltip appears after a 400ms hover delay (prevents flicker on incidental mouse movement), disappears immediately on mouse-leave or Esc. Popover opens on click, closes on outside-click/Esc, and can contain focusable content (unlike Tooltip, which never does).

**Accessibility:** Tooltip content is exposed via `aria-describedby`, not only visually — a screen-reader user focusing the trigger hears the tooltip text. Tooltip must never be the only place required information lives; if a tooltip conveys something necessary to complete a task, that's a content problem, not just an accessibility one.

### 4.14 Table / Data Grid

**Purpose.** The default surface for findings, assets, scans, notifications, members, and audit records. Tables are preferred over cards whenever exact-value comparison, sorting, or bulk action matters.

**Density:** Two modes, user-togglable where the screen supports high row counts (Findings List, Audit Log): `comfortable` (`--space-cell-y` = 12px) default, `compact` (`--space-cell-y` = 8px) for power users. Non-power-user screens (Team & Roles, Notifications Log) ship `comfortable` only — introducing a density toggle where row count is inherently small adds a control with no payoff.

**Column typography:** Header row uses `label` token, uppercase not required (avoid unless a future editorial pass adopts it deliberately — no current screen uses uppercase table headers). Cell content uses `body-md`; numeric/ID/timestamp columns use `mono-data` with tabular figures for alignment.

**Row states:** default, hover (`--color-bg-surface-raised` background), selected (checkbox-driven, `--color-accent-primary` at 8% background), critical-severity row (subtle left border in `critical` status `-solid` color — never a full-row red fill, which would compete with true row-selection state and over-saturate a list where multiple critical rows are common).

**Selection:** Row checkbox in a fixed 40px leading column, header checkbox drives select-all-on-page (never select-all-across-pages implicitly — selecting beyond the current page requires an explicit "Select all N matching filters" action link that appears only after the header checkbox is checked). Selecting ≥1 row replaces the toolbar's filter controls with a contextual bulk-action bar (`--color-bg-surface-raised` background, `--duration-fast` slide-down) showing the selection count and available bulk actions (e.g. "Acknowledge" on Findings List); clearing selection restores the filter bar in place, no layout jump.

**Sorting:** Column header click toggles ascending/descending, shown via a chevron icon (`--icon-xs`, filled `--color-accent-primary` when active, outline `--color-text-muted` when the column is sortable but inactive so sortability itself is discoverable without hovering). Only one column sorts at a time. Sort state lives in the URL per `02_FRONTEND.md` §4's shareable-state rule, not component-local state.

**Column widths:** Fixed pixel widths for enum/badge/timestamp columns (Severity, Status, Age), flexible (`minmax`) for free-text columns (Title, Asset), so badge and date columns never reflow as content loads while text columns use available space. The primary identifying column (Finding title, Asset value) is sticky-left on horizontal scroll at narrow desktop widths, so a user scrolling right through a wide table never loses track of which row they're reading.

**Sticky elements:** Header row is sticky (`--z-sticky`) on scroll within the table's own scroll container, not the page — this matters for Findings List and Audit Log, which can run to hundreds of rows above the fold on desktop. The bulk-action bar, when present, is sticky immediately below the header row at the same `--z-sticky` layer.

**Empty/loading/error:** See §4.20–4.22; a Table's empty and loading states are never a bare "no data" string — they follow the parameterized `EmptyState`/`Skeleton` pattern.

**Do:** Keep filters above the table, not buried in a column-header menu, for any filter a user applies routinely (severity, status) — matches `01_PRODUCT_BLUEPRINT.md`'s Findings List filter-bar placement.
**Don't:** Hide row actions behind hover-only reveal on touch-capable viewports; hover has no equivalent on touch, so actions must also be reachable via a persistent overflow menu icon.

**Data Grid** (heavier variant — inline cell editing, column resize/reorder) is not required anywhere in the current screen inventory; if a future screen needs it, it inherits every rule above and adds only the editing interaction, not a separate visual language.

### 4.15 Charts (DataChart wrapper)

Governed in full by §7 (Data Visualization) below; this entry covers only the component-level shell shared by every chart type. All charts render inside a consistent frame: `heading-h3` title top-left, optional `Popover`-triggered legend/info top-right, chart body, and — where relevant — a caption-level data-source note bottom-left (e.g. "Based on last 30 days"). Loading state is a shaped `Skeleton` matching the chart's real aspect ratio, never a spinner (consistent with `02_FRONTEND.md` §5's live-scan precedent). Every chart ships a visually-hidden text summary of its data (`sr-only` element preceding the SVG) for screen-reader users, since a chart's visual pattern has no non-visual equivalent otherwise.

### 4.16 Badge / Tag

**Purpose.** `Badge` (status — severity, finding status, role), `Tag` (categorical, non-status metadata — asset type, finding type label on a filter chip).

**Sizes:** Single size, 20px height, `caption`-weight text, `--space-1`/`--space-2` horizontal padding.

**Structure:** Badge = colored background/border/text triplet from §3.1 status tokens + a fixed icon (§8, never color-only) + text label. Tag = neutral `--color-bg-surface-raised` background, no severity color, optional leading icon.

**Do:** Always pair severity Badges with the text label spelled out (Critical/High/Medium/Low), matching `01_PRODUCT_BLUEPRINT.md`'s explicit accessibility requirement for Findings List. `info` is a UI notification/status style (Alert, Toast, unread-count badge), not a finding severity.
**Don't:** Never use a Badge for a value that isn't a defined status enum — that's what Tag is for.

### 4.17 Alert / Toast

**Purpose.** `Alert` (persistent, page-level or section-level message — e.g. Dashboard's partial-scan notice). `Toast` (transient, action-confirmation — e.g. "Finding marked resolved").

**Variants:** `info`, `success`, `warning`, `critical` — mapped to the same status tokens as Badge for consistency.

**Toast behavior:** Auto-dismisses after 5s (success/info) or requires manual dismiss (critical — an error the user needs to actually register shouldn't vanish on its own timer). Stacks vertically, newest on top, max 3 visible with overflow collapsed into a "+N more" summary. `--z-toast`, always above modal/drawer.

**Accessibility:** Toast container is `aria-live="polite"` (`assertive` for critical variant); Alert is part of normal document flow, announced naturally, no live-region needed since it's present on render rather than injected.

### 4.18 Modal / Drawer

**Purpose.** `Modal` — confirmations, compact edits, destructive actions only (Danger Zone delete confirmation, false-positive reason capture). Never long-form analysis. `Drawer` — quick investigation context without losing table state (a finding preview from Findings List before committing to the full detail page, a member's role-change form from Team & Roles).

**Sizes:** Modal: `sm` (400px, confirmation), `md` (560px, form). Drawer: fixed 480px width, full viewport height, slides from the right.

**Behavior:** Both trap focus, return focus to the triggering element on close, close on Esc and backdrop click (except destructive-action Modals mid-submission, which block backdrop-click close to prevent an accidental cancel of an in-flight delete).

**Accessibility:** `role="dialog"` + `aria-modal="true"`, labelled via `aria-labelledby` pointing at the Modal/Drawer's own heading.

**Do:** Prefer Drawer over Modal for anything the user might want to reference against the underlying list — that's the entire reason Drawer exists as distinct from Modal.
**Don't:** Don't stack a Modal on top of a Drawer or vice versa; if a confirmation is needed from within a Drawer, the Drawer's own content changes to a confirmation state in place rather than layering a second overlay.

### 4.19 Sidebar / Top Navigation / Breadcrumb / Pagination

Structural behavior (role-awareness, collapse mechanics, breadcrumb depth rule, org switcher) is specified in `01_PRODUCT_BLUEPRINT.md` §4 and implemented per `02_FRONTEND.md` §2's `components/layout/` module; this document owns only their visual tokens. Sidebar: `--sidebar-width-expanded`/`collapsed` per §3.4, `--color-bg-surface` background, active item indicated by a `--color-accent-emphasis` left border (2px) plus `--color-text-primary` (inactive items use `--color-text-secondary`). Breadcrumb: `caption` token, `--color-text-muted` separators, current page non-interactive in `--color-text-primary`. Pagination: numbered where total pages ≤ 7, prev/next + page-jump input beyond that; `mono-data` for page numbers to keep digit width consistent as the count changes.

### 4.20 Empty State

**Purpose.** Parameterized (icon, message, action) per `01_PRODUCT_BLUEPRINT.md` §11 — one implementation, every screen's empty case configures it rather than building its own.

**Structure:** Centered, `--icon-xl` icon in `--color-text-muted`, `heading-h4` message, `body-sm` supporting line, optional single action button.

**Rule.** An empty state always explains *why* it's empty and what unlocks value — "No verified assets yet, run a scan to discover them," never a bare "No data." The two-distinct-empty-states pattern on Findings List (`01_PRODUCT_BLUEPRINT.md` §9 — "no findings at all" vs. "no findings match your filter") is two different configurations of this same component, not two components.

### 4.21 Skeleton / Loading State

**Purpose.** Shape-matched loading placeholder, per `02_FRONTEND.md` §3's `loading.tsx` convention — never a generic centered spinner for any screen or widget that has a known real layout.

**Behavior:** Skeleton blocks use a subtle shimmer animation (`--duration-slow` sweep, respects `prefers-reduced-motion` by falling back to a static pulse-opacity instead of a moving gradient). Skeleton shapes are literal approximations of the real content's bounding boxes (a FindingCard skeleton has a badge-sized block, a title-width bar, and a two-line body block in the FindingCard's actual proportions).

**Where a spinner is still correct:** Only for sub-second, low-context operations with no meaningful shape to preview (e.g. a button's own inline loading state, §4.1) — never for a full route or widget.

### 4.22 Error State

**Purpose.** Prefer partial rendering with visible "some data unavailable" messaging over total failure whenever only part of a response is broken — this is the visual expression of the partial-failure contract specified in `03_BACKEND.md` §6.2 and `04_AGENT_PIPELINE.md` §11.

**Structure:** Route-level error (`02_FRONTEND.md` §3's `error.tsx`): centered message + retry button, matches Empty State's visual shell for consistency but uses the `critical`/`warning` icon set instead of the neutral Empty State icon. Widget-level partial error (e.g. one Dashboard widget's data source failed while the rest of the dashboard is fine): the widget renders its own inline `Alert` (`warning` variant) in place of its content, the rest of the dashboard renders normally — a single failed provider never blanks the whole screen.

### 4.23 Success State

Not a standalone component — expressed via `Toast` (transient confirmation), inline `Alert` (persistent, e.g. "Verified" badge context on Domain Verification), or a full screen acting as its own success state (First Report Reveal, per `01_PRODUCT_BLUEPRINT.md` §7). Listed here only to state explicitly that no separate "SuccessState" component exists — using the right existing primitive for the right duration of feedback is the rule, not a fourth overlay type.

### 4.24 Timeline / Activity Feed

**Purpose.** `Timeline` — sequential, time-based events for a single entity (a finding's lifecycle history, a scan's per-agent progression). `Activity Feed` — cross-entity chronological stream (Dashboard's Recent Activity widget, `01_PRODUCT_BLUEPRINT.md` §8).

**Structure:** Vertical line with node markers per event, `caption`-weight timestamp left-aligned or inline per available width, `body-sm` event description, optional status-colored node matching the event's outcome (resolved = `success`, regressed = `critical`).

**Do:** Use for scan progress, notification delivery attempts, and remediation history.
**Don't:** Use for wide comparison across many entities — that's a Table's job; a Timeline with 40 unrelated entities interleaved is unreadable regardless of styling.

### 4.25 Notification Panel

Header-mounted, opens as a `Popover`-shell containing a scoped `Activity Feed` filtered to notifications, per `01_PRODUCT_BLUEPRINT.md` §4's header spec (notification bell). Unread items get a `--color-accent-emphasis` left-border accent; the bell icon carries a numeric badge (`Badge`, `info` variant, no severity color implied) for unread count, capped display at "9+".

### 4.26 Dashboard Widgets

Not a new primitive — every widget in `01_PRODUCT_BLUEPRINT.md` §8's Dashboard table is a `Card` (§4.12) containing one of: a `Chart` (§4.15/§7), a `Table` excerpt, a `Timeline`/`Activity Feed` excerpt, or a KPI block (large `heading-h1`/`mono-data` number + `TrendSparkline` + delta label). Widget-specific layout rules are in §6, not restated here.

## 5. File Upload

**Purpose.** Phase 2, well-known-file verification path fallback (`01_PRODUCT_BLUEPRINT.md` §7).

**Structure:** Dropzone with dashed `--color-border-default` border, centered upload icon (`--icon-lg`) + `body-md` instruction + `caption` file-type/size constraint. Drag-over state switches border to `--color-accent-primary` solid.

**States:** empty, drag-active, uploading (inline progress bar, per Progress Bars §7.7), success (filename + checkmark + remove action), error (per-file, e.g. wrong file type — shown inline under that file, not as a page-level toast, since multiple files can fail independently).

## 6. Dashboard Design Rules

Applies to `01_PRODUCT_BLUEPRINT.md` §8's Dashboard and, by the same rules, any future widget-composed screen (a CA-firm portfolio view, per `01`'s Future Scalability section, reuses this layout model unchanged).

**Widget sizing.** Follows a 12-column grid (§3.4). Security Health status: full-width or half-width depending on viewport, always the visually largest widget on the page. Action Required and AI Recommendations: half-width each on desktop, stacked full-width on mobile, always positioned directly below Security Health with no widget of lower priority interleaved above them. Everything else (Recent Activity, Assets Summary, Compliance Status, Quick Actions): third-width on desktop, in the priority order `01_PRODUCT_BLUEPRINT.md` §8 already specifies. No decorative or purely illustrative widget is given area equal to or greater than an actionable one — a chart earns its space only if a decision depends on it.

**Spacing.** `--space-section-gap` (24px) between widget groups, `--space-card-padding` (16px) inside each. Table-shaped widget content (e.g. a Recent Activity excerpt) uses tighter internal row spacing (`--space-cell-y` compact) than the surrounding Card padding, so a widget doesn't feel padded twice.

**Visual and information hierarchy.** Strictly matches the reading order `01_PRODUCT_BLUEPRINT.md` §8 specifies: status → action-required → trend/recommendations → everything else. This is enforced at the grid-order level (DOM order matches visual order, no `order` CSS property reordering that would desync from screen-reader reading order).

**Card layouts.** One primary metric or list per Card — a Card that tries to show a KPI *and* a table *and* a chart simultaneously has a hierarchy bug and should split into two Cards. Card titles are always `heading-h3`, always top-left, never centered (centered titles read as marketing, not operational tooling).

**Table layouts within dashboard widgets.** Truncated to 3–5 rows with a "View all" link to the full screen (Findings, Scans) rather than a scrollable mini-table — a scrolling table inside a non-scrolling dashboard is a common source of accidental page-scroll hijacking on trackpads.

**Chart layouts.** See §7. On the dashboard specifically: no chart exceeds one widget's Card bounds, and the Risk Score trend is the only chart permitted above the fold at Dashboard-default density, consistent with the single-gauge rule in §7.7 (KPI + delta + sparkline everywhere else).

**Filter and search placement.** None at the Dashboard level, by explicit product decision (`01_PRODUCT_BLUEPRINT.md` §8: "Filtering belongs to Findings and Scans"). This is a content rule, not just a layout one — no filter UI should be added to Dashboard even as a convenience, since it duplicates a decision the product blueprint already made deliberately.

**Toolbar design.** Where a screen has a toolbar (Findings List's filter bar, Assets' bulk-action bar), it's a fixed-height row (`--control-height-md`) directly above the table, left-aligned filters, right-aligned actions/search, sticky beneath the page header on scroll.

**Quick actions.** Rendered as a small Card of `ghost`-variant buttons with leading icons (Run Scan Now, Invite Team Member), never as a dropdown menu — these are the highest-frequency actions on the screen and shouldn't cost an extra click to reveal.

**Keyboard navigation.** Tab order follows visual/DOM order (hierarchy above). Every widget's primary click-through target is reachable via Tab and activatable via Enter; widgets with internal interactive elements (a Quick Actions Card's multiple buttons) are a single Tab stop into the group, then arrow-key or continued Tab through the group's own items, consistent with the Command Palette's keyboard pattern (§4.6).

**Dense data presentation.** Applies to table-shaped and list-shaped dashboard content only — summary/status widgets stay spacious regardless of how dense the rest of the screen is, per the "dense vs. spacious is task-dependent, not a style preference" principle this system follows. Making every widget equally dense removes the exact hierarchy §2 requires.

**Progressive disclosure.** Dashboard → full list screen (Findings, Scans, Assets) → detail page/Drawer is the fixed three-layer depth for every entity type on this dashboard, matching the table + drawer + deep page pattern. No entity type gets a fourth layer of nested disclosure; if a screen needs one, that's a sign the entity needs its own top-level nav item instead.

**Responsiveness.** Per `02_FRONTEND.md` §11 and `01_PRODUCT_BLUEPRINT.md` §8: single-column stack on mobile in the same priority order as desktop, not a naive reflow of the desktop grid. Widgets that are inherently list/table-shaped collapse to their mobile Card-list pattern (§4.14's row-to-card transform) rather than a horizontally-scrolling table, which is never an acceptable mobile pattern in this system.

## 7. Data Visualization

Charts support decisions, not decoration. Every chart type below states when to use it, when not to, the common mistake it's prone to, and its interaction/accessibility contract. All charts render through `DataChart` (§4.15).

### 7.1 Line / Area Charts

**Use for:** Trend over continuous time — Risk Score history, 90-day compliance posture.
**Don't use for:** Per-run comparison where the question is "which scan had more findings," not "what's the trajectory" — that's a Bar Chart question.
**Common mistake:** Combining too many series on one line chart (e.g. all four severity levels plus the aggregate score) until no single trend is readable. Cap at 2–3 series per chart; use small multiples (§7.4) beyond that.
**Interaction:** Hover shows a `Tooltip` with the exact value and date at that point (`mono-data` for the number). No drill-down from a line chart directly — clicking a point navigates to the relevant Scan Detail page, it doesn't expand in place.
**Legend:** Only shown when more than one series is present; positioned above the chart, not overlapping the plot area.
**Loading/empty:** Shape-matched `Skeleton` (§4.21); empty state (no scans yet) uses the standard `EmptyState` component, not a flat empty axis.
**Accessibility:** Text summary (§4.15) states the direction and magnitude of the trend in one sentence ("Risk score decreased from 62 to 41 over the last 30 days"), not just axis labels.

### 7.2 Bar Charts (vertical, horizontal, stacked)

**Use for:** Category comparison — Findings by Severity (horizontal, stacked or segmented count row), per-scan finding counts.
**Don't use for:** More than ~7 categories in a single bar group before it becomes a label-reading exercise rather than a comparison; beyond that, a Table is clearer.
**Common mistake:** Using a Pie/Donut instead when exact comparison matters — a stacked or segmented bar communicates "12 critical vs. 3 high" far faster than two wedge sizes.
**Interaction:** Click a segment/bar to filter the linked Findings List by that severity/category — this is the one chart type in the system with a direct drill-down affordance, since severity-segmented bars exist specifically to feed triage.
**Legend:** Inline segment labels preferred over a separate legend block wherever the bar is wide enough; falls back to a legend only at narrow/mobile widths.
**Accessibility:** Each segment has a text label baked into the SVG (not color-only), satisfying §8 without relying on the chart's text summary alone.

### 7.3 Pie / Donut Charts

**Use for:** A single proportional split with 2–3 categories where the *relative share*, not the exact count, is the point (e.g. a coarse "verified vs. unverified assets" glance inside a small summary Card).
**Don't use for:** Findings by severity, compliance clause status, or anything with 4+ categories or where exact values matter. This is a common mistake in this domain. Compliance Status uses a checklist + progress bar (§7.9), never a donut.
**Common mistake:** Reaching for a donut as a default "make it look like a dashboard" choice. In this system it is the least-used chart type, deliberately.

### 7.4 Small Multiples

**Use for:** Comparing several severity bands' trends over time side by side without overplotting a single combined line chart.
**Don't use for:** Fewer than 3 series — at that point one combined chart with a legend is simpler.
**Interaction:** Each multiple is independently hoverable; no cross-multiple synchronized tooltip at MVP (adds complexity with limited payoff at current screen scope).

### 7.5 Scatter Charts

**Use for:** Two-dimensional correlation exploration — not currently required by any Tier 1/2 screen in `01_PRODUCT_BLUEPRINT.md`. Included for completeness should a future analytics surface (e.g. CVE severity vs. age) need it.
**Don't use for:** Anything with a clearer categorical or temporal framing — default to Bar or Line first and only reach for Scatter if the data genuinely has two independent continuous axes worth correlating.

### 7.6 Heatmaps

**Use for:** Density/frequency across two categorical axes at a glance — a plausible future Audit Log "activity by day-of-week × hour" view.
**Don't use for:** Any use case where a specific cell's exact value needs to be read precisely; heatmaps communicate pattern, not precision — pair with a Table for the precise version if both are needed.
**Accessibility:** Heatmaps are the hardest chart type in this system to make color-blind-safe; a heatmap ships only with an accompanying text/table equivalent, not color intensity alone (§8).

### 7.7 Status Indicators, Progress Bars, Gauges

**Status Indicators:** A colored dot/icon + text label (never dot alone), the atomic unit behind AgentStatusList and Security Health.
**Progress Bars:** Determinate only (scan progress with known step count, DPDP clause pass-rate); never used to represent an indeterminate wait — that's a `Skeleton` or spinner's job (§4.21).
**Gauges:** Used exactly once in the system — `RiskScoreGauge`, a 270° radial arc (not a full circle — full-circle gauges waste the top quadrant on nothing) built on Recharts' `RadialBarChart` per `02_FRONTEND.md` §9, colored by `-solid` status token matching the current band, with the numeric score in `display-lg`/`mono-data` centered inside the arc. Appears on First Report Reveal and Dashboard, secondary to the Security Health status text per `01_PRODUCT_BLUEPRINT.md` §8. Not extended to any other numeric widget — every other KPI in the system (Assets Summary count, Compliance pass-rate, Notification delivery rate) uses a plain `mono-data` number with a `TrendSparkline`, since a gauge's fixed 0–100 arc only earns its screen space where the number has a meaningful band structure the arc itself communicates.

### 7.8 Tables as Visualization

If the task is exact record lookup, a Table beats a chart regardless of how visually rich the alternative is. Findings, Assets, Scans History, Audit Log, and Notifications Log are all Tables first — see §4.14. This is stated explicitly here because "data visualization" is often misread as "replace tables with charts"; in this system, the correct visualization for most entity lists is a well-built Table, not a chart at all.

### 7.9 Compliance Progress

**Structure:** Checklist grid (one row per DPDP clause per `04_AGENT_PIPELINE.md` §8) with a `pass`/`fail`/`n/a` status icon+color per row (never color alone), plus a single aggregate progress bar showing pass-rate across all evaluated clauses. No donut, no gauge — compliance is section-based and status-based, not a single continuous number.
**Interaction:** Clicking a clause row expands inline (Accordion, §4.11) to show evidence and the Claude-generated narrative snippet for that clause, rather than navigating away — keeping the whole checklist scannable in one view.

### 7.10 Security Findings (as a visualization concern)

Findings are represented across three components depending on context, never invented as a fourth: `Table` for the full triage list, `FindingCard` (`Card` variant, §4.12) for Dashboard/First Report Reveal summaries, and severity-segmented `Bar Chart` (§7.2) for the aggregate count. All three read from the same severity token set (§3.1) so a finding's color meaning never shifts between contexts.

### 7.11 Audit Logs

**Structure:** Dense `Table` (compact density default, §4.14) with a `Timeline`-style date-range filter above it, following the dense-table-plus-detail-drawer pattern (§4.14, §4.18). Row click opens a `Drawer` with the full event payload in `JSONViewer` (`mono-block`), not a chart — audit work is event-specific, not pattern-specific.
**Don't use:** Any chart as the primary audit interface; a volume-over-time sparkline is acceptable as a secondary summary above the table, never as a replacement for the row-level record.

### 7.12 Risk Matrix

Not present in the current MVP/Phase 2 screen inventory (`01_PRODUCT_BLUEPRINT.md` §3 has no screen calling for a likelihood×impact grid). If introduced in a future phase, it follows the Heatmap pattern (§7.6): pattern-first visualization, paired with a text/table equivalent, never the sole representation of a risk decision — consistent with Rules-before-LLM's requirement that no visualization implies a judgment the deterministic rules engines didn't actually make.

## 8. Accessibility

Extends `02_FRONTEND.md` §12's WCAG 2.1 AA target with the specific token- and component-level thresholds that make it achievable, not a restatement of the target itself.

| Requirement | Rule |
|---|---|
| Contrast | Body text (`body-md`, `body-sm`) ≥ 4.5:1 against its background token. Large text (`heading-h1`–`h3`, 18px+) ≥ 3:1. All status-token text/background pairs in §3.1 are pre-verified to meet 4.5:1 in both themes — a new status color is not added without checking this first. |
| Focus ring | 2px `--color-focus-ring`, 2px offset, on every interactive element without exception; never removed without an equal-or-stronger replacement; this is one of the most common enterprise-dashboard accessibility failures. |
| Keyboard navigation | Every control reachable via Tab, every action triggerable without a mouse — stated per-component above where a specific pattern applies (Command Palette §4.6, Tabs §4.10, Accordion §4.11), and true as a system-wide default even where not restated. |
| Touch targets | Minimum 40×40px for any tappable control, achieved via padding around a visually smaller icon/control where needed (Checkbox, icon buttons) rather than inflating the visual size itself. |
| ARIA | Live regions (`aria-live`) on: form errors, toast notifications, scan/agent status changes, search loading state. Dialogs/drawers: `role="dialog"`, `aria-modal`, labelled, focus-trapped, focus-restored on close. Icon-only controls: `aria-label`. |
| Color-blind safety | No status, severity, or state is ever communicated by color alone anywhere in this system — every instance pairs color with an icon, text label, or pattern. This is enforced at the token level (§3.1's fixed icon+label pairing per status) so it can't be silently dropped by a component that only reads the color token. |
| Reduced motion | Every non-essential transition (hover states, drawer/dialog open-close easing, skeleton shimmer, agent-status transitions) gates on `prefers-reduced-motion` per `02_FRONTEND.md` §10's `useReducedMotion` mechanism; the risk score number specifically never animates on load regardless of motion preference, per that same section's rule. |

## 9. Design Decisions

- **Geist Sans deprecated; DM Sans / Inter / JetBrains Mono is canonical** (§1), per explicit direction. Applies retroactively to this document and forward to `06_DEVELOPMENT_GUIDE.md` and `07_SECURITY_COMPLIANCE.md`.
- **Color system redesigned around ink-navy + Signal Cyan** (§3.1), replacing the earlier near-black/Signal Blue pairing with a more distinctive, deliberately non-generic enterprise-SOC identity, and expanding both the dark and light semantic scales to be independently tuned rather than a mechanical light/dark inversion of one set of values.
- **Findings `previous_status`-driven "regressed" row styling** (§4.14) is a Table row-state, not a sixth Badge status — matches the schema decision in `03_BACKEND.md` §4.2 (regression is computed, not stored as a distinct enum value); the design system follows that data shape rather than introducing a visual state the backend has no matching field for.
- **RiskScoreGauge is the system's one gauge**, scoped to Risk Score specifically because the arc communicates band structure a plain KPI can't; every other numeric widget uses `mono-data` + `TrendSparkline` (§7.7).
- **Density toggle scoped to two screens only** (§4.14) — Findings List and Audit Log — rather than a system-wide table preference, since every other table in the inventory has row counts too small for density to matter, and a global density setting with no visible effect on most screens would be a confusing control to expose.

---

Owner: Qelvix Engineering Team
