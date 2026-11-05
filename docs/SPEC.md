# Cocoon — Product Spec (MVP)

Mockups: `docs/mockups/`. They are visual reference only; this document wins on text and behaviour.

## 1. What to build

A warm, calm voice journal web app that works on phone, iPad and laptop (Safari and Chrome).

You tap a big microphone and talk about your day in English. Your words appear live as you
speak. When you stop, Cocoon:

1. transcribes the recording accurately;
2. saves **your own words**, lightly tidied, as the main entry;
3. adds an AI **interpretation** ("What I meant") and **one key reflection**;
4. adds a short **title**, today's **date** and a one-word **mood**.

Each person signs in with Google and has their own private journal. Entries can be edited,
locked with a passcode, deleted, and given 1–2 photos. Extra views: a **mood calendar** and a
**memory wall** of photos. An optional **daily evening email** reminds you only on days you
haven't written. The app can be installed to the home screen (PWA).

**Feel:** a paper notebook. Soft off-white background, serif font for reading, generous spacing,
gentle motion. No AI-generated pictures.

**Language:** English only. One setting, **English (US)** or **English (UK)**, remembered on the
device. It sets the live-speech locale (`en-US` / `en-GB`) and the spelling the AI uses.

## 2. User journey

### 2.1 Sign in — mockup `01-sign-in`
- Signed-out visitors see one card: small clay mic icon, label "COCOON", heading
  "Tell me about your day.", subline "A quiet notebook that listens. Speak freely and get a
  journal entry in your own voice.", four bullets, and **Continue with Google**.
- Bullets:
  - "Just talk — I'll write it the way you would"
  - "Your own words, plus a gentle reflection"
  - "Your private journal; lock any page with a passcode"
  - "See how your weeks feel on a mood calendar"
- Footer line: "Your entries are private to you. Audio is deleted after it's transcribed."
- After sign-in you land on Home. Every page except sign-in requires a signed-in user.
- First sign-in shows a one-time hint above the mic: "Try it now — tell me one thing about today."

