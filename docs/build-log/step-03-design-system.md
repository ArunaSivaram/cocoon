# Step 03 — Design system + app shell

Cocoon now has its paper feel. Every screen from here on drops into a shared
header on a dotted paper background, with mood colours ready for the first
entry card in step 7. We also added the screenshot plumbing so we can compare
each new screen against its mockup from this step forward.

## What was built

- **Design tokens** in `src/index.css` via Tailwind v4's `@theme` block:
  the full Cocoon palette (ink, clay, parchment, paper, rule, mic gradient,
  recording red, six mood colours), fonts (Lora serif, Instrument Sans),
  radii, and a soft warm shadow. Also: shadcn's semantic tokens (`primary`,
  `secondary`, `destructive`, `border`, `ring`, …) **mapped onto the Cocoon
  palette** so shadcn's Button renders in clay/parchment, not purple.
- **Body background** — the faint dotted paper texture from the mockup
  (`radial-gradient` of 1 px ink dots on a 20 px grid at 6 % opacity).
- **Component classes** — `.paper-sheet`, `.card-soft`, `.label-eyebrow`
  (the small uppercase clay eyebrow above a serif heading).
- **Ruled-lines utility** — Tailwind v4 `@utility ruled-lines` that paints a
  1 px rule every 32 px. Not used yet; the "In my words" section in step 8
  will apply it.
- **Reduced-motion rule** — one `@media (prefers-reduced-motion: reduce)`
  block zeroes every animation and transition, as required by CLAUDE.md rule 7.
- **Mood map** (`src/lib/moods.ts`) — single source of truth for the 15
  SPEC §3.2 moods, each mapped to one of six colour groups with a solid dot
  colour and a soft badge tint (background + ink). Exports `MOOD_KEYS`,
  `MOOD_MAP`, `LOCKED_STYLE`, `moodStyle()`, and `isMoodKey()`. Tested
  (`src/lib/moods.test.ts`).
- **shadcn/ui primitives** added via the CLI: `Button`, `DropdownMenu`,
  `Avatar` (in `src/components/ui/`). These pulled in the `radix-ui` umbrella
  package and the `cn` classname merger package (shadcn's newer default, a
  drop-in replacement for `clsx + tailwind-merge`).
- **Shared header** (`src/components/header/Header.tsx`) with the account
  menu (`src/components/header/AccountMenu.tsx`): clay COCOON eyebrow, serif
  page title, three quick-action buttons (Reminder bell, Mood calendar,
  Memories — icons from `lucide-react`), avatar. Responsive: icon-only on
  phone, icon + label on `md:` (≥ 768 px); a small date appears next to the
  title on `md:` when `date` prop is set.
- **Layout wrapper** (`src/app/Layout.tsx`) — header + max-width container.
  Home / MoodCalendar / MemoryWall opt in by rendering `<Layout title="…">`.
  SignIn stays header-less (card-only per SPEC §2.1); Entry's own top bar
  comes in step 8.
- **Screenshot scripts** — `npm run shots` captures every route at 390×844
  and 1280×800 into `shots/`; `npm run journey` captures the walkthrough
  screenshots into `docs/journey/` with CLAUDE.md's naming convention
  (`NN-<screen>-<state>-<phone|laptop>.png`). Both scripts start Vite via
  `child_process.spawn`, poll for the port, and clean it up on exit.
- **USER_JOURNEY.md** updated: section 2 ("Today's page") now carries the
  current phone/laptop screenshots with a short description and a note that
  the mic card lands in step 7.

## Files created

- `src/lib/moods.ts`, `src/lib/moods.test.ts`
- `src/components/ui/button.tsx`, `dropdown-menu.tsx`, `avatar.tsx` (shadcn CLI)
- `src/components/header/Header.tsx`, `src/components/header/AccountMenu.tsx`
- `src/app/Layout.tsx`
- `scripts/_server.mjs`, `scripts/shots.mjs`, `scripts/journey.mjs`
- `docs/journey/02-home-default-phone.png`, `02-home-default-laptop.png`
- `docs/build-log/step-03-design-system.md` (this file)

## Files modified

- `src/index.css` — full design tokens, body background, component classes,
  ruled-lines utility, reduced-motion rule.
- `src/pages/Home.tsx` · `MoodCalendar.tsx` · `MemoryWall.tsx` — wrap in
  `<Layout title=…>` with placeholder bodies pointing at the step where the
  real UI lands.
- `src/App.test.tsx` and `tests/smoke.spec.ts` — updated expectations now
  that Home renders "Today's page" and the COCOON eyebrow.
- `package.json` — adds `playwright` devDep, `shots` and `journey` scripts,
  plus the shadcn runtime deps (`cn`, `radix-ui`).
