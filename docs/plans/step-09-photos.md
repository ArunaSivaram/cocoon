# Step 09 — Memories (real photos) — rebuild recipe

## Context

Step 8 shipped the Entry reading view with a read-only
`MemoriesPlaceholder`: thumbnails rendered from `entry.photos` and a
disabled dashed "Add a photo…" button that popped a *Coming in step 9*
toast. Everything on the API / query side is already in place:

- `src/hooks/queries.ts` exports `useUploadPhoto(entryId)` and
  `useDeletePhoto(entryId)` since step 4.
- `src/mocks/handlers.ts` implements `POST /api/entries/:id/photos`
  (multipart, 4 MB cap, `URL.createObjectURL` preview) and
  `POST /api/entries/:id/photos/:pid/delete`.
- `src/mocks/db.ts` enforces the 2-photo cap and returns
  `too_many_photos` / 409.

Step 9 only needs to build the browser-side pieces: resize the picked
file, open the file picker, call the existing mutations, and add the
viewer + remove-confirm dialogs.

**What Aruna will see at the end:**
- Tap the dashed "Add a photo or two from this day" button → the OS
  photo picker opens.
- Pick a photo (even a huge iPhone HEIC) → it's resized to a JPEG
  ≤ 1600 px in the browser, then uploaded. A thumbnail appears; counter
  ticks from `0/2` → `1/2` → `2/2`.
- At `2/2` the dashed button disappears.
- Tap a thumbnail → full-size viewer fills the screen; backdrop / Esc /
  × closes.
- Tap the × chip on a thumbnail → warm *"Remove this photo?"* dialog;
  Keep leaves it, Remove deletes.
- Upload failures (too big, too many, unreadable file) show a warm toast
  and leave the entry untouched.

## Approach

### 1. Browser-side resizer — `src/lib/resizeImage.ts`

