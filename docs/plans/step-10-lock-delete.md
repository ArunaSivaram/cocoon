# Step 10 — Lock, unlock, delete — rebuild recipe

## Context

By end of step 9 the Entry reading view was fully alive (title /
body / interpretation / reflection / notes editable, Memories with
photos), but **Lock** and **Delete** in the top bar were still
placeholder toasts (*"Coming in step 10"*), and a 423 from
`GET /api/entries/:id` dropped the user on a minimal "This page is
private" placeholder without actions.

Everything needed on the **data** side already exists: the mock
backend (`src/mocks/db.ts`) enforces 4–8 digit passcodes, records
failed unlocks (5 per 15 min → `rate_limited`), accepts a passcode
on `update / upload / delete / remove-lock`, and supports
`{forgot: true}` on `/delete`. The TanStack Query hooks
(`useLockEntry`, `useOpenEntry`, `useRemoveLock`, `useDeleteEntry`)
are also in place since step 4.

Step 10 ships the UI: five dialogs, the private screen, the
session-passcode store, the stale-signin gate, and the wiring to
make every section respect the lock.

**What Aruna will see at the end:** full SPEC §2.5 behaviour — see
the build log for the exhaustive demo script, but in short: lock
an entry with a passcode (typed twice + warning), get the "This
page is private" screen on return, shake-on-wrong-passcode unlock
dialog with rate-limit state, Remove lock while unlocked, Delete
with the right confirm for each state (unlocked → Keep/Delete;
locked → passcode or forgot-DELETE with recent-sign-in gate).

## Approach

### 1. Session passcode store — `src/lib/sessionPasscodes.ts`

Mirrors the `auth.ts` pattern — a module-level `Map<string, string>`
plus listeners plus a React hook based on `useSyncExternalStore`.

```ts
export function getSessionPasscode(entryId: string): string | undefined;
export function setSessionPasscode(entryId: string, passcode: string): void;
export function clearSessionPasscode(entryId: string): void;
export function clearAllSessionPasscodes(): void;
export function useSessionPasscode(entryId: string | undefined): string | undefined;
```

Never touches storage. `useSyncExternalStore` gives React a stable
subscription so sections re-render when a passcode arrives or is
cleared.

Unit tests: set / get / scope / clearOne / clearAll / listener fires.

### 2. Auth `signed_in_at` — `src/lib/auth.ts`

Extend `Session` with `signed_in_at?: string`. `signIn()` sets it
to `new Date().toISOString()`. New exports:

```ts
export const RECENT_SIGNIN_WINDOW_MS = 10 * 60 * 1000;
export function getRecentSignInAt(): number | null;
export function isSignInRecent(window = RECENT_SIGNIN_WINDOW_MS): boolean;
```

Sessions without `signed_in_at` are treated as stale — forces a
re-sign-in on the forgot-delete path, never silently upgrades.

### 3. Shake keyframes — `src/index.css`

Short horizontal shake. Respects the existing global
`prefers-reduced-motion` rule — no extra code.

```css
@keyframes cocoon-shake { 0%,100% {transform: translateX(0);} 15% {translateX(-8px)} ... }
.cocoon-shake { animation: cocoon-shake 0.4s ease-in-out; }
```

Replay the animation by changing a `key` prop on the wrapping div
so React re-mounts the node.

### 4. Dialog shell — `src/components/entry/dialogShell.tsx`

Small shared wrapper (portal + dim backdrop + Esc + body-scroll-
lock + focus-on-open). Used by the four new dialogs. PhotoViewer
and RemovePhotoDialog (step 9) continue to inline the pattern —
the polish step is the right time to consolidate everyone.

```tsx
<DialogShell open onClose busy ariaLabelledBy="…" panelClassName="…">
  {children}
</DialogShell>
```

### 5. The four dialogs

All live under `src/components/entry/`:

- **`LockDialog`** — 2 numeric fields (4–8 digits), mismatch /
  format errors, warning copy from SPEC §2.5. On success calls
  `setSessionPasscode(id, passcode)` so the user keeps reading.
