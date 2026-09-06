# Reference Design System Audit

**Reference:** https://nuanced-one-561026.framer.app/ — "FlowSuite", a professional CRM marketing template built in Framer (BRIX-style).
**Purpose:** Research only. Reverse-engineer the reference's design *language* to inform a future Qelvix redesign. **No Qelvix code was changed to produce this document.**
**Method:** Live inspection of the running site via a headless browser — computed styles extracted with JavaScript at 1440px (desktop) and 375px (mobile), plus page-content reading. Values are tagged:

- **OBSERVED** — read directly from the live DOM / computed CSS.
- **ESTIMATED** — derived from observed values but rounded/interpreted (exact source token not exposed).
- **INFERRED** — a reasoned judgment about intent, not a measured value.

> Framer compiles designs to opaque generated CSS, so no authored token names are visible. Everything below is reconstructed from rendered output.

---

## 1. Executive Summary

The reference is a **light-dominant, editorial-SaaS marketing site** whose premium feel comes from three moves, not from decoration:

1. **Oversized display typography with tight negative tracking** (64px / 56px headings at ~-0.04em) set against very generous whitespace.
2. **Flat, borderless, shadowless surfaces** where hierarchy is created by *color-block contrast* (a black card among white cards) rather than elevation.
3. **A single reserved accent** (electric blue `#0454FF`) used almost exclusively for primary action, with black + white carrying everything else.

Motion is **Framer scroll-reveal** (fade + rise as sections enter the viewport) layered over fast hover micro-interactions. The geometry is soft-but-confident: **large 24px corner radii** on containers and **full pills (100px)** on buttons.

**For Qelvix**, the transferable value is the *system discipline* — hierarchy-through-scale, whitespace-as-luxury, accent-reserved-for-action, flat surfaces with intentional contrast — **not** the specific font, the blue, or the airy marketing density. Qelvix is a dark-first security product; it should borrow the *principles* and keep its own identity, colors, and typographic voice.

---

## 2. Global Visual Language

**What makes it read as one coherent system?** Relentless repetition of a small kit: one typeface, one accent, one corner-radius family, pill buttons everywhere, uppercase mono-ish eyebrow labels above every section, and a fixed section rhythm (eyebrow → big heading → one-line subhead → content grid).

| Dimension | Reading | Tag |
|---|---|---|
| Overall aesthetic | Modern editorial SaaS; "premium template" polish | INFERRED |
| Brand personality | Confident, calm, professional, approachable | INFERRED |
| Visual tone | Bright, optimistic, clean | OBSERVED (white-dominant) |
| Premium vs functional | Leans **premium/marketing**; not a data-dense product UI | INFERRED |
| Minimalism level | High — few elements per viewport, lots of air | OBSERVED |
| Density | Low (marketing); wide gaps, one idea per band | OBSERVED |
| Whitespace strategy | Whitespace *is* the design; huge section padding (footer top padding 160px) | OBSERVED |
| Visual hierarchy | Extreme size contrast: 56–64px headings vs 16px body | OBSERVED |
| Editorial vs SaaS vs dashboard | **Editorial-SaaS** hybrid | INFERRED |
| Geometric language | Soft rounded rectangles; pill buttons | OBSERVED (radius 12/24/100) |
| Shape language | Rounded, friendly, no sharp corners | OBSERVED |
| Contrast strategy | **Color-block contrast** (black surface vs white) not shadow | OBSERVED |
| Visual rhythm | Predictable vertical cadence, repeating section template | OBSERVED |
| Repetition | Eyebrow + heading + subhead pattern on every section | OBSERVED |
| Negative space | Deliberate and large, especially around headings | OBSERVED |
| Overall "feel" | Expensive, quiet, trustworthy | INFERRED |

---

## 3. Layout System

| Property | Value | Tag |
|---|---|---|
| Max content width | ~**1265px** inner content container | OBSERVED |
| Full-bleed elements | Hero background image spans ~1425px (near-viewport) | OBSERVED |
| Horizontal page gutter (desktop) | **80px** (nav, sections, footer all pad 80px) | OBSERVED |
| Horizontal gutter (mobile) | **20px** | OBSERVED |
| Grid structure | 12-col implied; feature/benefit grids run 2–3 columns | INFERRED |
| Section vertical padding | Large — hero top 84px, footer top 160px, section-level gaps 64–100px | OBSERVED (edges) / ESTIMATED (~80–120px typical band) |
| Hero composition | Centered eyebrow + centered 64px headline + centered subhead + centered CTA, over a full-bleed image | OBSERVED |
| Content alignment | Predominantly **centered** for section intros; left-aligned inside cards | OBSERVED |
| Full-width vs contained | Contained content (1265px) inside full-bleed color/image bands | OBSERVED |
| Card positioning | Even grids, equal gaps; occasional 1 highlighted (black) card | OBSERVED |
| Symmetry | Mostly **symmetrical**; centered intros; balanced grids | OBSERVED |
| Desktop → mobile | Gutter 80→20px; nav 90→64px tall; multi-col grids collapse to 1 col | OBSERVED |