Pure helper + DOM pipeline split into two exports so the maths is unit-
testable in jsdom (canvas and `createImageBitmap` aren't).

```ts
export function computeTargetSize(w: number, h: number, maxEdge: number): {
  width: number;
  height: number;
};

export async function resizeImageToJpeg(
  file: File,
  options?: { maxEdge?: number; quality?: number },
): Promise<File>;
```

Behaviour of `resizeImageToJpeg`:
1. Load the file. Prefer `createImageBitmap(file, { imageOrientation:
   'from-image' })`; on throw, fall back to `new Image(); img.src =
   URL.createObjectURL(file)` — this HEIC path is essential for iOS
   Safari (SPEC §6 "Safari converts HEIC when drawing to canvas").
2. Compute target size via `computeTargetSize`.
3. Create a `<canvas>`, `getContext('2d', { alpha: false })`, draw.
4. `canvas.toBlob(resolve, 'image/jpeg', quality)` with `quality = 0.85`.
5. Return `new File([blob], baseName + '.jpg', { type: 'image/jpeg' })`.
6. Release the source (`bitmap.close()` or `URL.revokeObjectURL`) in a
   `finally`.

### 2. Unit tests — `src/lib/resizeImage.test.ts`

Cover `computeTargetSize` only (DOM bits are covered by manual device
testing + step-19 Playwright):
- Landscape / portrait / square → expected scaled dims.
- Already-smaller image → unchanged.
- Exactly at `maxEdge` → unchanged.
- Rounding (`2000 × 1333` @ maxEdge 1600 → `1600 × 1066`).
- Thin image (`10000 × 1` @ 1600) → height never drops below 1.
- Bad input (zero / negative / NaN source dims) → throws.
- Bad maxEdge (`0`, `-1`) → throws.

### 3. Photo viewer — `src/components/entry/PhotoViewer.tsx`

```ts
interface PhotoViewerProps {
  photos: Photo[];
  startIndex: number;
  onClose: () => void;
}
```

- `createPortal` into `document.body`.
- Dim backdrop `bg-ink/85 backdrop-blur-sm`; click = close.
- Centred `<img>` `max-h-[90vh] max-w-[92vw] object-contain`.
- `<Button variant="ghost" size="icon">×</Button>` top-right.
- When `photos.length > 1`: chevron buttons on either side and ←/→
  keyboard support; else no nav controls.
- Esc always closes. Lock `document.body.style.overflow = 'hidden'` for
  the lifetime of the modal; restore on unmount.
- Focus the × button on mount for keyboard users.

### 4. Remove-photo dialog — `src/components/entry/RemovePhotoDialog.tsx`

```ts
interface RemovePhotoDialogProps {
  open: boolean;
  busy: boolean;    // true while the delete mutation is in flight
  onKeep: () => void;
  onRemove: () => void;
}
```

- `createPortal` + dim backdrop (`bg-ink/70`).
- `card-soft` panel, `max-w-sm`, serif *"Remove this photo?"* heading,
  short ink-soft subline *"You can always add another one."*.
- Buttons: `<Button variant="ghost">Keep</Button>` and
  `<Button variant="destructive">Remove</Button>`.
- Esc / backdrop click = Keep, but only when `!busy` — can't escape
  mid-delete.
- Remove button label flips to *"Removing…"* and disables during `busy`.

### 5. Real Memories section — `src/components/entry/Memories.tsx`

```ts
interface MemoriesProps {
  entryId: string;
  photos: Photo[];
}
```

Replaces `MemoriesPlaceholder.tsx` (which gets deleted).

```tsx
const inputRef = useRef<HTMLInputElement>(null);
const [viewerStart, setViewerStart] = useState<number | null>(null);
const [pendingRemove, setPendingRemove] = useState<Photo | null>(null);
const upload = useUploadPhoto(entryId);
const remove = useDeletePhoto(entryId);
const count = photos.length;
const canAdd = count < 2 && !upload.isPending;
```

Rendered structure:
- `MEMORIES` eyebrow + `{count}/2` on the right.
- If `count > 0`: `<ul>` grid of thumbnails, each with the image button
  (`object-cover aspect-square rounded-xl`) and a `×` chip
  (top-right, `size-8 rounded-full bg-ink/70 text-paper`).
- If `count < 2`: dashed button. During `upload.isPending`, show
  spinner + *"Adding photo…"*.
- Hidden `<input type="file" accept="image/*">` reset to `''` after
  each change so re-picking the same file works.
- `PhotoViewer` mounted when `viewerStart !== null`.
- `RemovePhotoDialog` always mounted; visibility driven by
  `pendingRemove !== null`.

Error mapping (`uploadErrorMessage(err)`):
- `isApiError(err, 'too_many_photos')` → *"This entry already has two
  photos."*
- `isApiError(err, 'payload_too_large')` → *"That photo is too big —
  try a smaller one."*
- Error whose message matches the resizer's "open that photo" copy →
  *"Couldn't open that photo. Try another one."*
- Fallback → *"Couldn't add that photo. Try again."*

### 6. Wire into `Entry.tsx`

- Swap `MemoriesPlaceholder` import for `Memories`.
- Change `<MemoriesPlaceholder photos={data.photos} />` to
  `<Memories entryId={data.id} photos={data.photos} />`.
- Delete `src/components/entry/MemoriesPlaceholder.tsx`.

### 7. Journey screenshot additions

Add a second entry screen to `scripts/journey.mjs` so the empty
Memories state is captured too:

```js
{
  num: '06b',
  name: 'entry-reading',
  state: 'empty-memories',
  path: '/entry/44444444-4444-4444-8444-444444444444',
  requireAuth: true,
},
```

(That fixture is the anxious "Deadline Worries" entry — 0 photos, so
the dashed Add button shows.)

### 8. Docs

- `docs/USER_JOURNEY.md` — fill section 7 (Photos / Memories) with
  both screenshots; update the "step 8 of 21" header to "step 9 of
  21".
- `docs/build-log/step-09-photos.md` — the usual explain-as-you-go
  blocks.
- `docs/plans/README.md` — add step 09.
- Copy this file to `docs/plans/step-09-photos.md`.

## Files created

- `src/lib/resizeImage.ts`
- `src/lib/resizeImage.test.ts`
- `src/components/entry/Memories.tsx`
- `src/components/entry/PhotoViewer.tsx`
- `src/components/entry/RemovePhotoDialog.tsx`
- `docs/build-log/step-09-photos.md`
- `docs/plans/step-09-photos.md`
- `docs/journey/06b-entry-reading-empty-memories-phone.png`
- `docs/journey/06b-entry-reading-empty-memories-laptop.png`

## Files modified

- `src/pages/Entry.tsx` — use `Memories` instead of
  `MemoriesPlaceholder`.
- `scripts/journey.mjs` — add the 06b empty-memories screen.
- `docs/USER_JOURNEY.md` — section 7 filled; header bumped to
  "step 9 of 21".
- `docs/plans/README.md` — index now includes step 09.

## Files deleted

- `src/components/entry/MemoriesPlaceholder.tsx`

## Explicitly out of scope

- **Passcode-threaded photo mutations.** The hooks already accept a
  `passcode` arg but we don't surface a prompt — step 10 adds the
  unlocked-for-this-visit flow.
- **Server-side storage.** MSW handlers use `URL.createObjectURL` for
  preview URLs (SPEC §5 says the real API returns 1-hour signed URLs);
  real Supabase Storage lands in step 17.
- **PostHog `photo_added` event.** SPEC §9; PostHog lands in step 20.
- **Pinch-to-zoom in viewer / EXIF orientation library.** Polish /
  future work.
- **Web Worker for resize.** Main-thread resize is fine for the SPEC's
  file sizes.

## Verification (BUILD_PLAN Step 9 "Check")

1. `npm run typecheck` · `npm run lint` · `npm test` — all green.
   Resize tests appear under `src/lib/resizeImage.test.ts`.
2. `npm run dev`. Open `/entry/44444444-4444-4444-8444-444444444444`
   → Memories shows 0/2 with the dashed button.
3. Tap the dashed button → file picker opens. Pick any JPEG → the
   dashed button shows *"Adding photo…"* for a moment, then a
   thumbnail appears with a × chip top-right; counter reads 1/2;
   *"Photo added."* toast.
4. Repeat → 2/2 → dashed button disappears.
5. Tap a thumbnail → viewer fills screen. Click backdrop → closes.
   Open again, press Esc → closes. With 2 photos, press ←/→ or tap
   the chevrons → image swaps.
6. Tap × on a thumbnail → confirm dialog. Click Keep → dialog
   closes, photo stays. Click × again → Remove → *"Photo removed."*
   toast; count drops; dashed button reappears if below 2.
7. **HEIC path:** on your iPhone, pick an HEIC from the camera roll
   (don't let iOS convert first). Thumbnail should appear as JPEG.
8. `npm run shots` + `npm run journey` complete; new
   `06b-entry-reading-empty-memories-*.png` appear in `docs/journey/`.

## Suggested commit message

```
feat: real Memories section with browser-side resize, viewer, and remove-confirm
```

## Notes to flag in the build log

- SPEC §6 "Safari converts HEIC when drawing to canvas" is the whole
  reason for the `createImageBitmap` → `<img>` fallback in
  `resizeImage.ts`.
- Mock-mode preview URLs are `blob:` → they're session-scoped. Real
  signed URLs arrive in step 17.
- Passcode-aware photo flows are deliberately deferred to step 10.
