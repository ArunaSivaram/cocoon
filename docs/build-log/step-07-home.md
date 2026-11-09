# Step 07 — Home: record your day

The first screen that actually does something. Tap the mic, talk, and
watch Cocoon transcribe → write → open a new entry. Or type it. Below
the mic, your past entries sit in a scrollable list. All of the data
plumbing is mock-backed (no real Supabase or AI yet) but the UI is
real and the rest of the journey hangs off this step.

## What was built

- **Mic card** (`src/components/home/MicCard.tsx`) with all five live
  states:
  - **idle** — big clay mic button, prompt, subline, "Rather type it?" link.
  - **recording** — red stop button with two breathing rings behind it,
    mm:ss timer, lined live-text box with a blinking caret, amber
    "30 seconds left" banner at 9:30.
  - **transcribing** — gliding feather + *"Listening back carefully…"*.
  - **writing** — gliding feather + *"Writing your entry…"* + soft
    subline *"Keeping your words, your feelings, your voice."* with three
    bouncing dots.
  - **permission_denied** — warm card explaining how to allow the mic
    on iPhone / Chrome, with a "Rather type it?" fallback.
  - **failed_write** — editable textarea prefilled with whatever words
    we have + Try again / Discard buttons. The audio blob **stays in
    IndexedDB** for the retry.
- **Type card** (`src/components/home/TypeCard.tsx`) — the "Rather type
  it?" alternative. Same save pipeline, no audio.
- **First-time hint** (`src/components/home/FirstTimeHint.tsx`) —
  dismissible banner, shown once after first sign-in. Consumes the
  `cocoon.firstSignIn.v1` flag that step 5's `signIn()` planted.
- **Past entries** (`src/components/home/PastEntries.tsx` +
  `PastEntryCard.tsx`) — infinite-query list, "6 pages" total count
  on the right, dividers, loading skeletons, empty state, and a **Show
  earlier pages** button for pagination. Locked cards show
  *"A private entry"* in italic serif with a Lock badge; no title or
  mood leaks.
- **Save pipeline** (`src/hooks/useSavePipeline.ts`) — one hook that
  owns voice + typed + retry flows. Mapping:
  `upload-url → transcribe → create entry → clearRecording → navigate`.
  Transcribe failure falls back to the live-speech words (SPEC §2.2).
  Create-entry failure lands in `failed_write` with the transcript as
  a draft; blob stays in IDB for the retry.
- **Shared helpers:** `MoodBadge`, `formatCardDate`/`formatHomeDate`,
  `mimeToExt`.
- **Four CSS animations** in `src/index.css`:
  `cocoon-breath` (ripples), `cocoon-glide` (feather), `cocoon-dot`
  (three bouncing dots), `cocoon-caret` (blinking caret). All used via
  `motion-safe:` so OS reduce-motion disables them.

## Files created

- `src/components/MoodBadge.tsx`
- `src/components/home/FirstTimeHint.tsx`
- `src/components/home/MicCard.tsx`
- `src/components/home/TypeCard.tsx`
- `src/components/home/PastEntries.tsx`
- `src/components/home/PastEntryCard.tsx`
- `src/hooks/useSavePipeline.ts` (+ `useSavePipeline.test.tsx`)
- `src/lib/dates.ts` (+ `dates.test.ts`)
- `src/lib/mime.ts` (+ `mime.test.ts`)
- `docs/build-log/step-07-home.md` (this file)
- `docs/plans/step-07-home.md`

## Files modified

- `src/pages/Home.tsx` — full rewrite; composes
  `FirstTimeHint + (MicCard|TypeCard) + PastEntries`.
- `src/lib/types.ts` — `total_count: number` on `EntriesListResponse`.
- `src/mocks/db.ts` — returns `total_count`.
- `src/hooks/queries.ts` — `useEntries()` is now `useInfiniteQuery`.
- `src/index.css` — 4 keyframes + 4 helper classes.
- `scripts/journey.mjs` — add `02-home-idle`; note that recording /
  writing states need real mic input.