- **`UnlockDialog`** — single numeric field, shake on wrong
  passcode (`shakeKey` counter), rate-limited state swaps the
  input out when the server returns `rate_limited`.
- **`RemoveLockConfirm`** — Keep locked / Remove lock buttons;
  reuses the session passcode.
- **`DeleteEntryDialog`** — single component, four modes:
  unlocked-confirm, locked-passcode-or-forgot, type-DELETE, sign-
  in-required gate. Calls `isSignInRecent()` before sending
  `{forgot: true, signed_in_at}`.

### 6. `LockedPrivateScreen.tsx`

Mockup-10 card: clay lock bubble, *"This page is private"*,
*"Enter your passcode to read it."*, Unlock / Delete buttons.
Hosts its own UnlockDialog and DeleteEntryDialog instances.
`onUnlocked` tells the parent Entry page to refetch.

### 7. EntryTopBar rewrite

Replace the step-8 comingSoon-only version with props-driven
visibility:

```ts
interface EntryTopBarProps {
  minimal?: boolean;
  canLock?: boolean;
  canRemoveLock?: boolean;
  canDelete?: boolean;
  onLock?: () => void;
  onRemoveLock?: () => void;
  onDelete?: () => void;
}
```

- `minimal` = hide right-hand buttons (used on private + error
  screens).
- `canLock` = `!entry.is_locked`.
- `canRemoveLock` = `entry.is_locked && sessionPasscode`.
- `canDelete` = always on non-private screens.

### 8. Entry page wiring — `src/pages/Entry.tsx`

Branching:
- `isLoading` → skeleton.
- `locked` error + session passcode → `useOpenEntry.mutate`
  (effect), skeleton holds until `['entry', id]` cache updates.
- `locked` error + no session passcode → `LockedPrivateScreen`.
- `not_found` → placeholder with Back-to-journal.
- Any other error or no data → generic placeholder.
- Otherwise → full article. Three local `useState` booleans drive
  LockDialog / RemoveLockConfirm / DeleteEntryDialog.

### 9. Section components pick up `useSessionPasscode`

Five components (`EditableTitle`, `InMyWords`, `WhatIMeant`,
`MyNotes`, `Memories`): add
`const passcode = useSessionPasscode(entry.id);` and merge
`{passcode}` into the mutation body when `entry.is_locked`. Zero
behaviour change on unlocked entries.

`Memories` also gains an `isLocked: boolean` prop (the API already
accepts the passcode on upload / delete — we just needed the entry
reference).

### 10. Stale-signin gate in mock db

`src/lib/types.ts` — `DeleteEntryRequest` forgot variant now
carries `signed_in_at: ISODateTime`.

`src/mocks/db.ts`:
- New `DbResult` code `'unauthorized'`.
- `const RECENT_SIGNIN_WINDOW_MS = 10 * 60 * 1000;`
- `deleteEntry(id, req)` on the `forgot` path parses
  `req.signed_in_at` and returns 401 `unauthorized` if missing or
  older than the window.

Update `src/mocks/db.test.ts`: the existing forgot test gets a
fresh timestamp; add two new tests (stale / missing).

### 11. Scripts

`scripts/_server.mjs`:
- `SIGNED_IN_INIT_SCRIPT` sets `signed_in_at: new Date().toISOString()`
  so Playwright test sessions pass the recent-sign-in gate.
- `waitForFontsAndPaint` bump from 150 ms → 400 ms so the step-10
  locked screen's post-skeleton render is always captured.

`scripts/journey.mjs`: add

```js
{
  num: '08',
  name: 'locked-entry',
  state: 'private',
  path: '/entry/66666666-6666-4666-8666-666666666666',
  requireAuth: true,
},
```

### 12. Docs

- `docs/USER_JOURNEY.md` — fill section 8 with the private-screen
  screenshot + full description of all seven dialog states; header
  → "step 10 of 21".
