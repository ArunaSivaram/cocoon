# Step 04 — Types, API client, Query hooks, MSW mocks (rebuild recipe)

## Starting point
Step 03 complete. UI chrome in place; every screen shows a placeholder.

## Goal
A fully-typed data layer that the rest of the UI can be built against —
with an in-browser mock backend so step 5–13 don't need Supabase / AI.

## Install

```bash
npm install -D msw
npx msw init public/ --save   # drops public/mockServiceWorker.js
```

## Types — `src/lib/types.ts`

Every SPEC §5 request / response + the §4 DB rows as plain `interface`
/ `type`. No runtime code — the real Hono server (step 17) imports the
same file. Key types:

- `Profile`, `UpdateMeRequest`
- `Entry`, `EntrySummary` (discriminated union on `is_locked: true | false`
  so locked summaries don't carry `title/mood/photo_count`),
  `EntriesListResponse`
- `CreateEntryRequest`, `UpdateEntryRequest`, `OpenEntryRequest`,
  `LockEntryRequest`, `RemoveLockRequest`, `DeleteEntryRequest`
- `UploadUrlRequest/Response`, `TranscribeRequest/Response`
- `Photo`, `PhotoUploadResponse`, `MemoryWallResponse`
- `CalendarDay`, `CalendarResponse` (mood null for locked days)
- `Reminder`, `ReminderInput`
- `ExportResponse`, `ApiErrorCode`, `ApiErrorBody`, `HealthResponse`

Scalars: `Locale = 'en-US' | 'en-GB'`, `UUID`, `ISODateTime`, `ISODate`,
`Timezone`.

## Auth — `src/lib/auth.ts` (mock-only for step 4)

Minimal: when `VITE_USE_MOCKS === 'true'`, `getSession()` returns a
hard-coded test user with token `'mock-dev-token'`. Otherwise `null`.
Also `isSignedIn()`. (Step 5 rewrites this file to add
`signIn/signOut/onAuthChange`.)

## API client — `src/lib/api.ts`

Typed fetch wrapper over `BASE_URL = '/api'`.

- `api.get<T>(path, params?, options?)`,
  `api.post<Req, Res>(path, body?, options?)`,
  `api.patch`, `api.put`, `api.multipart<Res>(path, formData)`.
- Reads bearer token from `getSession()`; throws `APIError` (Error
  subclass with `.code` + `.status`) when `!res.ok`. Parses the
  `{error: {code, message}}` envelope; falls back to a status-code
  mapping when the body doesn't have a code.
- `.multipart` leaves the `content-type` header off so the browser sets
  the multipart boundary automatically.

## TanStack Query hooks — `src/hooks/queries.ts`

One hook per endpoint. Keys:
`['me']`, `['entries', cursor]`, `['entry', id]`, `['calendar', month]`,
`['photos']`, `['reminder']`.

Mutations invalidate the right scope:
- `useCreateEntry` → invalidate `['entries']` + `['calendar']`,
  `setQueryData(['entry', id], entry)`.
- `useLockEntry` / `useRemoveLock` → invalidate entries + calendar +
  photos.
- `useUploadPhoto` / `useDeletePhoto` → invalidate entry + entries + photos.
- `useOpenEntry(id)` → `setQueryData(['entry', id], entry)`.

## MSW mock backend — `src/mocks/`

- **`fixtures.ts`** — 6 English fixtures matching mockup
  `05-past-entries`. All on user id `00000000-0000-4000-8000-000000000001`
  (matches `auth.ts`'s MOCK_SESSION). Tamil entry becomes
  "A Cake for Mum". Entry 6 is locked with passcode **`1234`**. Mood on
  entry 2 is `tired` (matches the lavender badge). Photos use
  `https://picsum.photos/seed/<seed>/800/800`. Also exports
  `INITIAL_PROFILE`, `INITIAL_REMINDER`, `INITIAL_PASSCODES`.
- **`db.ts`** — in-memory store around the fixtures (`Map<UUID, Entry>`,
  passcodes map, failedUnlocks map for the 5-per-15-min rate limit).
  Pure functions, no HTTP:
  `listEntries(cursor)`, `getEntry(id)`, `openEntry(id, passcode)`,
  `createEntry`, `updateEntry`, `lockEntry`, `removeLock`,
  `deleteEntry`, `addPhoto` (enforces max 2), `deletePhoto`,
  `allUnlockedPhotos`, `calendarForMonth(ym)`, reminder helpers,
  `sendTestReminder` (60 s cooldown). Returns a tagged `DbResult<T>`
  union — `{ok: true, value}` or `{ok: false, status, code, message}`.
  Also `resetDb()` for tests.
- **`handlers.ts`** — MSW `http.*` handlers for every SPEC §5 route.
  All handlers check `Authorization: Bearer <token>` (any token works).
  Handlers delegate to `db.*` and map `DbResult` to HTTP via a tiny
  `dbResultToResponse` helper. Locked rules exactly match the real
  server-to-be (423 on GET, 401 wrong_passcode, 429 after 5 attempts,
  `mood: null` on calendar, locked photos excluded from
  `/api/photos`). **`POST /api/transcribe` and `POST /api/entries` each
  `await delay(2000)`** per the step prompt.
- **`browser.ts`** — `export const worker = setupWorker(...handlers);`
- **`server.ts`** — `export const server = setupServer(...handlers);`
  (used by `api.test.ts` in Node / jsdom).

## Boot MSW — `src/main.tsx`

```ts
async function enableMocksIfRequested() {
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledFrame: 'bypass',               // renamed from onUnhandledRequest in msw v3
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
}
enableMocksIfRequested().then(() => createRoot(...).render(...));
```

Dynamic import keeps MSW out of the production bundle.

## Env

- `.env.local` (gitignored) — `VITE_USE_MOCKS=true`.
- `.env.example` — document `VITE_USE_MOCKS=` under a "Dev switches"
  section.

## Dev probe — `src/components/dev/DevEntriesProbe.tsx`

A deliberately-ugly `useEntries()` consumer. Shows the 6 fixtures as a
list with date, title, mood badge, and photo count, or
"A private entry — Locked" for the locked one. Mount inside the Home
placeholder card. Step 7 deletes this component.

## AccountMenu

Switch the hard-coded `name/email` to read `session.user.*` via
`getSession()` (reactive hook arrives in step 5).

## ESLint

Add `'public'` to the ignore list (auto-generated `mockServiceWorker.js`
has an unused eslint-disable directive at the top).

## Tests

- **`src/mocks/db.test.ts`** — list newest-first, locked card shape,
  wrong passcode (401), 5-attempt lockout (429), update unlocked vs
  locked, lock/unlock/delete with and without passcode, max 2 photos,
  memory wall excludes locked, reminder cooldown.
- **`src/lib/api.test.ts`** — happy-path GET, `APIError.code === 'locked'`
  for 423, `'wrong_passcode'` for 401, successful open with 1234. Uses
  the Node `server`:
  ```ts
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => { server.resetHandlers(); resetDb(); });
  afterAll(() => server.close());
  ```

## MSW v3 gotchas (both bit us)

- Option renamed: `onUnhandledRequest` → `onUnhandledFrame` (both in
  `worker.start` and `server.listen`).
- `HttpResponse` is generic over `BodyType`. Don't use it as a type
  annotation; return `Response` from helpers like `requireAuth`.

## Verify

```bash
npm run typecheck && npm run lint && npm test   # all green; new db + api tests pass
npm run dev
# Home → "Dev probe · past entries" lists 6 items with mood badges
# DevTools → Network: /api/entries from Service Worker
npm run shots   # Home screenshot shows the fixture list
```

## Commit

```
feat: types, API client, TanStack Query hooks, and MSW mock backend
```
