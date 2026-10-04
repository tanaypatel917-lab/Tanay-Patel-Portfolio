# Portfolio direction — locked implementation brief

Status: superseded on 2026-09-01 by a light, Swiss-editorial redesign (paper background,
Overused Grotesk + Fragment Mono, one vermilion accent, typographic project posters).
See `AGENTS.md` for the current visual system. Sections 1 to 3 (purpose, content source,
information architecture, what to exclude) and the motion/accessibility contract in
sections 6 to 7 still apply; the dark palette, cyan signal, numbered rails and scroll
cue described below do not.

Original brief:

## 1. Product direction

- **Purpose:** establish Tanay Patel as a high-school builder who turns curiosity in finance, systems, and design into specific, testable work.
- **Audience:** judges, admissions readers, collaborators, and experienced builders scanning quickly for credibility.
- **Tone:** luxury editorial, cinematic precision, engineered performance. Ambitious but humble; never a generic student résumé or startup pitch.
- **Priority:** proof first. The solo Kean I.D.E.A. win and ongoing Wi-Fi/heartbeat R&D appear before academic and team evidence.
- **Memorable detail:** Tanay’s real portrait resolves from coarse ordered pixels into a readable monochrome dither field, then reacts only when interaction adds meaning.
- **Stack:** keep Next.js 14, TypeScript, Tailwind, and the existing `framer-motion` import path. Use Canvas 2D for the portrait. Do not add `motion`, another animation library, or a new UI kit.

## 2. References and portrait provenance

| Item | Locked use |
| --- | --- |
| Supplied still | `/Users/HS/Desktop/Screenshot 2026-08-24 at 1.27.12 PM.png`; reference for the large monochrome dither field, quiet technical rail, and image-led first viewport. Do not copy its exact layout, labels, branding, or subject. |
| Interaction reference | `https://mauriciojuba.com/`; borrow only the principle of a portrait that resolves, responds locally to pointer proximity, and shifts subtly with scroll. Do not copy code, assets, content, branding, or page structure. The live site can change; this brief is the contract. |
| Portrait source page | `https://tanaypatel.carrd.co/` |
| Original Carrd asset | `https://tanaypatel.carrd.co/assets/images/image01.jpg?v=78ab9e6e` |
| Canonical local asset | `public/images/tanay-headshot.jpg`, referenced in the app as `/images/tanay-headshot.jpg` |

Portrait validation completed on 2026-08-29:

- JPEG, RGB, `360 × 368`, `13,350` bytes.
- SHA-256: `57a00eeaa7b1c4e1d461713d105de6966e61778bced7ee2a8a99a058c6b7d3a5`.
- The direct Carrd asset and the canonical local file have the same SHA-256.
- `public/images/tanay-portrait.jpg` is an identical duplicate. Do not reference it; remove it during implementation cleanup once the canonical path is integrated.
- The source is a tight, nearly square, front-facing head-and-shoulders crop. Preserve the hair, eyes, chin, and collar. A desktop cover crop may trim outer shoulders, but must not crop the top of the hair or chin. Start from centered positioning; test the final dither at every breakpoint rather than assuming the color image crop transfers cleanly.

## 3. Existing-product audit

### Keep and integrate

| Existing file or idea | Decision |
| --- | --- |
| `src/content/portfolio.ts` | Keep unchanged as the typed, truthful source of identity, projects, evidence, disciplines, navigation, and contact copy. UI components consume it; do not duplicate strings in components. |
| `src/components/Landing/InteractiveDitherPortrait.tsx` and `src/lib/dither.ts` | Integrate as the portrait engine after its parallel card completes. Its Canvas 2D approach, deterministic ordered dither, capped work size/DPR, on-demand RAF, observer cleanup, and reduced-motion path match this direction. Pass the canonical local source and meaningful alt text. |
| `src/hooks/useReducedMotion.ts` | Keep as the shared motion gate. Reduced motion must change behavior, not merely shorten durations. |
| Existing landing’s dither portrait, oversized two-line name, dark field, and thin bottom metadata rail | Keep the ideas. Recompose them into the asymmetric grid below and replace generic copy with the verified content source. |
| `src/components/shared/SmoothScroll.tsx` | Keep only if native keyboard, anchor, and reduced-motion behavior remain correct. It is enhancement, never a dependency for navigation. |
| Near-black foundation and hairline separators | Keep, but replace the old blue accent and cool white with the locked tokens below. |

### Change

