# Step 09 — Memories (real photos)

The step-8 Entry page showed photos read-only, with a disabled dashed
"Add a photo…" button that popped a *Coming in step 9* toast. Now
the Memories section is fully alive: tap the dashed button → iOS /
Android / desktop file picker → the image is shrunk in your browser
to a JPEG ≤ 1600 px on its longest edge → uploaded → a thumbnail
appears. Tap a thumbnail for a full-size viewer; tap × and confirm
to remove. The dashed button hides at 2/2.

## What was built

- **`src/lib/resizeImage.ts`** — browser-side image resizer. Loads
  the file (with an HEIC-friendly fallback for iOS Safari), draws it
  to a canvas at the target size, encodes JPEG. Pure helper
  `computeTargetSize` is split out so the maths is unit-testable.
- **`src/lib/resizeImage.test.ts`** — 9 tests covering landscape /
  portrait / square / already-small / exact-max / rounding / thin
  images / bad input / bad maxEdge.
- **`src/components/entry/PhotoViewer.tsx`** — full-screen viewer
  modal. Dim backdrop, centred `<img>`, × close button, keyboard
  (Esc + ←/→), click-through to close on backdrop, locks body
  scroll. Uses `createPortal` so it floats above the sheet.
- **`src/components/entry/RemovePhotoDialog.tsx`** — confirm dialog
  with Keep / Remove and a destructive clay-red Remove button. Esc
  and backdrop click = Keep. Disables during the delete mutation.
- **`src/components/entry/Memories.tsx`** — real Memories section
  replacing `MemoriesPlaceholder`. Hidden `<input type="file">`
  triggered by the dashed button; `resizeImageToJpeg` →
  `useUploadPhoto`; thumbnails with × chips; toast on success /
  failure.
- **`src/pages/Entry.tsx`** — swapped `MemoriesPlaceholder` for
  `Memories`.
- **`scripts/journey.mjs`** — added a `06b-entry-reading-empty-memories`
  screen for the dashed-Add-button state (fixture #4, which has 0
  photos).
- **`docs/USER_JOURNEY.md`** — section 7 (Memories) now live with
  both filled and empty screenshots; header bumped to "step 9 of 21".

## Files created

- `src/lib/resizeImage.ts`
- `src/lib/resizeImage.test.ts`
- `src/components/entry/Memories.tsx`
- `src/components/entry/PhotoViewer.tsx`
- `src/components/entry/RemovePhotoDialog.tsx`
- `docs/build-log/step-09-photos.md` (this file)
- `docs/plans/step-09-photos.md`
- `docs/journey/06b-entry-reading-empty-memories-phone.png`
- `docs/journey/06b-entry-reading-empty-memories-laptop.png`

## Files modified

- `src/pages/Entry.tsx` — swapped the placeholder for the real
  `Memories` component.
- `scripts/journey.mjs` — added the 06b empty-memories screen.
- `docs/USER_JOURNEY.md` — section 7 filled; header updated.
- `docs/plans/README.md` — index now includes step 09.

## Files deleted

- `src/components/entry/MemoriesPlaceholder.tsx` — superseded by
  `Memories.tsx`.

## Explanations

### `resizeImage.ts` (`src/lib/resizeImage.ts`)
- **What it is.** Two exports: `computeTargetSize(w, h, maxEdge)`
  (pure maths: scale down so the longest edge is ≤ maxEdge, never
  upscale) and `resizeImageToJpeg(file, options?)` (the full
  pipeline that reads the file, draws it to a canvas, and returns a
  JPEG `File`).
- **Why.** SPEC §6 requires that photos are **resized in the browser
  to a JPEG of at most 1600 px before upload**. This keeps big
  iPhone shots from blowing past Vercel's 4.5 MB request cap and
  keeps the Supabase Storage footprint small.
- **How it connects.** `Memories.tsx` calls `resizeImageToJpeg(file)`
  the moment the user picks a file, before the `useUploadPhoto`
  mutation runs.
- **Worth knowing.** We prefer `createImageBitmap` (fast,
  off-main-thread decode where available) but fall back to an
  `<img>` element when that throws — HEIC from iOS Safari can
  only be decoded via `<img>` + canvas. The SPEC §6 note "Safari
  converts HEIC when drawing to canvas" refers to exactly this
  fallback.

### `PhotoViewer.tsx` (`src/components/entry/PhotoViewer.tsx`)
- **What it is.** A full-screen modal that shows a photo
  `object-contain` inside a 92 vw × 90 vh box on a dim backdrop.
  Close via ×, backdrop click, or Esc. If the entry has both
  photos, left/right chevrons (and ←/→ keys) cycle between them.
- **Why.** SPEC §2.4 calls for *"Tap to view full-size"* — the user
  should be able to really look at a photo without being pulled
  out of Cocoon.
- **How it connects.** `Memories` renders `<PhotoViewer>` with
  `startIndex` set to the tapped thumbnail; closing just unsets the
  Memories-local state that controls visibility.
- **Worth knowing.** Uses `createPortal` to mount under `<body>` so
  the dim backdrop isn't clipped by the entry sheet's `overflow:
  hidden`. Locks `body.style.overflow` while open so the page
  underneath doesn't scroll on touch.

