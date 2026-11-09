/**
 * Save pipeline — the "tap stop → entry open on screen" flow.
 *
 * Voice: upload-url → (skip real upload until step 15) → transcribe →
 * create entry → clear IndexedDB blob → navigate. Transcribe failure
 * falls back to the browser's live-speech text (SPEC §2.2). Create
 * failure lands in `failed_write` with the transcript as a draft the
 * user can edit and Try again.
 *
 * Typed: skip the first three; createEntry straight from the user text.
 */

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCreateEntry,
  useRequestUploadUrl,
  useTranscribe,
} from '@/hooks/queries';
import { mimeToExt } from '@/lib/mime';
import { clearRecording } from '@/lib/recordingStore';
import type { Locale } from '@/lib/types';

export type PipelineStatus = 'idle' | 'transcribing' | 'writing' | 'failed_write';

export interface UseSavePipeline {
  status: PipelineStatus;
  errorMessage: string | null;
  draftTranscript: string | null;
  saveVoice: (args: {
    blob: Blob;
    mimeType: string;
    liveTranscript: string;
  }) => Promise<void>;
  saveTyped: (text: string) => Promise<void>;
  retryFromDraft: (text: string) => Promise<void>;
  reset: () => void;
}

const LOCALE_DEFAULT: Locale = 'en-US';
const CREATE_FAIL_MESSAGE =
  "The AI couldn't finish writing. Your words are safe — try again when you're ready.";
const NO_WORDS_MESSAGE =
  "I didn't catch any words. Try again — a little louder or a bit closer to the mic?";

function currentTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export function useSavePipeline(): UseSavePipeline {
  const navigate = useNavigate();
  const requestUploadUrl = useRequestUploadUrl();
  const transcribe = useTranscribe();
  const createEntry = useCreateEntry();

  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftTranscript, setDraftTranscript] = useState<string | null>(null);

  const createThenNavigate = useCallback(
    async (transcript: string, liveTranscript: string, locale: Locale) => {
      setStatus('writing');
      try {
        const entry = await createEntry.mutateAsync({
          transcript,
          live_transcript: liveTranscript,
          locale,
          timezone: currentTimezone(),
        });
        await clearRecording().catch(() => {
          // Swallow — the entry is saved, that's what matters.
        });
        setStatus('idle');
        setErrorMessage(null);
        setDraftTranscript(null);
        navigate(`/entry/${entry.id}`);
      } catch (err) {
        setStatus('failed_write');
        setErrorMessage(err instanceof Error ? err.message : CREATE_FAIL_MESSAGE);
        setDraftTranscript(transcript);
      }
    },
    [createEntry, navigate],
  );

  const saveVoice = useCallback<UseSavePipeline['saveVoice']>(
    async ({ blob: _blob, mimeType, liveTranscript }) => {
      setStatus('transcribing');
      setErrorMessage(null);
      setDraftTranscript(null);

      // Step A: ask the API for a signed upload URL. This exercises the
      // wiring even while mocked; the real supabase upload lands in step 15.
      let uploadedPath: string | null = null;
      try {
        const { path } = await requestUploadUrl.mutateAsync({ ext: mimeToExt(mimeType) });
        uploadedPath = path;
        // TODO: step 15 — PUT `blob` to `path` via supabase-js using
        // the returned `token`. Until then the mock /api/transcribe
        // handler returns a fixed string and doesn't need the bytes.
      } catch {
        // Fall through — we'll retry with the live transcript.
      }

      // Step B: transcribe. Fall back to the live-speech words on failure.
      let transcript = '';
      if (uploadedPath) {
        try {
          const result = await transcribe.mutateAsync({
            audio_path: uploadedPath,
            locale: LOCALE_DEFAULT,
          });
          transcript = result.text.trim();
        } catch {
          transcript = '';
        }
      }
      if (!transcript) transcript = liveTranscript.trim();

      if (!transcript) {
        setStatus('failed_write');
        setErrorMessage(NO_WORDS_MESSAGE);
        setDraftTranscript('');
        return;
      }

      // Step C: create the entry and navigate.
      await createThenNavigate(transcript, liveTranscript, LOCALE_DEFAULT);
    },
    [requestUploadUrl, transcribe, createThenNavigate],
  );

  const saveTyped = useCallback<UseSavePipeline['saveTyped']>(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setStatus('writing');
      setErrorMessage(null);
      setDraftTranscript(null);
      await createThenNavigate(trimmed, trimmed, LOCALE_DEFAULT);
    },
    [createThenNavigate],
  );

  const retryFromDraft = useCallback<UseSavePipeline['retryFromDraft']>(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      await createThenNavigate(trimmed, trimmed, LOCALE_DEFAULT);
    },
    [createThenNavigate],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
    setDraftTranscript(null);
  }, []);

  return { status, errorMessage, draftTranscript, saveVoice, saveTyped, retryFromDraft, reset };
}
