# Qelvix — Landing Page V2 Design Specification

**Status:** SPECIFICATION ONLY. No production code changed. Do not implement until explicitly approved.
**Scope:** The public marketing landing page (`app/(marketing)/page.tsx` and its sections) only. **Not** the dashboard, authenticated app, onboarding, backend, APIs, scanner, database, or auth.
**Primary reference:** [`docs/REFERENCE_DESIGN_SYSTEM_AUDIT.md`](REFERENCE_DESIGN_SYSTEM_AUDIT.md) (the Framer CRM template study) — used for *principles*, never as a clone target.

> **Headline finding:** The current landing page is already well-architected and already embodies most of the reference's principles (flat surfaces, hairline borders, eyebrow labels, one reserved accent, generous section rhythm, tabular numerics, an isolated demo fixture, reduced-motion support). **V2 is a disciplined refinement, not a rebuild.** The goal is to sharpen hierarchy, cut visual monotony, tighten the hero and nav, verify truthful microcopy, and lift the type/whitespace scale — while preserving the existing design system, fonts, colors, and components.

---

## 1. Current Landing-Page Audit

**Route:** `app/(marketing)/page.tsx` → renders 10 sections in order:
`Hero → Problem → Solution → InteractiveDemo → HowItWorks → Architecture → Compliance → Pricing → Faq → FinalCta`
**Chrome:** `SplashScreen`, `AnnouncementBar` (DPDP), `MarketingHeader`, `MarketingFooter` (in `(marketing)/layout.tsx`).

**What's already strong (keep):**
- **Design tokens** — `app/globals.css` ink/fog/signal primitives → semantic tokens; light default + full dark theme; Tailwind exposure in `tailwind.config.ts`. Consistent.
- **Single reserved accent** — Signal Cyan (`--signal-600 #0891b2` light / `--signal-500 #06b6d4` dark). Used only for action/emphasis; severity colors reserved. Matches reference principle 03.
- **Flat + hairline surfaces** — cards are `rounded-xl border border-border/80 bg-surface shadow-2xs`; no heavy elevation. Matches reference principles 05–06.
- **Eyebrow labels** — `Eyebrow` pill + uppercase kickers on every section. Matches reference principle 07.
- **Product-truthful demo** — `InteractiveDemo` uses the isolated `DEMO_SCAN` fixture in `lib/data/landing.ts` (clearly a fixture; not authenticated data). Deterministic-rules honesty is a real differentiator, well-expressed.
- **Motion discipline** — `framer-motion` (already a dependency) via `Reveal`, `EASE_OUT` tokens, `useReducedMotion` honored, plus a global `prefers-reduced-motion` reset. Matches reference principle 10–11.
- **Accessibility scaffolding** — `aria-labelledby` per section, `role="tablist/tab/tabpanel"` in the demo, `sr-only` labels, focus-visible rings, skip target `#main`.

**Problems / opportunities (OBSERVED in code):**

| # | Issue | Evidence | Severity |
|---|---|---|---|
| P1 | **Hero is overloaded** — eyebrow + H1 + lede + scan input + 3 reassurances + "sample report" link + a 7-chip "intelligence sources" row with divider. Too many competing elements vs the reference's calm hero. | `Hero.tsx` lines 41–116 | High |
| P2 | **Card-grid monotony** — four consecutive sections (Solution, HowItWorks, Architecture-phases, plus Problem) use near-identical `border rounded-xl` cards with a top "0X //" kicker row and a bottom metric footer. Reads repetitive over a full scroll. | `Solution/HowItWorks/Architecture` | High |
| P3 | **Microcopy that reads as unverified SLAs/metrics** — "SLA: < 60s", "< 15s Latency", "Realtime Calc", "(42ms)", "7 CONTINUOUS AGENTS ACTIVE". Some are decorative/demo, but several are presented as product facts. | `HowItWorks.tsx` 29–34, `Architecture.tsx` 123, `InteractiveDemo.tsx` 90/194 | Med (truthfulness) |
| P4 | **Nav label↔target mismatch + length** — 8 items; "Product"→`#problem`, "Features"→`#solution`, "Security"→`#architecture` are non-obvious mappings. | `MarketingHeader.tsx` 18–26 | Med |
| P5 | **Type scale tops out below reference** — section headings max at `display-lg` (40px); hero ~60px. Reference display is 56–64px. Hierarchy could be more premium. | `primitives.tsx` 127, `tailwind.config.ts` 48–49 | Med |
| P6 | **"Mono/technical" look is simulated, not real** — `mono-data`/`mono-block` are font *sizes* only; no `font-mono` family is mapped, so JSON/evidence blocks render in Inter with `tabular-nums`. JetBrains Mono is imported in `layout.tsx` but unused. | `tailwind.config.ts` 42–45, 59–60 | Low |
| P7 | **SplashScreen on a marketing page** — a splash can delay perceived load / LCP. | `(marketing)/layout.tsx` 9 | Low (verify) |
| P8 | **Two stacked animated backdrops in hero** (`GridBackdrop` + `SurfaceField`). Restraint/perf check. | `Hero.tsx` 34–37 | Low |
| P9 | **Section rhythm is uniform** (`py-16 md:py-20` everywhere) — no "breathing" variation to separate acts of the page. | all sections | Low |