- `eslint.config.js` — disables `react-refresh/only-export-components` for
  `src/components/ui/**` (shadcn's files export helpers next to components).
- `docs/USER_JOURNEY.md` — section 2 filled, header and build step bumped.

## Explanations

### Design tokens (`src/index.css`, Tailwind v4 `@theme`)
- **What they are.** Named CSS custom properties that Tailwind turns into
  utilities: `--color-clay` becomes `bg-clay`, `text-clay`, `border-clay`;
  `--font-serif` becomes `font-serif`; `--radius-sheet` becomes
  `rounded-[var(--radius-sheet)]` (and the custom utility `rounded-sheet`).
- **Why.** The palette, fonts, and rounding live in one place so every
  screen stays on-brand. Later steps just use the utilities.
- **How it connects.** Every component uses these via Tailwind classes —
  `bg-paper`, `text-ink-soft`, `font-serif`, `shadow-soft`.
- **Worth knowing.** Tailwind v4 has **no `tailwind.config.js`** — tokens
  go in CSS via `@theme`. We also defined shadcn's semantic tokens
  (`primary`, `destructive`, etc.) and pointed them at our palette so
  shadcn components look native, not stock.

### Mood map (`src/lib/moods.ts`)
- **What it is.** The 15 moods from SPEC §3.2 grouped into 6 colour buckets
  (green / amber / lavender / brown / rose / grey), with a solid dot colour
  and a soft badge tint per mood.
- **Why.** The calendar, mood badges, and the AI prompt (step 16) all need
  to agree on what moods exist — if the AI returns a mood the UI can't
  render, we'd silently fall back to grey. This file is imported by both
  the UI (step 7's badge) and the server prompt (step 16) so drift is
  impossible.
- **How it connects.** The badge component (step 7) will do
  `const { dot, badgeBg, badgeInk } = moodStyle(entry.mood)`. The AI prompt
  will interpolate `MOOD_KEYS.join(', ')`.
- **Worth knowing.** Unknown or null moods fall back to `LOCKED_STYLE`
  (grey) — which is also what locked entries use in the calendar per SPEC §2.6.

### Header + AccountMenu (`src/components/header/*`)
- **What it is.** The shared top bar for Home / Mood calendar / Memory wall.
- **Why.** CLAUDE.md § Design system calls for it and mockups 02 and 15
  confirm the layout.
- **How it connects.** The `Layout` wrapper renders it with a per-page
  title. Mood calendar and Memories buttons are real `<Link>`s; Reminder
  and all account-menu items fire a `toast('Coming in step 12')` for now.
- **Worth knowing.** On phone (`< 768 px`) the three action buttons are
  icon-only (40 × 40 px, close to the 44 px touch-target guideline, which
  matches the mockup proportions). On `md:` they expand to icon + text and
  a small date appears next to the title.

### Layout (`src/app/Layout.tsx`)
- **What it is.** The page frame — max-width container + Header + `<main>`.
- **Why.** Keeps every real screen on the same 720/960 px measure that
  CLAUDE.md §Layout prescribes, so chrome doesn't drift from page to page.
- **How it connects.** Pages wrap their content in `<Layout title="…">`
  (or add `date="…"` on Home).

### Screenshot scripts (`scripts/*.mjs`)
- **What they are.** Two standalone Node scripts that boot Vite, launch a
  headless Chromium via `playwright`, visit each route at both viewports,
  and save PNGs.
- **Why.** CLAUDE.md asks for `shots` and `journey`. From step 3 onward,
  every screen change can be diffed against its mockup in `shots/`, and
  `docs/journey/` grows alongside `USER_JOURNEY.md`.
- **How they connect.** `_server.mjs` is a tiny shared helper (boot Vite,
  poll for 200, stop). The scripts set `reducedMotion: 'reduce'` and wait
  for `document.fonts.ready` before snapping so screenshots are
  deterministic.
- **Worth knowing.** Playwright browsers are a one-time install
  (`npx playwright install chromium`). We installed chromium while
  building this step; webkit comes later if we want cross-browser `e2e`.

## Notes to Aruna

- **The mockups say "Voice Journal". We say Cocoon.** Per CLAUDE.md the
  mockups are visual reference only; wording comes from SPEC.
- **The two language pickers in mockup 02-home are out.** English US/UK is
  one picker in the account menu (step 12).
- The **Reminder** button and every **account menu** item render but only
  show a toast. Real behaviour is step 12.
- The Entry page (`/entry/:id`) still shows the step-1 placeholder because
  its own top bar (Back · Lock · Delete) lives in step 8.
- `shots/` is gitignored; `docs/journey/` is committed per CLAUDE.md
  §"User journey document".

## How to try it

```bash
npm run dev          # http://localhost:5173 — resize from phone to laptop
npm run typecheck    # green
npm run lint         # green
npm test             # 6 tests pass (App smoke + 5 mood-map asserts)
npm run shots        # writes shots/{signin,home,entry,calendar,memories}-{phone,laptop}.png
npm run journey      # writes docs/journey/02-home-default-{phone,laptop}.png
```

Compare `shots/home-phone.png` with `docs/mockups/02-home.jpg` and
`shots/home-laptop.png` with `docs/mockups/15-desktop-home.jpg` — layout,
spacing, colours, and type should match (minus the mic card + past entries,
which land in step 7).

Enable "Reduce motion" in macOS System Settings → Accessibility, reload any
page: no transitions should fire.

## Suggested commit message

```
feat: design tokens, shared header, and screenshot scripts
```

## Open questions

- Icon-button height on phone is **40 px** rather than the 44 px CLAUDE.md
  touch-target guideline, to match the mockup's proportions and keep "Today's
  page" from truncating. Can revisit in step 13's polish pass if it feels
  too small to tap.
- We haven't installed webkit yet (`npx playwright install webkit`). Fine
  until we want cross-browser `e2e` tests.
