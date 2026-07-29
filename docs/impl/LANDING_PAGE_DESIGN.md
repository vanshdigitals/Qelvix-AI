# Landing Page — Visual Design Specification

**Status:** Living document. Source of truth for the Landing Page build (F14 / S18).
**Authority:** Subordinate to `01_PRODUCT_BLUEPRINT.md` §6 (section inventory, order, states, SEO, responsive) and `05_DESIGN_SYSTEM.md` §1–§3 (typography, tokens). Where this document appears to add a value, it is composing existing tokens, never introducing new ones — except in §16, which lists the two proposed amendments this design requires and cannot proceed without.

This document contains no code. Token names (`--color-bg-canvas`, `display-xl`) are the design system's vocabulary and are cited so the implementer never guesses a value.

---

## 0. How to read this

Every section below carries the same thirteen fields, in the same order: Purpose · Layout · Spacing · Typography · Illustration · Photography · Lighting · Hierarchy · Motion · Interactions · Responsive · Accessibility · Implementation notes. A field reading "None" is a decision, not an omission — it means that section deliberately has no photography, no illustration, or no entry animation, and adding one is a deviation.

**The rule that outranks everything here:** `05` §2 principle 1 — clarity over decoration. Every motion and lighting treatment specified below is justified by what it does for comprehension. If an implementer finds one that isn't, it is cut, not negotiated.

---

## 1. Governing Decisions

Four decisions were taken before this design began. Three of them resolve conflicts against frozen documents and are recorded here so no reviewer has to re-derive them.

| # | Decision | Against | Consequence |
|---|---|---|---|
| **D1** | **Hybrid hero.** The domain input remains the first fixation and the page's primary object. Cinematic treatment — depth, lighting, motion — is applied *to and around the input*, never as a competing decorative canvas. | `01` §6 says "the scan input, not a headline," and "no illustration competing with the input." A short headline now sits above the input. | Requires **Amendment A-02** (§16). Not merge-legal until filed. |
| **D2** | **Light default on marketing, dark default in-app.** All pre-authentication surfaces default light. The authenticated product keeps dark per `02` §8. The boundary between them is designed, not incidental — see §14. | `02` §8 states dark is the default theme. | Requires **Amendment A-03** (§16). The in-app default is unchanged, so `09` F2's validation checklist still passes as written. |
| **D3** | **Dual-track depth, single narrative.** One continuous story. Plain language at the top, technical depth introduced progressively as the visitor scrolls. The page is never split into audience tracks. | `01` writes for a non-technical MSME owner. This preserves that at the top and adds depth below it. | No conflict. `01`'s FAQ and Problem copy register is retained verbatim in tone. |
| **D4** | **`01` §6 is the structural spine.** Its section order is preserved exactly. New concepts (AI agents, integrations, dashboard showcase) are absorbed into existing sections. No parallel sections are created. | — | No conflict. |

**Two things this design will not do**, decided and not open for override: no fabricated customer logos and no fabricated testimonials (`01` §6 is explicit — "placeholder section removed rather than faked"); and no design token invented outside `05` §3.

---

## 2. Narrative Architecture

The page is one argument, told in the order a skeptical business owner actually forms doubts. Each section answers exactly one question and hands off to the next.

| Order | Section | Question answered | Depth register |
|---|---|---|---|
| 1 | Announcement bar | Is anything happening right now? | Plain |
| 2 | Navigation | Where am I, where can I go? | Plain |
| 3 | Hero | What is this, and what do I do? | Plain |
| 4 | Problem | Why should I care? | Plain |
| 5 | Solution | How does this help me specifically? | Plain |
| 6 | Interactive demo | What will I actually see? | Plain → visual |
| 7 | How it works | What happens after I click? | Plain |
| 8 | Architecture & trust | Can I believe the output? | **Technical ramp begins** |
| 9 | DPDP readiness | Does this help me with the law? | Technical |
| 10 | Pricing preview | What does it cost? | Plain again |
| 11 | Social proof slot | Who else uses this? | *Deferred — see §11* |
| 12 | FAQ | My remaining objections | Plain |
| 13 | Final CTA | What do I do now? | Plain |
| 14 | Footer | Everything else | Plain |

**The depth curve.** Sections 3–7 require zero security knowledge. Section 8 is the hinge: it opens in plain language ("your risk score is never decided by AI guesswork") and descends into the agent pipeline and data sources for readers who continue. Section 9 stays technical. Section 10 returns to plain. A CTO who lands here finds their evidence in 8–9; an MSME owner never has to enter them to reach the CTA.

**Deviation from `01` §6 ordering:** none. `01` places the Interactive demo before How it works; that order is kept, even though a strict simple-to-technical ramp would invert them. Seeing the artifact before the process is the more persuasive sequence and `01` chose it deliberately.

---

## 3. Global Visual Language

### 3.1 The core motif — the Surface Field

One motif carries the entire page: **a lattice of nodes and edges representing an organisation's public attack surface.** Nodes are hosts, subdomains, certificates, records. Edges are relationships between them.

It appears in exactly four places, each time doing a different job:

1. **Hero** — drifting, unresolved, barely visible. "Something is out there and you haven't looked at it."
2. **Interactive demo** — resolved into real data. "Here it is, mapped."
3. **Architecture & trust** — annotated with which agent reads which node. "Here's how we know."
4. **Final CTA** — collapsed back to a single point, the input. "Start."

It appears nowhere else. A motif used in every section is wallpaper.

**Construction rules.** Nodes are circles at `--icon-xs` (12px) or smaller. Edges are 1px (`--border-thin`). The field is never denser than roughly 40 nodes on desktop — beyond that it reads as noise and stops meaning "your infrastructure." Node positions are generated once per page load and are stable during a session; a field that reshuffles on scroll reads as decorative.

**Opacity discipline.** Light theme: field renders at 6–8% opacity against `--color-bg-canvas`. Dark theme: 10–12%. The field must never compete with body copy for contrast — it sits below the text layer in every sense.

### 3.2 Colour strategy

Marketing surfaces use the light values from `05` §3.1 as default.

| Role | Light (marketing default) | Dark (marketing toggle) |
|---|---|---|
| Page canvas | `--color-bg-canvas` → `--fog-50` | `--ink-950` |
| Raised sections, cards | `--color-bg-surface` → `--white` | `--ink-900` |
| Recessed bands | `--color-bg-inset` → `--fog-50` | `--ink-950` over `--ink-900` |
| Primary text | `--color-text-primary` → `--fog-900` | `--white` |
| Secondary text | `--color-text-secondary` → `--fog-600` | `--ink-200` |
| Accent / CTA / links | `--color-accent-primary` → `--signal-600` | `--signal-500` |
| Focus ring | `--color-focus-ring` → `--signal-600` | `--signal-300` |

