# Step 08 — Entry reading view + inline editing

Clicking an entry card used to open a step-1 "Entry … Route param:
`<id>`" placeholder. Now it opens the full reading view — paper sheet
with the red margin line, date + mood + title, **In my words** with
the ruled body + the raw transcript toggle, the **What I meant**
parchment card holding interpretation and **Key reflection**,
**Memories** thumbnails, and **My notes**. Every writeable section
has an inline Edit → Save/Cancel flow with a *"Saved."* toast.

## What was built

- **`src/pages/Entry.tsx`** — composes the top bar + sections, handles
  loading, locked (423), not-found (404), and generic error states.
- **`src/hooks/useInlineEdit.ts`** — shared state machine for every
  editable section. Guards against mid-edit draft clobbers. 7 tests.
- **`src/components/entry/EditableBlock.tsx`** — one visual wrapper
  (display text + pencil Edit link, textarea / input editor + × Cancel
  / ✓ Save buttons). Every section uses it.
- **`EntryTopBar`** — Back to journal (left); Lock + Delete (right,
  no-op for step 8, both fire `toast('Coming in step 10')`).
- **Section components** — `DateAndMood`, `EditableTitle`,
  `InMyWords`, `WhatIMeant`, `SupportNoteCard`, `MemoriesPlaceholder`,
  `MyNotes`.
- **`.entry-sheet`** CSS modifier (in `src/index.css`) — the paper
  sheet with the faint red margin line via a `::before` pseudo-element.
- **`isApiError(err, code)`** narrowing helper in `src/lib/api.ts`.
- **`formatEntryHeaderDate(iso)`** helper in `src/lib/dates.ts` for
  the date eyebrow.

## Files created

- `src/hooks/useInlineEdit.ts` (+ `useInlineEdit.test.tsx`)
- `src/components/entry/EntryTopBar.tsx`
- `src/components/entry/EditableBlock.tsx`
- `src/components/entry/DateAndMood.tsx`
- `src/components/entry/EditableTitle.tsx`
- `src/components/entry/InMyWords.tsx`
- `src/components/entry/WhatIMeant.tsx`
- `src/components/entry/SupportNoteCard.tsx`
- `src/components/entry/MemoriesPlaceholder.tsx`
- `src/components/entry/MyNotes.tsx`
- `docs/build-log/step-08-entry-reading.md` (this file)
- `docs/plans/step-08-entry-reading.md`
- `docs/journey/06-entry-reading-default-phone.png`, `06-entry-reading-default-laptop.png`

## Files modified

- `src/pages/Entry.tsx` — full rewrite.
- `src/lib/dates.ts` — adds `formatEntryHeaderDate`.
- `src/lib/api.ts` — adds `isApiError(err, code?)`.
- `src/index.css` — adds `.entry-sheet` with the red margin line
  pseudo-element.
- `scripts/shots.mjs` — `/entry/example` → real fixture id so the
  shots show real content.
- `scripts/journey.mjs` — adds `06-entry-reading-default`.
- `docs/USER_JOURNEY.md` — section 6 filled; header bumped to 8 of 21.
- `docs/plans/README.md` — index now includes step 08.

## Explanations

### `useInlineEdit` (`src/hooks/useInlineEdit.ts`)
- **What it is.** A tiny state machine returning
  `{ isEditing, draft, dirty, saving, startEditing, cancel, save, setDraft }`.
- **Why.** Every editable section (title, body, interpretation,
  reflection, notes) shares the exact same UX — this hook is the one
  place that enforces it.
- **How it connects.** Each section component instantiates it with the
  current server value as `initial` and the matching
  `useUpdateEntry(id).mutateAsync({ [field]: next })` as `onSave`.
- **Worth knowing.** `baseline` is a `useState`, not a `useRef`. React
  19's new `react-hooks/refs` rule forbids reading a ref during render,
  which bit the first draft. State works and makes `dirty` reactive.

### `EditableBlock` (`src/components/entry/EditableBlock.tsx`)
- **What it is.** The visual wrapper around `useInlineEdit`. Renders
  either the display content + pencil Edit link, or the editor
  (textarea or input) + Cancel / Save buttons.
- **Worth knowing.** Autofocuses the editor on edit-start and moves
  the caret to the end — avoids the "click Edit, click textarea, click
  end of text, type" shuffle on touch.

