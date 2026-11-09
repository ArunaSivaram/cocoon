# Step 03 — Design system + app shell (rebuild recipe)

## Starting point
Step 02 complete. Everything renders in unstyled HTML.

## Goal
Cocoon's paper look + the responsive shared header. Plus two screenshot
scripts (`npm run shots`, `npm run journey`) for mockup diffs and the
living `USER_JOURNEY.md`.

## Install

```bash
# shadcn primitives + the Playwright API (direct, not via @playwright/test)
npm install -D playwright
npx shadcn@latest add button dropdown-menu avatar --yes
```

shadcn's current CLI installs the `cn` and `radix-ui` packages and
writes `src/components/ui/{button,dropdown-menu,avatar}.tsx` using
`import { cn } from 'cn'` and `import { ... } from 'radix-ui'` — that's
the new default, leave it as-is.

Also: `npx playwright install chromium` once, so the scripts can run.

## Design tokens — rewrite `src/index.css`

```css
@import 'tailwindcss';

@theme {
  /* Cocoon palette (CLAUDE.md) */
  --color-background: #faf7f2;
  --color-paper: #fcfaf6;
  --color-card: #ffffff;
  --color-ink: #2c2621;
  --color-ink-soft: #6e6259;
  --color-rule: #e8dfd3;
  --color-parchment: #f4ece1;
  --color-clay: #a34e2a;
  --color-clay-light: #b85832;
  --color-clay-dark: #9e4a28;
  --color-recording: #d33f2b;

  /* Mood palette (keep in sync with src/lib/moods.ts) */
  --color-mood-green: #3f8a6e;
  --color-mood-amber: #e0a04a;
  --color-mood-lavender: #8a6fb8;
  --color-mood-brown: #b08a5e;
  --color-mood-rose: #c9584a;
  --color-mood-grey: #b8a898;

  /* shadcn semantic tokens → Cocoon palette */
  --color-foreground: #2c2621;
  --color-primary: #a34e2a;
  --color-primary-foreground: #ffffff;
  --color-secondary: #f4ece1;
  --color-secondary-foreground: #2c2621;
  --color-destructive: #d33f2b;
  --color-accent: #f4ece1;
  --color-accent-foreground: #2c2621;
  --color-muted: #f4ece1;
  --color-muted-foreground: #6e6259;
  --color-border: #e8dfd3;
  --color-input: #e8dfd3;
  --color-ring: #a34e2a;
  --color-card-foreground: #2c2621;
  --color-popover: #fcfaf6;
  --color-popover-foreground: #2c2621;

  --font-serif: 'Lora', ui-serif, Georgia, serif;
  --font-sans: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;

  --radius-card: 20px;
  --radius-sheet: 28px;
  --shadow-soft: 0 6px 24px -12px rgba(44, 38, 33, 0.18);
  --shadow-lift: 0 10px 32px -16px rgba(44, 38, 33, 0.22);
}

@layer base {
  html, body {
    background-color: var(--color-background);
    color: var(--color-ink);
    font-family: var(--font-sans);
  }
  body {
    background-image: radial-gradient(rgba(44,38,33,0.06) 1px, transparent 1px);
    background-size: 20px 20px;
    min-height: 100dvh;
  }
  h1, h2, h3, h4 { font-family: var(--font-serif); color: var(--color-ink); }
}

@layer components {
  .paper-sheet { background: var(--color-paper); border-radius: var(--radius-sheet);
    box-shadow: var(--shadow-soft); border: 1px solid color-mix(in srgb, var(--color-rule) 60%, transparent); }
  .card-soft { background: var(--color-card); border-radius: var(--radius-card);
    box-shadow: var(--shadow-soft); border: 1px solid color-mix(in srgb, var(--color-rule) 60%, transparent); }
  .label-eyebrow { font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--color-clay); font-weight: 500; }
}

@utility ruled-lines {
  background-image: repeating-linear-gradient(to bottom,
    transparent 0, transparent 31px,
    var(--color-rule) 31px, var(--color-rule) 32px);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Mood map — `src/lib/moods.ts`

15 keys from SPEC §3.2 (`calm, content, relieved, joyful, excited, hopeful,
proud, grateful, reflective, tired, anxious, sad, stressed, frustrated,
lonely`) → 6 groups (`green, amber, lavender, brown, rose, grey`) → each
with `dot` (CSS var ref), `badgeBg` (soft hex), `badgeInk` (readable hex).
Export `MOOD_KEYS`, `MOOD_MAP`, `LOCKED_STYLE`, `moodStyle()`, `isMoodKey()`.

Add `src/lib/moods.test.ts` that pins:
- `MOOD_KEYS` matches the 15 SPEC moods.
- Every mood has a known group.
- Every non-grey group has at least one mood.
- `moodStyle(null | undefined)` falls back to grey.

## Shared header — `src/components/header/`

- `Header.tsx` — props `{ title, date? }`. One row: left group (COCOON
  eyebrow + serif title + date-shown-on-`md:`); right group (three
  circle action buttons + `<AccountMenu/>`).
  - Actions use shadcn `Button` with `asChild` for the `<Link>`s to
    `/calendar` and `/memories`. Icons: `Bell`, `CalendarDays`, `Images`
    from `lucide-react`.
  - Phone (< 768 px): 40×40 icon-only (gap-1.5). Laptop: icon + label
    (gap-3).
- `AccountMenu.tsx` — shadcn `Avatar` inside `DropdownMenu` with menu
  items: name + email label, English US/UK, Export, Delete, Sign out.
  All items fire `toast('Coming in step 12')` for now.

## Layout wrapper — `src/app/Layout.tsx`

```tsx
<div className="min-h-dvh">
  <div className="mx-auto max-w-[720px] px-4 pt-6 md:max-w-[960px] md:pt-10">
    <Header title={title} date={date} />
    <main className="mt-6 md:mt-8">{children}</main>
  </div>
