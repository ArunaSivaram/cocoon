# Step 10 — Lock, unlock, remove lock, delete

Lock + Delete were placeholder toasts (*"Coming in step 10"*) at the
end of step 8. Now the whole private-pages flow from SPEC §2.5 is
live: set a passcode, unlock a private entry, edit while unlocked,
remove the lock, and delete either an unlocked entry (warm confirm)
or a locked one (passcode path *or* forgot-passcode → type **DELETE**
with a recent-sign-in gate).

## What was built

- **`src/lib/sessionPasscodes.ts`** — module-level `Map<entryId,
  passcode>` + `useSessionPasscode(id)` hook built on
  `useSyncExternalStore`. Mirrors the auth.ts pattern. Never touches
  localStorage so SPEC §2.5's *"for this visit only"* rule is
  guaranteed by design.
- **`src/lib/sessionPasscodes.test.ts`** — 6 unit tests for set / get
  / clear / scope / all-clear / listener notification.
- **`src/lib/auth.ts`** — session now carries `signed_in_at`;
  `getRecentSignInAt()` + `isSignInRecent()` helpers;
  `RECENT_SIGNIN_WINDOW_MS = 10 * 60 * 1000`.
- **`src/index.css`** — new `@keyframes cocoon-shake` + `.cocoon-shake`
  class. Respects the existing `prefers-reduced-motion` global rule.
- **`src/components/entry/dialogShell.tsx`** — small portal + backdrop
  + Esc + body-scroll-lock + focus-on-open wrapper used by the four
  new dialogs. Keeps them lean.
- **`src/components/entry/LockDialog.tsx`** — *Lock this page* dialog,
  two 4–8 digit fields, mismatch and format errors, success toast.
- **`src/components/entry/UnlockDialog.tsx`** — *Unlock entry* dialog
  (mockup 11): single numeric field, shake on wrong code,
  rate-limited state when the server returns `rate_limited`.
- **`src/components/entry/RemoveLockConfirm.tsx`** — *Remove lock*
  confirm, reuses the stored session passcode.
- **`src/components/entry/DeleteEntryDialog.tsx`** — one component,
  four visual modes: unlocked-confirm, locked-passcode-or-forgot,
  type-DELETE, and the sign-in-again gate.
- **`src/components/entry/LockedPrivateScreen.tsx`** — the mockup-10
  *"This page is private"* screen with Unlock + Delete buttons.
  Replaces the old placeholder `LockedView`.
- **`src/components/entry/EntryTopBar.tsx`** — rewritten with props:
  `canLock`, `canRemoveLock`, `canDelete`, `minimal`. No more
  *Coming in step 10* toasts.
- **`src/pages/Entry.tsx`** — new branches: private screen when
  locked-without-passcode; auto-open via `useOpenEntry.mutate` when
  we already hold the session passcode; renders all three new
  top-bar actions.
- **Section components (`EditableTitle`, `InMyWords`, `WhatIMeant`,
  `MyNotes`, `Memories`)** — read `useSessionPasscode(entry.id)`
  and merge `{passcode}` into their mutation body when
  `entry.is_locked`. Zero behaviour change on unlocked entries.
- **Mock db + types** — `DeleteEntryRequest` forgot variant now
  carries `signed_in_at`; `deleteEntry` 401s with `unauthorized` if
  the timestamp is missing or older than 10 minutes.
- **Scripts** — `SIGNED_IN_INIT_SCRIPT` sets `signed_in_at` on the
  Playwright test session; journey script adds screen
  `08-locked-entry-private`; `waitForFontsAndPaint` bumped from
  150 ms → 400 ms so the locked screen's post-skeleton render is
  always captured.

## Files created

- `src/lib/sessionPasscodes.ts` (+ `.test.ts`)
- `src/components/entry/dialogShell.tsx`
- `src/components/entry/LockDialog.tsx`
- `src/components/entry/UnlockDialog.tsx`
- `src/components/entry/RemoveLockConfirm.tsx`
- `src/components/entry/DeleteEntryDialog.tsx`
- `src/components/entry/LockedPrivateScreen.tsx`
- `docs/build-log/step-10-lock-delete.md` (this file)
- `docs/plans/step-10-lock-delete.md`
- `docs/journey/08-locked-entry-private-phone.png`
- `docs/journey/08-locked-entry-private-laptop.png`

## Files modified

- `src/index.css` — added `cocoon-shake` keyframes + utility.
- `src/lib/auth.ts` — `signed_in_at` + helpers.
- `src/lib/types.ts` — `DeleteEntryRequest` forgot variant now
  carries `signed_in_at`.
- `src/mocks/db.ts` — stale-signin gate on `deleteEntry({forgot})`;
  new `unauthorized` db-error code; constant exposed.
- `src/mocks/db.test.ts` — updated the existing forgot test and
  added two new ones (stale timestamp / missing timestamp).
