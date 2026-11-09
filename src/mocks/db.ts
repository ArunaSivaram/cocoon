/**
 * In-memory mock backend for Cocoon.
 *
 * Shape and rules match SPEC §4/§5 so step 17's real server can be swapped
 * in with no UI changes. No HTTP concerns here — handlers.ts owns those.
 */

import type {
  CalendarDay,
  CreateEntryRequest,
  Entry,
  EntrySummary,
  Photo,
  Profile,
  Reminder,
  ReminderInput,
  UpdateEntryRequest,
} from '@/lib/types';
import type { MoodKey } from '@/lib/moods';
import {
  INITIAL_ENTRIES,
  INITIAL_PASSCODES,
  INITIAL_PROFILE,
  INITIAL_REMINDER,
  TEST_USER_ID,
} from './fixtures';

export type DbResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      status: number;
      code:
        | 'not_found'
        | 'locked'
        | 'wrong_passcode'
        | 'rate_limited'
        | 'too_many_photos'
        | 'conflict'
        | 'bad_request';
      message: string;
    };

interface DbState {
  profile: Profile;
  entries: Map<string, Entry>;
  passcodes: Map<string, string>;
  reminder: Reminder;
  /** Per-entry timestamps of failed unlock attempts (newest first). */
  failedUnlocks: Map<string, number[]>;
}

const UNLOCK_WINDOW_MS = 15 * 60 * 1000;
const UNLOCK_MAX_ATTEMPTS = 5;
const TEST_REMINDER_COOLDOWN_MS = 60 * 1000;
const MAX_PHOTOS_PER_ENTRY = 2;
const PAGE_SIZE = 20;

