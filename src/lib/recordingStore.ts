/**
 * IndexedDB-backed store for the current in-progress recording.
 *
 * CLAUDE.md rule 3: never lose a recording. The audio blob stays in
 * IndexedDB until the entry is saved — if transcription or the AI step
 * fails, step 7's UI can offer "Try again" without the user losing what
 * they said.
 */

import { del, get, set } from 'idb-keyval';

const BLOB_KEY = 'cocoon.recording.v1.blob';
const MIME_KEY = 'cocoon.recording.v1.mime';
const TIME_KEY = 'cocoon.recording.v1.recordedAt';

export interface SavedRecording {
  blob: Blob;
  mimeType: string;
  recordedAt: string; // ISO
}

export async function saveRecording(blob: Blob, mimeType: string): Promise<SavedRecording> {
  const recordedAt = new Date().toISOString();
  await Promise.all([set(BLOB_KEY, blob), set(MIME_KEY, mimeType), set(TIME_KEY, recordedAt)]);
  return { blob, mimeType, recordedAt };
}

export async function loadRecording(): Promise<SavedRecording | null> {
  const [blob, mimeType, recordedAt] = await Promise.all([
    get<Blob>(BLOB_KEY),
    get<string>(MIME_KEY),
    get<string>(TIME_KEY),
  ]);
  if (!blob || !mimeType || !recordedAt) return null;
  return { blob, mimeType, recordedAt };
}

export async function clearRecording(): Promise<void> {
  await Promise.all([del(BLOB_KEY), del(MIME_KEY), del(TIME_KEY)]);
}