| Existing file | Required change |
| --- | --- |
| `src/app/page.tsx` | Replace `Landing → Cars → Building → Finance → Experience` with `Top → Work → Proof → Contact`. |
| `src/components/Landing/LandingSection.tsx` | Keep the first-viewport role but rebuild it around the locked hero grid, verified metadata, and `InteractiveDitherPortrait`. |
| `src/components/Landing/AnimatedName.tsx` | Preserve the two-line name entrance. Remove perpetual pointer parallax and per-letter `will-change`; the name settles after entry and has a reduced-motion static state. |
| `src/components/Landing/Tagline.tsx` | Replace “Builder · Enthusiast · Creator” with the exact intro/identity copy from `portfolioContent`. Avoid a slow letter-by-letter sentence reveal. |
| `src/components/Landing/Socials.tsx` | Replace icon-only circles with explicit Email and LinkedIn text links. Do not render an unverified GitHub link. Use 44px minimum hit areas and visible focus. |
| `src/components/Navigation/Navbar.tsx` | Keep the compact fixed structure; change destinations to `Work`, `Proof`, and `Contact`, with `TP` returning to `#top`. Remove the sound control. Active state is an icy-cyan hairline, not a glowing blue underline. |
| `src/components/shared/AppShell.tsx` | Keep shell/landmark responsibility. Remove sound, forced preloading, and custom-cursor concerns from the delivered route. Ensure there is one `main`. |
| `src/components/shared/Footer.tsx` | Turn it into the final contact frame described below. Use the verified email and LinkedIn only; remove “a lot of coffee” and the generic role line. |
| `src/app/globals.css` and `src/lib/constants.ts` | Consolidate on the locked token values; remove old `#4a9eff` uses from the delivered route. |
| `src/app/layout.tsx` | Update title/description to the builder positioning and keep semantic language metadata. |

### Remove from the delivered route

Do not delete strong experiments merely to erase history, but none of the following belongs in the final page or initial bundle unless reused for a verified proof entry:

- `DitherPortrait.tsx`: continuous full-window RAF, constant noise, scanline, and uncapped work are superseded by `InteractiveDitherPortrait`.
- `CarsSection` and its Three.js car scene: visually ambitious, but it makes an interest outrank actual proof and forces heavy preload/audio behavior.
- `BuildingSection` and keyboard scene: preserve as an experiment, not a portfolio section. Generic “building things” copy does not prove the named work.
- `FinanceSection` and `MoneyStack`: replace the sparse 250vh/card sequence with the DECA, AP Microeconomics, and Accounting evidence rows.
- `ExperienceSection`: remove the timeline/card layout and its unverified freelance, car-meet, investing, and date claims.
- `Preloader`: do not hold the page for 1.5–6 seconds or preload `car.glb` when the hero can render immediately.
- `SoundProvider`, engine/key sounds, sound toggle, and `Cursor`: remove from the delivered route. They do not clarify state and compete with the portrait interaction.
- Rounded translucent cards, blue glow nodes, pill forests, nested surfaces, and long pinned scroll segments.

Known implementation blocker: `src/app/chillax.css` contains stray `2sq` on line 2 and currently breaks `npm run build`. The implementation card must fix it before final verification.

## 4. Locked visual system

### Color tokens

- `--background: #0A0A0A` — page field.
- `--surface: #111111` — rare elevated/alternate field; do not turn every entry into a card.
- `--foreground: #F3F0E8` — warm primary text.
- `--muted: #9A9891` — secondary copy; must still meet contrast for its size.
- `--line: rgba(243, 240, 232, 0.16)` — hairline rules.
- `--signal: #C3FFFC` — the only chromatic signal; use for status squares, focus, active rules, and small numeric/metadata accents.

No purple, blue substitute, large cyan glow, gradient blob, or tinted image outline. Dither output remains black/warm-white; cyan belongs to interface signals, not skin or background.

### Typography

- **Display:** existing Chillax, weights 600–700, for `TANAY PATEL` and major section titles. Do not add another display family.
- **Body:** system sans stack for clarity and speed.
- **Technical metadata:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`, uppercase where labels are short.
- Display name: two lines, tight leading (`0.82–0.9`), slightly negative tracking, `clamp(4rem, 11vw, 11rem)` on desktop and `clamp(3.35rem, 18vw, 6rem)` on phone. It must never clip horizontally.
- Body measure: 48–68 characters. Use balanced wrapping only for short headings and pretty wrapping for short summaries.
- Status numbers, grades, and scores use tabular numerals.

### Geometry and depth

- Global gutter: `clamp(20px, 4vw, 64px)`; content maximum `1600px`.
- Desktop grid: 12 columns; tablet: 8; phone: 4. Hairline rules establish grouping.
- Corners are square or subtly rounded (`0–8px`). Do not use large rounded cards.
- Use borders for structure. Avoid ambient shadows; the portrait and typography provide depth.
- All icon/text controls have at least a `44 × 44px` target and a clearly visible cyan/white focus ring.

## 5. Exact information architecture and layout

`src/content/portfolio.ts` remains the single source of truth. Render its strings exactly; do not add dates, rankings, users, revenue, customers, accuracy, technologies, or outcomes.

### 01 — Top (`#top`)