**Accent scarcity is the whole strategy.** Signal Cyan appears above the fold exactly once — on the hero input's submit control and its focus state. Everywhere else on the page it is rationed to one accent object per viewport-height. This is what makes the input win first fixation despite the headline being physically larger (D1): in a field of near-monochrome ink and fog, the single saturated object is where the eye lands. Size is not the only hierarchy lever, and here it is deliberately not the primary one.

**Severity colours are quarantined.** `--breach-*`, `--flare-*`, `--caution-*`, `--verified-*` appear only inside the Interactive demo and the Dashboard showcase, where they are showing real finding data. They never decorate a marketing section. A red accent on a pricing card would collide with the severity language the product depends on.

**Alternating section surfaces** create rhythm without card grids: canvas → surface → canvas → inset → canvas. Never two adjacent sections on the same surface unless separated by a full-bleed element.

### 3.3 Typography application

All values from `05` §1.1. No new scale steps.

| Use | Token | Notes |
|---|---|---|
| Hero headline | `display-xl` — 56/64, DM Sans 700 | The page's only `display-xl`. `05` scopes it to "Landing Page hero only." |
| Section headers | `display-lg` — 40/48, DM Sans 700 | Every major section |
| Sub-section headers | `heading-h2` — 24/32, DM Sans 600 | Within Architecture, DPDP, FAQ |
| Card / feature titles | `heading-h3` — 20/28, DM Sans 600 | Solution cards, pricing tier names |
| Primary reading copy | `body-lg` — 16/24, Inter 400 | All explanatory paragraphs |
| Supporting copy | `body-md` — 14/20, Inter 400 | Captions under demo, footnotes |
| Eyebrow labels | `label` — 13/16, Inter 500 | Uppercase, letter-spacing +0.08em, `--color-text-secondary` |
| Metadata, disclaimers | `caption` — 12/16, Inter 400 | DPDP disclaimer, pricing fine print |
| Technical evidence | `mono-data` / `mono-block` — JetBrains Mono | **Only** in Architecture §8 and the demo's evidence panel |

**The monospace rule is load-bearing.** Per `05` §1, the moment type switches to JetBrains Mono the reader is looking at deterministic machine output, not written persuasion. On this page that cue does real argumentative work in section 8: the rules-before-LLM claim is *demonstrated* by showing rule output in mono next to the AI explanation in Inter. Using mono anywhere else on the page — a stylised label, a "technical-looking" pricing detail — destroys that cue and is a review block.

**Measure.** Body copy never exceeds 68 characters per line. Centred paragraphs never exceed 56.

### 3.4 Spacing and rhythm

From `05` §3.2. Marketing rhythm uses `--space-12` (48px) as its base unit and `--space-16` (64px) for hero padding.

| Context | Desktop | Tablet | Mobile |
|---|---|---|---|
| Section vertical padding | 128px (`--space-16` × 2) | 96px | 64px (`--space-16`) |
| Gap between section header and content | 48px (`--space-12`) | 40px | 32px (`--space-8`) |
| Page side margin | 32px (`--space-page-margin`) | 24px | 20px |
| Grid gutter | 24px (`--grid-gutter`) | 24px | 16px |
| Container max | 1200px (marketing, per `--container-max`) | — | — |

Grid: 12 columns (`--grid-columns`). **Every section states its column span explicitly below.** Asymmetric spans are the primary tool for making sections feel distinct without changing the underlying system.

### 3.5 Motion system

All durations and easing from `05` §3.3. **No new motion tokens are introduced** — see §16 for the one exception being proposed.

| Token | Value | Applied to |
|---|---|---|
| `--duration-fast` | 120ms | Hover, focus, colour shifts |
| `--duration-base` | 200ms | Accordion, dropdown, tab change |
| `--duration-slow` | 320ms | Scroll reveals, section entries, demo transitions |
| `--easing-standard` | `cubic-bezier(.2,0,0,1)` | Every transition on the page |

**Principles.**

- **Entry, once.** Scroll reveals fire a single time per element per page load. Re-animating on scroll-up is nauseating and signals nothing.
- **Reveal shape.** Opacity 0 → 1 with a 16px upward translate, `--duration-slow`, `--easing-standard`. Staggered children at 60ms intervals, maximum 5 in a stagger group — beyond that the last item's delay becomes perceptible latency.
- **Trigger point.** Element enters at 15% into the viewport, not on first pixel. Firing at the edge means the animation completes before the user has actually looked at it.
- **No parallax on text.** Ever. Parallax is permitted only on the Surface Field motif, at a maximum 0.15 scroll-rate differential.
- **No scroll-jacking, no scroll-driven scrubbing of long sequences.** The user owns the scrollbar.
- **`prefers-reduced-motion` is not a degraded path.** Per `02` §10, every non-essential transition is gated. Under reduced motion: reveals become instant opacity 0 → 1 at `--duration-fast`, the Surface Field becomes a static render with no drift, and the demo's auto-advance stops with manual controls remaining. The page loses nothing in comprehension.
- **The risk score never animates.** Per `02` §10 and `01`'s framing — no count-up, no fill sweep, anywhere the demo shows a score. This is a product-integrity rule, not a stylistic one: manufacturing drama around a number a business owner is already anxious about is exactly what the product refuses to do.

---

## 4. Section — Announcement Bar

**Purpose.** Surface one time-sensitive message (a DPDP Act update, or a limited free-scan window) without ever obstructing the CTA below it.

**Layout.** Full-bleed, 12/12. Single row, content centred, dismiss control right-aligned at the container edge. Height 40px desktop, 44px mobile (touch target).

**Spacing.** 12px vertical padding (`--space-3`), 32px side margin matching page margin. 8px gap between message text and inline link.

**Typography.** `body-sm` (13/18 Inter 400). Inline link at same size, weight 500, underlined. No bold, no uppercase — this is the least important element on the page and must look it.

**Illustration.** None. **Photography.** None. **Lighting.** Flat. No gradient, no shadow — the bar sits in the same plane as the page.

**Hierarchy.** Deliberately lowest. Surface is `--color-bg-inset`, text `--color-text-secondary`. It should be legible and ignorable in the same glance.

**Motion.** Entry: none on first paint — it is present in the initial render, not animated in. Dismiss: collapse height to 0 with opacity fade, `--duration-base`, `--easing-standard`; content below reflows smoothly rather than jumping. Hover on link: colour to `--color-accent-primary`, `--duration-fast`.

**Interactions.** Dismissible. Dismissal persists for the session. **Only one message at a time** — `01` §6 is explicit: no carousel, no rotation within a single view. If multiple messages are queued, the highest-priority one shows and the others do not.

