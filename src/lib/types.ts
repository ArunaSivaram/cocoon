/**
 * Cocoon API types — one place that mirrors SPEC §5 and §4.
 *
 * These interfaces are consumed by the browser (api.ts, hooks, MSW handlers)
 * AND, in steps 15–17, by the real Hono server. Keep them framework-free so
 * either side can import them without pulling in React or Node-specific code.
 */

import type { MoodKey } from './moods';

export type Locale = 'en-US' | 'en-GB';
export type UUID = string;
export type ISODateTime = string; // 'YYYY-MM-DDTHH:mm:ss.sssZ'
export type ISODate = string; //     'YYYY-MM-DD'
export type Timezone = string; //    IANA zone, e.g. 'Asia/Singapore'

// ---------- Profile (SPEC §4 profiles / §5 /api/me) ----------

export interface Profile {
  id: UUID;
  email: string;
  name: string;
  avatar_url: string | null;
  locale: Locale;
  created_at: ISODateTime;
}

export interface UpdateMeRequest {
  locale: Locale;
}

// ---------- Photo (SPEC §4 photos / §5 /api/photos, /api/entries/:id/photos) ----------

export interface Photo {
  id: UUID;
  entry_id: UUID;
  user_id: UUID;
  storage_path: string;
  content_type: 'image/jpeg';
  size_bytes: number;
  width: number;
  height: number;
  created_at: ISODateTime;
  /** Short-lived signed URL. Never a public URL. SPEC §5 footnote. */
  url: string;
}

export interface PhotoUploadResponse {
  photo: Photo;
}

// ---------- Entry (SPEC §4 entries / §5 /api/entries*) ----------

export interface Entry {
  id: UUID;
  user_id: UUID;
  entry_date: ISODate;
  timezone: Timezone;
  title: string;
  mood: MoodKey;
  body: string;
  interpretation: string;
  reflection: string;
  notes: string;
  transcript_raw: string;
  locale: Locale;
  support_note: boolean;
  is_locked: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  /** Populated in GET /api/entries/:id and POST /api/entries/:id/open. */
  photos: Photo[];
}

/**
 * Card summary returned by GET /api/entries. Locked entries hide title /
 * mood / photos per SPEC §2.3 — the type union forces callers to check
 * `is_locked` before touching those fields.
 */
export type EntrySummary = EntrySummaryUnlocked | EntrySummaryLocked;

export interface EntrySummaryUnlocked {
  id: UUID;
  entry_date: ISODate;
  created_at: ISODateTime;
  is_locked: false;
  title: string;
  mood: MoodKey;
  photo_count: number;
  first_photo_url: string | null;
}

export interface EntrySummaryLocked {
  id: UUID;
  entry_date: ISODate;
  created_at: ISODateTime;
  is_locked: true;
}

export interface EntriesListResponse {
  entries: EntrySummary[];
  next_cursor: string | null;
  /** Total number of entries in the user's journal (locked + unlocked). */
  total_count: number;
}

export interface CreateEntryRequest {
  transcript: string;
  live_transcript?: string;
  locale: Locale;
  timezone: Timezone;
}

export interface UpdateEntryRequest {
  title?: string;
  body?: string;
  interpretation?: string;
  reflection?: string;
  notes?: string;
  /** Required when the entry is locked (SPEC §5). */
  passcode?: string;
}

export interface OpenEntryRequest {
  passcode: string;
}

export interface LockEntryRequest {
  passcode: string;
}

export interface RemoveLockRequest {
  passcode: string;
}

/**
 * SPEC §5 — POST /api/entries/:id/delete. The `forgot` path requires a
 * recent sign-in; in mock mode the client sends the session's
 * `signed_in_at` so the mock can enforce the 10-minute window too.
 */
export type DeleteEntryRequest =
  | { passcode?: string }
  | { forgot: true; signed_in_at: ISODateTime };

// ---------- Upload + transcription (SPEC §5 /api/audio/upload-url, /api/transcribe) ----------

export interface UploadUrlRequest {
  ext: 'webm' | 'mp4';
}
export interface UploadUrlResponse {
  path: string;
  token: string;
}

export interface TranscribeRequest {
  audio_path: string;
  locale: Locale;
}
export interface TranscribeResponse {
  text: string;
}

// ---------- Memory wall + calendar (SPEC §5) ----------

export interface MemoryWallResponse {
  photos: Photo[];
}

export interface CalendarDay {
  id: UUID;
  entry_date: ISODate;
  /** null when the day's entry is locked (SPEC §2.6). */
  mood: MoodKey | null;
  is_locked: boolean;
  created_at: ISODateTime;
}
export interface CalendarResponse {
  days: CalendarDay[];
}

// ---------- Reminder (SPEC §4 reminders / §5 /api/reminder*) ----------

export interface Reminder {
  enabled: boolean;
  email: string;
  /** 'HH:MM' in 15-minute steps. */
  time_local: string;
  timezone: Timezone;
  last_sent_date: ISODate | null;
  last_test_at: ISODateTime | null;
}

export type ReminderInput = Pick<Reminder, 'enabled' | 'email' | 'time_local' | 'timezone'>;

// ---------- Export + account delete ----------

export interface ExportResponse {
  profile: Profile;
  /** Locked entries are exported without content per SPEC §5. */
  entries: Array<Entry | { id: UUID; entry_date: ISODate; is_locked: true }>;
}

// ---------- Error envelope (SPEC §5 — {error: {code, message}}) ----------

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'locked'
  | 'wrong_passcode'
  | 'rate_limited'
  | 'bad_request'
  | 'too_many_photos'
  | 'payload_too_large'
  | 'conflict'
  | 'server_error';

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

// ---------- Health ----------

export interface HealthResponse {
  ok: true;
}
