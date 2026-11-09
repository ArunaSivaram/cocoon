/**
 * useAudioRecorder — thin React wrapper around MediaRecorder that
 * handles Safari/Chrome MIME differences, the 10-minute cap, a 30-s
 * warning, permission errors, and persisting the blob to IndexedDB so
 * no recording is ever lost (CLAUDE.md rule 3).
 *
 * All browser-API-free helpers are exported so they can be unit-tested
 * without jsdom pretending to be a browser.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { clearRecording, loadRecording, saveRecording } from '@/lib/recordingStore';

export const RECORDER_MAX_MS = 10 * 60_000;
export const RECORDER_WARN_MS = 9 * 60_000 + 30_000;
const TICK_MS = 250;
const RECORDER_BITRATE = 32_000;

// MIME candidates in CLAUDE.md order: Chrome's Opus → generic webm → Safari's mp4.
const MIME_CANDIDATES: ReadonlyArray<{ mimeType: string; container: 'webm' | 'mp4' }> = [
  { mimeType: 'audio/webm;codecs=opus', container: 'webm' },
  { mimeType: 'audio/webm', container: 'webm' },
  { mimeType: 'audio/mp4', container: 'mp4' },
];

// ---------- Pure helpers (exported for tests) ----------

export function pickRecorderMimeType(
  isTypeSupported: (type: string) => boolean,
): { mimeType: string; container: 'webm' | 'mp4' } | null {
  for (const candidate of MIME_CANDIDATES) {
    if (isTypeSupported(candidate.mimeType)) return candidate;
  }
  return null;
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function shouldWarn(ms: number): boolean {
  return ms >= RECORDER_WARN_MS;
}

export function shouldStopAtCap(ms: number): boolean {
  return ms >= RECORDER_MAX_MS;
}

// ---------- Types ----------

export type RecorderStatus =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'stopping'
  | 'saved'
  | 'error';

export type RecorderError = 'permission_denied' | 'no_recorder_support' | 'unknown';

export interface AudioRecorderState {
  status: RecorderStatus;
  elapsedMs: number;
  warning: boolean;
  error: RecorderError | null;
  mimeType: string | null;
  blob: Blob | null;
  blobUrl: string | null;
  recordedAt: string | null;
}

export interface UseAudioRecorder {
  state: AudioRecorderState;
  start: () => Promise<void>;
  stop: () => void;
  clear: () => Promise<void>;
  isHydrating: boolean;
}

const initialState: AudioRecorderState = {
  status: 'idle',
  elapsedMs: 0,
  warning: false,
  error: null,
  mimeType: null,
  blob: null,
  blobUrl: null,
  recordedAt: null,
};

// ---------- Hook ----------

export function useAudioRecorder(): UseAudioRecorder {
  const [state, setState] = useState<AudioRecorderState>(initialState);
  const [isHydrating, setIsHydrating] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopRef = useRef<() => void>(() => {});

  // Rehydrate on mount from IndexedDB.
  useEffect(() => {
    let cancelled = false;
    loadRecording()
      .then((saved) => {
        if (cancelled || !saved) {
          if (!cancelled) setIsHydrating(false);
          return;
        }
        const url = URL.createObjectURL(saved.blob);
        blobUrlRef.current = url;
        setState((s) => ({
          ...s,
          status: 'saved',
          blob: saved.blob,
          blobUrl: url,
          mimeType: saved.mimeType,
          recordedAt: saved.recordedAt,
        }));
        setIsHydrating(false);
      })
      .catch(() => {
        if (!cancelled) setIsHydrating(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      stopTimer();
      try {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          recorderRef.current.stop();
        }
      } catch {
        // ignore
      }
      releaseStream();
      revokeBlobUrl();
    };
  }, [releaseStream, revokeBlobUrl, stopTimer]);

  const start = useCallback(async () => {
    if (state.status === 'recording' || state.status === 'requesting') return;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState((s) => ({ ...s, status: 'error', error: 'no_recorder_support' }));
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setState((s) => ({ ...s, status: 'error', error: 'no_recorder_support' }));
      return;
    }

    const picked = pickRecorderMimeType((t) => MediaRecorder.isTypeSupported(t));
    if (!picked) {
      setState((s) => ({ ...s, status: 'error', error: 'no_recorder_support' }));
      return;
    }

    setState((s) => ({
      ...s,
      status: 'requesting',
      error: null,
      elapsedMs: 0,
      warning: false,
    }));

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const kind =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'permission_denied'
          : 'unknown';
      setState((s) => ({ ...s, status: 'error', error: kind }));
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, {
      mimeType: picked.mimeType,
      audioBitsPerSecond: RECORDER_BITRATE,
    });
    recorderRef.current = recorder;

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    recorder.onstop = async () => {
      const chunks = chunksRef.current;
      chunksRef.current = [];
      const blob = new Blob(chunks, { type: picked.mimeType });
      try {
        const saved = await saveRecording(blob, picked.mimeType);
        revokeBlobUrl();
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setState((s) => ({
          ...s,
          status: 'saved',
          blob,
          blobUrl: url,
          mimeType: picked.mimeType,
          recordedAt: saved.recordedAt,
        }));
      } catch {
        // Even if IDB write fails, surface the in-memory blob so the user
        // doesn't lose their recording.
        revokeBlobUrl();
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setState((s) => ({
          ...s,
          status: 'saved',
          blob,
          blobUrl: url,
          mimeType: picked.mimeType,
          recordedAt: new Date().toISOString(),
          error: null,
        }));
      } finally {
        releaseStream();
      }
    };

    startTimeRef.current = performance.now();
    recorder.start(1000);
    setState((s) => ({
      ...s,
      status: 'recording',
      mimeType: picked.mimeType,
      error: null,
    }));

    stopTimer();
    intervalRef.current = setInterval(() => {
      const elapsedMs = performance.now() - startTimeRef.current;
      setState((s) =>
        s.status === 'recording'
          ? { ...s, elapsedMs, warning: shouldWarn(elapsedMs) }
          : s,
      );
      if (shouldStopAtCap(elapsedMs)) {
        stopRef.current();
      }
    }, TICK_MS);
  }, [state.status, releaseStream, revokeBlobUrl, stopTimer]);

  const stop = useCallback(() => {
    stopTimer();
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    setState((s) =>
      s.status === 'recording' ? { ...s, status: 'stopping' } : s,
    );
    try {
      recorder.stop();
    } catch {
      // ignore — onstop may still fire
    }
  }, [stopTimer]);

  // Keep the ref pointing at the current stop() for the auto-cap path in start().
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const clear = useCallback(async () => {
    stopTimer();
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch {
      // ignore
    }
    releaseStream();
    revokeBlobUrl();
    recorderRef.current = null;
    chunksRef.current = [];
    try {
      await clearRecording();
    } catch {
      // ignore
    }
    setState(initialState);
  }, [releaseStream, revokeBlobUrl, stopTimer]);

  return { state, start, stop, clear, isHydrating };
}