**Container behavior (INFERRED):** a centered max-width wrapper (~1265px) with 80px side padding on a fluid page; hero and colored bands break out to full-bleed while their inner text stays in the wrapper.

---

## 4. Typography System

**Primary typeface (OBSERVED):** **Archivo** (a grotesque sans), used for ~all headings and body. Weights present: **400 / 500 / 600 / 700**. A stray **Inter** appears ~3× (likely an embedded logo/widget), not part of the system.

**Reconstructed type scale (OBSERVED at 1440px — `size / line-height / weight / letter-spacing`):**

| Role | Desktop | Mobile | Weight | Tracking | Tag |
|---|---|---|---|---|---|
| Display / H1 (hero) | **64px / 70px** (LH 1.10) | 36px / 40px | 600 | **-2.56px (~-0.04em)** | OBSERVED |
| H2 (section title) | **56px / 62px** (1.10) | 28px / 31px | 600 | -2.24px (~-0.04em) | OBSERVED |
| H3 (stat / price number) | **48px / 53px** (1.10) | — | 700 | -1.92px | OBSERVED |
| H4 (card / plan title) | **36px / 40px** (1.10) | — | 500 | -0.72px (~-0.02em) | OBSERVED |
| Sub-heading (est.) | ~22–24px | ~20px | 500–600 | ~-0.4px | ESTIMATED |
| Body (default) | **16px / 22px** (1.40) | 15px / 21px | 400 | -0.2px | OBSERVED |
| Small / caption | ~14px / 20px | — | 400 | ~-0.1px | ESTIMATED |
| Eyebrow label ("FEATURES") | ~**12px**, uppercase, muted | 12px | 400–500 | ~+tracking, INFERRED | OBSERVED (size) |

**Signature typographic characteristics:**

- **Tight negative letter-spacing on large text** (~-0.04em on 56–64px). This is the single biggest driver of the "premium/modern" feel. — OBSERVED
- **Tight heading line-height (~1.1)** vs **relaxed body (~1.4)**. — OBSERVED
- **Headings sit in narrow measures** (H2 constrained to ~700px) → 4–6 words per line, strong shape. — OBSERVED
- **Body paragraphs ~570–630px wide** → comfortable ~60–75 character measure. — OBSERVED
- Weight is used sparingly for hierarchy: 600 for headings, 400 for body, 500 for card titles, 700 only for big numbers. — OBSERVED

**Comparison with Qelvix typography:**

| | Reference | Qelvix (current — FINAL, do not change) |
|---|---|---|
| Display/Heading | Archivo 600 | **DM Sans** (`--font-dm-sans`, mapped to `font-display`) |
| Body/UI | Archivo 400 | **Inter** (`--font-inter`, mapped to `font-sans`) |
| Numbers/technical | Archivo 700 | **JetBrains Mono** (`--font-jetbrains-mono`, already configured — the existing mono; **not** IBM Plex Mono) |
| Big-heading tracking | ~-0.04em (very tight) | (unspecified — likely default) |
| Heading line-height | ~1.1 | (unspecified) |

**Verdict (typography is FINAL — do NOT swap or add fonts):** **Preserve Qelvix's existing DM Sans + Inter typography system** exactly as it ships (DM Sans for display/headings, Inter for body/UI, with the already-configured JetBrains Mono available for technical/tabular labels). **Do NOT introduce Space Grotesk, IBM Plex Mono, or any new font.** The reference was studied only to learn *principles* — hierarchy, scale, tracking, line-height, weight usage, and spacing relationships — never its fonts. The transferable lesson is **the tracking and scale discipline**, applied on top of Qelvix's current fonts: e.g. ~-0.02 to -0.04em on large DM Sans display sizes and ~1.05–1.15 heading line-height.

---

## 5. Color System

**Palette (OBSERVED):**

