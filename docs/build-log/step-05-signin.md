# Step 05 — Sign-in page + mock auth + route guards

Cocoon now has a real "signed-in / signed-out" state. Every page except
`/signin` requires a session; without one you land on the sign-in card.
Clicking **Continue with Google** fakes a quick round-trip and lands you
back on the page you were trying to reach. Real Google OAuth comes in
step 15 — the shape here is ready for that swap.

## What was built

- **`src/lib/auth.ts`** — rewritten. Three verbs that drive the whole
  app: `signIn()`, `signOut()`, and `onAuthChange(listener)`. The session
  lives in `localStorage.cocoon.session.v1` so it survives reloads. An
  identity-stable cache keyed on the raw JSON string keeps
  `useSyncExternalStore` happy. A `storage` event listener keeps multiple
  tabs in sync.
- **`src/hooks/useAuth.ts`** — tiny `useSyncExternalStore` wrapper. Returns
  `{ session, signedIn }`. Components re-render automatically on sign-in
  and sign-out.
- **`src/app/RequireAuth.tsx`** — gate for every protected route. If no
  session, `<Navigate to="/signin" replace state={{ from: location }} />`.
- **`src/app/RedirectIfSignedIn.tsx`** — mirror for `/signin`: a signed-in
  user bounces to `state.from.pathname` (or `/`).
- **`src/pages/SignIn.tsx`** — the real sign-in card, laid out per mockup
  `01-sign-in`, worded per SPEC §2.1. Not wrapped in `<Layout>` — SPEC
  §2.1 is a card-only screen.
- **`src/components/icons/GoogleIcon.tsx`** — official multicolour "G"
  as inline SVG. No new dep.
- **`src/components/header/AccountMenu.tsx`** — now reads the live session
  via `useAuth()` and wires **Sign out** to `signOut() + queryClient.clear()
  + navigate('/signin')`.
- **`scripts/_server.mjs`** — exports a `SIGNED_IN_INIT_SCRIPT` constant;
  `shots.mjs` and `journey.mjs` inject it via Playwright's `addInitScript`
  so the headered screens still capture content instead of bouncing to
  `/signin`.

## Files created

- `src/hooks/useAuth.ts`
- `src/app/RequireAuth.tsx`, `src/app/RedirectIfSignedIn.tsx`
- `src/components/icons/GoogleIcon.tsx`
- `src/lib/auth.test.ts`
- `docs/journey/01-sign-in-default-phone.png`, `01-sign-in-default-laptop.png`
- `docs/build-log/step-05-signin.md` (this file)

## Files modified

- `src/lib/auth.ts` — rewrite.
- `src/pages/SignIn.tsx` — full build.
- `src/app/routes.tsx` — wrap protected routes with `RequireAuth`;
  `/signin` with `RedirectIfSignedIn`.
- `src/components/header/AccountMenu.tsx` — `useAuth()` + real sign-out.
- `src/App.test.tsx` — two cases (signed in / signed out).
- `src/lib/api.test.ts` — `beforeAll` calls `signIn()` so the bearer-token
  logic in `api.ts` has a session.
- `scripts/_server.mjs` · `shots.mjs` · `journey.mjs` — session seeding.
- `docs/USER_JOURNEY.md` — section 1 (Sign in) now carries screenshots +
  description; header bumped to "step 5 of 21".

## Explanations

### Mock auth (`src/lib/auth.ts`)
- **What it is.** A localStorage-backed session plus a tiny event emitter.
- **Why.** `useAuth` needs a store it can subscribe to; the API client
  (step 4) needs a token it can attach as `Authorization: Bearer …`.
- **How it connects.** `signIn()` writes the session and emits; `signOut()`
  clears and emits; `useSyncExternalStore` picks up the emit and re-renders
  anything using `useAuth()`.
- **Worth knowing.** The cache keyed on the raw JSON string keeps
  `getSession()` identity-stable even when called from a render loop — a
  common `useSyncExternalStore` gotcha.