**No broken links found** in footer/nav (footer explicitly omits unbuilt pages). No fabricated authenticated data. No placeholder-lorem. `DEMO_SCAN` carries a code TODO to be replaced by a real pre-run scan fixture before launch — carry that forward.

---

## 2. Reference Design Principles (applied subset)

From the audit, the principles worth pulling into Qelvix (see audit §15):
1. Hierarchy from scale, not decoration. 2. Tight negative tracking on large type. 3. One reserved accent. 4. Whitespace as rhythm. 5. Flat surfaces; contrast via color/inversion, not shadow. 6. Elevation reserved for the product shot. 7. Repeating eyebrow→heading→subhead template — but **vary the body composition** to avoid monotony. 8. Fast micro-motion + choreographed reveals. 9. Mobile = clarity over parity.

**Not borrowed** (audit §16): the light black/white base as identity, the electric-blue accent, Archivo, marketing airiness inside dense content, pill-everything, decorative parallax.

---

## 3. Qelvix Translation (reference → Qelvix)

| Reference move | Qelvix V2 translation |
|---|---|
| 56–64px display type | Raise hero to ~56–64px and section headings to `display-xl` (56px) on desktop — **using existing DM Sans**, `tracking-tight`. |
| One accent (blue) | Keep **Signal Cyan** as the only accent; severity palette stays reserved for data. |
| Flat + color-block emphasis | Keep flat + hairline; use the existing **dark-band inversion** (as `FinalCta` already does) to punctuate the page instead of shadows. |
| Calm hero | Strip the hero to eyebrow + H1 + lede + scan CTA + one reassurance line; **move the data-source proof to its own trust strip.** |
| Elevation on product shot | Keep `InteractiveDemo`'s `shadow-md ring-1` as the *one* elevated element. |
| Section variety | Break the four-in-a-row card grids with alternating compositions (see §7). |

**Target feeling:** "Qelvix evolved into a premium, precise security product." **Not** "Qelvix copied a CRM template."

---

## 4. Landing-Page Goals

1. In ~5 seconds, communicate **what** (external security monitoring), **who for** (Indian businesses handling customer data), **value** (see your risk in under a minute, in plain language).
2. Drive the **primary conversion**: enter a domain → `/signup?domain=…` (the existing `DomainScanInput` flow).
3. Build **credibility** through the deterministic-rules guarantee, DPDP alignment, and a real product preview — without fabricated metrics or logos.
4. Stay **fast, accessible, and theme-correct** in both light and dark.

---

## 5. Target Audience

- **Primary:** founders / ops / IT leads at Indian SMBs and growing brands who handle customer data, are exposed to DPDP obligations, and have no dedicated security team.
- **Secondary:** developers/IT admins who will action the plain-language findings.
- **Tone:** calm, technical, trustworthy, non-alarmist. Plain business language over jargon.

---

## 6. Information Architecture (evaluation of the 14 candidate sections)