**Responsive.** Below 640px: message truncates to a single line with ellipsis; the full text is never wrapped to two lines here, because a two-line announcement bar pushes the hero input below the fold on small phones, which is the one outcome this page cannot accept. If the message cannot fit, it is shortened at authoring time, not wrapped.

**Accessibility.** `role="region"` with an accessible name. Dismiss control is a real button with a visible label to screen readers ("Dismiss announcement"), minimum 44×44px hit area even though the visual glyph is smaller. Not `aria-live` — it is present at load, not injected.

**Implementation notes.** Never blocks or overlays the hero. When present, the sticky nav's offset accounts for it so nothing is occluded on scroll.

---

## 5. Section — Navigation

**Purpose.** Orient, and keep the primary CTA reachable at every scroll position.

**Layout.** Full-bleed bar, contents constrained to 1200px. Three zones: logo lockup (left), nav links (centre, desktop only), auth actions + theme toggle (right). Height 64px desktop, 56px mobile.

**Logo lockup — fixed, non-negotiable.** Left zone always contains the **icon mark** (`Logo Qelvix Only Black.png`), then **10px** of spacing, then the **wordmark** (`Text Qelvix Logo Only Black.png`). Two separate image assets, side by side, vertically centre-aligned on their optical centres.

- The two assets are **never merged, never redesigned, never substituted**.
- The combined asset (`Qelvix Logo black.png`) is **forbidden in the header**. It appears only in the footer brand block (§15) and on the About page.
- **Dark theme:** both marks render white via a CSS filter applied to the image elements. The source PNGs are never edited, never duplicated as white variants, never swapped for a different file.
- Icon mark height 28px desktop / 24px mobile. Wordmark scales to match optical weight, not to equal pixel height.
- The lockup is wrapped in a single link to `/`, with one accessible name ("Qelvix, home") — not two adjacent links reading the brand name twice.

**Spacing.** 32px between nav link items. 16px between right-zone controls. 24px minimum between the centre nav group and either side zone.

**Typography.** Nav links `body-md` (14/20 Inter 400), `--color-text-secondary`. Active/hovered → `--color-text-primary`. Login link `body-md` weight 500. CTA button label uses `button` token (14/20 Inter 600).

**Illustration.** None. **Photography.** None.

**Lighting.** At scroll position 0: fully transparent, no border, no shadow — the nav floats over the hero's Surface Field. After 24px of scroll: background becomes `--color-bg-surface` at 88% with a backdrop blur, plus a 1px `--color-border-subtle` bottom border. No drop shadow — the border alone is the separation, per `05`'s restraint on elevation.

**Hierarchy.** The CTA button is the only filled element in the bar and the only accent colour. Logo second. Links third and visually quiet.

**Motion.** Scroll state change: background opacity, blur and border fade in over `--duration-base`, `--easing-standard`. Never a height change or a logo resize on scroll — layout shift in a sticky header is disorienting and costs CLS. Link hover: colour only, `--duration-fast`, no underline slide, no scale.

**Interactions.** Sticky from the first scroll pixel, always visible (`01` §6: "CTA always visible"). Links: Product, Pricing, Docs. Right: theme toggle, Login, primary CTA. Nav links that target on-page sections scroll smoothly with the sticky-header offset accounted for, and update the URL fragment.

**Responsive.**
- **≥1024px:** full three-zone layout.
- **768–1023px:** centre nav collapses into a menu control; logo lockup and CTA remain visible.
- **<768px:** icon mark + wordmark still both present (the lockup rule holds at every breakpoint), menu control right, CTA button visible but reduced to `--control-height-sm` with a shortened label. **The CTA is never hidden behind the menu.**
- Mobile menu: full-height panel sliding from the right, `--duration-base`. Focus trapped, `Escape` closes, focus returns to the trigger.

**Accessibility.** `<nav>` landmark with accessible name. Menu control is `aria-expanded` + `aria-controls`. Keyboard operable throughout; visible focus ring using `--color-focus-ring` at `--border-thick`. Sticky nav never covers a focused element — scroll-margin accounts for its height. Theme toggle announces its action, not its state ("Switch to dark theme").

**Implementation notes.** The nav is a Client Component (scroll listener, menu state, theme toggle) per `02` §6's conditions. Everything else on this page defaults to Server Components.

---

## 6. Section — Hero

**Purpose.** Get a domain into the scan box. This section has exactly one job and every decision below serves it.

### Composition

Centred, single column, 8/12 on desktop (2-column offset each side). Vertical order:

1. **Eyebrow** — `label`, uppercase, `--color-text-secondary`. One short line of context.
2. **Headline** — `display-xl` (56/64 DM Sans 700), `--color-text-primary`, max 2 lines, max 48 characters. One emotional idea, plain language. *Reference register: "Know what the internet already knows about your business."* Final copy is a copywriting deliverable, not a design one; the constraint is length and register.
3. **The input** — the hero object. Full spec below.
4. **Promise line** — `body-lg`, `--color-text-secondary`, one line: the free / no-card / under-a-minute promise from `01` §6.
5. **Secondary action** — a quiet text link, `body-md` weight 500, accent-coloured, no button chrome: "See a sample report ↓" scrolling to the Interactive demo.

**The two CTAs** (per the brief) are the input's submit button (primary, filled, accent) and this text link (secondary, unadorned). The secondary action is deliberately not a second button — two buttons of comparable weight above the fold split intent, and `01` §6's entire argument is that intent must not be split here.

### The input — first fixation

This is how D1 is honoured. The headline is physically larger; the input wins the eye through four channels simultaneously:

1. **Colour.** The submit control is the only saturated `--color-accent-primary` object above the fold. Everything else is ink, fog, and white.
2. **Motion.** It is the only element with continuous, subtle movement (the Surface Field converging on it). Motion beats size for attention capture.
3. **Elevation.** The only element carrying `--shadow-md`. The headline sits flat on the canvas.
4. **Proximity.** It sits immediately below the headline with only 32px of separation, so the eye's path from headline to input is a single short saccade rather than a scan.

**Input specification.** Height `--control-height-lg` (48px). Max-width 560px, centred. Radius `--radius-md` (8px). Border 1px `--color-border-strong`, becoming 2px `--color-focus-ring` on focus. Left: a small globe/domain icon at `--icon-md`, `--color-text-muted`. Placeholder: a real-looking domain example, `--color-text-muted`. Right: the submit button, inset 4px within the field, `--control-height-md` (40px), filled `--color-accent-primary`, label in `button` token.

### Fields

**Illustration — the Surface Field.** The hero's cinematic layer, and the only illustration above the fold. Roughly 30–40 nodes on desktop, drifting on independent slow paths (a full drift cycle takes 40–60 seconds; movement should be barely perceptible when watched directly and clearly present in peripheral vision). Renders at 6–8% opacity light / 10–12% dark. Occupies the full hero bleed but is **masked to fade to zero opacity within 120px of the text column**, so it never sits behind body copy.