| Token | Value | Usage |
|---|---|---|
| Base surface | `#FFFFFF` white | Body, most sections, cards |
| Bold contrast surface | `#000000` black | Highlighted pricing card, primary CTA button |
| Primary text | `#000000` on light / `#FFFFFF` on dark | — |
| Muted text | grey (≈ `#6B6B70`-ish) | Eyebrows, secondary copy | ESTIMATED |
| **Accent** | **`#0454FF` electric blue** (`rgb(4,84,255)`) | Primary CTAs, links, key highlights |
| Hero | Full-bleed **image** with white text overlay | Not a solid dark fill | OBSERVED (correction) |
| Borders | **None custom** (only browser-default form borders `#767676`) | — |
| Semantic colors | Not prominent (marketing site, no data states) | — |

**Color logic:**

- **Achromatic base (black + white) + one saturated accent.** The whole site is essentially greyscale with `#0454FF` doing all the "action" signaling. — OBSERVED
- **Accent ratio is very low** — the blue appears only on primary buttons and a few links. High-value scarcity. — OBSERVED
- **Color is intentionally absent** from cards, backgrounds, dividers, and icons; contrast is carried by black/white blocking. — OBSERVED
- **No gradients of note; shadows are rare and soft** (see §9). — OBSERVED
- **Image treatment:** photography/product-UI sits full-bleed inside rounded (24px) clipped containers; images are not tinted. — OBSERVED

**Comparison with Qelvix palette:** Qelvix is **dark-first** (`#0B0B0D` bg / `#121216` surface / `#5B5CFF` accent) with a full **semantic set** (success/warning/error) the reference doesn't need. The reference validates Qelvix's instinct of **one reserved accent**, but Qelvix's `#5B5CFF` is a softer indigo than the reference's harsher `#0454FF` — keep Qelvix's; it reads calmer and more "security-grade." Do **not** adopt the light-dominant black/white base as Qelvix's default; Qelvix's dark identity is a differentiator.

---

## 6. Spacing System

**Recurring gap values (OBSERVED, by frequency):**

`10px ×123` · `8px ×29` · `16px ×25` · `24px ×19` · `20px ×15` · `6px ×12` · `12px ×7` · `100px ×7` · `32px ×6` · `64px ×5` · `40px ×3` · `48px ×3` · `4px ×2`

**Derived spacing scale (ESTIMATED):**

```
4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64 · 96/100
```

- Base rhythm is **8-based**, with **10px** as a common Framer default sub-unit (dominant because of tight intra-component gaps). — OBSERVED
- **Small gaps (8–16px)** bind icon↔text and list items; **24–32px** separates cards; **48–100px** separates sections. — OBSERVED
- **Section-to-section spacing is large** (footer top padding 160px is the outlier) — whitespace as luxury. — OBSERVED

**Applied spacing (OBSERVED samples):**

| Context | Value |
|---|---|
| Card padding | 26px / 30px / 40px (feature card) |
| Button padding | S `10×22`, M `14×36`, L `18×36` |
| Nav padding | `20px 80px` |
| Footer padding | `160px 80px 0` |
| Page gutter | 80px desktop / 20px mobile |

---

## 7. Component System

| Component | Purpose | Structure / Visual | States / Variants | Responsive | Tag |
|---|---|---|---|---|---|
| **Navbar** | Top navigation | 90px tall, transparent over hero, logo left, centered links, pill CTA right | Solid variant on scroll (typical Framer); **collapses to hamburger** on mobile (links hidden) | 90→64px, hamburger < ~810px | OBSERVED |
| **Primary button** | Main action | Pill (r100), solid black or blue, no border/shadow | Solid-black / solid-blue / ghost | Consistent | OBSERVED |
| **Ghost / nav link** | Navigation | Transparent, text-only, 16px | Hover color/underline | Hidden on mobile | OBSERVED |
| **Feature card** | Feature blurb | Flat, r12, padding 26–40px, icon + H4 + body | Default / highlighted (black) | 3-col → 1-col | OBSERVED |
| **Benefit block** | Advantage list | Icon/label + short copy in a grid | — | grid collapse | OBSERVED |
| **Pricing card** | Plans | Flat r12, big price number (48px/700), feature list with check icons, pill CTA; one card inverted black to highlight | Monthly/Yearly toggle; standard vs highlighted | stack | OBSERVED |
| **Eyebrow label** | Section kicker | ~12px uppercase muted text above every H2 | — | — | OBSERVED |
| **Testimonial card** | Social proof | Quote + name + role; flat surface | — | carousel/stack | OBSERVED |
| **Logo strip** | Trust ("10,000+ businesses") | Row of muted logos | — | wrap | OBSERVED |
| **Integration grid** | Tool logos | Grid of icon tiles + "Explore Integrations" CTA | — | grid collapse | OBSERVED |
| **Blog card** | Article teaser | Category pill + read-time + title + excerpt + image | — | 3→1 | OBSERVED |
| **FAQ accordion** | Q&A | Expand/collapse rows | Open / closed | full-width | OBSERVED (content) |
| **Footer** | Site foot | White, tall (160px top pad), link columns + newsletter input + pill "Subscribe" | — | columns stack | OBSERVED |
| **Toggle (billing)** | Monthly/Yearly | Segmented pill switch | Monthly / Yearly | — | OBSERVED (content) |
| **Icons** | Wayfinding | Small (24–28px), likely line icons | — | — | OBSERVED (size) |

