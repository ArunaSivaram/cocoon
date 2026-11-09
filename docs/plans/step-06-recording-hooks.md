# Step 06 — Recording hooks + /dev/mic (rebuild recipe)

## Starting point
Step 05 complete. The app has sign-in and route guards; no audio yet.

## Goal
Two React hooks that drive the recording UI in step 7, plus a hidden
test page to confirm them on real devices.

- `useAudioRecorder` — MediaRecorder wrapper, 32 kbps, 10-minute cap,
  9:30 warning, permission-denied state, IndexedDB persistence.
- `useSpeechRecognition` — webkit SpeechRecognition wrapper with
  auto-restart.
- `/dev/mic` — hidden public page for testing on iPhone Safari + Chrome.

## Install

```bash
npm install idb-keyval   # runtime dep for IndexedDB blob storage
```

## Types shim — `src/types/speech.d.ts`

Minimal ambient declarations: `SpeechRecognition`, `SpeechRecognitionEvent`,
`SpeechRecognitionErrorEvent`, `SpeechRecognitionConstructor`, and
`webkitSpeechRecognition`/`SpeechRecognition` on `window`. Only what the
hook touches.

## Recording store — `src/lib/recordingStore.ts`

Thin `idb-keyval` wrapper:
- Keys: `cocoon.recording.v1.blob`, `.mime`, `.recordedAt`.
- Exports: `saveRecording(blob, mime)`, `loadRecording()`, `clearRecording()`.
- `SavedRecording = { blob: Blob; mimeType: string; recordedAt: string }`.

Step 7's save flow calls `clearRecording()` only after the entry is
successfully created.

## `useAudioRecorder` — `src/hooks/useAudioRecorder.ts`

Exported constants + pure helpers (testable without jsdom MediaRecorder):

```ts
export const RECORDER_MAX_MS = 10 * 60_000;
export const RECORDER_WARN_MS = 9 * 60_000 + 30_000;

export function pickRecorderMimeType(isTypeSupported):
  { mimeType, container: 'webm' | 'mp4' } | null;
// Order: 'audio/webm;codecs=opus' → 'audio/webm' → 'audio/mp4' → null

export function formatElapsed(ms): string;      // 'mm:ss'
export function shouldWarn(ms): boolean;        // >= 9:30
export function shouldStopAtCap(ms): boolean;   // >= 10:00
```

State:
```ts
type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'stopping' | 'saved' | 'error';
type RecorderError = 'permission_denied' | 'no_recorder_support' | 'unknown';

interface AudioRecorderState {
  status, elapsedMs, warning, error,
  mimeType, blob, blobUrl, recordedAt
}
```

Flow:
1. Mount → `loadRecording()` from IDB. If present, surface as
   `{ status: 'saved', blob, blobUrl, mimeType, recordedAt }`.
2. `start()` → guard on `navigator.mediaDevices` + `MediaRecorder`
   support. Pick MIME. Set `status: 'requesting'`. Call `getUserMedia`;
   `NotAllowedError` → `error: 'permission_denied'`.
3. Create recorder with `{ mimeType, audioBitsPerSecond: 32_000 }`,
   `recorder.start(1000)`. Set `status: 'recording'`.
4. Interval every 250 ms updates `elapsedMs` + `warning`. At cap, call
   stop via a `stopRef` (see gotcha).
5. `stop()` → `recorder.stop()`; `onstop` concats chunks into a Blob,
   writes to IDB via `saveRecording`, revokes any prior objectURL,
   creates a new one, sets `status: 'saved'`.
6. `clear()` → stop timer, stop recorder, release stream, revoke URL,
   `clearRecording()`, reset to `initialState`.

Cleanup on unmount: stop interval, stop recorder (if active), release
all MediaStream tracks, revoke the objectURL.

**Gotcha — "stop accessed before declared":** the interval inside
`start()` needs to call `stop()` but `stop` is declared below. Route it
through a `stopRef = useRef<() => void>(() => {})`, then
`useEffect(() => { stopRef.current = stop; }, [stop])`. Keeps
`react-hooks/preserve-manual-memoization` from failing without an
eslint-disable.

## `useSpeechRecognition` — `src/hooks/useSpeechRecognition.ts`

Exported helpers:

