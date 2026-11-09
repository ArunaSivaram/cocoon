# Step 07 — Home: record your day (rebuild recipe)

## Context

Steps 1–6 shipped the chrome, the mock data layer, auth, and the two
recording hooks. Step 7 is the first screen that actually **does
something** — the mic card, the "Rather type it?" alternative, the
save pipeline (upload-url → transcribe → create entry, all mocked),
and the past-entries list below. After this step Aruna can push to
Vercel, open her phone, speak for 20 seconds, and watch an entry
appear in her journal.

CLAUDE.md rule 3 drives most of the error handling: the audio blob
stays in IndexedDB until the entry is created. If transcription fails
we use the live-speech words; if the AI create fails we show an
editable textarea with "Try again" and the recording survives in the
hooks for a retry.

**What Aruna will see at the end:**
- Home now has a full mic card with all three live states (idle,
  recording with breathing rings + lined live-text box, writing with
  gliding feather + status lines).
- "Rather type it?" swaps in a textarea with a **Write my entry**
  button; same pipeline, no audio.
- A one-time "Try it now — tell me one thing about today." hint above
  the mic for first sign-in.
- Past-entries list below, matching mockup 05 (date eyebrow, serif
  title, mood badge pill, photo thumbnail + count, chevron, locked
  variant). Count on the right (e.g. "6 pages"). **Show earlier pages**
  button paginates in blocks of 20.
- Tapping a card opens `/entry/:id` (step 8 finishes that page).

## Approach

### 1. Data layer touch-ups

#### `src/lib/types.ts`
Add `total_count: number` to `EntriesListResponse` so the "N pages"
label on past entries doesn't rely on counting loaded pages.

#### `src/mocks/db.ts`
`listEntries(cursor?)` returns `total_count: state.entries.size`.

#### `src/hooks/queries.ts`
Replace `useEntries(cursor?)` with a `useInfiniteQuery` version so
pagination is a one-liner (`fetchNextPage`, `hasNextPage`,
`isFetchingNextPage`). Key stays `['entries']` so step 4's mutation
invalidations still hit it.

```ts
export function useEntries() {
  return useInfiniteQuery({
    queryKey: ['entries'],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api.get<EntriesListResponse>('/entries', { cursor: pageParam ?? null }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}
```

### 2. Small shared pieces

- **`src/components/MoodBadge.tsx`** — pill that takes `mood: MoodKey`
  (or `null` for the "Locked" badge used on locked cards). Uses
  `moodStyle()` from `src/lib/moods.ts`. Capitalises the first letter.
- **`src/lib/dates.ts`** — `formatCardDate(iso)` →
  `"Wed, 4 Nov 2026"` (mockup 05). Exported so step 8's entry page can
  reuse it. Uses `date-fns` which is already installed.
- **`src/lib/mime.ts`** — `mimeToExt(mime)` → `'webm' | 'mp4'` for the
  `/api/audio/upload-url` request body. Takes a defaulted argument for
  safety; errors loudly in the unknown case.

### 3. Past entries — `src/components/home/PastEntries.tsx` and `PastEntryCard.tsx`

**PastEntryCard** — one row per entry, wrapped in a `Link` to
`/entry/:id`.

- **Unlocked variant:** 76×76 rounded photo thumbnail (if any) OR a
  soft parchment square with a tiny `FileText` icon as placeholder,
  then a column with the date eyebrow (small uppercase clay-ish),
  serif title (truncate to one line), and a row underneath with the
  camera icon + count (hidden if 0) and the MoodBadge. Chevron
  (`ChevronRight`) pinned right.
- **Locked variant:** no thumbnail (empty 76×76 parchment square with
  a `Lock` icon), "A private entry" in italic serif, Locked badge in
  the grey mood tint.

**PastEntries** — wraps `useEntries()`:

- Header row: serif "Past entries" + right-aligned
  `{total_count} {total_count === 1 ? 'page' : 'pages'}`.