---

## 8. Button System

**Anatomy specification (OBSERVED):**

| Property | Value |
|---|---|
| Shape | **Full pill** — `border-radius: 100px` |
| Border | None |
| Shadow | None (flat) |
| Heights | S **42px**, M **50px**, L **58px** |
| Padding | S `10px 22px`, M `14px 36px`, L `18px 36px` |
| Typography | ~12–16px, weight 400–500, tight tracking |
| Icon placement | Optional leading/trailing, ~8px gap | INFERRED |

**Variants (OBSERVED):**

- **Primary (on dark):** solid **black** bg, white label.
- **Primary (on light):** solid **`#0454FF`** bg, white label.
- **Ghost / nav:** transparent, colored text.

**Interaction (OBSERVED / INFERRED):**

- Hover: `transition: all` present broadly; a fast `transform 0.1s cubic-bezier(0.2,0,0,1)` micro-press. Likely subtle scale/opacity/bg shift. — OBSERVED (transition) / INFERRED (exact effect)
- Focus / active / disabled: not exposed in static capture — **NOT VERIFIED**.

---

## 9. Card / Surface Language

| Property | Value | Tag |
|---|---|---|
| Border radius | **12px** (inner cards), **24px** (large containers) | OBSERVED |
| Border treatment | **None** | OBSERVED |
| Shadow | **None** on general cards; rare soft ambient `rgba(0,0,0,0.08) 0 13px 37px` on floating product-UI imagery only | OBSERVED |
| Background contrast | White cards; **one black card** per group for emphasis | OBSERVED |
| Inner padding | 26–40px | OBSERVED |
| Nested surfaces | Minimal; content sits directly on the card | OBSERVED |
| Image treatment | Full-bleed inside rounded (24px) clipped containers | OBSERVED |
| Corner treatment | Uniformly rounded, generous | OBSERVED |

**System classification: FLAT + EDITORIAL COLOR-BLOCK.** — INFERRED
**Why:** No borders, no elevation, no glass. Depth and hierarchy are produced by *swapping the surface color* (black vs white) and by *whitespace*, which is a confident, high-craft choice that reads as premium and reduces visual noise. The only elevation is reserved for "real product" screenshots to make them feel tangible.

---

## 10. Iconography

| Property | Reading | Tag |
|---|---|---|
| Style | Line / outline icons | INFERRED |
| Stroke weight | ~1.5–2px | ESTIMATED |
| Size | 24–28px (measured small images at 28px) | OBSERVED |
| Corner geometry | Rounded joins to match the soft radius language | INFERRED |
| Fill vs outline | Predominantly outline; check-marks in pricing may be filled | INFERRED |
| Icon-to-text spacing | ~8px | ESTIMATED |
| Decorative vs functional | Mostly functional (feature/benefit/pricing markers) | INFERRED |

**Fit:** A consistent 1.5px line-icon set (e.g., Lucide/Feather family) matches this language. Qelvix already uses Lucide — compatible.

---

## 11. Motion / Interaction

**Motion inventory (OBSERVED where noted):**

| Motion | Trigger | Duration | Easing | Distance/Scale | Purpose | Tag |
|---|---|---|---|---|---|---|
| Section scroll-reveal | Element enters viewport | ~300–600ms | decelerate/emphasized | fade 0→1 + translateY (rise) | Draw the eye down the page | OBSERVED (23 `data-framer-appear-id` nodes; 616 opacity/will-change markers) |
| Button micro-press | Hover / press | **~100ms** | `cubic-bezier(0.2,0,0,1)` | small transform | Tactile feedback | OBSERVED |
| Generic hover | Hover | `transition: all` (default) | ease | color/bg/opacity | State feedback | OBSERVED (809 elements) |
| Parallax / cursor FX | — | — | — | — | None detected | OBSERVED (absent) |

