import { useEffect, useRef, useState } from 'react';
import { Feather, Keyboard, Loader2, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  formatElapsed,
  useAudioRecorder,
  type RecorderStatus,
} from '@/hooks/useAudioRecorder';
import { useSavePipeline } from '@/hooks/useSavePipeline';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

type MicStage =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'transcribing'
  | 'writing'
  | 'failed_write'
  | 'permission_denied';

interface MicCardProps {
  onSwitchToTyped: () => void;
}

export function MicCard({ onSwitchToTyped }: MicCardProps) {
  const recorder = useAudioRecorder();
  const speech = useSpeechRecognition();
  const pipeline = useSavePipeline();

  // Draft text shown in the failed-write editor. The pipeline owns the
  // "server-side" seed; a local override lets the user type without
  // losing their edits when the pipeline re-renders.
  const [userEdits, setUserEdits] = useState<string | null>(null);
  const draft = userEdits ?? pipeline.draftTranscript ?? '';

  // Kick the save pipeline exactly once when the recorder reaches
  // 'saved' with a blob. A ref keeps the "fired" flag out of the render
  // cycle; the guard at the top makes re-renders from unrelated deps
  // (speech ticks) cheap and harmless.
  const kickedRef = useRef(false);
  useEffect(() => {
    if (recorder.state.status !== 'saved' || !recorder.state.blob) return;
    if (kickedRef.current) return;
    kickedRef.current = true;
    void pipeline.saveVoice({
      blob: recorder.state.blob,
      mimeType: recorder.state.mimeType ?? 'audio/webm',
      liveTranscript: `${speech.state.finalText} ${speech.state.interimText}`.trim(),
    });
    // `pipeline` identity changes on every pipeline state update; we
    // only care about the recorder's transition, so we deliberately
    // exclude it from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    recorder.state.status,
    recorder.state.blob,
    recorder.state.mimeType,
    speech.state.finalText,
    speech.state.interimText,
  ]);

  const stage = deriveMicStage(recorder.state.status, recorder.state.error, pipeline.status);

  async function handleStart() {
    speech.reset();
    speech.start('en-US');
    kickedRef.current = false;
    setUserEdits(null);
    pipeline.reset();
    await recorder.start();
  }

  function handleStop() {
    recorder.stop();
    speech.stop();
  }

  async function handleRetry() {
    await pipeline.retryFromDraft(draft);
    setUserEdits(null);
  }

  async function handleDiscardAndNew() {
    kickedRef.current = false;
    setUserEdits(null);
    pipeline.reset();
    await recorder.clear();
    speech.reset();
  }

  return (
    <section className="paper-sheet p-6 md:p-8">
      {stage === 'idle' && <IdleView onStart={handleStart} onSwitchToTyped={onSwitchToTyped} />}
      {stage === 'requesting' && <RequestingView />}
      {stage === 'recording' && (
        <RecordingView
          elapsedMs={recorder.state.elapsedMs}
          warning={recorder.state.warning}
          speechSupported={speech.state.supported}
          finalText={speech.state.finalText}
          interimText={speech.state.interimText}
          listening={speech.state.status === 'listening'}
          onStop={handleStop}
        />
      )}
      {stage === 'transcribing' && <WritingView phase="transcribing" />}
      {stage === 'writing' && <WritingView phase="writing" />}
      {stage === 'permission_denied' && (
        <PermissionDeniedView
          onSwitchToTyped={onSwitchToTyped}
          onRetry={async () => {
            await recorder.clear();
            await handleStart();
          }}
        />
      )}
      {stage === 'failed_write' && (
        <FailedWriteView
          draft={draft}
          errorMessage={pipeline.errorMessage}
          onDraftChange={setUserEdits}
          onRetry={handleRetry}
          onDiscard={handleDiscardAndNew}
          busy={pipeline.status === 'writing'}
        />
      )}
    </section>
  );
}

function deriveMicStage(
  recorderStatus: RecorderStatus,
  recorderError: ReturnType<typeof useAudioRecorder>['state']['error'],
  pipelineStatus: ReturnType<typeof useSavePipeline>['status'],
): MicStage {
  if (pipelineStatus === 'failed_write') return 'failed_write';
  if (pipelineStatus === 'transcribing') return 'transcribing';
  if (pipelineStatus === 'writing') return 'writing';
  if (recorderError === 'permission_denied') return 'permission_denied';
  if (recorderStatus === 'requesting') return 'requesting';
  if (recorderStatus === 'recording' || recorderStatus === 'stopping') return 'recording';
  return 'idle';
}

// ---------- Views ----------

function IdleView({
  onStart,
  onSwitchToTyped,
}: {
  onStart: () => void;
  onSwitchToTyped: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <button
        type="button"
        onClick={onStart}
        aria-label="Start recording"
        className="group relative flex size-[132px] items-center justify-center rounded-full bg-gradient-to-b from-clay-light to-clay-dark text-white shadow-[var(--shadow-lift)] transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-clay/30 motion-safe:group-hover:scale-105"
      >
        <Mic className="size-10" aria-hidden />
      </button>
      <h2 className="mt-6 font-serif text-[1.5rem] leading-snug md:text-[1.75rem]">
        Tap and tell me about your day.
      </h2>
      <p className="mt-2 max-w-xs text-sm text-ink-soft">
        Speak freely. I&apos;ll write it the way you&apos;d write it.
      </p>
      <button
        type="button"
        onClick={onSwitchToTyped}
        className="mt-5 inline-flex items-center gap-1.5 text-sm text-clay underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
      >
        <Keyboard className="size-4" aria-hidden />
        Rather type it?
      </button>
    </div>
  );
}