### 2.2 Home: record your day — mockups `02-home`, `03-recording`, `04-writing-entry`
- **Header:** small "COCOON" label, heading "Today's page" (on wide screens also today's date).
  Right side: Reminder (bell), Mood calendar, Memories, and the Google avatar. Avatar menu: name,
  email, English (US)/(UK) setting, Export my journal, Delete my account, Sign out.
- **Mic card:** large round clay mic button, text **"Tap and tell me about your day."**, subline
  "Speak freely. I'll write it the way you'd write it." and a small **"Rather type it?"** link
  that swaps in a text box with a **Write my entry** button.
- **Recording:** tap the mic → button turns red with a stop square and breathing rings. Text:
  "I'm listening… tap again when you're done." A small timer shows elapsed time. Live words appear
  on a lined-paper box with a blinking caret. The audio is recorded at the same time.
  - Maximum 10 minutes. At 9:30 show "30 seconds left"; at 10:00 stop automatically.
  - If the mic permission is denied, show a friendly card explaining how to allow it, plus the
    "Rather type it?" option.
- **Stop:** tap again. The mic area becomes a gliding feather with "Listening back carefully…"
  while audio is transcribed, then "Writing your entry…" and "Keeping your words, your feelings,
  your voice." while the AI writes. When done, the new entry opens in the reading view.
- **Failures:** if transcription fails, use the live words. If the AI fails, keep the words in an
  editable text box with **Try again**. The audio stays in IndexedDB until an entry is saved.

### 2.3 Past entries — mockup `05-past-entries`
- Below the mic card: **Past entries**, newest first, with a count ("6 pages").
- Each card: thumbnail of the first photo (if any), short date ("Wed, 4 Nov 2026"), serif
  title (one line, ellipsis), coloured mood badge, camera icon with photo count.
- **Locked** cards show "A private entry" in italics and a Locked badge; no title, mood or photo.
- Paginate 20 at a time ("Show earlier pages").

### 2.4 Reading view — mockups `06`–`09`
- Top bar: **Back to journal** (left); **Lock** and **Delete** (right).
- A paper sheet with a faint red margin line containing:
  1. Full date and mood badge, then a large serif **title** (editable).
  2. **In my words** — the user's words, lightly tidied, on ruled lines. "Edit my words".
     A small "See original transcript" toggle shows the raw transcript.
  3. **What I meant** — a parchment card with the AI's first-person interpretation (editable),
     a divider, then the **Key reflection** in italic serif (editable).
  4. **Memories** — up to 2 photos ("1/2"). Tap to view full-size; × removes after a confirm. The
     dashed "Add a photo or two from this day" button disappears at 2.
  5. **My notes** — the user's own thoughts and bullet points ("Add my own thoughts").
- Editing a section swaps it for a textarea with Save and Cancel; a "Saved." toast confirms.
- **Support note:** if the AI flagged the entry (see §3.2), show a soft card under What I meant:
  "If today feels heavy, you don't have to carry it alone." with a link "Find someone to talk to"
  → https://findahelpline.com. No other change in tone; never alarming.

### 2.5 Lock, unlock, delete — mockups `10-locked-entry`, `11-passcode`
- **Lock:** choose a 4–8 digit passcode, typed twice. Warning: "If you forget it, this page can't
  be read again. You can still delete it."
- A locked entry opens to "This page is private" with **Unlock** and **Delete**.
- Unlocking shows the page for this visit only; it stays locked. While unlocked you can edit,
  add/remove photos, **Remove lock** or **Delete**.
- Wrong passcode: the dialog shakes and shows "That passcode isn't right." After 5 wrong tries in
  15 minutes for that entry, show "Too many tries. Please wait 15 minutes."
- **Delete** (unlocked entry): confirm dialog. **Delete** (locked entry): passcode, or
  "Forgot passcode?" → confirm by typing DELETE (requires a sign-in within the last 10 minutes;
  otherwise ask the user to sign in again first).

### 2.6 Mood calendar — mockup `12-mood-calendar`
- Label "MOOD CALENDAR", heading "How my days have felt".
- Month grid (Monday first) with previous/next arrows. Today circled in clay.
- One coloured dot per entry on each day. **Locked entries show a grey dot**, not their mood.
- Tap a day → list of that day's entries (mood badge or Locked, time). Tap one to open it.
- Below the grid: **"This month, I felt mostly…"** — moods with counts (unlocked entries only).

### 2.7 Memory wall — mockup `13-memory-wall`
- Label "MEMORY WALL", heading "Little pieces of my days", total photo count.
- All photos from **unlocked** entries, grouped by month, 2-column (phone) / 3-column (laptop)
  masonry. Each tile: mood dot, date and title over a soft dark gradient. Tap → entry.

### 2.8 Daily reminder (email) — mockup `14-reminder`
- Bell opens "A gentle evening nudge" with "I'll email you at this time — only on days you
  haven't written yet.":
  - "Remind me every evening" checkbox
  - email field (defaults to the Google email)
  - time picker (hour + minutes in 15-minute steps)
  - time zone detected from the browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`),
    shown as text, e.g. "Your time zone: Asia/Singapore"
  - **Save reminder** and **Send me a test** (60-second cooldown).
- Every 15 minutes the scheduler checks each user and emails "Tap and tell me about your day."
  with a button to open Cocoon — only if they haven't written that day, at most once a day.

### 2.9 Laptop and iPad — mockups `15-desktop-home`, `16-desktop-entry`
Same layout, centred, comfortable reading width. Header buttons show text labels.

## 3. AI behaviour

### 3.1 Transcription
- Record with `MediaRecorder` (`audio/webm;codecs=opus` on Chrome, `audio/mp4` on Safari),
  `audioBitsPerSecond: 32000`.
- Upload the blob directly to Supabase Storage bucket `audio-temp` with a signed upload URL from
  the API (Vercel functions can't accept bodies over 4.5 MB).
- The API downloads it and calls OpenAI `gpt-4o-transcribe` with `language: "en"` and prompt:
  "A personal voice diary in {US|UK} English. Keep the speaker's own words."
  Fall back to `whisper-1` on error. Delete the audio file afterwards in all cases.
- If both fail, return an error; the client falls back to the live words.

### 3.2 Writing the entry (Claude Sonnet)
The system prompt asks for JSON only:
`{ title, mood, body, interpretation, reflection, support_note }`

- **body** — the user's own words, lightly tidied. Keep their words, order and phrasing. Remove
  only fillers (um, uh, like, you know), false starts and stutter-repeats. Add punctuation and
  paragraph breaks. Never paraphrase, summarise or add anything. Fix a word only when speech
  recognition clearly misheard it. Use US or UK spelling as set.
- **interpretation** — 2–5 first-person sentences, warm and in the user's tone, capturing what
  they really meant and felt. Never formal, robotic, preachy or therapist-like. No invented events,
  people or feelings.
- **title** — 2–7 words.
- **mood** — exactly one of: calm, content, relieved, joyful, excited, hopeful, proud, grateful,
  reflective, tired, anxious, sad, stressed, frustrated, lonely.
- **reflection** — one short first-person sentence.
- **support_note** — `true` only if the entry suggests the person may be in serious distress or at
  risk of harming themselves; otherwise `false`. When true, interpretation and reflection stay
  gentle and honest, never dismissive or cheerful.
- The browser's live text is sent too, as a hint for missing words.
- Validate with Zod. If invalid, retry once; if the mood isn't in the list, use "reflective".
- Typed entries ("Rather type it?") go through the same step, skipping transcription.

## 4. Data model (Supabase Postgres)

All ids are `uuid` (`gen_random_uuid()`). All timestamps `timestamptz default now()`.
RLS enabled on every table, no policies (the API uses the service role).

- **profiles**: `id` (= `auth.users.id`, PK), `email`, `name`, `avatar_url`, `locale`
  (`en-US`|`en-GB`, default `en-US`), `created_at`
- **entries**: `id`, `user_id` (FK profiles, cascade), `entry_date` (date in the user's time zone),
  `timezone`, `title`, `mood` (check in mood list), `body`, `interpretation`, `reflection`,
  `notes`, `transcript_raw`, `locale`, `support_note` (bool), `is_locked` (bool default false),
  `passcode_salt`, `passcode_hash` (PBKDF2-SHA256, 210 000 iterations), `created_at`,
  `updated_at`. Index `(user_id, entry_date desc)`.
- **photos**: `id`, `entry_id` (FK entries, cascade), `user_id`, `storage_path`, `content_type`,
  `size_bytes`, `width`, `height`, `created_at`. Max 2 per entry (enforced in the API).
- **reminders**: `user_id` (PK), `enabled`, `email`, `time_local` (`HH:MM`, 15-minute steps),
  `timezone`, `last_sent_date`, `last_test_at`
- **unlock_attempts**: `id`, `user_id`, `entry_id`, `succeeded` (bool), `created_at`
- **cron_runs**: `id` (run id, PK), `created_at` — skip duplicate scheduler calls; delete rows
  older than 7 days.

Storage buckets (both private): `photos` (`{user_id}/{entry_id}/{photo_id}.jpg`) and
`audio-temp` (`{user_id}/{uuid}.{webm|mp4}`, also auto-cleaned after 24 h).

## 5. API (Hono, all under `/api`)

All routes need `Authorization: Bearer <supabase access token>` except `/api/cron/reminders`
(Bearer `CRON_SECRET`) and `/api/health`. Every query is scoped to the signed-in user.

| Method | Path | Purpose |
|---|---|---|
| GET | /api/me | Current profile (creates it on first call) |
| PATCH | /api/me | Update `locale` |
| POST | /api/audio/upload-url | `{ext}` → `{path, token}` signed upload URL in `audio-temp` |
| POST | /api/transcribe | `{audio_path, locale}` → `{text}`; deletes the audio |
| POST | /api/entries | `{transcript, live_transcript?, locale, timezone}` → Entry |
| GET | /api/entries?cursor= | Card summaries, newest first, 20 per page (locked: no title/mood/photo) |
| GET | /api/entries/:id | Entry (423 if locked, 404 if not yours) |
| POST | /api/entries/:id/open | `{passcode}` → full Entry + photo URLs for a locked entry |
| PATCH | /api/entries/:id | Edit `title / body / interpretation / reflection / notes` (+ `passcode` if locked) |
| POST | /api/entries/:id/lock | `{passcode}` |
| POST | /api/entries/:id/remove-lock | `{passcode}` |
| POST | /api/entries/:id/delete | `{passcode?}` or `{forgot: true}` (recent sign-in required) |
| POST | /api/entries/:id/photos | multipart `file` (+ `passcode`); max 2 (409), ≤ 4 MB, jpeg |
| POST | /api/entries/:id/photos/:pid/delete | `{passcode?}` |
| GET | /api/photos | Memory wall: photos of unlocked entries with 1-hour signed URLs |
| GET | /api/calendar?month=YYYY-MM | `[{id, entry_date, mood | null, is_locked, created_at}]` |
| GET / PUT | /api/reminder | Reminder settings |
| POST | /api/reminder/test | Send a test email (60-second cooldown → 429) |
| POST | /api/cron/reminders | Scheduler only |
| GET | /api/export | JSON of all entries + photo URLs (locked entries exported without content) |
| POST | /api/account/delete | Deletes all data, photos and the auth user (recent sign-in required) |
| GET | /api/health | `{ok: true}` |

Wrong passcode → 401. Too many tries → 429. Errors are `{error: {code, message}}`.
Photo URLs are short-lived signed URLs, never public.

## 6. Key rules
- "Today" and `entry_date` are calculated on the server from the time zone the client sends.
- Before upload, photos are resized in the browser to a JPEG of at most 1600 px (Safari converts
  HEIC when drawing to canvas).
- Reminders: send only within 60 minutes after the chosen time; claim the day
  (`last_sent_date`) before sending so it's never sent twice; undo the claim if sending fails.
- Rate limits: 5 failed unlocks per entry per 15 minutes; 30 entries created per user per day.
- The function config sets `maxDuration: 60` seconds for AI calls.

## 7. Environment variables

Browser (`VITE_`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_POSTHOG_KEY`,
`VITE_POSTHOG_HOST`.
Server only: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
`ANTHROPIC_MODEL`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `CRON_SECRET`.

## 8. Out of scope for the MVP
- Languages other than English (Tamil, Hindi etc. come later).
- Browsers other than Safari and Chrome.
- Native mobile apps (it's a PWA).
- AI-generated pictures, search, back-dating entries, push notifications, sharing.

## 9. Analytics (PostHog)
Identify by user id only — never send entry text, titles or moods tied to content.
Events: `signed_in` (`first_time`), `recording_started`, `recording_stopped` (`seconds`),
`entry_created` (`source`: voice|typed, `seconds_to_save`), `entry_failed` (`stage`),
`entry_edited` (`section`), `entry_locked`, `photo_added`, `calendar_viewed`,
`memory_wall_viewed`, `reminder_saved` (`enabled`), `reminder_email_clicked` (via `?ref=reminder`).
Key metrics: time to first entry, entries per active user per week, day-1 and day-7 retention.
