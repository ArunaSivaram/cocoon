# Step 01 — Scaffold (rebuild recipe)

## Starting point
Empty repo with just `CLAUDE.md`, `docs/SPEC.md`, `docs/BUILD_PLAN.md`,
`docs/USER_JOURNEY.md`, `docs/mockups/`.

## Goal
Working Vite + React 19 + TypeScript app with the folder layout CLAUDE.md
asks for, all npm scripts, an `.env.example`, and five placeholder pages
behind their routes. **No real UI yet.**

## Install

```bash
npm init -y
# Edit package.json: type: "module", engines.node ">=20", private: true

# Runtime
npm install react@^19 react-dom@^19 react-router-dom@^7 \
  @tanstack/react-query@^5 date-fns@^4 lucide-react sonner \
  class-variance-authority clsx tailwind-merge

# Build/dev
npm install -D vite@^7 @vitejs/plugin-react@^5 typescript@^5 \
  @types/react @types/react-dom @types/node \
  tailwindcss@^4 @tailwindcss/vite vite-plugin-pwa workbox-window

# Lint/format (pin @eslint/js to ^9 to match eslint@^9)
npm install -D "eslint@^9" "@eslint/js@^9" typescript-eslint \
  eslint-plugin-react-hooks eslint-plugin-react-refresh globals \
  prettier prettier-plugin-tailwindcss

# Tests
npm install -D vitest @vitest/ui jsdom \
  @testing-library/react @testing-library/jest-dom @playwright/test
```

## Config files (root)

- `tsconfig.json` — strict mode, `moduleResolution: "bundler"`,
  `jsx: "react-jsx"`, `noUncheckedIndexedAccess: true`,
  `noUnusedLocals/Parameters: true`, path alias `"@/*": ["./src/*"]`,
  `include: ["src", "tests"]`.
- `tsconfig.node.json` — standalone (no composite / project references);
  `types: ["node"]`; `include: ["vite.config.ts", "playwright.config.ts"]`.
- `vite.config.ts` — plugins: `@vitejs/plugin-react`, `@tailwindcss/vite`,
  `VitePWA` (minimal manifest, no icons yet). `resolve.alias` for `@`.
  **Import `defineConfig` from `vitest/config`** (not `vite`) so inline
  Vitest config typechecks. Set `test.environment: 'jsdom'`,
  `test.globals: true`, `test.setupFiles: ['./src/test-setup.ts']`.
- `eslint.config.js` — flat config: `@eslint/js` recommended +
  `typescript-eslint` recommended + `react-hooks` + `react-refresh`.
  Ignore: `dist`, `node_modules`, `playwright-report`, `test-results`,
  `.vite`, `coverage`, `shots`.
- `.prettierrc` — `singleQuote`, `semi`, `trailingComma: 'all'`,
  `printWidth: 100`, `plugins: ['prettier-plugin-tailwindcss']`.
- `.prettierignore` — `node_modules`, `dist`, `docs/journey`, `shots`,
  `package-lock.json`.
- `.gitignore` — `node_modules`, `dist`, `.vite`, `.vercel`, `*.log`,
  `.env*` with `!.env.example`, `shots/`, `playwright-report/`,
  `test-results/`, `.DS_Store`.
- `.env.example` — every SPEC §7 variable (both VITE_ browser and
  server-only), each with a short comment.
- `index.html` — Vite entry, viewport meta with `viewport-fit=cover`,
  preconnect + stylesheet for Lora + Instrument Sans Google Fonts,
  `<div id="root">`, `<script type="module" src="/src/main.tsx">`.
- `components.json` — shadcn/ui config pointing at `src/components/ui`
  and `src/index.css`. Base colour `"neutral"`, `tsx: true`, `rsc: false`.
- `playwright.config.ts` — `testDir: './tests'`,
  `webServer: { command: 'npm run dev', url: 'http://localhost:5173' }`,
  projects for chromium + webkit.

## npm scripts

```jsonc
{
  "dev": "vite",
  "build": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json && vite build",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json",
  "lint": "eslint .",
  "format": "prettier --write .",
  "test": "vitest run",
  "test:watch": "vitest",
  "e2e": "playwright test"
}
```

(`shots` and `journey` come in step 3.)

## `src/` layout

```
src/
  app/
    App.tsx          # QueryClientProvider + BrowserRouter + Routes + <Toaster/>
    routes.tsx       # 5 routes + 404 fallback
  pages/
    SignIn.tsx       # placeholder: "built in step 5"
    Home.tsx         # placeholder: "built in step 7"
    Entry.tsx        # placeholder; uses useParams to show :id
    MoodCalendar.tsx # placeholder: "built in step 11"
    MemoryWall.tsx   # placeholder: "built in step 11"
  components/.gitkeep
  hooks/.gitkeep
  lib/.gitkeep
  mocks/.gitkeep
  index.css          # just `@import 'tailwindcss';` for now
  main.tsx           # createRoot + <StrictMode><App/>
  test-setup.ts      # `import '@testing-library/jest-dom/vitest';`
  vite-env.d.ts      # /// <reference types="vite/client" />
                     # /// <reference types="vite-plugin-pwa/client" />
  App.test.tsx       # one smoke test: render <App/>, expect Home heading
```

Routes (all public at this step):

| Path | Component |
|---|---|
| `/signin` | SignIn |
| `/` | Home |
| `/entry/:id` | Entry |
| `/calendar` | MoodCalendar |
| `/memories` | MemoryWall |
| `*` | inline "Not found" |

`App.tsx`: one `QueryClient` with `{ retry: 1, staleTime: 0 }`, wrap in
`<BrowserRouter>`, render `<AppRoutes/>` + `<Toaster position="bottom-right"/>`.

## `tests/`

- `tests/smoke.spec.ts` — one Playwright spec that `page.goto('/')` and
  expects the Home heading.

## `docs/`

- `docs/build-log/step-01-scaffold.md` — the completion record.
- `docs/journey/.gitkeep` — the journey screenshots directory (populated
  from step 3).

## Known gotchas

- **Vitest picks up Playwright specs by default.** In `vite.config.ts`
  set `test.include: ['src/**/*.{test,spec}.{ts,tsx}']` and
  `test.exclude: [..., 'tests/**']`.
- **`tsconfig.node.json` as a composite reference** triggers
  `TS6310 may not disable emit`. Keep it standalone (no `references`,
  no `composite: true`) and run `typecheck` as two separate `tsc`
  invocations.
- **Vitest config types** are only merged when you import `defineConfig`
  from `vitest/config`, not from `vite`.

## Verify

```bash
npm install
npm run dev            # http://localhost:5173 — try each route
npm run typecheck      # green
npm run lint           # green
npm test               # 1 test passes
npm run build          # production build succeeds
```

Playwright browsers are a one-time install before `npm run e2e`:
`npx playwright install chromium webkit`.

## Commit

```
chore: scaffold Cocoon (Vite + React 19 + TS strict + Tailwind v4 + shadcn/ui + TanStack Query + router + testing)
```