Desktop/wide layout:

- Minimum height `100svh`; fixed/sticky nav above a 12-column composition.
- Portrait occupies roughly columns 6–12 and extends from the top edge to the bottom technical rail. It is a field, not a card. Fade its left edge into the page field so text and image meet without a hard panel boundary.
- Text occupies columns 1–7 and sits in the lower half. `TANAY` / `PATEL` may cross the portrait seam but must not cover the eyes.
- Order: eyebrow `Finance / systems / design`; display name `TANAY PATEL`; role `High-school builder`; headline `I turn curiosity into work I can test.`; exact summary from `portfolioContent.intro.summary`.
- Compact metadata: `New Jersey` and `Building alongside school`.
- Explicit links: `Email` and `LinkedIn`, using `portfolioContent.contact.links`.
- Bottom technical rail: left `01 / TOP`; center an icy-cyan 6px square followed by `FINANCE · SYSTEMS · DESIGN`; right `SCROLL ↓`. This adapts the reference’s instrumentation without copying its `THEME`, time, or labels.

Tablet (`768–1199px`): use an 8-column grid. Portrait occupies columns 4–8; name/intro occupy columns 1–5. Keep the face readable and prevent metadata from colliding with the rail.

Phone (`<768px`): use normal document flow, not a text-over-face full-screen crop. Nav first, then a near-square portrait field, then the name/intro/links. The technical rail becomes two rows or omits the center phrase if it cannot fit. Keep the first viewport clearly identifiable even when the contact links fall just below it.

### 02 — Work (`#work`)

Heading: `Selected work` with a compact `02 / WORK` index.

Render two full-width editorial rows separated by hairlines, not cards:

1. `Kean I.D.E.A.` / `Completed` / `A solo eco-grocery concept` — render its exact summary and proof. This is the dominant row and must make `Solo winner of the Kean I.D.E.A. eco-grocery competition.` immediately scannable.
2. `Security R&D` / `In progress` / `Heartbeat sensing through Wi-Fi` — render its exact summary and the explicit caveat that it is ongoing, not finished or deployed.

On desktop, use columns for index/category, title/summary, and proof/status. On phone, stack those fields in that order. Status is text plus a small signal square; never color alone. There are no project CTAs because no verified project URLs exist.

### 03 — Proof (`#proof`)

Heading: `Evidence, not adjectives` with `03 / PROOF`.

Render these five evidence items from `portfolioContent.evidence` as compact ruled rows:

- DECA Finance state qualifier — `State qualifier in DECA Finance.`
- AP Microeconomics — `AP score: 5.`
- Honors Accounting — `Course grade: 92%.`
- Princeton Volleyball Club — `16U setter.`
- High-school JV — `128 lb starter.`

Desktop: two-column editorial list with aligned labels and tabular proof values. Phone: one column. Finance/academic proof appears before sports. Sports read as supporting discipline, never the hero.

After the evidence list, render the four `portfolioContent.disciplines` entries—Finance, Systems, Design, Team discipline—as one compact four-column ruled strip on desktop and a two-by-two/one-column list on smaller screens. Use their exact summaries; do not convert them into cards.

### 04 — Contact (`#contact`)

A closing frame of at least `70svh`, separated by one hairline rule:

- Eyebrow: `04 / CONTACT`.
- Display title: exact `Let us compare notes.`
- Exact contact summary from `portfolioContent.contact.summary`.
- Primary link: `Tanay001@icloud.com` → `mailto:Tanay001@icloud.com`.
- Secondary link: LinkedIn → `https://www.linkedin.com/in/tanay-patel-1b2b2332b/`.
- Final baseline: `Tanay Patel · New Jersey` and a back-to-top control.

Do not show GitHub, phone, downloadable résumé, availability promises, or social accounts until verified.

## 6. Portrait and motion contract

