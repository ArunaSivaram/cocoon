# Step 06 — Recording hooks + /dev/mic

The two browser APIs that make Cocoon actually record now live behind
small React hooks. Step 7 (Home) will use these; step 8's "See original
transcript" plays back the audio blob they persist. A hidden `/dev/mic`
page lets Aruna test both hooks on her phone and laptop before any real
UI is in place.

## What was built

- **`src/hooks/useAudioRecorder.ts`** — a React hook around
  `MediaRecorder`. Picks the right MIME with `isTypeSupported`
  (CLAUDE.md "Browsers"), runs at 32 kbps, surfaces an `elapsedMs` timer
  and a `warning` flag at 9:30, auto-stops at 10:00, and persists the
  final blob to IndexedDB so a failed transcribe / AI step never loses
  the user's recording (CLAUDE.md rule 3).
- **`src/lib/recordingStore.ts`** — `idb-keyval` wrapper with three
  verbs: `saveRecording`, `loadRecording`, `clearRecording`.
- **`src/hooks/useSpeechRecognition.ts`** — a React hook around
  (`webkit`)`SpeechRecognition`. Continuous, interim results, auto-restarts
  when Safari/Chrome ends the session early, and gracefully reports
  `supported: false` where the API doesn't exist.
- **`src/pages/DevMic.tsx`** — hidden test harness at `/dev/mic`. Shows
  both hooks' state as a key/value table, a live-words box, an audio
  playback element, and Start/Stop/Clear buttons.
- **`src/types/speech.d.ts`** — minimal ambient types for the Web
  Speech API (TypeScript's default `lib.dom.d.ts` doesn't include it).

## Files created

- `src/hooks/useAudioRecorder.ts` (+ `useAudioRecorder.test.ts`)
- `src/hooks/useSpeechRecognition.ts` (+ `useSpeechRecognition.test.ts`)
- `src/lib/recordingStore.ts`
- `src/pages/DevMic.tsx`
- `src/types/speech.d.ts`
- `docs/build-log/step-06-recording-hooks.md` (this file)

## Files modified

- `src/app/routes.tsx` — added the public `/dev/mic` route.
- `package.json` — adds `idb-keyval` runtime dep.

## Explanations

### useAudioRecorder (`src/hooks/useAudioRecorder.ts`)
- **What it is.** A React hook that manages a `MediaRecorder` session.
- **Why.** The spec needs one place to handle all the cross-browser
  edge cases: MIME differences, permission errors, the 10-minute cap,
  and durable storage of the blob.
- **How it connects.** Step 7's Home mic card calls `start() / stop()`
  and shows `state.status`, `formatElapsed(elapsedMs)`, `state.warning`,
  and `state.error`. Step 8's "See original transcript" element reads
  `state.blobUrl` for playback.