- `src/pages/Entry.tsx` — full rewrite of locked branch + dialog
  wiring.
- `src/components/entry/EntryTopBar.tsx` — props-driven, no more
  coming-soon toasts.
- `src/components/entry/EditableTitle.tsx`, `InMyWords.tsx`,
  `WhatIMeant.tsx`, `MyNotes.tsx`, `Memories.tsx` — pick up
  `useSessionPasscode` and thread it into mutations when locked.
- `scripts/_server.mjs` — `SIGNED_IN_INIT_SCRIPT` sets
  `signed_in_at`; `waitForFontsAndPaint` waits 400 ms post-fonts.
- `scripts/journey.mjs` — new `08-locked-entry-private` screen.
- `docs/USER_JOURNEY.md` — section 8 filled; header bumped to
  "step 10 of 21".
- `docs/plans/README.md` — index now includes step 10.

## Explanations

### `sessionPasscodes.ts` (`src/lib/sessionPasscodes.ts`)
- **What it is.** An in-memory map from entry id → passcode, plus
  a React hook that re-renders consumers when the map changes.
- **Why.** SPEC §2.5 — *"Unlocking shows the page for this visit
  only; it stays locked."* Keeping the store in a module-level
  variable guarantees the data is gone after a page refresh or
  tab close. Nothing to remember to clear.
- **How it connects.** `UnlockDialog` and `LockDialog` call
  `setSessionPasscode(id, code)` on success. The five section
  components call `useSessionPasscode(entry.id)` so inline edits /
  photo uploads on a still-locked entry can send the passcode.
  `DeleteEntryDialog` and `RemoveLockConfirm` clear the id on
  success so the UI doesn't hold a dead key.
- **Worth knowing.** Using `useSyncExternalStore` (not React
  context) means no provider wrapping is needed — anywhere in the
  tree can read the current passcode for an entry, and the store
  survives route changes within the same tab.

### `auth.ts` additions
- **What is new.** `Session.signed_in_at: ISODateTime` — sign-in
  timestamp. `getRecentSignInAt(): number | null` returns ms.
  `isSignInRecent(window = RECENT_SIGNIN_WINDOW_MS)` — thin
  convenience.
- **Why.** The forgot-passcode delete path (SPEC §2.5) requires
  the user to have signed in within 10 minutes. We check client-
  side before enabling the destructive action; the mock enforces
  the same window on `/delete`.
- **Worth knowing.** Sessions created before step 10 have no
  `signed_in_at` and are correctly treated as stale — the user is
  asked to sign in again. No forced sign-out on upgrade.

### `cocoon-shake` keyframes
- 0.4s horizontal shake, 6 keyframes. Used by the unlock dialog on
  wrong passcode; triggered by a changing `key` prop so React
  re-mounts the animated node and the shake fires again on each
  failed attempt.
- Reduced-motion users get `animation-duration: 0.01ms !important`
  from the existing global rule — they see the red error without
  the wobble.

### `dialogShell.tsx`
- Shared portal + backdrop + Esc + body-scroll-lock + focus-on-open.
  Used by all four new dialogs so each stays ~80 lines.
- **Worth knowing.** PhotoViewer and RemovePhotoDialog (step 9)
  still inline the same pattern; migrating them to `dialogShell`
  is intentionally deferred to polish step 13 to keep this diff
  focused.

### `LockDialog`
- Two password fields (4–8 digits), mismatch check, maps HTTP
  errors to warm toast copy. On success, drops the passcode into
  the session store so the user stays reading the entry.
- **Worth knowing.** `inputMode="numeric" pattern="[0-9]*"` opens
  the iPhone number pad. `maxLength={8}` enforces SPEC §2.5's
  8-digit max.

### `UnlockDialog`
- Single-field version. Shake animation is driven by a `shakeKey`
  integer that increments on each wrong attempt — re-mounting the
  wrapped node forces the animation to replay. The dialog switches
  to a dedicated *"Too many tries"* state when the server returns
  `rate_limited`, hiding the input entirely.

### `RemoveLockConfirm`
- Deliberately *not* a passcode prompt — the SPEC says *"Remove
  lock"* happens while unlocked, which means we already have the
  passcode in session. Just a warm confirm.

### `DeleteEntryDialog`
- One component, four modes: unlocked-confirm, locked-
  passcode-or-forgot, type-DELETE, sign-in-required gate. Sharing
  the dialog shell keeps the mode switch feel instantaneous.
- **Worth knowing.** The *Forgot passcode?* link calls
  `isSignInRecent()` before sending `{forgot: true}`; if stale
  (>10 min) it swaps to the sign-in-required screen before any
  destructive network call fires.

### `LockedPrivateScreen`
- Mockup-10 card. Hosts both the UnlockDialog and the
  DeleteEntryDialog (locked mode). `onUnlocked` tells the parent
  Entry page to refetch so the full content replaces the private
  card.