- `docs/plans/README.md` — index step 10.
- `docs/build-log/step-10-lock-delete.md`.
- `docs/plans/step-10-lock-delete.md` (this file).

## Files created

- `src/lib/sessionPasscodes.ts` (+ `.test.ts`)
- `src/components/entry/dialogShell.tsx`
- `src/components/entry/LockDialog.tsx`
- `src/components/entry/UnlockDialog.tsx`
- `src/components/entry/RemoveLockConfirm.tsx`
- `src/components/entry/DeleteEntryDialog.tsx`
- `src/components/entry/LockedPrivateScreen.tsx`
- `docs/build-log/step-10-lock-delete.md`
- `docs/plans/step-10-lock-delete.md`
- `docs/journey/08-locked-entry-private-{phone,laptop}.png`

## Files modified

- `src/index.css` — `cocoon-shake` keyframes + utility.
- `src/lib/auth.ts` — `signed_in_at` + helpers.
- `src/lib/types.ts` — `DeleteEntryRequest` carries
  `signed_in_at` on the forgot variant.
- `src/mocks/db.ts` — stale-signin gate + `unauthorized` code +
  constant.
- `src/mocks/db.test.ts` — recent / stale / missing forgot tests.
- `src/pages/Entry.tsx` — rewrite locked branch + dialog wiring.
- `src/components/entry/EntryTopBar.tsx` — props-driven.
- `src/components/entry/{EditableTitle,InMyWords,WhatIMeant,MyNotes,Memories}.tsx`
  — thread `useSessionPasscode` into mutations when locked.
- `scripts/_server.mjs` — `signed_in_at` in init script; 400 ms
  wait.
- `scripts/journey.mjs` — add private-screen screen.
- `docs/USER_JOURNEY.md` — section 8 filled; header bumped.
- `docs/plans/README.md` — step 10 entry.

## Explicitly out of scope

- **Real crypto for passcodes.** PBKDF2-SHA256 is a step-17 concern.
- **Server-side enforcement of recent sign-in.** Step 17 adds a
  Supabase-session-based check server-side.
- **Dialog primitive consolidation.** PhotoViewer /
  RemovePhotoDialog still inline the pattern. Polish step 13.
- **PostHog events (`entry_locked`).** Step 20.
- **Full accessibility sweep on dialogs** (focus trap, aria-live
  for shake/error, etc.). Step 13.

## Verification (BUILD_PLAN Step 10 "Check")

1. `npm run typecheck` · `npm run lint` · `npm test` — all green.
   New tests: 6 for session passcodes + 2 for stale/missing
   forgot-delete = 8. Total: 99.
2. `npm run dev`. Lock an unlocked entry, log out, log in,
   re-open it → private screen. Unlock with the right code →
   entry opens. Edit the body → "Saved." toast.
3. Fail unlock 5 times → *"Too many tries. Please wait 15
   minutes."* Reload page → private screen (session passcode
   cleared); dialog opens straight into rate-limited state until
   `failedUnlocks` is cleared (reset db).
4. Remove lock while unlocked → top bar flips back to Lock;
   toast confirms.
5. Delete unlocked → Home + toast.
6. Open locked fixture
   (`/entry/66666666-6666-4666-8666-666666666666`), Delete via
   passcode → Home + toast.
7. Repeat, choose Forgot passcode? → type DELETE → Home + toast.
8. In DevTools, set `signed_in_at` to 20 min ago, reload → Forgot
   flow now asks to sign in again.
9. `npm run shots` + `npm run journey` complete; new
   `08-locked-entry-private-*.png` match mockup 10.

## Suggested commit message

```
feat: lock / unlock / remove-lock / delete flows with session passcode and forgot-DELETE path
```

## Notes to flag in the build log

- Passcodes in plain text in the mock; real PBKDF2 lives in
  step 17.
- `failedUnlocks` is in-memory only — restarting Vite clears it.
- "Recent sign-in" is a client + mock gate; real enforcement in
  step 17.
- Six dialog implementations — consolidation is polish step 13.