Use `InteractiveDitherPortrait` with `src="/images/tanay-headshot.jpg"` and meaningful alt text such as `Portrait of Tanay Patel`. Wrap it for layout/scroll transforms rather than adding a second rendering engine.

| State | Required behavior |
| --- | --- |
| Before decode | Stable near-black portrait region with reserved dimensions; no layout shift and no indefinite loader. |
| Entry | Resolve deterministic ordered pixels from coarse/dark to the readable final dither in `1.2s`, using `[0.22, 1, 0.36, 1]`. Name/metadata enter once with opacity and at most 16px vertical travel. |
| Pointer | Fine-pointer hover creates one smoothed local clarity/contrast field around the pointer, about 25–30% of the portrait’s shorter side. No glow, random noise, elastic warping, or full-page cursor follower. Fade the field out on leave. |
| Scroll | Move only the portrait wrapper, at most `-24px` vertically and `1.015` scale across the hero exit. Text may fade by at most 20%. Do not animate width, height, top, or left. |
| Touch/coarse pointer | No hover simulation. Render the resolved portrait and only the restrained scroll transform if device capability allows it. |
| Offscreen | Stop/cancel portrait RAF work through intersection visibility. No continuous render loop after entry/pointer settling. |
| Reduced motion | Render one stable final dither frame. Disable entry resolve, pointer field, parallax, smooth scrolling, custom cursor, and auto motion. Content remains complete and in the same reading order. |
| Weak device | Cap DPR/work resolution as the engine does; prefer a static final frame over dropped interaction frames. |
| Asset failure/no JS | Show a local, meaningful image fallback or accessible equivalent; never leave an announced blank canvas. |

Use `framer-motion` consistently for DOM transitions and native requestAnimationFrame only inside the Canvas 2D engine. Section reveals are one-shot opacity/translate transitions (`300–500ms`); do not pin long sections or stagger lists beyond `60ms` per item. Every animation must communicate load, state, or spatial continuity. Never use `transition: all`.

## 7. Accessibility, responsiveness, and performance

- Semantic order: `header/nav`, one `main`, four labelled `section` elements, and closing `footer`/contact semantics.
- One `h1` for Tanay’s name; section titles are `h2`; entry titles are `h3`.
- Anchor navigation works without Lenis/JavaScript and accounts for the fixed header with `scroll-margin-top`.
- Keyboard focus is obvious; links have descriptive visible text; external LinkedIn behavior is announced by standard browser semantics, not an icon alone.
- Dither contrast must preserve facial readability. Cyan-on-black and all muted text must meet WCAG AA for their rendered size.
- No horizontal overflow at 320, 375, 768, 1024, 1440, or 1920px widths. Long status labels and email text wrap safely.
- Use `100svh`/normal flow rather than relying only on `100vh`; respect mobile browser chrome and safe-area insets.
- Reserve portrait aspect ratio to prevent CLS. Core visual assets are local; do not hotlink Carrd or the motion reference at runtime.
- Initial page must not load the car/keyboard models, audio, GSAP ScrollTriggers, or an artificial preloader.
- Clean up all listeners, observers, timers, and RAF handles. Pause work when hidden/offscreen.

## 8. Implementation acceptance checklist

- [ ] The first viewport identifies Tanay, his builder focus, New Jersey, current status, and real portrait without requiring scroll.
- [ ] Page order and IDs are exactly `top`, `work`, `proof`, `contact`; navigation and back-to-top links work with keyboard and native scrolling.
- [ ] All rendered copy comes from `src/content/portfolio.ts`; no legacy or invented claims remain.
- [ ] `/images/tanay-headshot.jpg` is the only portrait path used, loads locally, and preserves the face at all breakpoints.
- [ ] Dither entry, local pointer field, restrained scroll depth, offscreen pause, touch behavior, and reduced-motion static state match the motion contract.
- [ ] Palette uses near-black, warm white, and only `#C3FFFC` as the signal color; no old blue glow, purple gradient, or card soup remains.
- [ ] Existing car, keyboard, money-stack, timeline, audio, custom cursor, and artificial preloader are absent from the delivered route and initial bundle.
- [ ] Fixed header, 44px targets, visible focus, headings, contrast, alt treatment, and reduced motion pass manual checks.
- [ ] No clipped display type, overlap, horizontal overflow, or illegible metadata at phone, tablet, laptop, and wide-desktop widths.
- [ ] `src/app/chillax.css` build typo is fixed during implementation.
- [ ] `npm run typecheck`, `npm run lint`, and `npm run build` pass; production build is exercised at desktop/mobile widths with no console errors or broken links/assets.