function freshState(): DbState {
  return {
    profile: { ...INITIAL_PROFILE },
    entries: new Map(INITIAL_ENTRIES.map((e) => [e.id, clone(e)])),
    passcodes: new Map(Object.entries(INITIAL_PASSCODES)),
    reminder: { ...INITIAL_REMINDER },
    failedUnlocks: new Map(),
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

let state = freshState();

/** Reset the DB. Tests only; the dev browser never calls this. */
export function resetDb(): void {
  state = freshState();
}

// ---------- Profile ----------

export function getProfile(): Profile {
  return state.profile;
}

export function updateLocale(locale: Profile['locale']): Profile {
  state.profile = { ...state.profile, locale };
  return state.profile;
}

// ---------- Entries ----------

function toSummary(entry: Entry): EntrySummary {
  if (entry.is_locked) {
    return {
      id: entry.id,
      entry_date: entry.entry_date,
      created_at: entry.created_at,
      is_locked: true,
    };
  }
  const first = entry.photos[0] ?? null;
  return {
    id: entry.id,
    entry_date: entry.entry_date,
    created_at: entry.created_at,
    is_locked: false,
    title: entry.title,
    mood: entry.mood,
    photo_count: entry.photos.length,
    first_photo_url: first ? first.url : null,
  };
}

/** Newest first by entry_date, then created_at. */
function sortedEntries(): Entry[] {
  return [...state.entries.values()].sort((a, b) => {
    if (a.entry_date !== b.entry_date) {
      return a.entry_date < b.entry_date ? 1 : -1;
    }
    return a.created_at < b.created_at ? 1 : -1;
  });
}

export function listEntries(cursor?: string): {
  entries: EntrySummary[];
  next_cursor: string | null;
} {
  const all = sortedEntries();
  const start = cursor ? all.findIndex((e) => e.id === cursor) + 1 : 0;
  const page = all.slice(start, start + PAGE_SIZE);
  const next = all[start + PAGE_SIZE] ? page[page.length - 1]!.id : null;
  return {
    entries: page.map(toSummary),
    next_cursor: next,
  };
}

export function getEntryRaw(id: string): Entry | undefined {
  return state.entries.get(id);
}

/**
 * GET /api/entries/:id — returns `locked` if the entry is private.
 * Callers must open via openEntry() to get content.
 */
export function getEntry(id: string): DbResult<Entry> {
  const entry = state.entries.get(id);
  if (!entry) return notFound('Entry not found.');
  if (entry.is_locked) {
    return { ok: false, status: 423, code: 'locked', message: 'This page is private.' };
  }
  return { ok: true, value: clone(entry) };
}

export function openEntry(id: string, passcode: string): DbResult<Entry> {
  const entry = state.entries.get(id);
  if (!entry) return notFound('Entry not found.');
  if (!entry.is_locked) {
    // Opening a non-locked entry is a no-op — just return it.
    return { ok: true, value: clone(entry) };
  }
  const rate = checkUnlockRate(id);
  if (!rate.ok) return rate;
  const expected = state.passcodes.get(id);
  if (!expected || expected !== passcode) {
    recordFailedUnlock(id);
    return {
      ok: false,
      status: 401,
      code: 'wrong_passcode',
      message: "That passcode isn't right.",
    };
  }
  state.failedUnlocks.delete(id);
  return { ok: true, value: clone(entry) };
}

export function createEntry(req: CreateEntryRequest, now = new Date()): Entry {
  const id = randomUuid();
  const createdAt = now.toISOString();
  // Fake AI output — the writer step (16) will do the real work.
  const synth = synthesiseAiFields(req.transcript);
  const entry: Entry = {
    id,
    user_id: TEST_USER_ID,
    entry_date: formatEntryDate(now, req.timezone),
    timezone: req.timezone,
    title: synth.title,
    mood: synth.mood,
    body: synth.body,
    interpretation: synth.interpretation,
    reflection: synth.reflection,
    notes: '',
    transcript_raw: req.transcript,
    locale: req.locale,
    support_note: false,
    is_locked: false,
    created_at: createdAt,
    updated_at: createdAt,
    photos: [],
  };
  state.entries.set(id, entry);
  return clone(entry);
}

export function updateEntry(
  id: string,
  patch: UpdateEntryRequest,
): DbResult<Entry> {
  const entry = state.entries.get(id);
  if (!entry) return notFound('Entry not found.');
  if (entry.is_locked) {
    if (!patch.passcode) return lockedError();
    const expected = state.passcodes.get(id);
    if (expected !== patch.passcode) {
      recordFailedUnlock(id);
      return wrongPasscodeError();
    }
  }
  const next: Entry = {
    ...entry,
    title: patch.title ?? entry.title,
    body: patch.body ?? entry.body,
    interpretation: patch.interpretation ?? entry.interpretation,
    reflection: patch.reflection ?? entry.reflection,
    notes: patch.notes ?? entry.notes,
    updated_at: new Date().toISOString(),
  };
  state.entries.set(id, next);
  return { ok: true, value: clone(next) };
}

export function lockEntry(id: string, passcode: string): DbResult<Entry> {
  const entry = state.entries.get(id);
  if (!entry) return notFound('Entry not found.');
  if (!validPasscode(passcode)) {
    return { ok: false, status: 400, code: 'bad_request', message: 'Passcode must be 4–8 digits.' };
  }
  state.passcodes.set(id, passcode);
  const next: Entry = { ...entry, is_locked: true, updated_at: new Date().toISOString() };
  state.entries.set(id, next);
  return { ok: true, value: clone(next) };
}

export function removeLock(id: string, passcode: string): DbResult<Entry> {
  const entry = state.entries.get(id);
  if (!entry) return notFound('Entry not found.');
  if (!entry.is_locked) return { ok: true, value: clone(entry) };
  const expected = state.passcodes.get(id);
  if (expected !== passcode) {
    recordFailedUnlock(id);
    return wrongPasscodeError();
  }
  state.passcodes.delete(id);
  const next: Entry = { ...entry, is_locked: false, updated_at: new Date().toISOString() };
  state.entries.set(id, next);
  return { ok: true, value: clone(next) };
}

export function deleteEntry(
  id: string,
  req: { passcode?: string; forgot?: boolean },
): DbResult<void> {
  const entry = state.entries.get(id);
  if (!entry) return notFound('Entry not found.');
  if (entry.is_locked) {
    if (req.forgot === true) {
      // Mock accepts the "forgot passcode" escape hatch.
    } else if (req.passcode) {
      const expected = state.passcodes.get(id);
      if (expected !== req.passcode) {
        recordFailedUnlock(id);
        return wrongPasscodeError();
      }
    } else {
      return lockedError();
    }
  }
  state.entries.delete(id);
  state.passcodes.delete(id);
  state.failedUnlocks.delete(id);
  return { ok: true, value: undefined };
}

// ---------- Photos ----------

export function addPhoto(
  entryId: string,
  file: { bytes: number; width: number; height: number; url: string },
  passcode?: string,
): DbResult<Photo> {
  const entry = state.entries.get(entryId);
  if (!entry) return notFound('Entry not found.');
  if (entry.is_locked) {
    const expected = state.passcodes.get(entryId);
    if (!passcode || expected !== passcode) {
      recordFailedUnlock(entryId);
      return wrongPasscodeError();
    }
  }
  if (entry.photos.length >= MAX_PHOTOS_PER_ENTRY) {
    return {
      ok: false,
      status: 409,
      code: 'too_many_photos',
      message: 'This entry already has two photos.',
    };
  }
  const photo: Photo = {
    id: randomUuid(),
    entry_id: entryId,
    user_id: TEST_USER_ID,
    storage_path: `${TEST_USER_ID}/${entryId}/${randomUuid()}.jpg`,
    content_type: 'image/jpeg',
    size_bytes: file.bytes,
    width: file.width,
    height: file.height,
    created_at: new Date().toISOString(),
    url: file.url,
  };
  const next: Entry = {
    ...entry,
    photos: [...entry.photos, photo],
    updated_at: new Date().toISOString(),
  };
  state.entries.set(entryId, next);
  return { ok: true, value: clone(photo) };
}

export function deletePhoto(
  entryId: string,
  photoId: string,
  passcode?: string,
): DbResult<void> {
  const entry = state.entries.get(entryId);
  if (!entry) return notFound('Entry not found.');
  if (entry.is_locked) {
    const expected = state.passcodes.get(entryId);
    if (!passcode || expected !== passcode) {
      recordFailedUnlock(entryId);
      return wrongPasscodeError();
    }
  }
  const idx = entry.photos.findIndex((p) => p.id === photoId);
  if (idx === -1) return notFound('Photo not found.');
  const next: Entry = {
    ...entry,
    photos: entry.photos.filter((_, i) => i !== idx),
    updated_at: new Date().toISOString(),
  };
  state.entries.set(entryId, next);
  return { ok: true, value: undefined };
}

export function allUnlockedPhotos(): Photo[] {
  return sortedEntries()
    .filter((e) => !e.is_locked)
    .flatMap((e) => e.photos)
    .map(clone);
}

// ---------- Calendar ----------

/**
 * SPEC §5 GET /api/calendar?month=YYYY-MM. Locked entries return mood=null.
 */
export function calendarForMonth(month: string): CalendarDay[] {
  return sortedEntries()
    .filter((e) => e.entry_date.startsWith(month))
    .map((e) => ({
      id: e.id,
      entry_date: e.entry_date,
      mood: e.is_locked ? null : (e.mood as MoodKey),
      is_locked: e.is_locked,
      created_at: e.created_at,
    }));
}

// ---------- Reminder ----------

export function getReminder(): Reminder {
  return { ...state.reminder };
}

export function updateReminder(input: ReminderInput): Reminder {
  state.reminder = { ...state.reminder, ...input };
  return { ...state.reminder };
}

export function sendTestReminder(now = new Date()): DbResult<void> {
  const last = state.reminder.last_test_at ? new Date(state.reminder.last_test_at).getTime() : 0;
  if (now.getTime() - last < TEST_REMINDER_COOLDOWN_MS) {
    return {
      ok: false,
      status: 429,
      code: 'rate_limited',
      message: 'Please wait a minute between test emails.',
    };
  }
  state.reminder = { ...state.reminder, last_test_at: now.toISOString() };
  return { ok: true, value: undefined };
}

// ---------- Helpers ----------

function notFound(message: string): DbResult<never> {
  return { ok: false, status: 404, code: 'not_found', message };
}
function lockedError(): DbResult<never> {
  return { ok: false, status: 423, code: 'locked', message: 'This page is private.' };
}
function wrongPasscodeError(): DbResult<never> {
  return { ok: false, status: 401, code: 'wrong_passcode', message: "That passcode isn't right." };
}

function checkUnlockRate(entryId: string, now = Date.now()): DbResult<void> {
  const attempts = state.failedUnlocks.get(entryId) ?? [];
  const recent = attempts.filter((t) => now - t < UNLOCK_WINDOW_MS);
  state.failedUnlocks.set(entryId, recent);
  if (recent.length >= UNLOCK_MAX_ATTEMPTS) {
    return {
      ok: false,
      status: 429,
      code: 'rate_limited',
      message: 'Too many tries. Please wait 15 minutes.',
    };
  }
  return { ok: true, value: undefined };
}

function recordFailedUnlock(entryId: string): void {
  const prev = state.failedUnlocks.get(entryId) ?? [];
  state.failedUnlocks.set(entryId, [...prev, Date.now()]);
}

function validPasscode(passcode: string): boolean {
  return /^\d{4,8}$/.test(passcode);
}

/**
 * Compute the user's local date from a server-side "now". The real server
 * will do this with a proper TZ library; for mocks we trust the IANA zone
 * via Intl.DateTimeFormat.
 */
function formatEntryDate(now: Date, tz: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(now); // en-CA gives YYYY-MM-DD
}

/**
 * Fake AI fields for the mock. Keeps the body close to the transcript
 * (lightly trimmed) and produces a neutral interpretation/title/mood. The
 * real writer (step 16) is Claude Sonnet.
 */
function synthesiseAiFields(transcript: string): {
  title: string;
  mood: MoodKey;
  body: string;
  interpretation: string;
  reflection: string;
} {
  const cleaned = transcript
    .replace(/\s+/g, ' ')
    .replace(/\b(um|uh|like|you know)\b/gi, '')
    .trim();
  const first = cleaned.split(/[.?!]\s*/)[0] ?? cleaned;
  const title = first
    .split(' ')
    .slice(0, 4)
    .join(' ')
    .replace(/^\w/, (c) => c.toUpperCase());
  return {
    title: title || 'A Note from Today',
    mood: 'reflective',
    body: cleaned.endsWith('.') ? cleaned : `${cleaned}.`,
    interpretation:
      "I'm just getting my thoughts down. There's no neat shape to today yet, and that's alright.",
    reflection: 'Writing it down is enough for now.',
  };
}

/** crypto.randomUUID() is available in all modern browsers + jsdom via Node 20+. */
function randomUuid(): string {
  return crypto.randomUUID();
}

// Rate-limit constants exposed for tests.
export const DB_CONSTANTS = {
  UNLOCK_WINDOW_MS,
  UNLOCK_MAX_ATTEMPTS,
  TEST_REMINDER_COOLDOWN_MS,
  MAX_PHOTOS_PER_ENTRY,
  PAGE_SIZE,
};
