# Cocoon — voice journal

Cocoon is a warm, calm voice journal web app. You tap a mic, talk about your day in English,
and Cocoon saves your own words (lightly tidied) plus a short AI interpretation, one key
reflection, a title and a mood. It should feel like a paper notebook.

- Product spec: `docs/SPEC.md` (source of truth for behaviour and copy)
- Build plan: `docs/BUILD_PLAN.md` (we build one step at a time, in order)
- Visual reference: `docs/mockups/*.jpg`

**The mockups were made for an earlier version.** Match their layout, spacing, colours and feel,
but take all text, names and behaviour from `docs/SPEC.md`. In particular the mockups say
"Voice Journal" (now **Cocoon**), show two language pickers (now one English US/UK picker) and
show Tamil text (MVP is English only).

## Stack

- **Frontend:** React 19, Vite, TypeScript (strict), Tailwind CSS v4, shadcn/ui, TanStack Query,
  react-router, date-fns, lucide-react icons, sonner toasts, vite-plugin-pwa.
- **API:** one Vercel Function at `api/[[...route]].ts` running a **Hono** app. All routes live
  under `/api`. Shared server code lives in `server/` (not inside `api/`).
- **Auth, database, files:** Supabase. Google sign-in via Supabase Auth. Postgres for data.
  Private Storage buckets `photos` and `audio-temp`.
- **AI:** OpenAI `gpt-4o-transcribe` (fallback `whisper-1`) for speech-to-text. Anthropic Claude
  Sonnet for writing the entry; model ID comes from env `ANTHROPIC_MODEL`, never hard-coded.
- **Email:** Resend. **Scheduler:** Supabase `pg_cron` + `pg_net` calls `/api/cron/reminders`
  every 15 minutes with a Bearer secret.
- **Analytics:** PostHog (events listed in SPEC §9).
- **Tests:** Vitest for units, Playwright for end-to-end and screenshots.
- **Hosting:** Vercel. Local dev with `vercel dev` so the frontend and `/api` run together.

## Folder layout

```
src/
  app/            routes, layout, providers
  pages/          SignIn, Home, Entry, MoodCalendar, MemoryWall
  components/     UI pieces (shadcn in components/ui)
  hooks/          useSpeechRecognition, useAudioRecorder, ...
  lib/            api client, types, mood map, formatting
  mocks/          MSW handlers + fixtures (used until the real API is wired)
api/[[...route]].ts   Vercel entry → server/app.ts
server/           Hono routes, Supabase admin client, AI, email, crypto
supabase/migrations/  SQL migrations
tests/            Playwright specs
docs/             SPEC, BUILD_PLAN, mockups
```

## Rules that must never be broken

1. **Every data access goes through `/api`.** The browser uses Supabase only for sign-in. The API
   verifies the Supabase access token, then uses the service-role client and filters **every**
   query by `user_id`. Another user's id returns 404. RLS is enabled on all tables with no
   policies (deny by default).
2. **Locked entries stay locked.** Never return title, body, interpretation, reflection, notes,
   mood or photos of a locked entry without a correct passcode in that request. The calendar
   shows locked entries as a grey lock dot, not their real mood.
3. **Never lose a recording.** Keep the audio blob in IndexedDB until the entry is saved. If
   transcription or AI fails, keep the words on screen so the user can retry.
4. **Audio is temporary.** Delete it from `audio-temp` right after transcription (success or failure).
5. **Secrets never reach the browser.** Only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and
   `VITE_POSTHOG_KEY` may have the `VITE_` prefix.
6. **No AI-generated images**, ever.
7. Respect `prefers-reduced-motion`: turn every animation off.

## Browsers

Target **Safari (iOS + macOS)** and **Chrome (Android + desktop)**. Others may work but are not
tested. Safari records `audio/mp4`, Chrome records `audio/webm;codecs=opus` — pick with
`MediaRecorder.isTypeSupported`. Mic and live speech need HTTPS (localhost is fine).
Live words use `webkitSpeechRecognition` with `lang` = `en-US` or `en-GB`; if it is missing,
recording still works and the live box shows "Your words will appear when you stop."

## Design system

- **Fonts:** Lora (serif) for headings and all reading text; Instrument Sans for interface text.
- **Colours** (define as CSS variables in `src/index.css` via Tailwind v4 `@theme`):
  - background `#FAF7F2` (faint dotted texture), paper sheet `#FCFAF6`, cards `#FFFFFF`
  - ink `#2C2621`, soft ink `#6E6259`, ruled lines `#E8DFD3`, parchment `#F4ECE1`
  - clay `#A34E2A`, mic gradient `#B85832 → #9E4A28`, recording red `#D33F2B`