**Photography.** None. `01` §6 forbids anything competing with the input; a photograph would be the single worst offender.

**Lighting.** Light theme: a soft, very low-contrast radial warmth originating behind the input and falling off within ~400px — a suggestion of the input being lit, not a visible gradient blob. Dark theme: the same radial becomes a cool `--signal-500` glow at ≤6% opacity. In both themes this is the only lighting effect above the fold. No aurora sheets, no volumetric god-rays, no mesh gradients — those read as decoration, and `05` §2 principle 1 cuts them.

**Hierarchy.** Input → headline → promise line → eyebrow → secondary link → Surface Field. Note the input outranks the headline; that ordering is the design.

### Motion — the reveal sequence

The hero's cinematic quality lives entirely in a four-state sequence tied to the user's actual progress. Every state does functional work.

| State | Behaviour |
|---|---|
| **Rest** | Field drifts slowly. Input at rest. Nothing demands attention. |
| **Focus** (input focused) | Over `--duration-slow`: nodes ease inward roughly 8% toward the input's centre; edge opacity rises ~40%; the input's border transitions to the focus ring. Reads as the system orienting toward the user. |
| **Valid domain entered** | A single node illuminates to `--color-accent-primary` and a thin connector draws from it toward the input over `--duration-slow`. One node, not many. "We can see you." |
| **Submit** | Field converges to the input's centre and dissolves; the input transitions to its loading state. This is the visual handoff into signup. |

**Entry animation (page load).** Staggered reveal: eyebrow → headline → input → promise line, 60ms apart, `--duration-slow`, opacity + 16px rise. The Surface Field fades in last, over 800ms, so the text is readable before anything moves. **The input is interactive from first paint** — never gated behind the entry animation completing.

**Reduced motion.** Field renders static, no drift, no convergence. Focus and valid states become instant colour changes. The submit handoff becomes a plain loading state. The section loses nothing functional.

### Interactions

- Inline domain-format validation, per `01` §6. Error appears **below the field as inline text**, never as a toast — `01` is explicit that field-level errors are not toasts.
- Loading: input disables, submit shows a spinner, re-submission blocked while the lightweight format/reachability pre-check runs. This is the pre-check, **not the scan** — copy must not imply scanning has begun.
- Success: routes to Signup with the domain pre-filled. The user never retypes it.
- `Enter` submits from anywhere in the field.

**Responsive.**
- **≥1024px:** as specified. Hero occupies roughly 88vh, never a forced 100vh.
- **768–1023px:** headline drops to `display-lg` (40/48). Input max-width 480px. Field node count reduces to ~24.
- **<640px:** headline `display-lg`, max 3 lines. **Input goes full-width** (`01` §6) minus page margins, with the submit button moving *below* the field as a full-width button rather than inset — a 40px inset button beside text input on a 360px screen leaves too little room for a domain. Field reduces to ~12 nodes at reduced opacity. Vertical padding 64px.
- Hero content stays above the fold on a 667px-tall viewport with the announcement bar present. This is a hard constraint and takes precedence over any spacing value above.

**Accessibility.** The input is a labelled form field — visible label may be visually hidden, but the accessible name is explicit, never placeholder-only. Validation errors use `aria-describedby` and `aria-invalid`. The pre-check state announces via `aria-live="polite"` (`02` §12). The Surface Field is decorative: `aria-hidden`, not focusable, no semantic content. Headline is the page's single `<h1>`. Focus ring on the input meets `--border-thick` at 3:1 against both adjacent surfaces.

**Implementation notes.** Client Component (form state, validation, animation). The Surface Field renders on a canvas layer, dynamically imported so it never blocks first paint, with the hero fully functional before it loads. Field animation pauses when the hero scrolls out of view — an off-screen animation loop is pure battery cost. LCP element is the headline; it must not be render-blocked by the field.

---

## 7. Section — Problem

**Purpose.** Recognition, not information. Per `01` §6, this section's job is to make the visitor think "yes, that's true of me" — three things they already suspect but haven't confirmed.

**Layout.** Asymmetric, deliberately breaking the hero's symmetry. Section header spans columns 1–5. The three statements stack vertically in columns 6–12, each as a full-width row with a generous 64px gap between them. **Not a three-card grid** — `01` calls this "not a features list," and three equal cards is the visual grammar of a features list.

**Spacing.** 128px section padding. 48px between header and first statement. 64px between statements. Each statement's internal leading: 16px between its line and any supporting text.

**Typography.** Section header `display-lg`. Each of the three statements set in `heading-h2` (24/32 DM Sans 600) — large enough to read as a claim, not body copy. No supporting paragraph under any of them; a statement that needs explaining isn't recognition.

**Illustration.** Minimal and structural: a 1px rule to the left of each statement in `--color-border-default`, with a small node glyph at its top — a fragment of the Surface Field, unresolved. Three fragments, three unknowns. Nothing more.

**Photography.** None.

**Lighting.** Flat. Surface is `--color-bg-canvas`. This section should feel plain and slightly cold — it is the low point of the emotional arc and should not be visually comforted.

**Hierarchy.** The three statements are peers; none is emphasised over the others. The section header is subordinate to them.

**Motion.** Entry: statements stagger in at 80ms intervals (slightly slower than the standard 60ms — the pacing should feel deliberate, like three separate realisations). Opacity + 16px rise, `--duration-slow`. The left rule draws downward from its node over `--duration-slow`, `--easing-standard`, synchronised with its statement. No hover state — these are not interactive.

**Interactions.** None. This section is read, not used.

**Responsive.** Below 1024px the header moves above the statements, full width; statements go full width with 48px gaps. Below 640px, statements drop to `heading-h3` (20/28) and gaps to 40px. The left rule persists at all breakpoints — it is the section's only structure.

**Accessibility.** Statements are a semantic list. The decorative rule and node are `aria-hidden`. Contrast: `heading-h2` at `--color-text-primary` clears AA comfortably in both themes.

**Implementation notes.** Server Component. Copy is fixed and comes from `01` §6's three statements — the exact framing there is the deliverable, not a starting point.

---

## 8. Section — Solution

**Purpose.** Answer each of the three problems, one to one, in the same order, so the visitor never loses the thread (`01` §6).