### `RemovePhotoDialog.tsx` (`src/components/entry/RemovePhotoDialog.tsx`)
- **What it is.** A small centred confirm card ("Remove this photo?")
  with Keep / Remove buttons.
- **Why.** SPEC §2.4 — *"× removes after a confirm."* We never
  nuke a photo on a single tap.
- **How it connects.** `Memories` opens it by setting
  `pendingRemove` to the clicked photo; Remove runs the
  `useDeletePhoto` mutation and the component closes on success.
- **Worth knowing.** During the delete mutation the Remove button
  becomes "Removing…", Esc is blocked, and backdrop clicks are
  no-ops — so the user can't double-fire or escape mid-delete.

### `Memories.tsx` (`src/components/entry/Memories.tsx`)
- **What it is.** The real Memories section. Composes the viewer,
  the confirm dialog, a hidden file input, the resize helper, and
  the upload/delete mutations into one component.
- **Why.** Direct wiring of SPEC §2.4 photo rules and SPEC §6 image
  handling.
- **How it connects.** Rendered by `Entry.tsx` between the (optional)
  support-note card and My Notes. Reads from the `entry.photos`
  prop; mutations call back into TanStack Query which invalidates
  `['entry', id]` and `['entries']` so the thumbnail list and the
  past-entries card both refresh.
- **Worth knowing.** The `<input>` is reset to `''` after each pick
  so the user can re-pick the same file if upload failed. The
  error-to-toast mapper returns distinct copy for the three realistic
  failure modes (too-many-photos, too-big, unreadable image) and a
  generic fallback.

### Journey script update
- **`scripts/journey.mjs`** gained a `06b-entry-reading-empty-memories`
  screen that opens the "Deadline Worries Keeping Me Up" fixture
  (id `44444444-4444-4444-8444-444444444444`, 0 photos). That's how
  the dashed Add button ends up in the captured journey without
  requiring real file uploads during Playwright.

## How to try it

```bash
npm run dev
# Open http://localhost:5173.
# Tap any entry in the past-entries list.
# Scroll to MEMORIES. Try each of:
#  1. Tap "Add a photo or two from this day" → pick a photo →
#     thumbnail appears → "Photo added." toast → counter ticks up.
#  2. Pick a second photo → counter → 2/2 → the dashed button vanishes.
#  3. Tap a thumbnail → full-size viewer opens → tap backdrop or
#     press Esc to close. If you added two, press ←/→ to flip
#     between them, or tap the on-screen chevrons.
#  4. Tap × on a thumbnail → confirm dialog → Keep closes it
#     without deleting; Remove deletes it with a "Photo removed."
#     toast.
#  5. Open the "Deadline Worries Keeping Me Up" entry to see the
#     empty 0/2 state — only the dashed button is shown.

# For the HEIC path (the one we most want to get right):
# Sync an iPhone photo to your Mac Downloads as HEIC and drop it
# into the picker. It should upload as a JPEG thumbnail without
# complaint.

npm run typecheck   # green
npm run lint        # green
npm test            # 91 tests pass (82 before + 9 resize tests)
npm run shots       # /entry screenshot picks up photo thumbnails
npm run journey     # 06 + 06b memory screens refreshed
```

## Notes

- **Mock-mode preview URLs are transient.** The MSW handler for
  `POST /api/entries/:id/photos` calls `URL.createObjectURL(file)`
  and stores the resulting `blob:` URL in the in-memory fixture.
  That URL is valid for this browser tab only — refresh the page
  and the thumbnail stops loading. Not a bug worth fixing; real
  Supabase Storage signed URLs land in step 17 and solve this for
  good.
- **Passcode threading is stubbed.** `useUploadPhoto` and
  `useDeletePhoto` already accept an optional `passcode` from
  step 4, but we don't surface a passcode prompt yet. Step 10
  will plumb the unlocked-for-this-visit passcode through so a
  locked entry can still accept new photos while open.
- **EXIF orientation.** `createImageBitmap(file, { imageOrientation:
  'from-image' })` respects embedded orientation, so photos taken
  sideways on a phone come out upright. The `<img>` fallback inherits
  the browser's auto-orientation.
- **No PostHog `photo_added` event yet.** SPEC §9 lists it; PostHog
  itself lands in step 20.
- **Server-side cap check.** The MSW handler already enforces 2
  photos per entry (returns `too_many_photos` / 409) and the 4 MB
  payload cap, so the client safely treats the hide-at-2 UI as
  defence-in-depth rather than the only gate.

## Suggested commit message

```
feat: real Memories section with browser-side resize, viewer, and remove-confirm
```

## Open questions

- Should the viewer support pinch-to-zoom on touch? Not in SPEC —
  revisit during polish (step 13) if real-device testing says it
  feels cramped.
- EXIF rotation sometimes still surprises on older iOS builds. If
  anyone hits a sideways upload, we can add an orientation sniff
  before drawing to canvas (`exifr` is tiny, ~5 kB).
- The resize happens on the main thread. Fine for a 10 MB iPhone
  JPEG; a 50 MP photo might briefly jank. If that becomes real, we
  can move the pipeline into a Web Worker.
