# Step 01 — Scaffold

Set up an empty but complete Cocoon project: install the stack, create the folder
layout from `CLAUDE.md`, wire the npm scripts, and add placeholder routes for
every screen. **No real UI yet** — later steps fill it in.

## What was built

- **Vite + React 19 + TypeScript (strict)** app, bootstrapped by hand (no CRA /
  `create-vite` template so we control every file).
- **Tailwind CSS v4** via `@tailwindcss/vite` — no `tailwind.config.js`, no
  `postcss.config.js`. Design tokens come in step 3.
- **shadcn/ui** initialised via `components.json` (Tailwind v4 flavour). No
  components added yet.
- **TanStack Query** — single `QueryClient` wired at the root of the app.
- **React Router v7** (`react-router-dom`) with five routes:
  `/signin`, `/`, `/entry/:id`, `/calendar`, `/memories`, plus a `*` 404.
- **Sonner** toaster mounted at the bottom-right per `CLAUDE.md` design system.
- **vite-plugin-pwa** with a placeholder manifest (full icons in step 13).
- **ESLint 9** flat config + TypeScript-ESLint + React Hooks + React Refresh.
- **Prettier** with the Tailwind-class sorter plugin.
- **Vitest + jsdom + Testing Library** — one smoke test renders the app and
  asserts the Home heading is on screen.
- **Playwright** — one smoke e2e spec. The config spins up `npm run dev` on
  demand. Browsers aren't installed yet — run `npx playwright install chromium`
  before `npm run e2e`.
- **`.env.example`** covers every variable in SPEC §7 (browser + server).
- **`.gitignore`** ignores `.env*` (keeps `.env.example`), `shots/`, and the
  usual build + test artefacts.

## Files changed

**Root:** `package.json`, `tsconfig.json`, `tsconfig.node.json`,
`vite.config.ts`, `eslint.config.js`, `.prettierrc`, `.prettierignore`,
`.gitignore`, `.env.example`, `index.html`, `components.json`,
`playwright.config.ts`.

**`src/`:** `main.tsx`, `index.css`, `vite-env.d.ts`, `test-setup.ts`,
`App.test.tsx`, `app/App.tsx`, `app/routes.tsx`, `pages/SignIn.tsx`,
`pages/Home.tsx`, `pages/Entry.tsx`, `pages/MoodCalendar.tsx`,
`pages/MemoryWall.tsx`, plus `.gitkeep` in `components/`, `hooks/`, `lib/`,
`mocks/`.

**`tests/`:** `smoke.spec.ts`.

**`docs/`:** `build-log/step-01-scaffold.md` (this file), `journey/.gitkeep`.

## Explanations — what each piece is for

### Vite + React 19 (`vite.config.ts`, `src/main.tsx`)
- **What it is.** Vite is the dev server and bundler. React 19 is the UI
  library. `main.tsx` mounts `<App/>` into the `#root` div.
- **Why.** Vite is fast and the modern default. React 19 is the latest stable
  release and the stack `CLAUDE.md` asks for.
- **How it connects.** `index.html` loads `/src/main.tsx` as a module → it
  renders `<App/>` → `<App/>` wraps providers around the router.
- **Worth knowing.** We use the `@/*` path alias (configured in both
  `tsconfig.json` and `vite.config.ts`) so imports look like
  `@/pages/Home` instead of relative dots.

### Tailwind CSS v4 (`@tailwindcss/vite`, `src/index.css`)
- **What it is.** The utility-class CSS framework. v4 is a big upgrade from v3.
- **Why.** Fast, consistent, and matches `CLAUDE.md`.
- **How it connects.** `@tailwindcss/vite` scans source files and injects
  styles at the `@import 'tailwindcss';` line in `src/index.css`.
- **Worth knowing.** v4 has **no `tailwind.config.js`** — custom colours,
  fonts, and sizes live in CSS via `@theme { … }` inside `index.css`. Step 3
  fills that block with Cocoon's palette and fonts.

### React Router v7 (`src/app/routes.tsx`)
- **What it is.** Client-side routing.
- **Why.** We need five distinct screens (plus a 404) without full page loads.
- **How it connects.** `<App/>` wraps `<BrowserRouter>` → `<AppRoutes/>`
  declares the five `<Route>`s.
- **Worth knowing.** Step 5 will add a route guard that redirects every page
  except `/signin` when the user isn't signed in. For now routes are open.

### TanStack Query (`src/app/App.tsx`)
- **What it is.** Server-state cache for fetched data.
- **Why.** Later steps fetch entries, calendar data, reminders, etc. — Query
  handles caching, retries, loading / error states so the pages stay simple.
- **How it connects.** One `QueryClient` lives at app root via
  `<QueryClientProvider>`. Step 4 adds typed hooks around our API client.
- **Worth knowing.** Default options: `retry: 1`, `staleTime: 0`. We'll tune
  these per-query as we go.