### useAuth (`src/hooks/useAuth.ts`)
- **What it is.** The subscription hook.
- **Why.** React 19's `useSyncExternalStore` is purpose-built for external
  stores like localStorage — no Context provider needed.
- **How it connects.** Guards and the account menu use it.

### Route guards (`src/app/RequireAuth.tsx`, `RedirectIfSignedIn.tsx`)
- **What they are.** Two tiny components that wrap route elements and
  redirect based on the current session.
- **Why.** Every page except `/signin` must require a signed-in user
  (BUILD_PLAN step 5); the sign-in page should bounce signed-in users away
  so hitting the back button after signing in doesn't trap them in a loop.
- **How they connect.** `routes.tsx` wraps each `Route`'s element.
- **Worth knowing.** The `state.from` round-trip means "tried to reach
  `/calendar` while signed out → sign in → land on `/calendar`" just works.

### Sign-in page (`src/pages/SignIn.tsx`)
- **What it is.** The screen you land on when you aren't signed in.
- **Why.** First impression of Cocoon. Needs to feel like paper and set
  expectations: audio is deleted, journal is private.
- **How it connects.** Calls `signIn()` from `auth.ts`, then
  `navigate(from)`.
- **Worth knowing.** Copy is from **SPEC §2.1**, not the mockup — the
  mockup says "Voice Journal", lists Tamil/Hindi, and has a different
  footer line. Those are all out for the MVP.

### AccountMenu sign-out
- The menu now reads live session data (name, email, avatar initial) via
  `useAuth()`. Sign out calls `signOut()`, `queryClient.clear()` (so the
  next account doesn't see cached entries), and navigates to `/signin`.

### Script session seeding (`scripts/*`)
- Playwright's `addInitScript` runs code **before any page JS loads**, so
  the auth cache boots with a session already present and `RequireAuth`
  doesn't redirect. Only protected screens get the seed; `/signin` is
  screenshotted in a clean, unauthenticated context so it renders the card.

## How to try it

```bash
npm run dev
# http://localhost:5173/ — bounces to /signin. Click Continue with Google.
# After ~600 ms you land on Home with the dev probe showing the 6 fixtures.
# Open the account menu → Sign out → back on /signin.
# Try the "deep link" case: open a private window and hit /calendar — you
# bounce to /signin, sign in, and land on /calendar.

npm run typecheck   # green
npm run lint        # green
npm test            # 38 tests pass across 5 files
npm run shots       # screenshots signin via unseeded context, rest seeded
npm run journey     # produces 01-sign-in-* and 02-home-*
```

## Notes

- Mockup `01-sign-in` says "Voice Journal", has a Tamil/languages bullet,
  and a different footer line. SPEC §2.1 wins — we use **COCOON**, four
  English-only bullets, and *"Your entries are private to you. Audio is
  deleted after it's transcribed."*
- **Clearing the session in DevTools:** Application → Local Storage →
  remove `cocoon.session.v1`. The tab becomes "signed out" the moment the
  `storage` event fires (next render, no reload needed).
- **Reset the first-time hint:** also remove `cocoon.firstSignIn.v1` (the
  flag that step 7 will consume for the one-time home hint).
- When step 15 wires Supabase, **only `src/lib/auth.ts`** changes. The
  hook, guards, page, and menu keep working.

## Suggested commit message

```
feat: sign-in page, mock auth with sign-in/sign-out, and route guards
```

## Open questions

- Should the sign-in card use the paper-sheet border style (ruled margin)
  or stay as the current `card-soft`? Right now it matches the mockup
  exactly. Easy to swap later.
- `queryClient.clear()` on sign-out is a safety net rather than a true
  per-user cache boundary. If step 15 ever makes two accounts share a tab
  (via back-button after sign-out + re-sign-in), we may want to key caches
  on user id. Not an issue for mock-only now.
