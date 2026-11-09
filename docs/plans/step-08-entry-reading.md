# Step 08 — Entry reading + inline editing (rebuild recipe)

## Context

Step 7 saves a new entry and navigates to `/entry/:id`, which is still
the step-1 placeholder ("Entry … Route param: `<id>`"). This step
replaces that placeholder with the full reading view the whole app is
oriented around: the paper sheet with the red margin line, date + mood
+ title, **In my words** (with the raw-transcript toggle), the **What
I meant** parchment card holding the AI interpretation + Key
reflection, a **My notes** section, and inline editing with Save /
Cancel + "Saved." toast on every section.

Lock, Unlock, Delete, and real Photo add/remove land in steps 9–10.
This step shows the Lock and Delete buttons in the top bar as visible
but no-op (`toast('Coming in step 10')`), and renders the entry's
existing photos as read-only thumbnails with a disabled "Add a photo"
button (actual add/remove is step 9).

**What Aruna will see at the end:**
- Clicking a past-entry card opens its full reading view at
  `/entry/:id`.
- Paper sheet with a faint red margin line, date eyebrow + mood badge,
  large serif title.
- Four editable sections: **Title**, **In my words**, **What I meant**
  / **Key reflection**, **My notes**. Pencil **Edit** link under each
  section swaps it for a textarea with × Cancel / ✓ Save. A **"Saved."**
  toast confirms.
- "See original transcript" toggle under In my words that reveals the
  raw speech-to-text text.
- Support-note card (always off in fixtures today; toggleable via a
  `?support=1` query param for visual testing).
- Memories — read-only photo thumbnails if the entry has any; a
  disabled "Add a photo or two from this day" dashed button noting
  step 9.
- Back to journal link in the top bar; Lock and Delete buttons that
  show a "Coming in step 10" toast.