```ts
export function getSpeechRecognitionConstructor():
  SpeechRecognitionConstructor | null;
// Prefers window.SpeechRecognition; falls back to window.webkitSpeechRecognition.

export function accumulateSpeechResults(prev, event): { finalText, interimText };
// Final chunks → space-join into finalText. Interim chunks → concatenated into interimText.

export function speechRecognitionLang(locale: 'en-US' | 'en-GB'): string;
```

Hook: `useSpeechRecognition()` → `{ state, start(locale), stop(), reset() }`.

Flow:
1. Initial state: `supported = getSpeechRecognitionConstructor() !== null`.
2. `start(locale)` creates a new recognition instance per call (simpler
   lifecycle than reuse), sets `continuous = true`, `interimResults =
   true`, `lang = locale`, binds handlers, `.start()`. Resets
   `userStoppedRef = false`.
3. `onresult` → `accumulateSpeechResults` into state.
4. `onerror` — swallow `'no-speech'` and `'aborted'` (common, harmless);
   otherwise set `status: 'error'`.
5. `onend` — if `userStoppedRef.current === false`, `setTimeout(() =>
   recognitionRef.current?.start(), 150)` to auto-restart. The 150 ms
   delay avoids "already started" races.
6. `stop()` → `userStoppedRef = true`, `.stop()`.
7. `reset()` clears accumulated text.

Cleanup on unmount: set user-stopped, clear restart timer, `.abort()`
the recognition.

## `/dev/mic` page — `src/pages/DevMic.tsx`

Public route (no `<RequireAuth>`) so it's easy to hit on a phone over
the Vercel preview. Vertical stack:

- Header: "DEV · /DEV/MIC" eyebrow + title.
- Card with Start / Stop / Clear buttons and a locale select (en-US / en-GB).
- Permission-denied card when `recorder.state.error === 'permission_denied'`.
- Amber warning card at 9:30: "30 seconds left."
- Two-column grid of hook state (status / elapsed / mime / warning /
  blob size / recordedAt / speech supported / status / error / locale).
- "Live words" card: shows `finalText` + `<em>interimText</em>` with a
  blinking caret while listening. Fallback "Live speech isn't available"
  line when `!supported`.
- Playback card when `blobUrl` present: `<audio controls src={blobUrl}/>`.

## Route — `src/app/routes.tsx`

```tsx
<Route path="/dev/mic" element={<DevMic />} />  // public, no RequireAuth
```

## Tests (pure logic only)

- `src/hooks/useAudioRecorder.test.ts`:
  - `pickRecorderMimeType` prefers opus, falls back to mp4, returns null.
  - `formatElapsed` across boundaries (0, 30_500, 60_000, 9:30, 10:00).
  - `shouldWarn` + `shouldStopAtCap` at boundary conditions.
- `src/hooks/useSpeechRecognition.test.ts`:
  - `getSpeechRecognitionConstructor` null → webkit → unprefixed priority
    (stub `window.SpeechRecognition` / `window.webkitSpeechRecognition`).
  - `accumulateSpeechResults`: interim overwrites, final appends,
    whitespace trimmed, mixed events in order.
  - `speechRecognitionLang` returns input unchanged.

(Full hook integration isn't unit-testable in jsdom — `MediaRecorder`
and `SpeechRecognition` don't exist there. Device testing is the real
check.)

## Known gotchas

- `MediaRecorder.isTypeSupported` ordering matters: try Opus first
  (Chrome), fall back to `audio/mp4` (iPhone Safari).
- Safari requires HTTPS for mic (localhost is fine). Vercel preview
  URLs are HTTPS by default.
- `webkitSpeechRecognition` auto-ends on silence; the `onend` handler
  must restart until the user explicitly stops.
- `URL.revokeObjectURL` on the previous `blobUrl` before creating a
  new one — otherwise leaked.

## Verify

```bash
npm run typecheck && npm run lint && npm test   # 60 tests
npm run dev
# http://localhost:5173/dev/mic → allow mic → speak → see live words →
# Stop → playback element → Clear → everything resets
```

Then push, open on **iPhone Safari** (expect `audio/mp4`) and **Chrome**
(expect `audio/webm;codecs=opus`). Deny permission → friendly card.
Record past 9:30 → warning; 10:00 → auto-stop. Don't move on until both
work.

## Commit

```
feat: audio recorder + speech recognition hooks + /dev/mic test page
```