- **Moods** (fixed list — keep `src/lib/moods.ts` and the AI prompt in sync):
  - green `#3F8A6E`: calm, content, relieved
  - amber `#E0A04A`: joyful, excited, hopeful, proud
  - lavender `#8A6FB8`: reflective, tired
  - brown `#B08A5E`: grateful
  - rose `#C9584A`: anxious, sad, stressed, frustrated, lonely
  - grey `#B8A898`: locked / unknown. Badges use soft tints of the same colour.
- **Shapes:** rounded 16–28 px corners, soft warm shadows, thin borders, ruled-paper lines
  behind written text.
- **Motion:** breathing rings on the mic while recording; gliding feather + bouncing dots while
  writing; blinking caret on live words; gentle lift on card hover; shake on wrong passcode.
- **Layout:** one column, max width ~720 px (wider for the memory wall), generous padding,
  touch targets ≥ 44 px, toasts bottom-right. Header buttons show text labels on ≥ 768 px.
- **Voice of the copy:** warm, short, first person, never clinical or preachy.

## How to work in this repo

- Before writing code for a step, read the step in `docs/BUILD_PLAN.md` and the related part of
  `docs/SPEC.md`, then propose a short plan and wait for approval.
- Keep changes small and focused on the current step. Do not start the next step unprompted.
- Types for API requests and responses live in `src/lib/types.ts` and are shared by the MSW
  mocks and the real API, so the switch from mocks to real API needs no UI changes.
- After UI work, run the Playwright screenshot script at 390×844 (phone) and 1280×800 (laptop)
  and compare with the matching mockup. Fix obvious differences before saying a step is done.
- Run `npm run typecheck`, `npm run lint` and `npm test` before finishing a step.
- Suggest a git commit message at the end of each step.

## Explain as you go (required)

The owner is a product manager learning how this app is built. She is not a full-time engineer.
Explain in plain language, define any jargon the first time, and keep each explanation short.

**Before a step:** a numbered plan — what you'll build, which files, in what order, and what she
will be able to see or try at the end. Wait for approval.

**After each new class, hook, module or API route** (one block per file, not per line):
- **What it is** — one sentence.
- **Why it exists** — the user need or spec section it serves.
- **How it connects** — what calls it and what it calls.
- **Worth knowing** — one design choice or gotcha.

**After each integration** (Supabase, Google sign-in, OpenAI, Anthropic, Resend, PostHog,
pg_cron, Vercel):
- What the service does for Cocoon and what data is sent to it.
- The data flow as numbered steps (browser → API → service → back).
- Which env vars/keys it uses and where they are set (local `.env.local` vs Vercel).
- How to test it by hand, and what happens if it fails.

**After each screen:**
- What the user can do on it and which journey step it is (SPEC §2.x).
- Its states (empty, loading, normal, error, locked…) and how to see each one.
- The main components it is made from.
- How it compares with its mockup, and any differences left.
- Then update the user journey document (below).

**At the end of each step** write `docs/build-log/step-NN-<name>.md` with: what was built, the
explanations above, files changed, how to try it, and open questions. Keep it readable on its own.

## User journey document (keep it updated)

`docs/USER_JOURNEY.md` is a living walkthrough of Cocoon with real screenshots, built alongside
the app. After every step that adds or changes a screen or state:
1. Run `npm run journey` — a Playwright script that signs in as the mock test user, walks the
   journey and saves screenshots to `docs/journey/<NN>-<screen>-<state>-<phone|laptop>.png`
   (390×844 and 1280×800, deviceScaleFactor 2).
2. Update that screen's section in `docs/USER_JOURNEY.md`: the phone screenshot (laptop one
   linked), a 2–4 line description of what the user sees and does, the states, and what
   happens next. Mark sections not built yet as "Coming in step N".
3. Keep the flow diagram at the top in sync (Mermaid).
Screenshots in `docs/journey/` are committed; `shots/` (mockup comparison) is gitignored.

## Commands

- `npm run dev` — Vite only (uses MSW mocks)
- `vercel dev` — Vite + `/api` together (real backend)
- `npm run typecheck` · `npm run lint` · `npm test` · `npm run e2e`
- `npm run shots` — screenshots of every route for comparing with mockups (into `shots/`)
- `npm run journey` — walks the user journey and refreshes `docs/journey/` screenshots
- `npx supabase db push` — apply migrations