### shadcn/ui (`components.json`)
- **What it is.** A tool that copies well-designed accessible components into
  `src/components/ui`. You install them with `npx shadcn@latest add <name>`.
- **Why.** We get Button, Dialog, Textarea, etc. without writing them from
  scratch, and we own the code so we can restyle.
- **How it connects.** `components.json` tells the CLI where things live
  (`@/components/ui`, `src/index.css`) and which base colour / style to use.
- **Worth knowing.** No components added yet — step 3 adds the first ones.

### Sonner toasts (`src/app/App.tsx`)
- **What it is.** The toast library CLAUDE.md asks for.
- **Why.** Used for the "Saved." confirmation and other gentle feedback.
- **How it connects.** `<Toaster position="bottom-right" />` mounted once;
  pages call `toast('Saved.')` from anywhere.

### vite-plugin-pwa (`vite.config.ts`)
- **What it is.** Turns the app into an installable Progressive Web App.
- **Why.** SPEC says Cocoon should install to the iPhone home screen.
- **How it connects.** On build, it generates `sw.js` + a manifest so iOS /
  Chrome can treat Cocoon as an app.
- **Worth knowing.** The manifest here has no icons yet — proper clay-mic
  icons and the full manifest arrive in step 13 (polish pass).

### Vitest + Testing Library (`src/App.test.tsx`, `src/test-setup.ts`)
- **What it is.** Unit test runner (Vitest) + React component testing helpers.
- **Why.** `CLAUDE.md` asks for unit tests; we need `npm test` to pass from
  step 1 onwards.
- **How it connects.** Vitest reads its config from `vite.config.ts`
  (`test.*`). The smoke test mounts `<App/>` and checks that the Home heading
  renders. `test-setup.ts` loads `@testing-library/jest-dom` matchers.
- **Worth knowing.** Vitest `include` is restricted to `src/**/*.{test,spec}.{ts,tsx}`
  so it doesn't try to run the Playwright e2e specs under `tests/`.

### Playwright (`playwright.config.ts`, `tests/smoke.spec.ts`)
- **What it is.** Browser automation for end-to-end tests and (later) the
  `shots` and `journey` screenshot scripts.
- **Why.** Real-browser tests catch bugs unit tests can't — especially around
  recording, routing, and responsive layouts.
- **How it connects.** `playwright.config.ts` auto-starts `npm run dev` on
  port 5173 via `webServer`, then runs specs in `tests/` against Chromium and
  WebKit.
- **Worth knowing.** Browsers aren't downloaded yet. Before the first
  `npm run e2e`, run `npx playwright install chromium webkit`.

### ESLint 9 + Prettier (`eslint.config.js`, `.prettierrc`)
- **What they are.** Lint catches bugs and style issues; Prettier formats code.
- **Why.** Consistency across future steps.
- **How it connects.** ESLint's flat config pulls in TypeScript-ESLint, React
  Hooks, and React Refresh. Prettier's Tailwind plugin keeps utility classes
  in canonical order.
- **Worth knowing.** Run `npm run format` to auto-format everything.

## Notable choices and gotchas

- **Tailwind v4 install story is new.** We use the `@tailwindcss/vite` plugin
  and `@import 'tailwindcss';` in CSS — there is deliberately no
  `tailwind.config.js` or `postcss.config.js`.
- **React Router v7** is the current major version; the `<Routes>` / `<Route>`
  API matches v6 so this is a painless choice.
- **`tsconfig.node.json`** is separate from the main `tsconfig.json` because
  `vite.config.ts` and `playwright.config.ts` run in Node (they need
  `@types/node`), while the app runs in the browser. `typecheck` runs both.
- **`VITE_USE_MOCKS`** isn't in `.env.example` yet — SPEC §7 doesn't list it
  and it's only wired in step 4 when MSW lands.
- **`api/`, `server/`, `supabase/`** folders are **not** created in this step.
  They belong to steps 2, 14, and 15.

## How to try it

```bash
npm install            # already done
npm run dev            # http://localhost:5173
# Then click around:
#   /          → Home placeholder with links
#   /signin    → SignIn placeholder
#   /entry/42  → Entry placeholder (shows the :id)
#   /calendar  → MoodCalendar placeholder
#   /memories  → MemoryWall placeholder
#   /nothing   → 404 fallback

npm run typecheck      # should pass
npm run lint           # should pass
npm test               # should pass (1 test)
npm run build          # production build, should succeed
```

For Playwright e2e (optional at this step):

```bash
npx playwright install chromium webkit
npm run e2e
```

## Suggested commit message

```
chore: scaffold Cocoon (Vite + React 19 + TS strict + Tailwind v4 + shadcn/ui +
TanStack Query + router + testing)
```

## Open questions

- Node 26 is a lot newer than the LTS. We only require `>=20` in `package.json`.
  Vercel's default runtime for Vite is fine with both, so nothing to change
  here — just a note.
- The PWA plugin prints a warning about missing icons at build time; that's
  expected until step 13.
