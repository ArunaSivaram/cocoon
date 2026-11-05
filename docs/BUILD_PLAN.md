# Cocoon — Build Plan

Build in order. Each step has a **prompt** to paste into Claude Code and a **check** you do
yourself before moving on. Commit after every step that passes its check.

How to run each step:
1. Start Claude Code in the project folder and switch to plan mode.
2. Paste the step's prompt. Read the plan it proposes; correct anything that looks off.
3. Approve, let it build, then do the check yourself (on your phone when it says so).
4. Read the explanations and `docs/build-log/step-NN-*.md`. Ask "why?" about anything unclear
   before moving on — that's the cheapest time to learn it.
5. For screen steps, open `docs/USER_JOURNEY.md` and check the new screenshots and descriptions.
6. `git add -A && git commit -m "<message Claude suggests>"`.
7. Start a fresh Claude Code session (`/clear`) for the next step — it keeps context small.

Every step's prompt implicitly includes: *"Follow CLAUDE.md → Explain as you go, write the build
log, and update the user journey document if a screen changed."* If Claude Code forgets, say so.

---

## Phase 0 — Accounts and setup (about 1 hour, no code)

Create these (all have free tiers):

| Service | What to do | You'll need |
|---|---|---|
| GitHub | New private repo `cocoon` | repo URL |
| Vercel | Sign up with GitHub | — |
| Supabase | New project, region Singapore | Project URL, anon key, service-role key |
| Google Cloud | New project → OAuth consent screen (External) → OAuth client (Web). Authorised redirect URI = the callback URL shown in Supabase → Auth → Providers → Google | Client ID + secret, pasted into Supabase |
| OpenAI | API key, add $5–10 credit | `OPENAI_API_KEY` |
| Anthropic | Console API key, add credit; note the current Sonnet model ID from the models page | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` |
| Resend | API key; verify a domain you own (or use `onboarding@resend.dev` to test, which only sends to your own email) | `RESEND_API_KEY`, `EMAIL_FROM` |
| PostHog | New project | project key + host |

On your laptop: install Node.js 20+, Git, the Vercel CLI (`npm i -g vercel`), the Supabase CLI,
and Claude Code.

Put the starter kit in place:
```
cocoon/
  CLAUDE.md
  docs/SPEC.md
  docs/BUILD_PLAN.md
  docs/mockups/*.jpg
```
Then `git init`, commit, and push to GitHub.

---

## Phase 1 — Frontend with a fake backend

### Step 1 — Scaffold
**Prompt:**
> Read CLAUDE.md and docs/SPEC.md. Scaffold the project as described in CLAUDE.md: Vite + React 19
> + TypeScript strict, Tailwind v4, shadcn/ui, TanStack Query, react-router, date-fns,
> lucide-react, sonner, vite-plugin-pwa, Vitest, Playwright, ESLint + Prettier. Create the folder
> layout, the npm scripts listed in CLAUDE.md, an `.env.example` with every variable from SPEC §7,
> and a `.gitignore` that ignores `.env*` (except the example) and `shots/`. Create
> `docs/build-log/` and `docs/journey/`. Add placeholder pages and routes
> for SignIn, Home, Entry (/entry/:id), MoodCalendar (/calendar) and MemoryWall (/memories).
> Don't build any real UI yet.

**Check:** `npm run dev` opens a page; `npm run typecheck`, `npm run lint`, `npm test` all pass.

### Step 2 — Deploy early to Vercel
**Prompt:**
> Add a `vercel.json` suitable for a Vite SPA with an `api/` folder (SPA fallback to index.html
> for non-/api paths). Add `api/[[...route]].ts` with a minimal Hono app that only serves
> GET /api/health → {ok:true}, set maxDuration 60. Explain the steps for me to import the repo
> in Vercel.

**Check:** Import the repo in Vercel. Open `https://<your-app>.vercel.app` and
`/api/health` on your phone. From now on every push gives you an HTTPS preview to test the mic on.

### Step 3 — Design system and app shell
**Prompt:**
> Implement the design system from CLAUDE.md: fonts (Lora, Instrument Sans), colour variables
> via Tailwind v4 @theme, dotted paper background, card and paper-sheet styles, ruled-lines
> utility, mood map in src/lib/moods.ts with badge tints, reduced-motion handling. Build the
> shared header (COCOON label, page title, Reminder / Mood calendar / Memories buttons, avatar
> menu) responsive as in mockups 02-home and 15-desktop-home. Add a Playwright script
> `npm run shots` that screenshots each route at 390×844 and 1280×800 into `shots/`, and a
> second script `npm run journey` as described in CLAUDE.md → "User journey document" (it will
> grow as screens are added).

**Check:** Run `npm run shots`; header and background look like the mockups. Run
`npm run journey` and confirm `docs/journey/` gets its first screenshots.

### Step 4 — Types and mock API
**Prompt:**
> Create src/lib/types.ts for every request and response in SPEC §5. Create a typed API client in
> src/lib/api.ts (fetch with the Supabase bearer token, typed errors) and TanStack Query hooks.
> Add MSW handlers in src/mocks that implement every endpoint in memory, with 6 realistic English
> fixture entries matching mockup 05-past-entries (one locked, passcode 1234, some with photos
> from placeholder images) plus a fake 2-second delay for transcribe and entries POST. Enable MSW
> only when VITE_USE_MOCKS=true. Mock sign-in so I'm always signed in as a test user.

**Check:** App loads with mock data in dev; network tab shows mocked `/api` calls.

### Step 5 — Sign-in screen
**Prompt:**
> Build the sign-in page exactly as SPEC §2.1 with mockup 01-sign-in as visual reference.
> The Google button calls a `signIn()` function from src/lib/auth.ts that is mocked for now.
> Add the route guard: every page except /signin requires a signed-in user.

**Check:** Compare phone screenshot with `01-sign-in.jpg`.

### Step 6 — Recording hooks (the hardest part — test on real devices)
**Prompt:**
> Build src/hooks/useAudioRecorder.ts and src/hooks/useSpeechRecognition.ts per CLAUDE.md
> "Browsers" and SPEC §2.2 and §3.1. Recorder: pick mime type with isTypeSupported, 32 kbps,
> timer, 10-minute cap with a warning at 9:30, permission-denied state, and save the blob to
> IndexedDB (idb-keyval) until cleared. Speech: webkitSpeechRecognition with en-US / en-GB,
> continuous + interim results, auto-restart when Safari or Chrome ends the session early,
> graceful "not supported" state. Add a hidden /dev/mic test page showing both hooks' state,
> the live text, and a playback of the recorded audio. Write unit tests for the pure logic.

**Check:** Push, open `/dev/mic` on the Vercel preview on **your iPhone (Safari)** and on
**Chrome (Android or desktop)**. Record 1 minute: live words appear, playback works, a
permission denial shows the friendly message. Don't continue until both browsers work.

### Step 7 — Home screen
**Prompt:**
> Build the Home page per SPEC §2.2 and §2.3 using the hooks from step 6 and mockups 02, 03, 04
> and 05: mic card with the three states (idle, recording with breathing rings and lined live-text
> box, writing with gliding feather and the two status lines), "Rather type it?" text mode,
> first-time hint, the failure/retry flow, and the Past entries list with locked cards and
> pagination. The save flow calls upload-url → upload → transcribe → create entry (all mocked)
> and then navigates to the new entry.

**Check:** On your phone, record → see "Listening back carefully…" → "Writing your entry…" →
lands on the entry. Turn on airplane mode mid-save: words are kept and Try again works.

### Step 8 — Reading view and editing
**Prompt:**
> Build the Entry page per SPEC §2.4 with mockups 06, 07, 08, 09 and 16: paper sheet with red
> margin line, date + mood badge, title, In my words (with See original transcript), What I meant
> parchment card with Key reflection, My notes, inline editing with Save/Cancel and a "Saved."
> toast, and the support-note card. Photos section can be a placeholder for now.

**Check:** Edit every section; refresh — changes persist in the mock.

### Step 9 — Photos
**Prompt:**
> Build the Memories section per SPEC §2.4 and §6: add up to 2 photos, resize in the browser to
> JPEG ≤ 1600 px before upload, show 1/2 count, full-size viewer, remove with confirm, dashed add
> button hidden at 2.

**Check:** Add an iPhone photo (HEIC) in Safari — it uploads as JPEG.

### Step 10 — Lock, unlock, delete
**Prompt:**
> Build lock / unlock / remove lock / delete per SPEC §2.5 with mockups 10 and 11: set passcode
> (typed twice + warning), private screen, unlock dialog with shake and error, too-many-tries
> state, unlocked-for-this-visit behaviour (keep passcode only in memory), delete confirm, and
> the Forgot passcode → type DELETE flow.

**Check:** Lock an entry, leave and come back — it's locked again. 5 wrong tries shows the wait message.

### Step 11 — Mood calendar and memory wall
**Prompt:**
> Build the Mood calendar (SPEC §2.6, mockup 12) and Memory wall (SPEC §2.7, mockup 13).
> Locked entries show a grey dot and never appear on the memory wall or in the mood counts.

**Check:** Compare both pages with their mockups on phone and laptop.

### Step 12 — Reminder dialog and account menu
**Prompt:**
> Build the reminder dialog (SPEC §2.8, mockup 14) with detected time zone and the 60-second test
> cooldown, and the avatar menu items: English (US)/(UK) setting, Export my journal, Delete my
> account (with a serious confirm), Sign out.

**Check:** Settings persist in the mock; time zone shows your real zone.

### Step 13 — Polish pass
**Prompt:**
> Do a polish pass: run `npm run shots` and compare every screen with its mockup, fix spacing and
> typography differences, check touch targets ≥ 44 px, keyboard focus states, reduced motion,
> loading skeletons, empty states (no entries yet, no photos yet), and the PWA manifest + icons
> (warm clay mic on off-white). List anything you couldn't match.

**Check:** Install the app to your iPhone home screen and use it for a day with mock data.
Note what feels off. **This is the end of the frontend.**

---

## Phase 2 — Real backend

### Step 14 — Database and storage
**Prompt:**
> Create Supabase migrations for SPEC §4: tables, checks, indexes, RLS enabled with no policies,
> the two private buckets, and a pg_cron job that deletes audio-temp files older than 24 h.
> Explain how I link the Supabase CLI and push the migrations.

**Check:** Tables and buckets appear in the Supabase dashboard.

### Step 15 — Real sign-in and API foundation
**Prompt:**
> Replace the mocked auth with Supabase Google sign-in (redirect back to the app, session kept and
> refreshed by supabase-js). In server/, build the Hono app foundation: Supabase admin client,
> auth middleware that verifies the bearer token and loads/creates the profile, user-scoped query
> helpers, Zod validation, the error format from SPEC §5, and GET/PATCH /api/me. Add tests that
> prove a user can't read another user's data.

**Check:** Set env vars in Vercel and in `.env.local`. Add your Vercel URLs to Supabase → Auth →
URL configuration. Sign in with Google on your phone.

### Step 16 — Entries, transcription and the AI writer
**Prompt:**
> Implement upload-url, transcribe and entries endpoints (create, list with cursor, get, patch,
> calendar) per SPEC §3 and §5. Put the Claude system prompt in server/ai/writeEntry.ts exactly
> following SPEC §3.2, validate with Zod, retry once. Write 5 test transcripts (happy, tired,
> rambling with fillers, very short, distressed) and a script `npm run eval:writer` that prints
> the AI output for each so I can review the tone.

**Check:** Run the eval and read every output. Do the bodies keep your exact words? Is the
interpretation warm, not preachy? Does the distressed one set `support_note: true`? Tune the
prompt until you're happy. Then record a real entry on your phone, end to end.

### Step 17 — Photos, lock and the rest of the API
**Prompt:**
> Implement photos, memory wall, lock / open / remove-lock / delete (PBKDF2 with node:crypto,
> constant-time compare, unlock_attempts rate limit), export and account delete per SPEC §5 and
> §6. Add tests for: locked content never returned without passcode, rate limiting, max 2 photos,
> recent-sign-in requirement.

**Check:** Lock an entry and try `GET /api/entries/:id` in the browser — it returns 423 with no content.

### Step 18 — Reminders
**Prompt:**
> Implement the reminder endpoints and /api/cron/reminders per SPEC §2.8 and §6 with Resend and a
> simple warm HTML email (Cocoon name, one line, a clay button linking to APP_URL?ref=reminder).
> Add a Supabase migration that schedules pg_cron + pg_net to POST to the cron endpoint every 15
> minutes with the CRON_SECRET (read the secret from Supabase Vault, not hard-coded).

**Check:** Send me a test arrives. Set a reminder for 15 minutes from now on a day with no entry
— it arrives once. Write an entry first — it doesn't.

### Step 19 — Switch off mocks and test end to end
**Prompt:**
> Make production and preview use the real API (mocks only with VITE_USE_MOCKS=true). Write
> Playwright end-to-end tests against a local Supabase for: typed entry → read → edit → lock →
> unlock → delete; photo add/remove; calendar and memory wall hide locked content.

**Check:** All tests pass. Use the real app on your phone for 3 days.

---

## Phase 3 — Launch

### Step 20 — Analytics
**Prompt:**
> Add PostHog per SPEC §9: identify by user id only, never send entry content, add every listed
> event, respect Do Not Track. Build a short checklist for the PostHog dashboard I should create
> (activation funnel, entries per user per week, D1/D7 retention).

### Step 21 — Launch checklist
**Prompt:**
> Review the whole codebase against CLAUDE.md's "Rules that must never be broken" and SPEC §6.
> Check security headers, error pages, a simple Privacy page (what's stored, that audio is
> deleted, that OpenAI and Anthropic process the text/audio, how to export and delete), favicon,
> social preview image, and Google OAuth consent screen moved to production. Give me a list of
> issues ranked by severity before fixing anything.

**Check:** Fix the high-severity items, then invite 5–10 friends and watch the funnel.

---

## When something goes wrong
- **Claude Code goes off track:** stop it, `git restore .` (or `git reset --hard` to the last
  commit), `/clear`, and re-run the step with a more specific prompt.
- **A bug you can't explain:** paste the exact error and what you did, and ask it to find the
  cause before changing code.
- **Mic issues on iPhone:** always test on the HTTPS Vercel preview, not on a local IP address.