</div>
```

Home / MoodCalendar / MemoryWall wrap their current placeholder content
in `<Layout title="…">`. SignIn + Entry stay unchanged (no header).

## Screenshot scripts

- `scripts/_server.mjs` — shared helpers: `startDevServer` (spawn `npm
  run dev`, poll `/`, 30 s timeout), `stopDevServer`, `VIEWPORTS`
  (`phone: 390×844 @2x`, `laptop: 1280×800 @2x`), `waitForFontsAndPaint`.
- `scripts/shots.mjs` — loops 5 routes × 2 viewports into `shots/`.
- `scripts/journey.mjs` — declarative `SCREENS` array (for this step:
  just `02-home-default`); writes `docs/journey/NN-screen-state-device.png`.
- Both scripts use `page.emulateMedia({ reducedMotion: 'reduce' })` so
  screenshots are deterministic.

Add `npm run shots` and `npm run journey` to `package.json`.

## ESLint tweak

shadcn's `button.tsx` exports `Button` + `buttonVariants` side-by-side,
which trips `react-refresh/only-export-components`. Add a scoped off
block for `src/components/ui/**`:

```js
{
  files: ['src/components/ui/**/*.{ts,tsx}'],
  rules: { 'react-refresh/only-export-components': 'off' },
},
```

## Update `USER_JOURNEY.md`

- Bump header line to current step / 21.
- Fill section 2 ("Today's page") with phone + laptop screenshots and a
  2–4 line description.

## Known gotchas

- "Today's p..." truncation on phone: four 44×44 buttons eat too much
  room. Compromise: 40×40 on phone, matches mockup; keep 44 px on laptop
  via `md:w-auto`.
- Tailwind v4 uses `@theme`, no `tailwind.config.js`, no `postcss.config.js`.
- Mockup still says "Voice Journal" — we use "COCOON" (CLAUDE.md note).

## Verify

```bash
npm run typecheck && npm run lint && npm test   # all green
npm run dev                                     # resize phone → laptop
npm run shots                                   # 10 PNGs in shots/
npm run journey                                 # 2 PNGs in docs/journey/
```

Compare `shots/home-{phone,laptop}.png` with `docs/mockups/02-home.jpg`
and `docs/mockups/15-desktop-home.jpg`.

## Commit

```
feat: design tokens, shared header, and screenshot scripts
```