**Layout.** **Structurally mirrors the Problem section** — this mirroring is the point. Header now spans columns 8–12 (flipped from Problem's 1–5); the three answers occupy columns 1–7. The visitor's eye moves from right-weighted to left-weighted, which registers as a turn in the argument without requiring a word of explanation.

Each answer is a row: a small accent-coloured index numeral, the answer headline, and one supporting line.

**Spacing.** 128px section padding. 64px between answers. 12px between an answer's headline and its supporting line.

**Typography.** Header `display-lg`. Answer headlines `heading-h3` (20/28 DM Sans 600) — deliberately *smaller* than the Problem statements, because answers should feel calm and specific where problems felt large and vague. Supporting line `body-lg`, `--color-text-secondary`, max 68 characters. Index numerals `label`, `--color-accent-primary`.

**Illustration.** The Surface Field fragments from the Problem section reappear — now **resolved**: the same node glyphs, connected by complete edges, rendered at full section opacity rather than as broken fragments. Direct visual answer to the Problem section's incompleteness.

**Photography.** None.

**Lighting.** Surface steps up to `--color-bg-surface` (white in light theme). The section is literally brighter than the one above it. A single soft `--shadow-sm` on the surface edge lifts it off the canvas. This is the page's first moment of relief and the lighting carries it.

**Hierarchy.** Answers → header → supporting lines → illustration.

**Motion.** Entry: answers stagger at 60ms. The connecting edges between resolved nodes draw in left-to-right over `--duration-slow` as the section enters — completing the lines the Problem section left broken. This is the single most important motion beat on the page after the hero, because it animates the argument itself. Fires once.

**Interactions.** None.

**Responsive.** Below 1024px: header above, full width, answers stacked full width. Below 640px: index numerals move inline with headlines rather than sitting in their own column, to preserve reading width.

**Accessibility.** Ordered list markup — the one-to-one correspondence with Problem is semantic, not just visual. Index numerals decorative and `aria-hidden` (the list provides numbering). Edge-drawing animation `aria-hidden` and fully gated by reduced-motion.

**Implementation notes.** Server Component. The Problem and Solution sections share the node-position data so the fragments genuinely match — this is a real data dependency, not a visual approximation.

---

## 9. Section — Interactive Demo

**Purpose.** Show the actual product interface with a real, pre-run scan result. Per `01` §6: real, not fabricated, and the real dashboard UI, not a mockup.

**Layout.** Full-bleed section. Header centred, 6/12. Below it, the demo viewport at 10/12 with a subtle perspective treatment: the product frame sits at a slight 3D tilt (≤4° on the X axis) at rest, easing to flat 0° as it scrolls to centre. Enough depth to feel like an object, not so much that the UI becomes hard to read.

**Spacing.** 128px section padding. 64px between header and viewport. 24px internal padding on the frame chrome.

**Typography.** Header `display-lg`. Caption below the viewport `body-md`, `--color-text-secondary`, stating plainly that this is a real scan of a placeholder domain. All type *inside* the demo is the product's own — `body-md`, `mono-data`, severity badges — because it is the product.

**Illustration.** The Surface Field appears here **fully resolved into real data** — this is the demo's asset map. Third and most literal appearance of the motif.

**Photography.** None. The product frame is a rendered UI surface, never a photograph of a laptop or a person at a desk. Device mockups with photographic bezels are precisely the generic-SaaS grammar this design avoids.

**Lighting.** The frame carries `--shadow-lg` — the heaviest elevation on the page, used exactly once. A very soft accent-tinted ambient glow beneath the frame at ≤8% opacity grounds it. In dark theme the glow is `--signal-500`; in light theme it is a neutral cool shadow with no colour cast, because a cyan glow under a white UI on a white page reads as a rendering error.

**Hierarchy.** The demo viewport dominates the section completely. Header and caption are service copy.

**Motion.** Frame tilt eases from 4° to 0° across the scroll range, tied to scroll position — the one place scroll-linked motion is permitted, because it makes the object feel physical. Maximum 0.15 rate differential. Inside the demo: a slow auto-advance between two or three views (asset map → findings list → a single finding detail), `--duration-slow` cross-fades, roughly 4s per view, **pausing on hover and on focus**, and stopping permanently once the user interacts manually. **The risk score does not animate** — no count-up, no gauge fill.

**Interactions.** Manual controls (previous/next, or view tabs) always present, never hover-revealed — per `02` §12, no action exists only behind hover. Auto-advance stops permanently on first manual interaction. The demo is a display surface: it does not accept a domain or trigger a real scan.

**Responsive.** Per `01` §6: **below 640px the live widget becomes a static annotated screenshot.** This is a documented requirement, not an optimisation — a demo requiring pinch-zoom isn't a demo. The static version carries 2–3 short callout annotations pointing at the risk score, a severity badge, and the plain-language explanation. Between 640–1023px: live demo retained, tilt removed, auto-advance retained, frame padding reduced.

**Accessibility.** The demo is content, not decoration. Each view has a text alternative describing what it shows. Auto-advance respects `prefers-reduced-motion` (stops entirely). Controls are real buttons, keyboard operable, with visible focus. View changes announce via `aria-live="polite"`. Any severity shown carries its text label, never colour alone (`05` §8, INV-28). Static mobile screenshot carries full descriptive alt text.

**Implementation notes.** Data comes from a genuine pre-run scan of a placeholder domain, committed as a fixture — never generated at request time and never fabricated. The demo reuses the real product components (`SeverityBadge`, `FindingCard`, `RiskScoreGauge`), which is what makes it trustworthy and also enforces INV-22: no second implementation of a component that already exists. Dynamically imported, below-fold, never blocking LCP.

---

## 10. Section — How It Works

**Purpose.** Three steps: verify your domain → we scan continuously → you get plain-language alerts. Maps exactly to the onboarding sequence, so what is promised here is precisely what happens next (`01` §6).

**Layout.** Horizontal three-step sequence on desktop, 12/12, each step 4 columns, connected by a continuous 1px rule running through the step markers. Vertical on mobile with the rule running down the left. **The connecting line is the design** — three disconnected cards would lose the sense of sequence entirely.

**Spacing.** 128px section padding. Steps separated by 32px gutters. 24px between a step's marker and its title, 12px between title and description.

**Typography.** Header `display-lg`. Step numerals `label` in `--color-accent-primary`. Step titles `heading-h3`. Descriptions `body-md`, `--color-text-secondary`, maximum two lines each — a step needing three lines is not a step.

**Illustration.** One Lucide glyph per step at `--icon-lg` (24px), sitting on the connecting rule inside a circular surface-filled marker with a 1px border. Icons follow `05` §3.5's one-icon-per-meaning rule: the icon used for "verify" here is the same icon used for verification everywhere in the product.

**Photography.** None.

**Lighting.** Recessed band — `--color-bg-inset`. Sitting lower than the Solution section above and the Architecture section below, it reads as a procedural interlude between two persuasive sections. Flat, no shadows.

**Hierarchy.** The sequence as a whole outranks any individual step. No step is emphasised.

**Motion.** Entry: the connecting rule draws horizontally (or vertically on mobile) over `--duration-slow`; step markers pop in as the line reaches each one, 100ms apart. Deliberately literal — the line drawing left to right *is* the sequence. Markers scale from 0.92 to 1.0 with opacity, `--duration-base`. No hover state.

**Interactions.** None. Optionally each step links to the corresponding onboarding documentation; if so, the whole step becomes one link target, not a separate "learn more."

**Responsive.** Below 1024px: vertical stack, rule on the left at the page margin, markers left-aligned, content right of the rule. Below 640px: unchanged in structure, reduced spacing (48px between steps), descriptions to one line where possible.

**Accessibility.** Ordered list — sequence is semantic. Connecting rule and markers `aria-hidden`; the list conveys order. Icons decorative, meaning carried by the step title.

**Implementation notes.** Server Component. Step copy must stay synchronised with the actual onboarding flow in `01` §7 — if onboarding changes, this section is updated in the same PR, or the page starts lying about what happens next.

---

## 11. Section — Architecture & Trust *(the technical hinge)*

**Purpose.** The page's most important differentiator and the start of the technical ramp (D3). Per `01` §6, it states plainly: your risk score is never decided by AI guesswork — only by fixed, auditable rules. AI is used only to explain results in plain language.

This section absorbs **AI Agents** and **Integrations** per D4, rather than creating parallel sections.

**Layout.** Three bands, increasing in technical depth. This is the progressive-disclosure mechanism in its purest form: a visitor can stop after band 1 and have understood the claim.

- **Band 1 — the claim (plain).** Centred, 8/12. A single large statement plus one short paragraph. Zero jargon. This is what an MSME owner reads and it is complete on its own.
- **Band 2 — the proof (visual).** Full-bleed, split 6/6. Left: a rules-engine output rendered in `mono-block` — the deterministic evidence. Right: the plain-language explanation of that same finding in `body-lg` Inter. A labelled divider between them makes the boundary explicit: *rules decided this · AI wrote this*. The typographic contrast **is** the argument (§3.3).
- **Band 3 — the pipeline (technical).** 12/12. The agent pipeline shown as a horizontal DAG: agents as nodes, the four phases as groups, with each agent labelled by what it inspects. Beneath it, a quiet row of the external data sources the pipeline reads. This is where **Integrations** lives — as evidence of rigour, not as a logo wall.

**Spacing.** 160px section padding — the page's largest, marking this as the centre of gravity. 96px between bands. Band 2's split has a 48px centre gutter.

**Typography.** Band 1 statement `display-lg`, centred, max 3 lines. Band 1 paragraph `body-lg`, `--color-text-secondary`, max 56 characters centred. Band 2: `mono-block` (13/22 JetBrains Mono) left, `body-lg` right, divider label in `label` uppercase. Band 3: agent names `body-md` weight 500, phase labels `label` uppercase, data-source names `body-sm`.

**Illustration.** The Surface Field's fourth and final analytical appearance: in band 3 the nodes are annotated with which agent reads them. The DAG is drawn in the same visual language — nodes, 1px edges, no gradients, no glow. Data sources appear as **plain text names**, not logos: these are API providers, not partners, and rendering their marks implies an endorsement relationship that does not exist.

**Photography.** None.

**Lighting.** Band 1 on `--color-bg-canvas`, flat. Band 2 steps up to `--color-bg-surface` with `--shadow-sm`; the mono panel within it sits on `--color-bg-inset`, visibly recessed — machine output should feel like it is *underneath* the interpretation. Band 3 returns to canvas. Dark theme adds a ≤6% `--signal-500` ambient behind the DAG only.

**Hierarchy.** Band 1 statement → band 2 split → band 3 DAG. A visitor who reads only the first statement has received the differentiator.

**Motion.** Band 1: standard reveal. Band 2: the two panels enter from their respective sides by 16px, 120ms apart, mono panel first — evidence arrives before interpretation, and the ordering is the argument. Band 3: the DAG draws phase by phase, left to right, 150ms between phases, `--duration-slow`; each phase's agents fade in together. Data-source row reveals last. Hover on an agent node: its label gains `--color-text-primary` and its edges brighten, `--duration-fast` — no tooltip, no modal, no expansion.

**Interactions.** Agent nodes are hover-highlightable but not clickable at MVP. If a "read the technical documentation" link is added, it is one link at band 3's end, not per-node.

**Responsive.** Band 2 stacks below 1024px, mono panel above explanation — preserving the evidence-then-interpretation order. Below 768px the mono panel gets horizontal scroll rather than wrapping; wrapped monospace stops reading as machine output. Band 3's DAG becomes vertical below 1024px, phases stacked; below 640px it reduces to a phase list with agent counts, dropping the graph. A four-phase DAG on a 360px screen is illegible and a smaller version of an illegible thing is not a solution.

**Accessibility.** Band 2's divider labels are real text, not visual-only — the rules/AI distinction must reach a screen reader. Mono panel is `<pre>`-semantic with an accessible label identifying it as rule output. DAG has a text alternative describing the pipeline; nodes are not focusable if not interactive. Hover highlight is decorative and has a keyboard-reachable equivalent only if the nodes become interactive. Mono at 13px must clear AA — verify `mono-block` against `--color-bg-inset` in both themes, as this is the page's smallest sustained reading text.

**Implementation notes.** Band 2's content is a real finding from the same fixture as the Interactive demo — same scan, same domain, consistent throughout the page. Agent names and phase groupings come from `04_AGENT_PIPELINE.md` and must match the shipped pipeline; showing an agent that does not exist is the most damaging possible error in the page's most trust-critical section. Band 3's DAG is dynamically imported.

---

## 12. Section — DPDP Readiness

**Purpose.** Explain what readiness indicators mean, and state explicitly that this is not a certification claim.

**Layout.** Asymmetric: content in columns 1–6, a compact indicator panel in columns 8–12. The panel shows a small set of readiness indicators in the product's real visual language — the same status treatment used in-app, not a marketing reinterpretation.

**Spacing.** 128px section padding. 48px between the header and body. The disclaimer sits 32px below the body, visually separated but not buried.

**Typography.** Header `display-lg`. Body `body-lg`. **Disclaimer in `caption` (12/16) at `--color-text-secondary`** — small, but present, adjacent to the claim it qualifies, never in a footnote at the page bottom. Indicator labels `body-md`; indicator states use the product's status tokens.

**Illustration.** None beyond the indicator panel, which is real UI.

**Photography.** None. No compliance-badge imagery, no shield icons, no certification-style seals — every one of those implies exactly the certification this section disclaims.

**Lighting.** `--color-bg-surface` with `--shadow-sm` on the indicator panel only. Restrained: this section must feel factual, not promotional.

**Hierarchy.** Header → body → indicator panel → disclaimer. The disclaimer is last in hierarchy but must never be visually suppressed below legibility.

**Motion.** Standard reveal for text. Indicators fade in together, not staggered — staggering would dramatise a compliance state, and per `01`'s framing the product does not manufacture drama around anxiety-adjacent numbers. No progress-bar fill animation.

**Interactions.** Optional single link to the full compliance explanation. Indicators are not interactive here.

**Responsive.** Stacks below 1024px, panel below content. Below 640px indicators go to a single column. The disclaimer never collapses, never truncates, never moves behind a "read more."

**Accessibility.** The disclaimer is real body text in the DOM adjacent to the claim, per `01`'s convention for consent-adjacent copy. `caption` at 12px must clear AA in both themes — verify explicitly, as this is the page's smallest text carrying legal weight. Indicator states carry text labels, never colour alone (INV-28).

**Implementation notes.** Disclaimer wording is the exact language used everywhere DPDP appears (`07_SECURITY_COMPLIANCE.md`). It is not rewritten for tone here. Same disclaimer, every surface.

---

## 13. Sections — Pricing Preview, Social Proof Slot, FAQ

### 13.1 Pricing Preview

**Purpose.** Three tiers, condensed, freemium shown first and never hidden (`01` §6). Links to the full Pricing page.

**Layout.** Three columns, 4/4/4. This is the one place a symmetric card layout is correct — tiers are genuinely parallel and comparison is the task. The freemium tier is **leftmost**, first in reading order.

**Spacing.** 128px section padding. 24px gutters. 24px card internal padding (`--space-card-padding` × 1.5 for marketing weight). 16px between a tier's price and its feature list.

**Typography.** Header `display-lg`. Tier names `heading-h3`. Prices `heading-h1` (32/40 DM Sans 700) with tabular numerals. Feature lists `body-md`. Fine print `caption`.

**Illustration / Photography.** None.

**Lighting.** Cards on `--color-bg-surface` with `--shadow-sm`. One tier may carry a 1px `--color-accent-primary` border as the recommended option — **border only, no accent fill, no scale-up, no "most popular" ribbon**. Ribbons are the ThemeForest grammar this design excludes.

**Hierarchy.** Freemium first by position; recommended tier marked by border alone.

**Motion.** Cards reveal together, not staggered — staggering implies ranking. Hover: `--shadow-sm` → `--shadow-md` and a 1px upward translate, `--duration-fast`. No scale transform; scaling a card containing a price makes the number appear to change.

**Interactions.** Each card's CTA routes to signup with the tier preselected. Card body is not a link target — only the explicit CTA is, so a stray click never commits a plan choice.

**Responsive.** Below 1024px: 2 columns with freemium spanning full width on the first row. Below 640px: single column, freemium first. **Never a horizontal-scroll carousel** — pricing that must be swiped to compare cannot be compared.

**Accessibility.** Prices use tabular numerals per `05` §1. The recommended tier's status is conveyed in text, not by border colour alone. Feature lists are semantic lists. Cards are not clickable regions containing links.

**Implementation notes.** Server Component. Prices come from one source shared with the full Pricing page — two pages disagreeing about price is a trust failure.

### 13.2 Social Proof Slot — *deferred, do not populate*

**Status: designed and deliberately not built at MVP launch.**

`01` §6 is explicit: testimonials are "omitted at MVP launch: there are no customers yet. Placeholder section removed rather than faked." This design honours that. The same reasoning extends to a "Trusted By" logo wall, which was requested but has the identical problem — Qelvix has no customers whose logos it may display.

**What ships at MVP:** nothing. The section does not render. There is no empty state, no "coming soon," no grayed-out placeholder logos, no "trusted by teams at" over generic marks.

**What is reserved for later:** the slot sits between Pricing and FAQ. When real testimonials exist, they occupy 8/12 centred, one quote at a time (never a carousel), quote text in `heading-h3` DM Sans 600, attribution in `body-md` `--color-text-secondary`. Photography, if any, is a real photograph of the real person who said it — never stock. If a logo wall is later justified, it renders marks at uniform optical weight in `--color-text-muted`, monochrome, with no marks the company has not been given written permission to display.

**Implementation note.** Do not build this section speculatively. An unrendered section is not technical debt; a fabricated one is a liability.

### 13.3 FAQ

**Purpose.** Answer the objections a skeptical owner actually has — is this safe to run on my live site, will you sell my data, what happens after the free scan, do I need to be technical (`01` §6). Written for the primary persona's literacy level, not a security audience.

**Layout.** Two columns on desktop: section header sticky in columns 1–4, accordion in columns 6–12. The sticky header keeps context while the visitor scans answers. Single column below 1024px.

**Spacing.** 128px section padding. Accordion items separated by 1px `--color-border-subtle`. 20px vertical padding per closed item; expanded answers add 16px above and 24px below.

**Typography.** Header `display-lg`. Questions `heading-h4` (16/24 DM Sans 600). Answers `body-lg`, `--color-text-secondary`, max 68 characters per line.

**Illustration / Photography.** None. A chevron at `--icon-sm` is the only glyph.

**Lighting.** `--color-bg-canvas`, flat, no card treatment. FAQs in individual elevated cards fragment what should read as one continuous list.

**Hierarchy.** Questions are scannable at a glance; answers are subordinate until opened.

**Motion.** Accordion expand/collapse: height and opacity, `--duration-base`, `--easing-standard` — per `05` §4.11's accordion behaviour, not a bespoke variant. Chevron rotates 180° over the same duration. Entry: items stagger at 40ms, faster than elsewhere since this is a list, not a sequence of ideas.

**Interactions.** Multiple items may be open simultaneously — forcing single-open makes comparing two answers impossible. First item **closed** by default; opening one for the visitor presumes which objection they hold.

**Responsive.** Header unsticks and moves above the list below 1024px. Below 640px, questions may wrap to two lines; the tap target is the full row, minimum 44px tall.

**Accessibility.** Native disclosure semantics: each question is a button with `aria-expanded` controlling its panel. Keyboard operable, visible focus. Content is in the DOM when collapsed (not conditionally rendered) so it is findable via in-page search. Reduced motion: instant expand, no height animation.

**Implementation notes.** Uses the shared Accordion primitive from `05` §4.11 — no bespoke FAQ accordion (INV-21, INV-22). FAQ content is marked up with FAQPage structured data alongside the SoftwareApplication schema required by `01` §6.

---

## 14. Section — Final CTA *(the threshold)*

**Purpose.** Repeat the domain input. Per `01` §6 this is emphatically **the same component as the hero**, not a generic "Sign Up" button.

This section also carries D2's designed transition from marketing to product.

**Layout.** Full-bleed, centred, 8/12. Vertical order: a short closing line, the input, the promise line. Deliberately sparse — everything that needed saying has been said.

**The threshold treatment.** This section renders **dark in both themes**. In light theme it is the page's single dark band; in dark theme it is continuous with the page. Two things follow from this:

1. The visitor sees the product's actual visual environment before entering it, so signup is not a jarring context switch — D2's "entering the product, not switching to another website."
2. In light theme it creates a strong terminal moment. The page has been light and open throughout; it closes by stepping into the operations console.

Transition is a scroll-driven surface change over the section's top 200px, `--easing-standard`. Not an abrupt edge, not a gradient smear — a controlled crossfade of the section's background from `--fog-50` to `--ink-950`, with text colours crossing at the midpoint so contrast never dips below AA at any point in the transition. **This last constraint is non-negotiable and must be verified at intermediate states**, not just at the endpoints.

**Spacing.** 160px section padding — matching Architecture, bookending the page's two heaviest moments. 32px between closing line and input, 20px between input and promise line.

**Typography.** Closing line `display-lg`, max 2 lines. Promise line `body-lg`. Input identical to hero.

**Illustration.** The Surface Field's final appearance, **collapsed**: nodes converged to a tight cluster behind the input, edges short and dense. The page opened with a scattered, unresolved field and closes with a single resolved point. The visual argument completes.

**Photography.** None.

**Lighting.** Dark surface with a `--signal-500` radial behind the input at ≤8% opacity — the same lighting language as the hero, now in the dark register. The input is the only lit object in the section.

**Hierarchy.** Input → closing line → promise line.

**Motion.** Surface transition as described. Field collapse animates over `--duration-slow` as the section enters, once. Input behaves exactly as the hero's, including focus convergence and valid-domain illumination — identical component, identical behaviour.

**Interactions.** Identical to hero: inline validation, inline errors, pre-check loading, routes to signup with domain pre-filled.

**Responsive.** Input full-width below 640px with the submit button below the field, matching the hero exactly. Surface transition retained at all breakpoints but shortened to 120px on mobile where scroll distances are compressed.

**Accessibility.** Because this is the same component as the hero, the page contains two inputs with the same purpose — each needs a **distinct accessible name** ("Enter your domain to scan" / "Enter your domain to scan — get started") so a screen-reader user navigating by form control can distinguish them. Contrast verified at transition midpoints, not only at endpoints. Reduced motion: surface change becomes instant at the section boundary; field renders collapsed and static.

**Implementation notes.** Genuinely the same component instance as the hero (INV-22 — a second domain-input implementation is a bug), parameterised only by accessible name and theme context. The signup route it leads to loads in dark theme, completing the handoff.

---

## 15. Section — Footer

**Purpose.** Everything else, findable, without competing with the CTA above it.

**Layout.** Dark surface, continuous with the Final CTA — no visible seam between them; they read as one closing block. Four-column sitemap-style link groups (`01` §6) spanning 8/12, with the brand block in columns 1–3. Bottom row: legal line and social icons.

**The brand block** is one of the only places the **combined logo** (`Qelvix Logo black.png`) is permitted (§5). It renders white via CSS filter in this dark context, at a comfortable size — this is a brand moment, not a nav element. The header's icon-plus-wordmark lockup is **not** used here; the footer is exactly where the combined mark earns its place.

**Spacing.** 96px top padding, 48px bottom. 32px between link groups. 12px between links within a group. 48px above the bottom legal row, separated by a 1px `--color-border-default` rule.

**Typography.** Group headings `label` uppercase, `--color-text-muted`. Links `body-md`, `--color-text-secondary` → `--color-text-primary` on hover. Legal line `caption`, `--color-text-muted`.

**Illustration / Photography.** None.

**Lighting.** Flat dark. No glow, no gradient. The page's energy has been spent by design.

**Hierarchy.** Deliberately flat — the footer is a directory. The brand block is the only element with visual weight.

**Motion.** No entry animation. The footer is present, not revealed — animating a footer into view is motion without purpose. Link hover: colour only, `--duration-fast`.

**Interactions.** Standard navigation. Social icons at `--icon-md` with accessible names.

**Responsive.** Four groups → two below 1024px → one below 640px, with groups becoming collapsible sections on mobile to avoid a 400px-tall wall of links. Brand block moves to the top of the stack on mobile.

**Accessibility.** `<footer>` landmark. Link groups are semantic lists with their headings programmatically associated. Social icon links have text names, never icon-only accessible names. Contrast for `--color-text-muted` on the dark surface must clear AA for the legal line — this is the page's lowest-contrast text and the most likely AA failure on the page.

**Implementation notes.** Contains no invented company details beyond what is provided (`01` §6). Legal links resolve to real pages; a footer link to a 404 undoes the trust the page just built.

---

## 16. Required Amendments and Open Items

This design cannot be implemented as specified until the following are resolved. Per `08` §16.2, a conflict with a frozen document produces an ADR, never a silent override.

| ID | Against | What this design does differently | Required action |
|---|---|---|---|
| **A-02** | `01` §6 — "the scan input, not a headline"; "no illustration competing with the input" | Adds a `display-xl` headline above the input, and a Surface Field illustration behind it. Mitigated by making the input win first fixation through colour, motion, elevation, and proximity rather than size (§6), and by masking the field away from the text column. | **ADR required** before F14 implementation. Must argue that time-to-CTA is unchanged and that the field is non-competing. `01` wins conflicts by default per the Documentation Index; this ADR must be explicit that it is not asserting a critical architectural issue, only a refinement within `01`'s stated intent. |
| **A-03** | `02` §8 — dark is the default theme | Marketing surfaces default light; in-app default is unchanged. | **ADR required.** Low risk: `09` F2's validation checklist ("dark theme default") refers to the authenticated app and still passes. |

**Open items requiring a decision before build:**

1. **Hero and closing copy.** This document fixes length, register, and hierarchy but not final wording. Copywriting is a separate deliverable and the reference lines here are placeholders for tone only.
2. **The demo fixture.** A real scan against a real placeholder domain must be run and committed. Until it exists, sections 9 and 11 have no content. This is the longest-lead dependency in the whole page.
3. **Announcement bar content source.** Whether messages are hardcoded per deploy or configurable is unspecified in `01`; if configurable, that is a backend concern and needs its own card.
4. **Motion token for reveals.** Reveals are specified at `--duration-slow` (320ms), the longest token `05` §3.3 provides. 320ms is slightly quick for a large section reveal; a `--duration-reveal` of ~480ms scoped to marketing would be better. **Not introduced here** — adding a token to `05` requires an ADR, and the design is fully implementable at 320ms. Raise only if it looks wrong in build.

**Sequencing note.** The Landing Page is F14 / S18 in `09_IMPLEMENTATION_ROADMAP.md` — deliberately late, after a working scan exists, because building the promise before the thing promised is the failure mode `09` explicitly guards against. This document existing now does not move that position. Implementation waits for its phase; the two ADRs above should be filed well before it, not on the day.