- `data.pages.flatMap(p => p.entries)` → stack of cards with a thin
  divider between them. Empty state ("Your first page starts here.
  Tap the mic above.") when zero entries.
- Loading skeleton (3 shimmer cards) while `isLoading`.
- Error state ("Couldn't load your past entries.") on error.
- At the bottom: if `hasNextPage`, a centred secondary button
  **Show earlier pages** that calls `fetchNextPage()`. Disabled +
  "Loading…" while `isFetchingNextPage`.

### 4. Save pipeline — `src/hooks/useSavePipeline.ts`

A single hook that owns the voice- and typed-entry flows so the
MicCard and TypeCard don't repeat logic. State machine:

```ts
type PipelineStatus =
  | 'idle'
  | 'transcribing'
  | 'writing'
  | 'failed_write';

interface UseSavePipeline {
  status: PipelineStatus;
  errorMessage: string | null;
  draftTranscript: string | null; // seeded on failed_write for the Try-again textarea
  saveVoice: (args: { blob: Blob; mimeType: string; liveTranscript: string }) => Promise<void>;
  saveTyped: (text: string) => Promise<void>;
  retryFromDraft: (text: string) => Promise<void>;
  reset: () => void;
}
```

**Voice flow:**
1. Set `status: 'transcribing'`.
2. `useRequestUploadUrl` → `{ path, token }`. Mock-only: we **skip** the
   actual upload. Real supabase-js upload lands in step 15 (leave a
   `// TODO: step 15 — PUT blob to path using token` comment where it
   goes).
3. `useTranscribe({ audio_path, locale })`. On success: use
   `response.text`. On failure: fall back to `liveTranscript`. If
   both are empty → throw "We didn't catch any words. Please try
   again." → `status: 'failed_write'` with `draftTranscript = ''`.
4. Set `status: 'writing'`.
5. `useCreateEntry({ transcript, live_transcript, locale, timezone })`.
   On success: `await clearRecording()`, `navigate(/entry/${id})`,
   `reset()`.
6. On failure: `status: 'failed_write'`, `draftTranscript` = whatever
   transcript we had (so the user can edit + retry). Blob stays in
   IDB.

**Typed flow:** skip 1–3, jump to `writing` with
`transcript = text, live_transcript = text`.

**Retry flow:** `retryFromDraft(text)` re-runs step 5 only, with the
user-edited text.

**Locale / timezone:** locale defaults to `'en-US'` (step 12 adds the
picker). Timezone: `Intl.DateTimeFormat().resolvedOptions().timeZone`.

### 5. Mic card — `src/components/home/MicCard.tsx`

Composes `useAudioRecorder()`, `useSpeechRecognition()`, and
`useSavePipeline()`. Owns the "which state does the card show" logic.
Derived state helper:

```ts
type MicStage =
  | 'idle'
  | 'permission_denied'
  | 'requesting'
  | 'recording'
  | 'transcribing'
  | 'writing'
  | 'failed_write';

function deriveMicStage(recorder, pipeline): MicStage { … }
```

**idle** — big clay round button (120 px) with a `Mic` icon,
serif "Tap and tell me about your day.", subline "Speak freely. I'll
write it the way you'd write it.", and a small "Rather type it?"
link (toggles the Type mode, step 7-point-X below). Also the
first-time hint banner above the mic when the flag is set.

**recording** — top-to-bottom per mockup 03: a red circle stop
button (white square inside) wrapped in two absolutely-positioned
concentric rings that **breathe** (CSS keyframe `scale(0.9) →
scale(1.4)` with fading opacity). Below it: "I'm listening… tap again
when you're done." in serif, then a mm:ss timer. Below the text: the
live-text box (ruled background via the `.ruled-lines` utility,
min-height ~140 px) showing `finalText` + `<em>interimText</em>` with a
blinking caret while the speech recog is listening. If
`!speech.supported`, show the small "Your words will appear when you
stop." line in its place. Amber "30 seconds left" banner at the top of
the card when `recorder.state.warning`.

**transcribing / writing** — a small clay circle with a `Feather`
lucide icon that **glides** (CSS keyframe `translateX(-6px → 6px)` on
a 2.4 s loop). Below:
- `transcribing` → `"Listening back carefully…"` only.
- `writing` → `"Writing your entry…"` + soft-ink subline *"Keeping
  your words, your feelings, your voice."* + three dots that bounce
  (staggered keyframes).

**permission_denied** — soft card with a warm message and the help
line: *"Tap the lock icon in the address bar to allow microphone
access, then try again."* Plus a "Rather type it?" fallback.

**failed_write** — editable textarea prefilled with `draftTranscript`
and a **Try again** button. Soft note: *"The AI couldn't finish
writing. Your words are safe."* When the user retries, the `Try
again` runs `retryFromDraft(editedText)`.

All animations respect `prefers-reduced-motion` because step 3 added
the global `@media` rule that zeros animations.

### 6. Rather-type-it? mode — `src/components/home/TypeCard.tsx`

Swaps the MicCard entirely when the user clicks "Rather type it?".
Serif prompt "Write a few lines about today.", a `<textarea>` (min
height 180 px, autofocus), `Write my entry` button (disabled while
empty / submitting), and a small "Back to voice" link. Same pipeline
(`saveTyped`). Shows the `transcribing`/`writing` phases in a
simplified form (no feather — just "Writing your entry…").

### 7. First-time hint — `src/components/home/FirstTimeHint.tsx`

Reads `localStorage.cocoon.firstSignIn.v1`. If present, renders a
small clay-tinted banner above the mic: *"Try it now — tell me one
thing about today."* A small `X` dismiss button removes the key.
The key was planted in step 5's `signIn()` on first-ever sign-in.

### 8. Home page — `src/pages/Home.tsx`

Stripped-down composer:

```tsx
export function Home() {
  const [mode, setMode] = useState<'voice' | 'typed'>('voice');
  const today = format(new Date(), 'EEEE, MMMM d');
  return (
    <Layout title="Today's page" date={today}>
      <FirstTimeHint />
      {mode === 'voice'
        ? <MicCard onSwitchToTyped={() => setMode('typed')} />
        : <TypeCard onSwitchToVoice={() => setMode('voice')} />}
      <PastEntries className="mt-8 md:mt-10" />
    </Layout>
  );
}
```

Also: **delete** `src/components/dev/DevEntriesProbe.tsx` and its
import on Home (per the step-4 plan's "deletes in step 7").

### 9. Animations — add to `src/index.css`

Three keyframes scoped to `motion-safe:` utilities (so
`prefers-reduced-motion` auto-opts out):

- `@keyframes cocoon-breath` — `transform: scale(0.95)` /
  `opacity: 0.7` → `transform: scale(1.5)` / `opacity: 0`. 2.4 s
  infinite. Used on two absolutely-positioned ring pseudo-elements
  behind the stop button.
- `@keyframes cocoon-glide` — `translateX(-6px) rotate(-3deg)` ↔
  `translateX(6px) rotate(3deg)`. 2.4 s infinite alternate. Used on
  the feather.
- `@keyframes cocoon-dot` — `translateY(0)` ↔ `translateY(-4px)`.
  0.9 s infinite. The three dots use `animation-delay` of 0 / 150 /
  300 ms.
- `@keyframes cocoon-caret` — `opacity: 1 → 0 → 1`. 1 s infinite.
  Applied to the small bar at the end of the live text.

### 10. Unit tests (pure logic only)

- `src/lib/dates.test.ts` — `formatCardDate` across a couple of ISO
  inputs (Sun/Mon/Wed spot checks, matching the mockup format).
- `src/lib/mime.test.ts` — `mimeToExt`:
  - `'audio/webm;codecs=opus'` → `'webm'`
  - `'audio/webm'` → `'webm'`
  - `'audio/mp4'` → `'mp4'`
  - Unknown → throws.
- `src/hooks/useSavePipeline.test.ts` — happy voice flow (all three
  mocks resolve, navigates), transcribe fails → uses live transcript,
  create fails → ends in `failed_write` with the transcript as draft.
  Uses `setupServer` from `src/mocks/server.ts` plus `vi.mock` for
  `useNavigate` + `clearRecording`.

The MicCard / TypeCard / PastEntries components themselves aren't
unit tested — their behaviour is exercised by the save-pipeline test
and by the screenshot + manual checks.

### 11. Shots + journey

Re-run `npm run shots` (Home screenshot picks up the mic card). Add
to `scripts/journey.mjs`:

```js
{ num: '02', name: 'home', state: 'idle', path: '/', requireAuth: true },
```

(rename the existing `02-home-default-*.png` to `02-home-idle-*.png`).

Recording and writing states are hard to screenshot without real mic
input — leave `03-recording` and `04-writing` as "Coming" in the
USER_JOURNEY for now; they can be captured later via a dev query
param if we really want them in CI.

### 12. USER_JOURNEY.md

- Bump header line to "step 7 of 21".
- Fill section 2 (Today's page) with the new idle screenshots + a
  description of the three live states.
- Fill section 5 (Past entries) with a screenshot of the list.

### 13. Build log — `docs/build-log/step-07-home.md`

"Explain as you go" blocks for: `useSavePipeline`, `MicCard`,
`TypeCard`, `PastEntries` + `PastEntryCard`, `FirstTimeHint`,
`MoodBadge`, the keyframes, and the pipeline error contract (what
happens when each stage fails).

### 14. Save plan to `docs/plans/step-07-home.md`

Before overwriting this file for step 8, copy the final plan to
`docs/plans/step-07-home.md` (per the workflow commitment from the
previous turn).

## Files created

- `src/components/MoodBadge.tsx`
- `src/components/home/FirstTimeHint.tsx`
- `src/components/home/MicCard.tsx`
- `src/components/home/TypeCard.tsx`
- `src/components/home/PastEntries.tsx`
- `src/components/home/PastEntryCard.tsx`
- `src/hooks/useSavePipeline.ts`
- `src/lib/dates.ts` (+ `dates.test.ts`)
- `src/lib/mime.ts` (+ `mime.test.ts`)
- `src/hooks/useSavePipeline.test.ts`
- `docs/build-log/step-07-home.md`
- `docs/plans/step-07-home.md`

## Files modified

- `src/pages/Home.tsx` — full rewrite.
- `src/lib/types.ts` — add `total_count` to `EntriesListResponse`.
- `src/mocks/db.ts` — return `total_count`.
- `src/hooks/queries.ts` — `useEntries()` becomes infinite.
- `src/index.css` — four keyframes + `.breathing-ring` / `.gliding-feather`
  / `.bouncing-dots` / `.blinking-caret` utility classes.
- `scripts/journey.mjs` — add Home idle (rename state), refresh PNGs.
- `docs/USER_JOURNEY.md` — sections 2 and 5 filled.

## Files deleted

- `src/components/dev/DevEntriesProbe.tsx`

## Out of scope

- Real Supabase upload of the audio blob (step 15). We request the
  signed upload URL from `/api/audio/upload-url` to exercise the
  pipeline, but the mock doesn't actually store bytes — the mock
  `/api/transcribe` returns a fixed string regardless.
- Reading view on `/entry/:id` (step 8).
- Locale picker (step 12). Pipeline hard-codes `en-US`.
- Mood badge visuals on the Entry page (step 8).
- The AI prompt for Claude Sonnet (step 16). Mock's
  `synthesiseAiFields()` is already close enough for UX testing.

## Verification (BUILD_PLAN Step 7 "Check")

1. `npm run typecheck` · `npm run lint` · `npm test` all green. New
   tests pass (dates, mime, save pipeline).
2. `npm run dev`. On Home you see the mic card in idle state with
   today's date next to the title. First-time hint is visible if the
   `cocoon.firstSignIn.v1` key is in localStorage.
3. Tap the mic (allow permission), speak for 10 s, tap stop:
   - Live text appears while recording (Chrome/Edge/Safari).
   - Transcribing → writing status lines show for ~4 s total
     (2 s + 2 s mock delays).
   - You land on `/entry/<new-id>` (placeholder page from step 1).
4. Below the mic: 6 past entries from the fixtures, newest first.
   Entry #6 shows "A private entry — Locked" with a Locked badge.
5. Toggle airplane mode or block `/api/entries` with a devtools
   request-blocking rule, tap mic, speak, stop. The pipeline fails on
   create; you see the editable-textarea card with the transcript and
   a **Try again** button. Re-enable the network, tap Try again → the
   entry saves.
6. Click **Rather type it?**, type two lines, click **Write my entry**
   → ~2 s "Writing your entry…" → lands on the new entry.
7. On your phone over the Vercel preview, record, stop, and see the
   entry save. Then open the account menu → Sign out → the Home cache
   is cleared and the next sign-in shows the past entries correctly.

## Suggested commit message

`feat: Home with mic card, typed mode, save pipeline, and past entries`

## Notes to flag in the build log

- Mockup 02's two language pickers are **out** per CLAUDE.md
  (English-only MVP; single picker lives in the account menu in
  step 12).
- The "two status lines" during writing map to the two pipeline
  phases, not two lines at the same time.
- Breathing rings, gliding feather, bouncing dots, and the blinking
  caret are the four animations CLAUDE.md asks for. Every one is
  behind a `motion-safe:` utility, so OS-level reduce-motion disables
  them automatically.
- The audio blob **stays in IndexedDB** through the save pipeline.
  We only call `clearRecording()` after `createEntry` resolves.
  If the user closes the tab mid-flow, the next visit's recorder
  rehydrates the blob; if they then start a new recording we
  overwrite it (acceptable — they chose to start fresh).
- We request the signed upload URL via `/api/audio/upload-url` even in
  mock mode to keep the pipeline wiring honest; the actual PUT to
  Supabase Storage is a TODO comment until step 15.