### `EntryTopBar`
- Back / Lock / Delete. Lock + Delete fire `toast('Coming in step 10')`
  for now. Step 10 wires both.

### `.entry-sheet` CSS
- **What it is.** A `paper-sheet` variant with the faint red margin
  line painted via `::before`.
- **Why.** The line is purely decorative and shouldn't affect layout
  — a pseudo-element on an element with `position: relative; overflow:
  hidden` gives perfect alignment regardless of rounded corners.
- **Worth knowing.** Content inside the sheet uses extra left-padding
  (`44px` phone / `64px` md) so text clears the line.

### Each section
- **`DateAndMood`** — `formatEntryHeaderDate(entry.entry_date)` +
  `MoodBadge`.
- **`EditableTitle`** — single-line `EditableBlock` (input, not
  textarea).
- **`InMyWords`** — ruled-lines body + a collapsible
  *See original transcript* button that reveals `entry.transcript_raw`
  in a dim parchment panel.
- **`WhatIMeant`** — parchment-tinted card with the interpretation
  and (below a thin rule) the italic serif Key reflection. Two
  `EditableBlock`s — one per field.
- **`SupportNoteCard`** — soft warm aside with the SPEC §2.4 copy and
  the `findahelpline.com` link. Shown when `entry.support_note` is
  true **or** when `?support=1` is in the URL (dev toggle).
- **`MemoriesPlaceholder`** — read-only thumbnails of
  `entry.photos`; a disabled dashed "Add a photo…" button that
  tooltips "Coming in step 9".
- **`MyNotes`** — empty state uses italic serif *"Your own reflections
  and bullet points will live here."* + an *Add my own thoughts* link.
  Non-empty state displays the notes with an Edit link.

### Error states on `Entry`
- **423 locked** → "This page is private" with a Back to journal
  button. Full unlock dialog lives in step 10.
- **404 not_found** → "I can't find that entry."
- Anything else → generic "Couldn't open this entry."

## How to try it

```bash
npm run dev
# Open http://localhost:5173, click any past entry. "A Calming
# Evening Walk" is the first one.
# Click Edit on each section, type, tap × Cancel — the display
# restores. Click Edit again, type, tap ✓ Save — "Saved." toast
# appears and the new content shows.
# Toggle See original transcript to view the raw speech-to-text.
# Visit /entry/<id>?support=1 to see the support-note card.
# Click the locked fixture (#6) from Home → "This page is private".
# Click Lock or Delete in the top bar → "Coming in step 10" toast.

npm run typecheck   # green
npm run lint        # green
npm test            # 82 tests pass
npm run shots       # /entry screenshot picks up the real fixture
npm run journey     # 06-entry-reading-default-* PNGs appear
```

## Notes

- **Mockups are layout truth; SPEC is copy truth.** Mockups show
  "Voice Journal" and Tamil text; we use "COCOON" and English only.
- **Edits persist only in MSW's in-memory DB.** Refreshing the page
  keeps the edit (the DB is still in memory). Closing the tab or
  restarting Vite resets to the original fixtures. Real persistence
  is step 15.
- **React 19 strictness.** `useInlineEdit` was reworked once because
  the new `react-hooks/refs` rule rejected reading a ref during
  render — state for `baseline` is the sanctioned pattern.
- **Locked view is placeholder-level.** The full "This page is
  private" screen with the unlock dialog + 5-wrong-tries rate limit
  is step 10.
- **Memories section is read-only.** Real add/remove with
  browser-side JPEG resize + 1600 px cap lands in step 9.
- The `?support=1` query param is a dev-only visual toggle — handy
  until step 16 trains the AI to flip `support_note` on real entries.

## Suggested commit message

```
feat: Entry reading view with inline editing and support-note card
```

## Open questions

- Edit-mode exclusivity — right now any number of sections can be in
  edit mode at once. Fine in practice; if it gets confusing we can
  cap at one at a time via a page-level context.
- The `WhatIMeant` card uses inline-style `color-mix` because the
  parchment background doesn't need its own Tailwind token. If more
  tinted cards appear later we'll promote it.
- Keyboard shortcuts — Esc to cancel, ⌘Enter to save — are a nice
  polish touch for step 13.