- Locked entry (fixture #6): a gentle "This page is private" state
  with a Back to journal button. The full unlock dialog comes in step 10.

## Approach

### 1. Shared inline-edit primitive — `src/hooks/useInlineEdit.ts`

Small typed hook. Keeps Save/Cancel UX identical across every section
and keeps the Entry page thin.

```ts
type UseInlineEditArgs<T> = {
  initial: T;
  onSave: (next: T) => Promise<unknown>;
  isEqual?: (a: T, b: T) => boolean;
};

type UseInlineEdit<T> = {
  isEditing: boolean;
  draft: T;
  startEditing: () => void;
  cancel: () => void;
  save: () => Promise<void>;
  setDraft: (next: T) => void;
  dirty: boolean;
  saving: boolean;
};

export function useInlineEdit<T>(args: UseInlineEditArgs<T>): UseInlineEdit<T>;
```

Behaviour:
- `startEditing()` seeds `draft` from `initial` and flips `isEditing`.
- `setDraft(v)` updates `draft`.
- `cancel()` restores `draft` to `initial` and exits edit mode.
- `save()` calls `onSave(draft)`. On success → `toast('Saved.')`, exit
  edit mode. On error → `toast.error('Couldn\'t save. Try again.')`,
  stay in edit mode. `saving` flips true during the call.
- When `initial` changes (new API response landed), we **don't**
  overwrite the user's current `draft` — if they're mid-edit, their
  input wins.
- `dirty` is `!isEqual(initial, draft)`.

**Pure tests** (`useInlineEdit.test.tsx`) using `renderHook`:
start → draft seeded; cancel → draft resets; save on success →
isEditing false + onSave called with draft; save on reject → stays in
edit mode + no toast confirms; mid-edit `initial` change doesn't
clobber draft.

### 2. Reusable editor UI — `src/components/entry/EditableBlock.tsx`

A small presentational wrapper that renders either the display
(`children`) or an editor (`textarea` or `input`) depending on
`isEditing`. Props:

```ts
interface EditableBlockProps {
  edit: UseInlineEdit<string>;
  editLabel?: string;        // 'Edit' / 'Edit my words' / etc.
  singleLine?: boolean;       // input vs textarea
  editorPlaceholder?: string;
  editorClassName?: string;   // apply .ruled-lines to In my words etc.
  renderDisplay: () => React.ReactNode;
  autoFocusOnEdit?: boolean;
}
```

Buttons at the bottom-right when editing: **× Cancel** (variant=ghost)
and **✓ Save** (default button, disabled when `!edit.dirty || edit.saving`).
When not editing, a pencil "Edit" link under the display content.

### 3. Entry top bar — `src/components/entry/EntryTopBar.tsx`

Sits outside the paper sheet. Matches mockups 06 and 16 — icon-only on
phone, icon + label on `md:`. Three items:
- Left: **Back to journal** (ArrowLeft + label) → navigates to `/`.
- Right: **Lock** (Lock icon) → `toast('Coming in step 10')`.
- Right: **Delete** (Trash2 icon, destructive variant styling) →
  `toast('Coming in step 10')`.

Uses the existing shadcn `Button` with `variant="ghost"`. Horizontal
layout with `justify-between`.

### 4. Paper sheet with red margin line — new utility in `src/index.css`

Extend the existing `.paper-sheet` with a modifier class `.entry-sheet`
that:
- Keeps the warm shadow, paper bg, soft border.
- Adds `position: relative; overflow: hidden` (so the margin line
  doesn't bleed through rounded corners).
- Adds a `::before` pseudo-element: 1 px wide, from top to bottom, at
  `left: 28px` on phone and `left: 48px` on `md:`, in a faint recording
  red: `color-mix(in srgb, var(--color-recording) 35%, transparent)`.

Content inside gets `padding-left: 44px` on phone / `padding-left: 64px`
on `md:` so text doesn't collide with the line.

### 5. Entry page composition — `src/pages/Entry.tsx`

```tsx
export function Entry() {
  const { id = '' } = useParams<{ id: string }>();
  const { data, isLoading, error } = useEntry(id);

  if (isLoading) return <EntryPageShell><EntrySkeleton/></EntryPageShell>;
  if (error && isApiError(error, 'locked')) return <EntryPageShell><LockedView entryId={id}/></EntryPageShell>;
  if (error && isApiError(error, 'not_found')) return <EntryPageShell><NotFoundView/></EntryPageShell>;
  if (error || !data) return <EntryPageShell><GenericErrorView/></EntryPageShell>;

  return (
    <EntryPageShell>
      <EntryTopBar />
      <article className="entry-sheet mt-5 md:mt-6">
        <DateAndMood entry={data} />
        <EditableTitle entry={data} />
        <InMyWords entry={data} />
        <WhatIMeant entry={data} />
        {shouldShowSupportNote(data) && <SupportNoteCard />}
        <MemoriesPlaceholder photos={data.photos} />
        <MyNotes entry={data} />
      </article>
    </EntryPageShell>
  );
}
```

`EntryPageShell` is a small wrapper that does the centred max-width
container matching mockup 16 (720 px). No Home-style `<Layout>`
header — the Entry page has its own top bar.

`shouldShowSupportNote(entry)` returns `entry.support_note` or `true`
if the URL has `?support=1` (dev visual toggle).

### 6. The section components

Each one reads/writes a single Entry field via `useUpdateEntry(id)`
and `useInlineEdit`.

- **`DateAndMood`** — reuses `formatCardDate()` (step 7) for the long
  form "WEDNESDAY, 4 NOVEMBER 2026" eyebrow (actually: SPEC says
  "Full date" — e.g. "Wednesday, 4 November 2026" letter-spaced
  uppercase). Add `formatEntryHeaderDate(iso)` to `src/lib/dates.ts`
  → `"WEDNESDAY, 4 NOVEMBER 2026"`. Mood badge via existing
  `MoodBadge` component.

- **`EditableTitle`** — single-line input when editing, large serif
  `<h1>` when not. `edit.setDraft` on input, `edit.save` on submit.

- **`InMyWords`** — small clay "IN MY WORDS" eyebrow, then the body
  on ruled lines using the existing `.ruled-lines` utility. Below:
  pencil "Edit my words" link. Under that, a tiny toggle button
  **"See original transcript" ↔ "Hide original transcript"** that
  reveals `entry.transcript_raw` in a dim parchment panel.

- **`WhatIMeant`** — a parchment-tinted card (background
  `var(--color-parchment)`, subtle border). Sparkles icon + "WHAT I
  MEANT" eyebrow + interpretation paragraph + Edit. Horizontal divider
  (dotted or 1 px rule). Quote icon + "KEY REFLECTION" eyebrow +
  reflection in **italic serif** + Edit.

- **`SupportNoteCard`** — soft, warm. SPEC copy verbatim: *"If today
  feels heavy, you don't have to carry it alone."* with a
  `Find someone to talk to` link → `https://findahelpline.com`. Never
  alarming — same visual weight as any other card, slightly warmer
  tint.

- **`MemoriesPlaceholder`** — "MEMORIES" eyebrow + "{n}/2" count.
  Render any existing photos as read-only rounded thumbnails (no ×
  button). If `photos.length < 2`, show a dashed "Add a photo or two
  from this day" button, **disabled**, with a `Coming in step 9`
  tooltip (`title` attribute).

- **`MyNotes`** — pencil icon + "MY NOTES" eyebrow. If `entry.notes`
  is empty, show italic placeholder *"Your own reflections and points
  will live here."* + an "Add my own thoughts" link that opens the
  editor directly. Otherwise, display notes with the Edit link
  underneath.

### 7. Error states

`isApiError(err, code)` is a tiny helper in `src/lib/api.ts` to narrow
`err instanceof APIError && err.code === code`. Three handled cases:
- 423 locked → "This page is private" placeholder with a Back to
  journal button. Note that full unlock lands in step 10.
- 404 not_found → "I can't find that entry." + Back link.
- Anything else → generic "Couldn't open this entry." + Back link.

Loading: a small skeleton matching the paper sheet layout — eyebrow,
title bar, three paragraph bars.

### 8. Update the queries for cache invalidation

`useUpdateEntry` already (step 4) calls
`qc.setQueryData(['entry', id], entry)` and invalidates `['entries']`.
So after a successful edit the Home list reflects the new title/mood
without a refetch. No change needed.

### 9. Journey + USER_JOURNEY

- `scripts/journey.mjs`: append `{ num: '06', name: 'entry-reading',
  state: 'default', path: '/entry/11111111-1111-4111-8111-111111111111',
  requireAuth: true }` (the "A Calming Evening Walk" fixture, mockup 06's
  entry). The fixture seed is stable across sessions.
- `docs/USER_JOURNEY.md` — fill section 6 (Reading view) with phone +
  laptop screenshots.

### 10. Build log + rebuild recipe

- `docs/build-log/step-08-entry-reading.md` with the usual
  explain-as-you-go blocks for `useInlineEdit`, `EditableBlock`,
  `EntryTopBar`, `EntryPaper` (red margin), each section component,
  the `?support=1` visual toggle, and the error/locked states.
- Copy this plan file to `docs/plans/step-08-entry-reading.md` before
  it's overwritten by step 9.

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
- `docs/build-log/step-08-entry-reading.md`
- `docs/plans/step-08-entry-reading.md`
- `docs/journey/06-entry-reading-default-phone.png`, `06-entry-reading-default-laptop.png`

## Files modified

- `src/pages/Entry.tsx` — full rewrite.
- `src/lib/dates.ts` — add `formatEntryHeaderDate(iso)` →
  `"WEDNESDAY, 4 NOVEMBER 2026"` (all caps, letter-spaced via CSS
  class not the string).
- `src/lib/api.ts` — add `isApiError(err, code)` narrowing helper.
- `src/index.css` — add `.entry-sheet` class with the red margin line
  pseudo-element.
- `scripts/journey.mjs` — add entry-reading screen.
- `docs/USER_JOURNEY.md` — section 6 filled; header bumped to "step 8 of 21".
- `docs/plans/README.md` — index now includes step 08.

## Explicitly out of scope

- Real photo add/remove and HEIC → JPEG resize (step 9).
- Lock / Unlock / Remove lock / Delete flows (step 10).
- Full unlock dialog for a locked entry you own — step 8 just shows a
  graceful "This page is private" placeholder.
- Keyboard shortcuts (Esc to cancel, ⌘Enter to save) — add if needed
  during polish in step 13.
- Edit-mode exclusivity (only one section editable at a time).
  Multiple sections can be edited concurrently; feels natural and
  avoids the user losing changes when they click another section.

## Verification (BUILD_PLAN Step 8 "Check")

1. `npm run typecheck` · `npm run lint` · `npm test` all green. New
   `useInlineEdit` tests pass.
2. `npm run dev`. From Home, click "A Calming Evening Walk" →
   `/entry/<id>` renders the paper sheet with the red margin line,
   date eyebrow, mood badge, title, In my words, What I meant +
   Key reflection, memory thumbnails (2 photos), empty My notes
   placeholder.
3. Click **Edit my words** → textarea with the body; type; click
   **× Cancel** — the display restores. Click **Edit my words** again,
   type, click **✓ Save** — "Saved." toast fires; the body shows the
   new text. Refresh the page → the edit persists (in the mock DB
   until the next full page reload clears MSW). Same for Title,
   What I meant, Key reflection, and My notes.
4. Click **See original transcript** — raw transcript panel appears
   below In my words. Click **Hide original transcript** — it hides.
5. Visit `/entry/11111111-1111-4111-8111-111111111111?support=1` — the
   support-note card appears under What I meant.
6. Click the locked fixture from Home's past-entries list
   (`/entry/66666666-6666-4666-8666-666666666666`) — a "This page is
   private" placeholder shows with a Back to journal button (full
   unlock lands in step 10).
7. Click a bad id (`/entry/nope`) — "I can't find that entry."
   placeholder shows.
8. Lock / Delete buttons in the top bar each fire the
   "Coming in step 10" toast.
9. On laptop (≥ 768 px): paper sheet is centred at ~720 px; top bar
   buttons show text labels; margin line sits further from the content.
10. `npm run shots` + `npm run journey` complete; new
    `06-entry-reading-default-*.png` appear.

## Suggested commit message

```
feat: Entry reading view with inline editing and support-note card
```

## Notes to flag in the build log

- Mockups 06–09 are the source of layout truth; all **copy** comes
  from SPEC §2.4. The AI writer prompt lives in step 16 — this step
  just displays whatever the create-entry mock produced.
- The red margin line is a CSS pseudo-element on `.entry-sheet`, not
  a border, so it aligns independently of the paper sheet's rounded
  corners.
- `useInlineEdit` guards against overwriting a user's draft when the
  API response changes under them. Important once step 16 does real
  AI edits that might arrive after a user has started typing.
- Dev toggle: visit `/entry/<id>?support=1` to see the support-note
  card without having to flip a fixture's `support_note: true`.
- The locked view is deliberately minimal — step 10 replaces it with
  the full unlock dialog + 5-wrong-tries rate limit.
