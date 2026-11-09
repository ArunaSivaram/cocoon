# Step 02 — Deploy early to Vercel (rebuild recipe)

## Starting point
Step 01 complete. The repo builds locally but isn't deployed.

## Goal
Vercel preview URL for every `git push`, with a tiny Hono function
responding to `GET /api/health`.

## Install

```bash
npm install hono   # runtime dep (no VITE_ prefix)
```

## Files

### `api/[...route].ts` (new, single-bracket catch-all — **not** `[[...route]]`)

```ts
import { Hono } from 'hono';
import { handle } from 'hono/vercel';

export const config = {
  runtime: 'edge',   // IMPORTANT: Hono's `handle` returns a Fetch handler
                     // which Vercel's Node runtime doesn't await — the
                     // function hangs until it times out. Edge speaks
                     // Fetch natively.
};

const app = new Hono().basePath('/api');
app.get('/health', (c) => c.json({ ok: true }));

export default handle(app);
```

### `vercel.json` (new)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

The rewrite is the SPA fallback — negative lookahead sends any
non-`/api/*` path to `/index.html` so React Router can handle it.

### `tsconfig.node.json` (modify)

Add `"api/**/*.ts"` to `include` so `tsc --noEmit -p tsconfig.node.json`
picks up the function file.

## Known gotchas (both bit us)

1. **`api/[[...route]].ts` (double brackets) is a Next.js convention.**
   Vercel's bare-`api/` folder router doesn't register double-bracket
   files, so `/api/*` gets no handler and the SPA rewrite's negative
   lookahead also skips `/api/*` — you get a true 404. Use single
   brackets: `api/[...route].ts`.
2. **Hono's `handle` + Vercel Node runtime → `FUNCTION_INVOCATION_TIMEOUT`.**
   `handle(app)` returns `async (req: Request) => Response` (Web Fetch
   API). Vercel's Node runtime expects the old `(req, res) => void`
   shape and never awaits the Fetch response → the function hangs
   until Vercel kills it (504). Fix: `runtime: 'edge'` in the file's
   `config` export.

## Vercel import (one-time)

1. Push the branch to GitHub.
2. <https://vercel.com> → Continue with GitHub → Add New → Project →
   import `cocoon`.
3. Framework preset: Vite (auto). Build / output are picked up from
   `vercel.json`. **No env vars needed** at this step.
4. Deploy. ~1 minute.

## Verify

```bash
curl https://<your-app>.vercel.app/api/health
# {"ok":true}

curl -I https://<your-app>.vercel.app/signin
# HTTP/2 200 (SPA rewrite served /index.html; React Router takes over)
```

Also browser-check: `/`, `/signin`, `/entry/42`, `/calendar`, `/memories`
all load, `/api/health` returns JSON.

## Commit

```
chore: add Vercel config and /api/health (Hono on a single Vercel Function)
```