function RequestingView() {
  return (
    <div className="flex flex-col items-center py-8 text-center text-ink-soft">
      <Loader2 className="size-6 animate-spin text-clay" aria-hidden />
      <p className="mt-3 text-sm">Asking for mic permission…</p>
    </div>
  );
}

function RecordingView({
  elapsedMs,
  warning,
  speechSupported,
  finalText,
  interimText,
  listening,
  onStop,
}: {
  elapsedMs: number;
  warning: boolean;
  speechSupported: boolean;
  finalText: string;
  interimText: string;
  listening: boolean;
  onStop: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {warning && (
        <p className="mb-4 w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          30 seconds left.
        </p>
      )}
      <div className="relative flex size-[132px] items-center justify-center">
        <span
          aria-hidden
          className="cocoon-breath-ring motion-safe:block"
          style={{ width: 132, height: 132, marginTop: -66, marginLeft: -66 }}
        />
        <span
          aria-hidden
          className="cocoon-breath-ring motion-safe:block"
          style={{
            width: 132,
            height: 132,
            marginTop: -66,
            marginLeft: -66,
            animationDelay: '1.2s',
          }}
        />
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop recording"
          className="relative flex size-[132px] items-center justify-center rounded-full bg-[var(--color-recording)] text-white shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--color-recording)]/30"
        >
          <Square className="size-10 fill-white" aria-hidden />
        </button>
      </div>
      <h2 className="mt-6 font-serif text-[1.5rem] leading-snug md:text-[1.75rem]">
        I&apos;m listening… tap again when you&apos;re done.
      </h2>
      <p className="mt-1 font-mono text-sm tabular-nums text-ink-soft">
        {formatElapsed(elapsedMs)}
      </p>
      <div
        className="ruled-lines mt-5 min-h-[140px] w-full rounded-xl bg-paper p-4 text-left font-serif text-base leading-8 text-ink"
        aria-live="polite"
      >
        {speechSupported ? (
          <>
            {finalText}
            {interimText && (
              <span className="text-ink-soft">
                {' '}
                <em>{interimText}</em>
              </span>
            )}
            {!finalText && !interimText && (
              <span className="text-ink-soft">(start speaking…)</span>
            )}
            {listening && <span aria-hidden className="cocoon-caret motion-safe:inline-block" />}
          </>
        ) : (
          <span className="text-ink-soft">Your words will appear when you stop.</span>
        )}
      </div>
    </div>
  );
}

function WritingView({ phase }: { phase: 'transcribing' | 'writing' }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="flex size-24 items-center justify-center rounded-full bg-parchment">
        <Feather className="cocoon-glide motion-safe:inline-block size-8 text-clay" aria-hidden />
      </div>
      <h2 className="mt-5 font-serif text-[1.375rem] md:text-[1.5rem]">
        {phase === 'transcribing' ? (
          <>
            Listening back carefully<Dots />
          </>
        ) : (
          <>
            Writing your entry<Dots />
          </>
        )}
      </h2>
      {phase === 'writing' && (
        <p className="mt-2 max-w-sm text-sm text-ink-soft">
          Keeping your words, your feelings, your voice.
        </p>
      )}
    </div>
  );
}

function Dots() {
  return (
    <span className="ml-1 inline-flex items-end gap-1 align-baseline">
      <span className="cocoon-dot motion-safe:inline-block" style={{ animationDelay: '0ms' }} />
      <span className="cocoon-dot motion-safe:inline-block" style={{ animationDelay: '150ms' }} />
      <span className="cocoon-dot motion-safe:inline-block" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

function PermissionDeniedView({
  onSwitchToTyped,
  onRetry,
}: {
  onSwitchToTyped: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 text-sm text-ink">
      <h2 className="font-serif text-[1.375rem] text-ink">Microphone is blocked.</h2>
      <p className="text-ink-soft">
        Cocoon can&apos;t hear you until you allow the microphone. On iPhone: Settings →
        Safari → Microphone. On Chrome: tap the lock icon in the address bar → Site
        settings → Microphone → Allow. Then come back and try again.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" onClick={onRetry}>
          Try the microphone again
        </Button>
        <Button type="button" variant="outline" onClick={onSwitchToTyped}>
          <Keyboard className="size-4" aria-hidden /> Rather type it?
        </Button>
      </div>
    </div>
  );
}

function FailedWriteView({
  draft,
  errorMessage,
  onDraftChange,
  onRetry,
  onDiscard,
  busy,
}: {
  draft: string;
  errorMessage: string | null;
  onDraftChange: (value: string) => void;
  onRetry: () => void;
  onDiscard: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-[1.375rem] text-ink">Your words are safe.</h2>
      <p className="text-sm text-ink-soft">
        {errorMessage ?? "The AI couldn't finish writing. Your words are saved."}
      </p>
      <textarea
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        className="ruled-lines min-h-[180px] w-full rounded-xl bg-paper p-4 font-serif text-base leading-8 text-ink focus:outline-none focus:ring-2 focus:ring-clay/40"
        aria-label="Your words — edit before trying again"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onRetry} disabled={busy || !draft.trim()}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Writing…
            </>
          ) : (
            'Try again'
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={onDiscard} disabled={busy}>
          Discard and start over
        </Button>
      </div>
    </div>
  );
}
