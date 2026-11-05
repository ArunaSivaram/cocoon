# Step 02 — Deploy early to Vercel

Put the app on Vercel so every push gets a real HTTPS preview URL. This matters
because the mic (step 6) needs HTTPS on iOS — localhost is fine, but a phone on
your home wifi isn't. From now on, you test on the Vercel preview on your phone.

## What was built

- **`api/[[...route]].ts`** — one Vercel Function that holds a tiny
  [Hono](https://hono.dev) app. Hono is a small, fast web framework (like
  Express but modern). We put every `/api/*` route into this single file
  because it's cheaper (one cold start) and lets Hono handle the internal
  routing. Today it only serves `GET /api/health`.
- **`vercel.json`** — tells Vercel how to deploy:
  - `framework: "vite"`, `outputDirectory: "dist"` so it knows this is a Vite
    SPA.
  - `rewrites` — any path that is **not** `api/…` is rewritten to
    `/index.html`. That's the classic "single-page app fallback" — the browser
    then lets React Router pick the right page based on the URL.
  - `functions."api/[[...route]].ts".maxDuration = 60` — serverless functions
    have a time limit; 60 seconds is enough for the longest AI call we'll
    make (step 16).

### Why `[[...route]].ts` (double brackets)?

Vercel's file-based routing supports three catch-all shapes:
- `api/foo.ts` → matches `/api/foo` only
- `api/[...slug].ts` → catch-all, requires at least one segment
- `api/[[...slug]].ts` → **optional** catch-all — matches `/api` on its own too

Hono wants to see every `/api/*` path so it can route internally, so the
optional catch-all is the right choice. The Hono docs ship this exact pattern.

## Files changed

- `api/[[...route]].ts` (new)
- `vercel.json` (new)
- `tsconfig.node.json` (now includes `api/**/*.ts` so `tsc` typechecks the
  function file)
- `package.json` (adds `hono` as a runtime dep)
- `docs/build-log/step-02-vercel.md` (this file)

## Explanations

### Hono (`api/[[...route]].ts`)
- **What it is.** A small web framework. You attach routes to an `app`
  object (`app.get('/foo', handler)`) and export it via
  `handle(app)` from `hono/vercel` so Vercel can call it like any serverless
  function.
- **Why.** CLAUDE.md asks for Hono. It's tiny (~15 KB), fast on serverless,
  and TypeScript-native.
- **How it connects.** Every `/api/*` HTTPS request hits the function file,
  which runs Hono's router. Today only `/api/health` responds.
- **Worth knowing.** `.basePath('/api')` lets us write `app.get('/health', …)`
  instead of `app.get('/api/health', …)` everywhere. All routes in SPEC §5
  will go into this same app file (or files imported into it).

### Vercel configuration (`vercel.json`)
- **What it is.** Deployment settings for Vercel.
- **Why.** Vercel autodetects most things, but the SPA fallback rewrite is
  not automatic for a bare Vite project, and `maxDuration` must be explicit.
- **How it connects.** Vercel reads this file during every deploy.
- **Worth knowing.** The rewrite uses a negative lookahead regex,
  `/((?!api/).*)`, which means "any path that does not start with `api/`".
  Everything else falls back to `index.html` and React Router takes over.

## Steps to import the repo in Vercel

> This is the one-time setup. After this, every `git push` to GitHub
> auto-builds a preview URL.

1. **Push the repo to GitHub** if you haven't yet. The remote URL in your git
   config points at `github.com/ArunaSivaram/cocoon`. Make sure the repo
   exists and your local branch is pushed:
   ```bash
   git add -A
   git commit -m "chore: scaffold + Vercel setup"   # or your own message
   git push -u origin main
   ```

2. **Sign in to Vercel with GitHub.**
   Go to <https://vercel.com>. Click **Continue with GitHub** and authorise
   Vercel to see your repos. (You can restrict it to just the `cocoon` repo —
   recommended.)

3. **Import the project.**
   On the Vercel dashboard, click **Add New → Project** → find `cocoon` →
   **Import**.

4. **Review the project settings.** Vercel will auto-detect most of these:
   - **Framework Preset:** Vite (auto)
   - **Build Command:** `npm run build` (from `vercel.json`)
   - **Output Directory:** `dist` (from `vercel.json`)
   - **Install Command:** leave default (`npm install`)
   - **Root Directory:** `.` (the repo root)
   - **Node version:** 20 or later (Vercel picks a sensible default).

5. **Environment variables.** Leave empty for now — this step only serves a
   health check that needs no secrets. We'll add every `SUPABASE_*`,
   `OPENAI_*`, `ANTHROPIC_*`, `RESEND_*`, `CRON_SECRET`, etc. in step 15.

6. **Click Deploy.** First deploy takes about a minute. When it's done you'll
   see a `*.vercel.app` URL — click it.

## Check (the one from BUILD_PLAN.md)

Open these two URLs on your phone (Safari):

- `https://<your-app>.vercel.app/` → shows the Home placeholder with links to
  the other routes.
- `https://<your-app>.vercel.app/api/health` → shows `{"ok":true}`.

Also try `https://<your-app>.vercel.app/signin`, `/entry/42`, `/calendar`,
`/memories` — they should all load (not 404). If any give a Vercel 404 page,
the SPA rewrite in `vercel.json` isn't being picked up — re-deploy and check
the Build logs.

## What this unlocks

From now on, every `git push` gives you:
- A **production deploy** on the main URL (when you push to `main`).
- A **preview deploy** with its own URL (when you push to any other branch, or
  open a PR). Use preview URLs to test risky changes without touching the
  production URL.

## Suggested commit message

```
chore: add Vercel config and /api/health (Hono on a single Vercel Function)
```

## Open questions

- We haven't set a Vercel region. The default is Washington D.C. (`iad1`),
  which is fine for now but adds ~200 ms latency from Singapore. We can change
  it in the Vercel project settings → Functions → Region to `sin1`
  (Singapore) once the Supabase project is in Singapore (step 14).
- No custom domain yet. The `*.vercel.app` URL is fine for the whole build
  phase.