- **Worth knowing.** The hook rehydrates on mount from IndexedDB (so a
  user refreshing mid-save doesn't lose their recording), and it
  auto-stops exactly at 10:00 using an interval tick. The MIME type is
  picked via `MediaRecorder.isTypeSupported` in CLAUDE.md order:
  `audio/webm;codecs=opus` → `audio/webm` → `audio/mp4`.

### recordingStore (`src/lib/recordingStore.ts`)
- **What it is.** Three tiny async functions that read / write / clear
  the current blob in IndexedDB via `idb-keyval`.
- **Why.** CLAUDE.md rule 3 — never lose a recording. The server-side
  audio-temp file is deleted after transcription (SPEC §3.1); the
  browser-side blob is cleared by the save flow in step 7 only after
  the entry is created.
- **Worth knowing.** Keys are versioned (`.v1.*`) so a future schema
  change doesn't break hot-reloaded dev tabs.

### useSpeechRecognition (`src/hooks/useSpeechRecognition.ts`)
- **What it is.** A React hook around the webkit-prefixed (or
  un-prefixed) `SpeechRecognition`.
- **Why.** Both Safari and Chrome end `continuous: true` recognition
  sessions on their own schedule (silence detection, GC, battery). If
  we don't auto-restart, the live-words box freezes mid-sentence.
- **How it connects.** Step 7's live-text panel reads `state.finalText`
  and `state.interimText` and shows the blinking caret while
  `state.status === 'listening'`.
- **Worth knowing.** We swallow the common `'no-speech'` and `'aborted'`
  errors because they're fired as part of normal operation, not real
  failures. `userStoppedRef` tracks user intent so we only auto-restart
  when the user hasn't tapped stop.

### DevMic (`src/pages/DevMic.tsx`)
- **What it is.** A hidden page under `/dev/mic` that shows both hooks'
  state live, with Start / Stop / Clear buttons and audio playback.
- **Why.** Debugging mic + speech on real devices is painful without a
  dedicated harness; the real UI isn't ready until step 7.
- **How it connects.** Public route — no sign-in required so it's easy
  to hit on a phone over the Vercel preview URL.

### Speech types (`src/types/speech.d.ts`)
- Minimal ambient declarations covering only the parts the hook
  actually uses (`SpeechRecognition`, `SpeechRecognitionEvent`,
  `SpeechRecognitionErrorEvent`, `window.webkitSpeechRecognition`).

## How to try it

**On your laptop:**
```bash
npm run dev
# http://localhost:5173/dev/mic
# Click Start → allow mic → speak for 10s → watch live text update
# Click Stop → audio playback element appears
# Refresh → playback still there (rehydrated from IndexedDB)
# Click Clear → everything goes away; IDB keys gone
```

**On your phone (the step 6 Check):**
1. Push to GitHub. Vercel builds a preview URL.
2. On your iPhone (Safari), open the preview + `/dev/mic`. Allow mic.
3. Record for 30 s. Expect `mimeType: audio/mp4`, live words updating.
4. On an Android or desktop Chrome, same page. Expect
   `mimeType: audio/webm;codecs=opus`.
5. Deny mic in Settings → Safari → Microphone, retry. Expect the
   friendly permission card and `error: permission_denied`.
6. Record for 9:30+ → "30 seconds left" card appears. Let it hit 10:00 →
   auto-stops and saves.

## Notes

- **The CLAUDE.md "Browsers" rule.** iPhone Safari does `audio/mp4`;
  Chrome does `audio/webm;codecs=opus`. We pick the first supported MIME
  in that CLAUDE.md order. HTTPS is required on real devices (localhost
  is a browser-recognised exception); Vercel previews are HTTPS.
- **The "stop-at-cap" cycle.** The interval inside `start()` needs to
  call `stop()`, but `stop` is declared after `start` to keep the
  reading order clean. We route the auto-stop through a `stopRef` so the
  interval closes over a stable ref rather than the (not-yet-declared)
  `stop` identifier. This also kept `react-hooks/preserve-manual-memoization`
  happy without disabling the rule.
- **Live speech might not exist.** On Firefox desktop and some
  jailbroken/privacy browsers the Web Speech API is missing entirely.
  The hook reports `supported: false` and the UI shows a gentle note.
  Audio recording still works.
- **`/dev/mic` is public.** It accesses no app data; making it public
  means Aruna can test on her phone without signing in. No link to it
  from the real UI — only discoverable by URL.
- **No shots / journey entry.** Playwright's headless Chromium can grant
  mic permission, but spoofing a real audio stream is fiddly. The page
  isn't part of the end-user journey either.

## Suggested commit message

```
feat: audio recorder + speech recognition hooks + /dev/mic test page
```

## Open questions

- We could `URL.createObjectURL` once per blob and store the URL in
  IndexedDB (not just the blob). Currently we re-create the URL on
  every mount. The current approach is simpler and object URLs are
  tiny — revisit only if the dev probe or step 7 shows a measurable
  delay.
- The `shouldStopAtCap` check runs every 250 ms. If the device throttles
  background timers, a user could theoretically over-record by a second
  or two before the next tick stops them. Fine for the spec's 10-minute
  cap; worth remembering if we ever care about hard limits.