**FUNCTIONAL motion:** button/hover feedback, accordion expand — communicates state.
**DECORATIVE motion:** the scroll fade-and-rise reveals — pure marketing delight, adds no information.

**Easing character:** emphasized-decelerate (fast out of the gate, settles softly) — the modern "premium" curve.

---

## 12. Responsive Behavior

| Aspect | Desktop (1440) | Mobile (375) | Tag |
|---|---|---|---|
| Navigation | Full link row + pill CTA, 90px | **Hamburger**, links hidden, 64px | OBSERVED |
| Grid | 2–3 col feature/benefit/pricing/blog grids | Single column stack | OBSERVED / INFERRED |
| Typography | H1 64 / H2 56 / body 16 | H1 36 / H2 28 / body 15 | OBSERVED |
| Padding / gutter | 80px | 20px | OBSERVED |
| Cards | Side-by-side | Stacked full-width | INFERRED |
| Images | Full-bleed cover | Scale to width | INFERRED |
| CTA | Inline in nav + sections | Likely full-width in menu | INFERRED |
| Content priority | Everything visible | Nav + secondary content collapsed behind menu | OBSERVED |

**Tablet (~768–1024px): NOT DIRECTLY CAPTURED — ESTIMATED.** Expect an intermediate type scale (H1 ~44–52px), 2-col grids, hamburger appearing somewhere ~810px, gutter ~40px.