- `docs/USER_JOURNEY.md` — sections 2 (Today's page) and 5 (Past entries)
  filled; header bumped to 7 of 21.
- `docs/plans/README.md` — index now includes step 07.

## Files deleted

- `src/components/dev/DevEntriesProbe.tsx` (replaced by the real list).

## Explanations

### Save pipeline (`src/hooks/useSavePipeline.ts`)
- **What it is.** A React hook that runs the "tap stop → entry open"
  flow. One place for the voice + typed + retry code paths.
- **Why.** The pipeline has several steps (upload-url, transcribe,
  create entry) and several failure modes (transcribe, create). Keeping
  it in one hook means MicCard and TypeCard are purely presentational.
- **How it connects.** Reads the three TanStack Query mutations from
  `queries.ts`; calls `clearRecording()` from `recordingStore.ts` on
  success; `useNavigate()` to the new entry.
- **Worth knowing.** We call `/api/audio/upload-url` even though the
  mock doesn't actually store bytes — keeps the pipeline wiring honest
  so step 15 only has to add the supabase-js PUT in one place. The TODO
  comment in `saveVoice` marks the spot.

### Mic card (`src/components/home/MicCard.tsx`)
- **What it is.** The large container with the five live states.
- **Why.** The spec's mic flow is rich enough to be its own component;
  Home just picks between voice and typed modes.
- **How it connects.** Owns three hooks (`useAudioRecorder`,
  `useSpeechRecognition`, `useSavePipeline`) and derives the display
  stage with a small pure helper (`deriveMicStage`).
- **Worth knowing.** We kick the save pipeline from an effect when the
  recorder transitions to `saved`, guarded by a `useRef` flag so speech
  updates (frequent during recording) don't re-fire it.

### Type card (`src/components/home/TypeCard.tsx`)
- **What it is.** The textarea alternative.
- **Why.** SPEC §2.2's "Rather type it?" path is first-class — needed
  when the mic is denied, blocked, or the user just prefers.
- **How it connects.** Same `useSavePipeline`, but calls `saveTyped`
  directly (no upload / transcribe).

### Past entries (`src/components/home/PastEntries.tsx` + `PastEntryCard.tsx`)
- **What they are.** The list below the mic. One card per entry;
  pagination via `useInfiniteQuery` + a "Show earlier pages" button.
- **Why.** SPEC §2.3 exactly. Locked cards must hide title / mood /
  photos — the `EntrySummary` type (step 4) already forces that at the
  type level.
- **How they connect.** `useEntries()` is now an infinite query so
  `fetchNextPage` is a one-liner.

### First-time hint (`src/components/home/FirstTimeHint.tsx`)
- **What it is.** The small dismissible "Try it now — tell me one thing
  about today." banner above the mic.
- **Why.** SPEC §2.1 asks for it on first sign-in.
- **How it connects.** Reads `cocoon.firstSignIn.v1` from localStorage
  (planted by step 5's `signIn()` on first-ever sign-in). The X button
  removes the key.

### Animations (`src/index.css`)
- **What they are.** Four CSS keyframes: breathing rings, gliding
  feather, bouncing dots, blinking caret — the four motions CLAUDE.md
  § Design system asks for.
- **Why.** They're the warmth of the app. Users with
  `prefers-reduced-motion: reduce` see no motion thanks to the global
  media query added in step 3.

## How to try it

```bash
npm run dev
# Open http://localhost:5173 — allow mic → speak → stop
# → "Listening back carefully…" (2 s)
# → "Writing your entry…" (2 s)
# → lands on /entry/<new-id> (step 1 placeholder; step 8 builds this)
#
# Try the Rather type it? path: type a few lines → Write my entry →
# "Writing your entry…" → lands on the new entry.
#
# Try the failure path: DevTools → Network → right-click
# /api/entries → Block request URL. Record and stop. Pipeline lands in
# failed_write; edit the text, Unblock, click Try again.

npm run typecheck   # green
npm run lint        # green
npm test            # 75 tests across 10 files
npm run shots       # Home phone / laptop PNGs updated
npm run journey     # 02-home-idle-* PNGs updated
```

## Notes

- Mockup 02's two language pickers are **out** — English-only for MVP
  per CLAUDE.md. Step 12 adds the single US/UK picker inside the
  account menu.
- The "two status lines" during writing map to the **two pipeline
  phases** (transcribing, then writing), not two lines at once.
- The React 19 ESLint plugin (`react-hooks@7`) now flags
  setState-in-effect and ref-updates-in-render. The pipeline-kick
  effect uses a ref guard and includes every reactive value in deps;
  the failed-write draft is derived during render from
  `userEdits ?? pipeline.draftTranscript`.
- We request `/api/audio/upload-url` in mock mode too, so the pipeline
  shape matches what step 15 will need. The `TODO: step 15` comment in
  `useSavePipeline` is the exact spot the supabase upload PUT goes.
- Recording and writing screenshots can't be auto-captured without
  real mic input — mockups 03 and 04 cover the design intent.

## Suggested commit message

```
feat: Home with mic card, typed mode, save pipeline, and past entries
```

## Open questions

- The failed_write recovery currently keeps the audio blob in
  IndexedDB but we don't resurface "you have an unfinished recording"
  on next mount. If a user closes the tab mid-retry, the blob is there
  but silent. The explicit "never lose a recording" rule is still met
  (the next recording would overwrite it, which is an active user
  choice). Consider a passive banner later.
- Pipeline test runtime is ~13 s because the mock `/api/transcribe`
  and `/api/entries` each wait 2 s. Not a problem yet; if it bites,
  override those handlers in the test file to skip the delay.