### `EntryTopBar` (rewrite)
- Props now drive visibility: `canLock` (shown when
  `!entry.is_locked`), `canRemoveLock` (shown only when
  locked-for-visit), `canDelete` (always on non-private pages),
  `minimal` (hides all right-hand buttons on the private screen
  and on error placeholders).

### `Entry.tsx` branching
- Loading → skeleton.
- 423 + session passcode present → `useOpenEntry.mutate` fires
  (effect), skeleton holds until the query cache has the full
  entry.
- 423 + no session passcode → `LockedPrivateScreen`.
- 404 → not-found placeholder.
- Other errors → generic placeholder.
- Otherwise → full reading view with all three top-bar actions
  wired to local `useState` toggles that open the matching dialog.

### Mock `deleteEntry` stale-signin gate
- The forgot-passcode path now reads `req.signed_in_at` and
  returns `{code: 'unauthorized', status: 401}` if it's missing or
  older than 10 minutes. Mirrors what step-17's real server will
  enforce from the Supabase session.

## How to try it

```bash
npm run dev

# Lock an unlocked entry
# 1. Open any unlocked entry (e.g. "A Calming Evening Walk").
# 2. Tap Lock in the top bar → dialog opens.
# 3. Type "1234" twice → Lock → "This page is now private." toast.
# 4. Top bar swaps Lock → Remove lock; you keep reading because
#    the passcode is in session memory.
# 5. Refresh the page → you get the private screen (passcode cleared).

# Unlock
# 6. Tap Unlock → dialog opens. Type a wrong 4-digit code →
#    the dialog shakes + shows "That passcode isn't right."
# 7. Repeat 4 more times → dialog switches to "Too many tries.
#    Please wait 15 minutes." Try again until the window expires
#    (or close/reopen the tab — the mock's rate-limit map lives
#    in memory too).
# 8. Type "1234" → entry opens; top bar again shows Remove lock
#    + Delete.

# Edit while unlocked-for-visit
# 9. Edit the title or body — "Saved." toast fires like usual.
#    Under the hood each mutation carries the session passcode.

# Remove lock
# 10. Tap Remove lock → confirm → "Lock removed. This page is no
#     longer private." The top bar now shows Lock again.

# Delete an unlocked entry
# 11. Tap Delete → "Delete this page? Once it's gone, you can't
#     get it back." → Delete → "Page deleted." → Home.

# Delete a locked entry from the private screen
# 12. Open the step-6 locked fixture at
#     /entry/66666666-6666-4666-8666-666666666666.
# 13. Tap Delete from the private card. Enter "1234" → delete.
# 14. Or tap Forgot passcode? → type DELETE → delete.

# Stale-signin gate (hard to trigger naturally — easiest in DevTools)
# 15. In the console: JSON.parse(localStorage['cocoon.session.v1'])
#     and rewrite `signed_in_at` to a 20-minute-old ISO string, then
#     reload. Now the Forgot flow asks you to sign in again first.

npm run typecheck   # green
npm run lint        # green
npm test            # 99 tests pass (91 before + 8 new)
npm run shots       # 10 screenshots
npm run journey     # 10 journey screenshots incl. 08-locked-entry-private
```

## Notes

- **Mocks store passcodes in plain text.** PBKDF2-SHA256 with
  210 000 iterations is enabled on the real server (step 17).
- **Rate-limit window is mock-mode only.** The `failedUnlocks` map
  lives in-memory and is gone after a page reload. Real
  `unlock_attempts` with time-windowed counting lands in step 17.
- **"Recent sign-in" is a 10-min client + mock gate.** Real
  enforcement reads the Supabase session server-side in step 17.
- **No PostHog `entry_locked` event yet** — PostHog itself lands
  in step 20.
- **Six dialog implementations now share patterns but not code.**
  `dialogShell` is used by the four new dialogs; PhotoViewer and
  RemovePhotoDialog (step 9) still inline the same scaffolding.
  Polish step 13 should consolidate.

## Suggested commit message

```
feat: lock / unlock / remove-lock / delete flows with session passcode and forgot-DELETE path
```

## Open questions

- Should **Remove lock** also require the passcode (defence-in-
  depth — what if the user shared their phone mid-visit)? Right
  now we trust the session: unlocked-for-visit means it's still
  the same person. Flagged for polish.
- The unlock dialog's `tracking-[0.5em]` looks nice in Safari but
  can push a 7–8 digit passcode past the right edge on narrow
  phones. Fine for 4-digit codes (the spec recommends short) —
  revisit if any user reports clipping.
- **No unit tests for the dialog components themselves.** They're
  state-heavy and portal-based, which makes vitest+jsdom brittle.
  Covering them properly waits for step 19's Playwright suite.