| # | Candidate | Verdict | Rationale |
|---|---|---|---|
| 1 | Navigation | **Keep** (tighten) | Reuse `MarketingHeader`; simplify labels (§16). |
| 2 | Hero | **Keep** (simplify) | Reuse `Hero`; reduce load (§8). |
| 3 | Trust / credibility strip | **Keep** (promote) | Extract the data-source chips out of the hero into a dedicated slim strip. Honest (tool names, not fake customer logos). |
| 4 | Security posture / product overview | **Keep** = Problem + Solution | Real copy from blueprint. |
| 5 | How Qelvix works | **Keep** | `HowItWorks` (4 steps). |
| 6 | Scanner / monitoring capabilities | **Keep** = Solution + Architecture pipeline | Real 7-agent/4-phase model. |
| 7 | Findings / risk visualization | **Keep** = InteractiveDemo | The one hero product visual. |
| 8 | AI-assisted explanation | **Keep** = Architecture "guarantee" block | Deterministic-rules + plain-language differentiator. |
| 9 | Compliance / DPDP | **Keep** | `Compliance` trust-center. |
| 10 | Reports | **Fold in** | Represented inside the demo + pricing ("Exportable reports"). No standalone section. |
| 11 | Product workflow | **Keep** = HowItWorks | Same as #5; don't duplicate. |
| 12 | Security / reliability explanation | **Keep** = Architecture | Same as #6/#8. |
| 13 | CTA | **Keep** = FinalCta | Dark-band closer. |
| 14 | Footer | **Keep** | `MarketingFooter`. |
| — | Testimonials / customer logos | **Omit** until real | No fabricated social proof (already intentionally unrendered). |
| — | Pricing | **Keep** | Real tiers in `lib/data/landing.ts`. |

**Net:** the existing 10-section set is correct. Do **not** add sections for length. The only structural change is **promoting the trust strip out of the hero** and **varying section composition**.

---

## 7. Exact Section Order (V2)

```
0. AnnouncementBar (DPDP)           — unchanged
1. Hero (simplified)                — calm: eyebrow · H1 · lede · scan CTA · one reassurance line
2. Trust strip (NEW slim band)      — data/intelligence sources (moved out of hero)
3. Problem                          — 2-col, keep
4. Solution (capabilities)          — VARY: from 4-up cards → 2-col feature rows w/ larger type
5. InteractiveDemo (product)        — the one elevated product shot, keep
6. HowItWorks (4 steps)             — VARY: horizontal numbered stepper on desktop
7. Architecture (guarantee+pipeline)— keep guarantee block; pipeline stays 4-phase
8. Compliance (DPDP trust center)   — keep (asymmetric 6/6 split already varies rhythm)
9. Pricing                          — keep (3 tiers)
10. Faq                             — keep
11. FinalCta (dark band)            — keep
12. Footer                          — keep
```
Rationale: alternating **canvas / surface / surface-inset** backgrounds already exist; V2 adds *compositional* variety (rows vs grids vs stepper vs split) so four consecutive card-grids no longer read the same (fixes P2).

For every section below: **purpose · content · visual structure · real data source · CTA · desktop · mobile.**

### §7.1 Hero (simplified)
- **Purpose:** instant what/who/value + primary conversion.
- **Content:** Eyebrow "Continuous security for Indian businesses"; H1 "Know what the internet knows about your business"; lede (existing); `DomainScanInput`; **one** reassurance line ("No card · results in under a minute · DPDP-ready"); keep the "See sample report ↓" anchor.
- **Visual:** centered, one backdrop (keep `GridBackdrop`; make `SurfaceField` optional/lighter — P8). Raise H1 to `~64px` desktop.
- **Data:** none (static copy). Submit → `/signup?domain=…`.
- **CTA:** primary = scan input submit; secondary = "See sample report" (scrolls to demo).
- **Desktop:** single centered column, max ~`measure-centered`; H1 up to 64px.
- **Mobile:** H1 ~36–40px; input stacks (label sr-only, full-width button); reassurances wrap to one/two lines; drop the sample-report link below the fold if cramped.

### §7.2 Trust strip (NEW, extracted)
- **Purpose:** credibility without fake logos; declutter the hero (fixes P1).
- **Content:** "Continuous intelligence sources & audit feeds" + the 7 chips (Shodan, SSL Labs, VirusTotal, NVD, AbuseIPDB, SecurityTrails, Google Safe Browsing).
- **Visual:** slim full-width band, hairline top/bottom, chips centered, muted. No cards.
- **Data:** `DATA_SOURCES` in `lib/data/landing.ts`.
- **CTA:** none.
- **Desktop:** single centered row, chips wrap once. **Mobile:** horizontal scroll or 2-row wrap; reduce to the label + wrapped chips.

