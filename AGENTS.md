# Tanay Patel portfolio

Next.js 14 (app router), TypeScript, plain CSS in `src/app/globals.css` (Tailwind is
installed but the page is styled with hand-written classes), `framer-motion` for DOM
motion, Lenis for inertia scrolling, Canvas 2D for the dither portrait.

## Commands

- `npm run dev` - dev server on http://localhost:3000
- `npm run typecheck` - `tsc --noEmit` (covers legacy components too)
- `npm run lint` - `next lint` (one pre-existing warning in `src/components/Landing/PhotoReveal.tsx`, not in the route)
- `npm run build` - production build; stop `next dev` first, both write to `.next/`
- `npm run start -- -p 3000` - serve the production build (kill the previous `next-server` first or it fails with EADDRINUSE and the old build keeps serving)

## Delivered route

`src/app/page.tsx` renders `Hero` -> Work -> Proof -> `CarsSection`; `AppShell` wraps it
with the skip link, `SmoothScroll`, `Navbar` and `Footer` (which owns `#contact`).
Section ids are `top`, `work`, `proof`, `cars`, `contact`. All copy comes from
`src/content/portfolio.ts`; do not add claims, dates or metrics that are not in that file.

Legacy experiments (`Cars/CarCanvas|CarScene|CarCamera|CarLighting|Road`, `Building`,
`Finance`, `Experience`, most of `Landing`, `Cursor`, `Preloader`, `useSoundEffect`) are
not imported by the route. They still have to typecheck.

## Cars section (3D)

- `CarsSection` (framer `useScroll` on the stage) -> `CarPlate` (IntersectionObserver +
  `next/dynamic`, ssr off) -> `CarPlateScene` (react-three-fiber, `frameloop="demand"`)
  -> `CarModel`. Three.js and the model load only when the plate is within 800px.
- Model: `public/models/car-web.glb` (4.2 MB, meshopt + WebP, no simplification), made
  from `car.glb` with
  `npx @gltf-transform/cli@4 optimize car.glb car-web.glb --compress meshopt --texture-compress webp --simplify false`.
  `useGLTF(src, false, true)` decodes meshopt from the bundle; never enable the Draco flag,
  drei points it at a Google CDN. `car.glb`, `car-1024.glb`, `car-source.glb` (71 MB) are
  superseded and can be deleted.
- Scene: orthographic plan view on transparent canvas (paper shows through), RoomEnvironment
  PMREM for reflections, drei `ContactShadows` for grounding, no post-processing. The car
  drives `TRAVEL` units along the plate with scroll; `FRAME_LENGTH / 2 > TRAVEL + 2.35`
  keeps it in frame. Frames are only requested on progress change or while settling.

## Visual system (Swiss editorial, light)

- Tokens live in `:root` in `globals.css`: paper `#F3F3F1`, ink `#111111`, muted
  `#666664` (5.1:1 on paper), hairline `rgba(17,17,17,.12)`, one accent `#E24B1F`
  (vermilion, used only for the Kean poster tile, focus rings and the email hover).
- Type: Overused Grotesk (variable, `public/fonts/overused-grotesk`) for everything,
  Fragment Mono for 12px metadata. Sources and licenses in `public/fonts/README.md`.
  The variable font's `slnt` axis is unfinished upstream; do not use oblique styles.
- Corners are square everywhere. Structure comes from hairlines and whitespace, not
  cards or shadows. Gutters are tight (`--gutter`), sections are separated by
  `--space-section`.
- Header uses `mix-blend-mode: difference` on desktop so it inverts over the ink and
  vermilion posters; phones get a solid paper bar instead.
- Project "posters" (`ProjectPoster`) are typographic covers (the title repeated) because
  no verified project imagery exists. Do not replace them with fake screenshots.
- The dither portrait renders ink cells on paper (`InteractiveDitherPortrait`), pointer
  hover sharpens local contrast, and reduced motion renders a single static frame.

## Motion rules

- Entrance and scroll reveals go through `Reveal` (`framer-motion` `whileInView`, once,
  16px rise) or the hero's line-mask reveal. Everything checks `useReducedMotion`.
- Anchor clicks are handled in `SmoothScroll` (Lenis `scrollTo`, `pushState`, focus to
  the section, which is why sections carry `tabIndex={-1}`). Section anchors land 88px
  under the header via negative `scroll-margin-top` that cancels `--space-section`.
- No `window` scroll listeners, no GSAP, no marquees, no scroll cues.
