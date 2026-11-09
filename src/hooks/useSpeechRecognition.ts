/**
 * useSpeechRecognition — wraps the webkit-prefixed (or un-prefixed) Web
 * Speech API. Both Safari and Chrome end sessions on their own schedule
 * when continuous=true, so we auto-restart until the user explicitly stops.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechStatus = 'idle' | 'listening' | 'error';

export type SpeechLocale = 'en-US' | 'en-GB';

export interface SpeechState {
  supported: boolean;
  status: SpeechStatus;
  finalText: string;
  interimText: string;
  error: string | null;
}

export interface UseSpeechRecognition {
  state: SpeechState;
  start: (locale: SpeechLocale) => void;
  stop: () => void;
  reset: () => void;
}

const AUTO_RESTART_DELAY_MS = 150;

// ---------- Pure helpers (exported for tests) ----------

/**
 * Returns the browser's SpeechRecognition constructor, preferring the
 * un-prefixed version when available. Null in jsdom / Firefox / IE.
 */
export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Fold a SpeechRecognitionEvent into accumulated text. Final chunks
 * appear in `finalText` (space-joined); interim chunks overwrite
 * `interimText`.
 */
export function accumulateSpeechResults(
  prev: { finalText: string; interimText: string },
  event: SpeechRecognitionEvent,
): { finalText: string; interimText: string } {
  let finalText = prev.finalText;
  let interimText = '';
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i];
    if (!result || result.length === 0) continue;
    const transcript = result[0]?.transcript ?? '';
    if (result.isFinal) {
      finalText = joinFinal(finalText, transcript);
    } else {
      interimText += transcript;
    }
  }
  return { finalText, interimText };
}

function joinFinal(prev: string, chunk: string): string {
  const trimmed = chunk.trim();
  if (!trimmed) return prev;
  if (!prev) return trimmed;
  return `${prev} ${trimmed}`;
}

/** Trivial today; isolated for step 12's locale switch. */
export function speechRecognitionLang(locale: SpeechLocale): string {
  return locale;
}

// ---------- Hook ----------

const initialState: SpeechState = {
  supported: true, // overridden on mount if the constructor is missing
  status: 'idle',
  finalText: '',
  interimText: '',
  error: null,
};

export function useSpeechRecognition(): UseSpeechRecognition {
  const [state, setState] = useState<SpeechState>(() => ({
    ...initialState,
    supported: getSpeechRecognitionConstructor() !== null,
  }));

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const userStoppedRef = useRef<boolean>(true);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localeRef = useRef<SpeechLocale>('en-US');

  const clearRestartTimer = useCallback(() => {
    if (restartTimeoutRef.current !== null) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  const createRecognition = useCallback((): SpeechRecognition | null => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) return null;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechRecognitionLang(localeRef.current);

    recognition.onresult = (ev) => {
      setState((s) => {
        const next = accumulateSpeechResults(
          { finalText: s.finalText, interimText: s.interimText },
          ev,
        );
        return { ...s, finalText: next.finalText, interimText: next.interimText };
      });
    };

    recognition.onerror = (ev) => {
      // 'no-speech' and 'aborted' are expected lifecycle events — ignore.
      if (ev.error === 'no-speech' || ev.error === 'aborted') return;
      setState((s) => ({ ...s, status: 'error', error: ev.error || 'unknown' }));
    };

    recognition.onend = () => {
      if (userStoppedRef.current) {
        setState((s) =>
          s.status === 'error' ? s : { ...s, status: 'idle' },
        );
        return;
      }
      // Auto-restart after a brief delay to avoid "already started" races.
      clearRestartTimer();
      restartTimeoutRef.current = setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch {
          // Treat a failed restart as idle; the user can tap Start again.
          setState((s) => ({ ...s, status: 'idle' }));
        }
      }, AUTO_RESTART_DELAY_MS);
    };

    return recognition;
  }, [clearRestartTimer]);

  const start = useCallback(
    (locale: SpeechLocale) => {
      localeRef.current = locale;
      if (!state.supported) return;

      // Fresh instance per start → simpler lifecycle than reusing.
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      clearRestartTimer();

      const recognition = createRecognition();
      if (!recognition) {
        setState((s) => ({ ...s, supported: false }));
        return;
      }
      recognitionRef.current = recognition;
      userStoppedRef.current = false;
      setState((s) => ({
        ...s,
        status: 'listening',
        error: null,
        interimText: '',
        // keep finalText — caller decides when to reset
      }));
      try {
        recognition.start();
      } catch {
        // If start throws (already started etc.) just surface idle.
        setState((s) => ({ ...s, status: 'idle' }));
      }
    },
    [state.supported, createRecognition, clearRestartTimer],
  );

  const stop = useCallback(() => {
    userStoppedRef.current = true;
    clearRestartTimer();
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setState((s) => (s.status === 'listening' ? { ...s, status: 'idle' } : s));
  }, [clearRestartTimer]);

  const reset = useCallback(() => {
    setState((s) => ({ ...s, finalText: '', interimText: '', error: null }));
  }, []);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      userStoppedRef.current = true;
      clearRestartTimer();
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [clearRestartTimer]);

  return { state, start, stop, reset };
}