### §7.3 Problem
- **Purpose:** name the blind spots the buyer already feels. **Content:** `PROBLEMS` (4). **Visual:** 2-col cards (keep). **Data:** `PROBLEMS`. **CTA:** none. **Desktop:** 2×2. **Mobile:** 1-col stack.

### §7.4 Solution (capabilities) — VARY
- **Purpose:** the four capabilities that answer the problems.
- **Content:** `SOLUTIONS` (4). **Visual (V2):** switch from 4-up equal cards to **2-col feature rows** (icon + larger `h3` headline + detail + outcome), giving each capability more type weight and breaking the grid rhythm (fixes P2).
- **Data:** `SOLUTIONS`. **CTA:** none. **Desktop:** 2×2 rows, generous gap. **Mobile:** 1-col.

### §7.5 InteractiveDemo (product visual) — the one elevated element
- **Purpose:** show a real scan in the real interface. **Content:** `DEMO_SCAN` (Asset Map / Findings / Finding Detail tabs; risk index; DPDP status). **Visual:** windowed product frame, `shadow-md ring-1` (the page's single elevation). **Data:** `DEMO_SCAN` fixture — **must be replaced by a real pre-run scan fixture before launch** (existing code TODO). Label remains clearly a sample. **CTA:** implicit (tab exploration) + the hero anchor lands here. **Desktop:** sidebar rail + panel, auto-advancing tabs (pauses on hover/focus). **Mobile:** auto-advance disabled (<640px), tabs become a horizontal row, min-height reduced.

### §7.6 HowItWorks — VARY
- **Purpose:** de-risk onboarding ("domain → alert" in 4 steps). **Content:** `WORKFLOW_STEPS` (4). **Visual (V2):** desktop **horizontal numbered stepper** (1→2→3→4 with a connecting hairline) instead of a 4-up card grid; keep icon + title + description. **Data:** `WORKFLOW_STEPS`; **remove/soften invented SLAs** in the footers (P3) unless backed by real measurement. **CTA:** none. **Desktop:** 4-across stepper. **Mobile:** vertical stepper with a left rail line.

### §7.7 Architecture (guarantee + pipeline)
- **Purpose:** the deterministic-rules trust guarantee + the 7-agent/4-phase model. **Content:** guarantee heading + rule-evidence/plain-language split; `AGENT_PHASES`; `DATA_SOURCES`. **Visual:** keep the two-column code-proof box (the JSON block is a good candidate for real monospace — P6/§11). Pipeline stays 4-phase. **Data:** `AGENT_PHASES`, `RULE_EVIDENCE`, `DATA_SOURCES`. **Soften "SLA/Latency" footers** to truthful phrasing. **CTA:** none. **Desktop:** centered guarantee + 4-col phases. **Mobile:** stacked; JSON block scrolls.

### §7.8 Compliance (DPDP trust center)
- **Purpose:** show DPDP readiness posture honestly (with the "not legal certification" disclaimer — keep). **Content:** `COMPLIANCE_INDICATORS` (4, mixed states). **Visual:** asymmetric 6/6 split (copy left, trust-center card right) — already varies rhythm; keep. **Data:** `COMPLIANCE_INDICATORS`. **CTA:** none. **Desktop:** 6/6. **Mobile:** stacked, 2×2 → 1-col indicator grid.

### §7.9 Pricing
- **Purpose:** transparent tiers; drive signup. **Content:** `PRICING_TIERS` (Free/Growth/Business), Growth recommended. **Visual:** 3 cards, recommended gets accent border + ring (keep). **Data:** `PRICING_TIERS`. **CTA:** each card → `/signup?plan=…`; footnote → `/pricing`. **Desktop:** 3-up, equal height. **Mobile:** 1-col, recommended first or highlighted.

### §7.10 Faq
- **Purpose:** remove final objections (safety, DPDP, data privacy, cadence). **Content:** `FAQS` (8). **Visual:** accordion, hairline dividers. **Data:** `FAQS`. **CTA:** none. **Desktop:** single column, ~measure width. **Mobile:** full-width accordion, 44px min targets.

### §7.11 FinalCta (dark band)
- **Purpose:** last conversion, high contrast. **Content:** eyebrow + H2 "Find out in under a minute" + `DomainScanInput` + reassurance. **Visual:** forced `data-theme="dark"` band (keep) — this is the reference's "color-block contrast" applied. **Data:** none. **CTA:** scan input → `/signup?domain=…`. **Desktop:** centered. **Mobile:** stacked input.

### §7.12 Footer
- **Purpose:** navigation, trust badges, legal. **Content:** 4 link groups (only resolvable routes), status badge, DPDP/TLS chips, socials. **Visual:** `surface-inset`, tall top padding. **Data:** static. **CTA:** secondary links. **Desktop:** 4/8 brand+links split. **Mobile:** stacked, 2-col link groups.

---

## 8. Hero Specification (detail)

- **WHAT/WHO/VALUE** conveyed by: H1 (what the internet knows → external exposure), lede (scans your public footprint like an attacker, plain language, risk score in under a minute), eyebrow (Indian businesses).
- **Primary CTA:** `DomainScanInput` — domain field + "Scan my business" → `/signup?domain=…`. Inline validation already present.
- **Secondary CTA:** "See sample report ↓" anchor to `#demo`.
- **Copy rules:** concrete product language only. Banned: "AI-powered platform of the future", "revolutionizing", "next-generation". (Current copy already complies.)
- **Reduce (V2):** move the 7-chip data-source row to the Trust strip (§7.2); collapse three reassurances to one line; keep a single background layer.
- **Hierarchy:** H1 (64px) ≫ lede (16px) ≫ CTA ≫ reassurance (12px). One accent element (the submit button).

---

## 9. Product Visual Specification

- **Source of truth:** `InteractiveDemo` + `DEMO_SCAN`. It is a **real interface rendering of sample data**, not an illustration — exactly what the brief asks.
- **Isolation:** `DEMO_SCAN` lives in `lib/data/landing.ts`, clearly a fixture, never connected to authenticated user data. Keep it isolated and labeled ("Live Product Stage", sample domain `example-textiles.in`).
- **Do not fabricate:** the metrics shown (risk 62, 5 assets, 3 findings, DPDP mixed) are demo values consistent with the real model. **Before launch, replace `DEMO_SCAN` with the output of a real pre-run scan** against a placeholder domain (existing TODO). Remove/soften decorative "42ms" / "7 AGENTS ACTIVE" unless truthful.
- **Elevation:** this is the single elevated element on the page (`shadow-md ring-1`), per reference principle 06.

---

## 10. CTA Strategy

- **Primary (repeated, consistent):** domain scan → `/signup?domain=…`. Appears in Hero, sticky header ("Scan my business"), and FinalCta.
- **Secondary:** "See sample report" (hero → demo); "Log in" (header); pricing tier CTAs → `/signup?plan=…`.
- **Accent discipline:** the solid-cyan button is reserved for the primary action; header uses a smaller solid-cyan "Scan" + ghost "Log in". Never use the accent for decoration.
- **One idea per section:** most sections have **no** CTA (they inform); conversion is concentrated in Hero + FinalCta + Pricing.

---

## 11. Typography (FINAL fonts — do not change)

- **Fonts stay exactly as production:** **DM Sans** (`--font-dm-sans` → `font-display`, headings), **Inter** (`--font-inter` → `font-sans`, body/UI), **JetBrains Mono** (`--font-jetbrains-mono`, already imported). **No new fonts. No Space Grotesk / IBM Plex Mono / Montserrat / Poppins.**
- **Scale (existing tokens, `tailwind.config.ts`):** `display-xl 56/64` · `display-lg 40/48` · `h1 32/40` · `h2 24/32` · `h3 20/28` · `h4 16/24` · `body-lg 16` · `body-md 14` · `body-sm 13` · `label 13` · `caption 12` · `mono-data/mono-block 13`.
- **V2 adjustments (values, not fonts):**
  - Hero H1 → ~`56–64px` desktop (currently ~60px max — nudge to `display-xl`/64px).
  - Section headings → `display-xl` (56px) desktop where they currently cap at `display-lg` (40px) (fixes P5). Keep `tracking-tight`.
  - Heading line-height stays tight (~1.08–1.2, as tokens define); body stays 1.5.
  - **Optional (no new font):** map the already-imported **JetBrains Mono** to a `font-mono` utility and apply it to the JSON/rule-evidence blocks (`Architecture`, `InteractiveDemo` `DetailView`) so "technical" reads as genuine monospace instead of Inter+tabular (fixes P6). This changes rendering of ~2 code blocks only.
- **Numerics:** keep `tabular-nums` on all metrics/counts/timestamps.

---

## 12. Colors (existing system — do not change)

> **Correction to the earlier audit brief:** production accent is **Signal Cyan**, not indigo `#5B5CFF`. Use the real tokens below.

- **Accent:** `--signal-600 #0891b2` (light) / `--signal-500 #06b6d4` (dark); emphasis `#67e8f9` dark. **Action only.**
- **Light (marketing default):** canvas `#f4f5f8`, surface `#ffffff`, inset `#f4f5f8`, border `#e8eaf0`/strong `#d3d7e0`, text `#12151f` / secondary `#4b5468` / muted `#8992a8`.
- **Dark:** canvas `#080a10`, surface `#0f1420`, raised `#161c2c`, inset `#0b0e16`, border `#212940`, text `#ffffff` / `#aeb6c9` / `#6b7690`.
- **Severity (reserved for data):** critical `#dc2626`, high `#d9480f`, medium `#b45309`, low gray, info cyan, success `#0d9165`.
- **Rules:** one accent; severity never used decoratively; both themes must remain correct (the page ships light-default with a dark theme + the `FinalCta` dark band). No new colors, no gradients beyond the existing subtle `GridBackdrop` glow.

---

## 13. Spacing

- **Existing scale (keep):** Tailwind base + custom `page-margin 32`, `section-gap 24`, `4.5/8.5/13/18/22/26/30` (18–120px). Section padding today: `py-16 md:py-20`.
- **V2:** introduce **rhythm variation** (fixes P9) — e.g. hero/demo/finalCta get more air (`md:py-24`/`py-28`), informational grids stay `md:py-20`. Keep horizontal gutter `px-5 md:px-page-margin` (20→32px). Content max-width `max-w-marketing` (1280px) unchanged.

---

## 14. Cards / Surfaces

- **Keep:** flat, `rounded-xl` (12px) / `rounded-2xl` (16px for pricing), `border border-border/80`, `shadow-2xs`, hover → `border-border-strong` / `bg-surface-inset`. No heavy shadows. (Reference used 24px radius; Qelvix's smaller radius is *correct* for "not excessively rounded" security tone — keep 12–16px.)
- **Elevation reserved** for the `InteractiveDemo` frame only.
- **V2:** reduce the repeated "kicker row + metric footer" chrome on at least the Solution and HowItWorks cards so not every card looks identical (supports P2). Nested surfaces (`bg-surface-inset` inside `bg-surface`) stay for code blocks.

---

## 15. Buttons

- **Primary:** solid accent, `rounded-lg`/`rounded-md`, `h-10`/`h-8`, `text-body-sm font-semibold text-white`, hover `bg-accent/90`, focus-visible ring. (Existing `DomainScanInput` submit + header CTA.)
- **Secondary/ghost:** bordered or text, `text-content-secondary` → hover `text-content-primary` / `bg-accent/10`.
- **Pills reserved** for chips/badges/nav toggles — **not** primary buttons (keeps a security-tool feel vs the reference's full-pill CTAs). Keep buttons at `rounded-md/lg`.
- **States:** hover (color), active, disabled (opacity-40 + spinner on submit), focus-visible ring — all already present; preserve.

---

## 16. Navigation

- **Keep** `MarketingHeader` (sticky, blur-free, scroll shadow, section-scroll-spy, mobile hamburger < `lg`, appearance dropdown).
- **V2 fixes (P4):** reduce to a clearer set and fix label↔target: `Product` (→ overview/solution), `Security` (→ architecture/guarantee), `Pricing`, `Docs` — plus `Sample report`, `Log in`, and the solid **Scan my business** CTA. Move `About`/`Contact`/`Resources` into the footer or a small "More" affordance to declutter.
- **Desktop:** logo left · centered links · right cluster (sample report · log in · Scan CTA · appearance). **Mobile:** logo + hamburger + Scan CTA; full-height menu with Escape/scroll-lock (already implemented).

---

## 17. Motion

- **Keep restrained** (reference principles 10–11): `Reveal` fade+rise on scroll (respect reduced-motion), `duration-fast 120ms` micro-interactions, `duration-base 200ms` transitions, `ease standard cubic-bezier(.2,0,0,1)`. The demo tabs auto-advance (pausing on hover/focus, disabled on mobile/reduced-motion) — keep.
- **Avoid:** parallax, infinite loops (the pulse dots are tiny/acceptable but audit for reduced-motion), heavy entrance choreography. Consider trimming the hero's animated `SurfaceField` (P8).
- **Reduced motion:** already globally handled in `globals.css` + component-level `useReducedMotion`; preserve.

---

## 18. Responsive Behavior

Breakpoints = Tailwind defaults: `sm 640 · md 768 · lg 1024 · xl 1280` (nav collapses < `lg`).

| Aspect | 1440 | 1280 | 1024 | 768 | 390 |
|---|---|---|---|---|---|
| Navbar | full links + CTA | full (xl link visible) | full (lg) | **hamburger** | hamburger + Scan |
| Hero H1 | 64px | 60px | 52px | 44px | 36–40px |
| Scan input | inline row | inline | inline | inline | **stacked** (full-width button) |
| Product demo | rail + panel, auto-advance | same | rail + panel | panel stacks under rail | **tabs row**, auto-advance off, reduced min-height |
| Grids (Problem/Pricing/Solution) | 2/3/4-up | same | 2–3-up | 2-up | 1-col |
| Section padding | `py-24/28` (hero/demo/cta), `py-20` else | same | `py-20` | `py-16` | `py-14` |
| Footer | 4/8 split | same | split | 2-col groups | stacked |

**Mobile is designed, not stacked:** hero simplifies to headline + input + one reassurance; trust chips scroll; demo auto-advance off; stepper goes vertical; pricing leads with the recommended tier.

---

## 19. Accessibility

- **Heading hierarchy:** one `h1` (hero); every section `h2` with `aria-labelledby`; sub-blocks `h3`. Preserve.
- **Keyboard:** all CTAs are real `button`/`Link`; demo tabs are a proper `tablist` with arrow-key semantics; mobile menu Escape-closes + scroll-locks; visible `:focus-visible` ring (2px accent). Verify tab order in the simplified hero.
- **CTA labels:** descriptive ("Scan my business", "See sample report", "Start free monitoring"); scan input has an `sr-only` label + `aria-describedby` error. Keep.
- **Contrast:** verify AA on both themes, especially muted text on inset and accent-on-white for the solid button; severity chips must pass with their text tokens.
- **Reduced motion:** honored globally + per component (keep).
- **Images/alt:** icons are `aria-hidden`; any real product screenshot must have meaningful `alt` or be marked decorative. The demo is DOM (not an image) — good.
- **Non-color severity:** severity must carry a text label + shape, not color alone (the `SeverityBadge` + `stateLabel` pattern already does this — keep).

---

## 20. Performance Rules

- **No new dependencies.** Reuse `framer-motion` (already installed), Lucide, Tailwind. No new animation/3D/video libraries.
- **Keep sections server-rendered** where possible; only `Hero`, `InteractiveDemo`, `DomainScanInput`, `FinalCta`, `Architecture` (clipboard), `MarketingHeader` need `'use client'`. Don't add client boundaries to `Problem`/`Solution`/`HowItWorks`/`Compliance`/`Pricing` (they're server components today — preserve).
- **Assets:** no heavy hero video/background images; the product visual is DOM, not a bitmap — keep it that way. Any future image via `next/image`, sized, lazy.
- **Audit `SplashScreen`** (P7): confirm it doesn't delay LCP; if it does, gate it to first-visit or remove from the marketing route.
- **Backdrops:** consider dropping one hero backdrop layer (P8) to reduce paint. Keep `GridBackdrop` (CSS-only) over animated `SurfaceField` on hero if a trade is needed.
- **Budget target (INFERRED):** LCP < 2.5s, CLS ~0, no layout shift from font swap (fonts use `next/font`, already optimized).

---

## 21. Components Required (V2)

Minimal new work — most is reuse. New/changed:

| Component | Type | Purpose | Notes |
|---|---|---|---|
| `TrustStrip` | server | Slim data-source band extracted from hero | Reuses `DATA_SOURCES`; ~1 small component |
| `Stepper` (HowItWorks variant) | server | Horizontal numbered stepper | Can be an internal refactor of `HowItWorks`, not a shared export |
| `font-mono` utility wiring | config | Map existing JetBrains Mono | `tailwind.config.ts` fontFamily `mono` + apply to 2 code blocks (optional) |

No other new components are required.

## 22. Existing Components That Can Be Reused (most of V2)

`Hero`, `DomainScanInput`, `InteractiveDemo` (+ `SeverityBadge`), `Problem`, `Solution`, `HowItWorks`, `Architecture`, `Compliance`, `Pricing`, `Faq`, `FinalCta`, and primitives `Eyebrow`/`SectionHeader`/`GridBackdrop`/`Hairline`/`WindowChrome`, plus `Reveal`/`RevealGroup`/`RevealChild`, `MarketingHeader`, `MarketingFooter`, `AnnouncementBar`, `AppearanceDropdown`, `Logo`, `SurfaceField`. All tokens in `globals.css`/`tailwind.config.ts`. **The design system and component library are sufficient — V2 mostly re-composes them.**

## 23. Components That Should Be Removed / Replaced / Changed

- **Change (not remove):** `Hero` — remove the embedded data-source chip row (→ `TrustStrip`) and collapse reassurances.
- **Change:** `HowItWorks` — recompose as stepper; drop invented SLA footers (P3).
- **Change:** `Architecture` / `InteractiveDemo` — soften unverified latency/agent microcopy (P3); optionally real monospace for code blocks (P6).
- **Change:** `MarketingHeader` — trim/relabel nav (P4).
- **Verify:** `SplashScreen` — keep only if perf-neutral (P7).
- **Replace before launch (data, not component):** `DEMO_SCAN` fixture → real pre-run scan output (existing TODO).
- **Remove:** nothing wholesale. No section is deleted.

---

## 24. Implementation Order (when approved)

1. **Tokens/config first:** add rhythm spacing usage + (optional) `font-mono` mapping. No visual change yet.
2. **Hero simplification** + **TrustStrip** extraction (highest-impact clarity win).
3. **Type scale bump** on section headings (display-xl) — global, low-risk.
4. **Section-composition variety:** Solution → feature rows; HowItWorks → stepper.
5. **Microcopy truthfulness pass** (SLAs/latency/agent counts) across HowItWorks/Architecture/InteractiveDemo.
6. **Nav tighten** (labels + moved items).
7. **Optional monospace** for code/evidence blocks.
8. **Perf pass:** SplashScreen + hero backdrop audit.
9. **A11y + responsive QA** at 1440/1280/1024/768/390, both themes, reduced-motion.
10. **Replace `DEMO_SCAN`** with a real pre-run fixture before launch.

Each step is independently shippable and reversible. Nothing here touches the dashboard, app, onboarding, backend, APIs, scanner, DB, or auth.

---

### Guardrails (restated)
- No font changes (DM Sans + Inter + JetBrains Mono are FINAL). No new fonts.
- No new dependencies. No backend/API/DB/auth/onboarding/dashboard/scanner changes.
- No fabricated authenticated data; demo data stays isolated and labeled.
- Do not implement until this specification is explicitly approved.

### Provenance
- Current-state audit read from source: `app/(marketing)/page.tsx` & `layout.tsx`, `components/marketing/*`, `components/layout/*`, `app/globals.css`, `tailwind.config.ts`, `lib/data/landing.ts`.
- Principles from `docs/REFERENCE_DESIGN_SYSTEM_AUDIT.md`.
- Values tagged OBSERVED (from code) unless marked ESTIMATED/INFERRED. Reference site not re-inspected this pass.