**Type-scale ratio:** desktop→mobile is roughly **0.5–0.56×** on large headings (a steep, deliberate reduction so mobile isn't overwhelmed). — OBSERVED

---

## 13. Visual Hierarchy

**Attention order in a typical section:**

1. **Big heading (56–64px)** — dominates by sheer size + tight tracking.
2. **Accent CTA (blue/black pill)** — the only saturated element, pulls the click.
3. **Product imagery / highlighted (black) card** — contrast block.
4. **Body subhead** — one calm line, low contrast.
5. **Eyebrow label + supporting detail** — smallest, muted, sets context.

**Mechanisms (OBSERVED):**

- **Size** — 3–4× jump from body to heading is the primary tool.
- **Contrast** — black surface / blue accent against white does the rest.
- **Whitespace** — isolation makes each element feel important.
- **Position** — centered intros anchor the eye; CTA sits directly under the promise.
- **Color** — used *only* to elevate the CTA.
- **Typography** — weight (600 vs 400) and tracking separate levels.
- **Motion** — reveal-on-scroll times attention to reading order.

---

## 14. Design Tokens (Reconstructed)

> Names are proposed; values are OBSERVED unless marked. This is a *reconstruction of the reference*, not a Qelvix spec (see §18 for Qelvix V2).

**COLOR**
```
--ref-white         #FFFFFF   (OBSERVED)
--ref-black         #000000   (OBSERVED)
--ref-accent        #0454FF   (OBSERVED)
--ref-text-muted    ~#6B6B70  (ESTIMATED)
--ref-border        none / #767676 UA-default only (OBSERVED)
```

**TYPOGRAPHY**
```
--ref-font          "Archivo", sans-serif           (OBSERVED)
--ref-display  64/70  w600  ls -2.56px               (OBSERVED)
--ref-h2       56/62  w600  ls -2.24px               (OBSERVED)
--ref-h3       48/53  w700  ls -1.92px               (OBSERVED)
--ref-h4       36/40  w500  ls -0.72px               (OBSERVED)
--ref-body     16/22  w400  ls -0.2px                (OBSERVED)
--ref-eyebrow  ~12    uppercase, muted               (OBSERVED size)
```

**SPACING** (8-based, 10 sub-unit)
```
4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64 · 96   (ESTIMATED from OBSERVED gaps)
```

**RADIUS**
```
--ref-r-sm   8px    (OBSERVED)
--ref-r-md   12px   (OBSERVED, dominant on cards)
--ref-r-lg   16px   (OBSERVED)
--ref-r-xl   24px   (OBSERVED, dominant on containers)
--ref-r-2xl  48px   (OBSERVED, occasional)
--ref-r-pill 100px  (OBSERVED, buttons)
```

**BORDER**
```
default: none (flat system)   (OBSERVED)
```

**SHADOW**
```
--ref-shadow-none    (default, OBSERVED)
--ref-shadow-float   0 13px 37px rgba(0,0,0,0.08)   (OBSERVED, rare — product imagery only)
```

**MOTION**
```
--ref-dur-micro   ~100ms   ease cubic-bezier(0.2,0,0,1)   (OBSERVED)
--ref-dur-reveal  ~300-600ms  emphasized-decelerate        (OBSERVED/ESTIMATED)
```

**BREAKPOINTS** (ESTIMATED — Framer defaults)
```
desktop ≥1200 · tablet ~810–1199 · mobile ≤809
```

---

## 15. Design Principles

Derived from the reference (not generic advice):

```
01 — Hierarchy comes from scale, not decoration (3–4× heading-to-body jump).
02 — Tight negative tracking on large type reads as "premium".
03 — One reserved accent; the rest is achromatic. Scarcity = value.
04 — Whitespace is the primary luxury signal (huge section padding).
05 — Surfaces are flat; contrast is a color swap (black vs white), never a shadow.
06 — Elevation is rare and reserved for "real product" imagery only.
07 — Every section repeats one template: eyebrow → heading → subhead → grid.
08 — Big radii on containers (24px), full pills on actions — a soft, confident geometry.
09 — Body copy stays in a 60–75ch measure; headings stay narrow for shape.
10 — Motion is choreography: scroll-reveal times the reading order.
11 — Micro-interactions are fast (~100ms) and tactile; page reveals are slower.
12 — Mobile halves the type scale and hides nav behind a hamburger — clarity over parity.
```

---

## 16. What Qelvix Should Borrow

> Format: **REFERENCE** (what it does) → **QELVIX APPLICATION** (how to adapt) → **WHY**.

**A. Scale-driven hierarchy**
- REFERENCE: 56–64px headings vs 16px body; 3–4× jump.
- QELVIX: Introduce a true **display tier using the existing DM Sans** (e.g. 48–56px) for page titles and the Risk Score; widen the gap between H1/H2/body so the current UI stops feeling flat. **No new font — DM Sans + Inter stay as-is.**
- WHY: Clear at-a-glance hierarchy helps an operator triage a dashboard faster.

**B. Tight display tracking + tight heading line-height**
- REFERENCE: ~-0.04em, LH ~1.1 on big text.
- QELVIX: Apply ~-0.02 to -0.04em and LH ~1.05–1.15 on the **existing DM Sans** display/H1/H2.
- WHY: Borrowing the tracking/line-height *principle* adds the same premium polish while keeping Qelvix's current fonts unchanged.

**C. Accent reserved strictly for action**
- REFERENCE: `#0454FF` only on primary CTAs/links.
- QELVIX: Reserve `#5B5CFF` for primary buttons, active nav, key interactive affordances — **not** for decorative fills, borders, or headings.
- WHY: Makes the "do this next" action unmistakable in a busy security console.

**D. Whitespace as rhythm (adapted density)**
- REFERENCE: very large section padding.
- QELVIX: Increase breathing room *around card groups and section headers* (not inside data tables). Adopt a consistent vertical rhythm scale.
- WHY: Reduces the cramped feeling while preserving data density where it matters.

**E. Flat surfaces with intentional contrast**
- REFERENCE: flat cards, contrast via color-block.
- QELVIX: Keep flat `#121216` surfaces; use a **single hairline `#26262C` border** for separation (dashboards need edges tables don't get from color alone) and reserve any inversion (a lighter/accent-tinted card) for the one KPI you want to elevate (e.g. Risk Score).
- WHY: Flat + hairline is calmer and more "instrument-grade" than shadows; the one elevated card guides the eye.

**F. Eyebrow/section labels**
- REFERENCE: small uppercase muted kicker over every section.
- QELVIX: Adopt the *pattern* — ~11–12px UPPERCASE, muted, with slight positive tracking — using the **existing type system**: **Inter** for section/eyebrow labels, or the **already-configured JetBrains Mono** for technical/tabular labels ("CRITICAL", "LAST SCAN", "RISK") if a monospaced treatment is wanted. **Do not introduce any new font.**
- WHY: The uppercase-muted-label pattern sharpens section hierarchy; using Inter/JetBrains Mono keeps Qelvix's identity intact.

**G. Consistent radius + spacing scale**
- REFERENCE: 8/12/16/24 radii; 8-based spacing.
- QELVIX: Standardize on radius `6/8/12/16` and spacing `4/8/12/16/24/32/48/64` tokens everywhere.
- WHY: Consistency is what makes a system feel designed rather than assembled.

**H. Choreographed, functional motion**
- REFERENCE: fast micro (~100ms) + reveal.
- QELVIX: Use **~120ms** hover/press micro-interactions and **~200–240ms** skeleton→content fades; number count-up on the Risk Score. **Skip decorative parallax/scroll reveals in the dashboard.**
- WHY: Motion should confirm state and data freshness, not entertain.

**I. Mobile clarity over parity**
- REFERENCE: halve type, hamburger nav.
- QELVIX: Collapse the sidebar to a drawer, reduce heading scale, prioritize Risk Score + active findings on small screens.
- WHY: Operators do check dashboards on phones; ruthless prioritization beats shrinking everything.

---

## 17. What Qelvix Should Avoid

- **Do NOT adopt the light black/white base as default** — Qelvix's dark-first identity is a differentiator for a security product. — (branding/colors)
- **Do NOT swap to `#0454FF`** — it's harsher than Qelvix's `#5B5CFF` and off-brand. Keep the indigo. — (colors)
- **Do NOT copy Archivo, and do NOT introduce Space Grotesk, IBM Plex Mono, or any new font** — **Preserve Qelvix's existing DM Sans + Inter typography system. Borrow only the reference site's principles of hierarchy, scale, tracking, line-height and spacing.** (The typography decision is FINAL.) — (typography)
- **Do NOT import the marketing airiness into data views** — a security console needs higher density than a CRM landing page; oversized padding inside tables wastes operator time. — (density)
- **Do NOT make everything a pill** — full-pill buttons suit marketing; for dense toolbars/filters use medium-radius buttons and reserve pills for tags/severity chips. — (components)
- **Avoid decorative scroll-reveal / parallax in the app** — it delays information and feels gimmicky in a monitoring tool. — (interaction)
- **Avoid shadow-based elevation everywhere** — but also don't go fully borderless; dashboards need hairline separation the reference can skip. — (surface)
- **Do NOT center-align dense content** — centered intros work for marketing; dashboards should stay left-aligned and scan-friendly. — (layout)

---

## 18. Proposed Qelvix Design System V2 (Specification Only — NOT Implemented)

**Preserve:** Qelvix brand identity, existing colors, the three-font system, security credibility, technical clarity, accessibility.
**Improve:** hierarchy, spacing, cards, navigation, dashboard composition, data-viz language, interaction, responsive behavior, visual consistency.

### 18.1 Color (unchanged values; clarified roles)
```
Dark:  bg #0B0B0D · surface #121216 · surface-raised (new, est.) #17171C
       text #F5F5F2 · muted #9898A3 · border #26262C
       accent #5B5CFF (ACTION ONLY) · success #32A071 · warning #B7791F · error #C24141
Light: bg #F6F5F1 · surface #FFFFFF · text #111113 · muted #6B6B70 · border #E4E2DD · accent #4C4DFF
Severity: map Critical/High/Medium/Low to existing error/warning + derived tints (non-color-dependent, see §19).
```

### 18.2 Typography — EXISTING fonts only (add a display tier + tracking rules; NO new fonts)

> **FINAL:** Preserve Qelvix's existing **DM Sans + Inter** system. Do NOT introduce Space Grotesk, IBM Plex Mono, or any other font. Only the *principles* (scale, tracking, line-height, weight) are borrowed from the reference.

```
Display   DM Sans 600  48–56px / LH 1.10 / ls -0.02em   (page titles, Risk Score)   [font-display]
H1        DM Sans 600  32–36px / LH 1.15 / ls -0.02em                                [font-display]
H2        DM Sans 600  24px    / LH 1.20 / ls -0.01em                                [font-display]
H3        DM Sans 600  18–20px / LH 1.25                                             [font-display]
Body      Inter 400    14–16px / LH 1.5                                              [font-sans]
Body-sm   Inter 400    13px    / LH 1.45                                             [font-sans]
Label/Eyebrow  Inter 500 (or existing JetBrains Mono)  11–12px UPPERCASE, muted, +0.04em tracking
Metric/Number  Inter 500 tabular-nums (or existing JetBrains Mono)  (KPIs, counts, timestamps)
```

*(DM Sans, Inter, and JetBrains Mono are already in the production setup — nothing new is added. JetBrains Mono is optional for technical/tabular labels only.)*

### 18.3 Spacing
```
4 · 8 · 12 · 16 · 24 · 32 · 48 · 64   (+96 for page-level bands)
Card padding 20–24px · Section gap 32–48px · Table row 12–16px
```

### 18.4 Radius
```
sm 6 · md 8 · lg 12 · xl 16 · pill 999 (chips/tags/toggles only)
```

### 18.5 Border & Elevation
```
Hairline border  1px #26262C (dark) / #E4E2DD (light)  — default separation
Elevation: flat by default. One optional soft shadow for popovers/menus:
  0 8px 24px rgba(0,0,0,0.35) (dark)  — NOT on static cards.
Emphasis: a single accent-tinted or raised card for the primary KPI.
```

### 18.6 Motion
```
--dur-micro  120ms  cubic-bezier(0.2,0,0,1)   (hover/press/toggle)
--dur-enter  200ms  ease-out                  (skeleton→content, dropdowns)
--dur-number 600ms  ease-out                  (Risk Score count-up)
Respect prefers-reduced-motion.
```

### 18.7 Breakpoints
```
mobile ≤640 · tablet 641–1023 · desktop 1024–1439 · wide ≥1440
Content max-width ~1200–1280px; sidebar collapses to drawer < 1024.
```

---

## 19. Dashboard Design Direction (Direction Only — do NOT build yet)

| Element | Direction | Tag |
|---|---|---|
| **Risk Score** | Hero KPI: large **DM Sans** display number + muted **Inter** (or existing JetBrains Mono) band label; count-up on load; single elevated/accent-tinted card | INFERRED |
| **Findings** | Left-aligned list/table, hairline row separators, severity chip (pill) + mono count; density over decoration | INFERRED |
| **Severity indicators** | Color **plus** a non-color cue (label text + icon/shape) so it's not color-dependent; reuse existing severity tokens | INFERRED (a11y) |
| **Scan history** | Clean timeline/list; mono timestamps (tabular-nums); status pill (queued/running/completed/failed) | INFERRED |
| **Assets** | Card grid or table; flat surfaces + hairline; mono for IDs/domains | INFERRED |
| **Compliance (DPDP)** | Checklist with clear pass/attention states; progress as a simple bar, accent reserved for "action needed" | INFERRED |
| **Recommendations** | Ranked list by severity; primary action button uses the reserved accent | INFERRED |
| **Activity / Alerts** | Compact feed; eyebrow-style mono timestamps; muted until it needs attention | INFERRED |
| **Charts** | Flat, minimal gridlines, severity-token fills, no gradients; label + value; theme-aware (light/dark) | INFERRED |
| **Empty states** | Generous whitespace + one clear accent CTA ("Run a scan") — borrow the reference's calm confidence here | INFERRED |
| **Loading states** | Skeletons that match final layout; 200ms fade to content; no spinners where a skeleton fits | INFERRED |

**Guiding idea:** apply the reference's *calm, hierarchical, accent-reserved* language to a **denser, dark, instrument-grade** surface — marketing polish, operator ergonomics.

---

## 20. Implementation Recommendations

1. **Tokenize first.** Land the V2 color-role, type, spacing, radius, and motion tokens (§18) as CSS variables + Tailwind theme extension **before** touching any screen. Consistency comes from tokens.
2. **Typographic pass is the highest ROI, lowest risk.** Adding a display tier + tracking/line-height rules to the **existing DM Sans** (fonts unchanged) visibly lifts perceived quality without new components or new fonts.
3. **Standardize the card + section-header primitives** (flat + hairline + eyebrow-label) and reuse them everywhere; kill one-off spacing.
4. **Reserve the accent** — audit current usage and remove `#5B5CFF` from any non-action context.
5. **Motion tokens, applied conservatively** — micro-interactions + skeleton fades only; no decorative reveals in-app.
6. **Sequence:** tokens → typography → card/section primitives → dashboard KPI/Risk Score → tables/lists → empty/loading states → responsive drawer. Each step ships independently and is reversible.
7. **Validate accessibility at each step** — severity is never color-only; contrast meets WCAG AA on both themes.
8. **Keep it research-to-spec until approved** — this document is direction; no production UI should change until the redesign is greenlit.

---

### Provenance & Limitations
- Captured live at 1440×900 and 375×812; tablet values are ESTIMATED, not measured.
- Framer's generated CSS hides authored token names — all "tokens" here are reconstructed from computed values.
- Hover/focus/active/disabled button states and the FAQ/testimonial interactions were not exercised — **NOT VERIFIED**.
- No proprietary assets were copied; no layouts were reproduced pixel-for-pixel. This is design research, not a clone.
