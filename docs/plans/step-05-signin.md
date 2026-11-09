# Step 05 — Sign-in page + mock auth + route guards (rebuild recipe)

## Starting point
Step 04 complete. Mock auth is "always signed in"; no sign-in UI.

## Goal
A real sign-in card at `/signin`, route guards for every other page, and
a `signIn()` / `signOut()` pair that move between those states. Mock-only
(real Google OAuth is step 15).

## Rewrite `src/lib/auth.ts`

Replace step 4's auto-signed-in stub with a `localStorage`-backed store +
event emitter:

- `STORAGE_KEY = 'cocoon.session.v1'`
- `FIRST_SIGNIN_KEY = 'cocoon.firstSignIn.v1'` (step 7 will consume it
  for the one-time Home hint)
- Identity-stable snapshot cache keyed on the raw JSON string — so
  `useSyncExternalStore` doesn't re-render forever.

API:
- `getSession(): Session | null` — reads cache
- `isSignedIn(): boolean`
- `signIn(): Promise<Session>` — `await setTimeout(600)` then write
  session, emit. First call also writes the first-sign-in flag.
- `signOut(): void` — remove session + emit
- `onAuthChange(listener): () => void` — subscribe/unsubscribe

Also attach a `window.addEventListener('storage', …)` handler so cache
updates on cross-tab changes.

## Hook — `src/hooks/useAuth.ts`

```ts
export function useAuth() {
  const session = useSyncExternalStore(onAuthChange, getSession, () => null);
  return { session, signedIn: session !== null };
}
```

## Guards — `src/app/`

- `RequireAuth.tsx`:
  ```tsx
  const { signedIn } = useAuth();
  const location = useLocation();
  if (!signedIn) return <Navigate to="/signin" replace state={{ from: location }} />;
  return <>{children}</>;
  ```
- `RedirectIfSignedIn.tsx` — the mirror for `/signin`: redirects a
  signed-in user to `state?.from?.pathname ?? '/'`.

## Routes — `src/app/routes.tsx`

Wrap:
- `/signin` → `<RedirectIfSignedIn><SignIn/></RedirectIfSignedIn>`
- `/`, `/entry/:id`, `/calendar`, `/memories` → `<RequireAuth>…</RequireAuth>`
- `*` 404 stays public.

## Sign-in page — `src/pages/SignIn.tsx`

Follow mockup `01-sign-in` **layout**; use **SPEC §2.1 copy** (not the
mockup's "Voice Journal" / Tamil bullet / alt footer).

Structure (centred, NOT in `<Layout>` — card-only):
1. `card-soft` container.
2. Clay circle (56 px, `bg-clay`) with `Mic` icon (white).
3. `COCOON` eyebrow.
4. Serif h1 "Tell me about your day."
5. Soft-ink subline (verbatim SPEC).
6. Four bullets with clay-tinted icon pills (`Mic`, `Sparkles`, `Lock`,
   `CalendarDays`).
7. shadcn `Button` outline, `h-12 w-full rounded-full`, with
   `<GoogleIcon/>` + "Continue with Google". Shows `Loader2` spinner +
   "Signing in…" while pending.
8. Footer line (SPEC): *"Your entries are private to you. Audio is
   deleted after it's transcribed."*

Click handler: `await signIn()`, then
`navigate(location.state?.from?.pathname ?? '/', { replace: true })`.
Future-proof try/catch around `signIn()` (toast on failure) so step 15
doesn't touch this file.

## Google icon — `src/components/icons/GoogleIcon.tsx`

Inline SVG of the official multicolour "G". No new deps.

## AccountMenu — real sign-out

`src/components/header/AccountMenu.tsx`:
- Replace `getSession()` with `useAuth()` (reactive).
- Sign out: `signOut(); queryClient.clear(); navigate('/signin', { replace: true });`
- Other menu items keep firing `comingSoon` (step 12).

The `queryClient.clear()` is a safety net so a different account next
time doesn't see the previous user's cached entries.

## Screenshot scripts — seed a session for protected routes

`scripts/_server.mjs`: add
```js
export const SIGNED_IN_INIT_SCRIPT = `
  try {
    localStorage.setItem('cocoon.session.v1', JSON.stringify({
      accessToken: 'mock-dev-token',
      user: { id: '00000000-0000-4000-8000-000000000001',
              name: 'Test User', email: 'test@cocoon.local', avatarUrl: null },
    }));
  } catch {}
`;
```
`scripts/shots.mjs`: for each route, `if (route.requireAuth)
await context.addInitScript(SIGNED_IN_INIT_SCRIPT);`.
`scripts/journey.mjs`: prepend `{ num: '01', name: 'sign-in', state:
'default', path: '/signin', requireAuth: false }` to `SCREENS`; same
init-script logic.

## Tests

- **`src/lib/auth.test.ts`** — initial signed out, `signIn()` → signed in,
  `signOut()` → signed out, `getSession()` returns identity-stable refs,
  `onAuthChange` fires on both events, first-sign-in flag set.
  `beforeEach/afterEach`: `localStorage.clear()` + `signOut()`.
- **`src/App.test.tsx`** — two cases: unauthenticated `/` shows the
  SignIn heading; after `signIn()`, `/` shows "Today's page".
- **`src/lib/api.test.ts`** — `beforeAll` now calls `await signIn()` so
  api.ts has a session; `afterAll` calls `signOut()`.

## `docs/USER_JOURNEY.md`

- Bump header line to "step 5 of 21".
- Fill section 1 (Sign in) with phone + laptop screenshots and the
  standard description template.

## Verify

```bash
npm run typecheck && npm run lint && npm test   # 38 tests
npm run dev
# incognito → any URL bounces to /signin
# Continue with Google → ~600 ms spinner → lands on /
# header → avatar → Sign out → back on /signin
# deep-link: /calendar signed out → /signin → sign in → /calendar
npm run shots && npm run journey
```

## Commit

```
feat: sign-in page, mock auth with sign-in/sign-out, and route guards
```
