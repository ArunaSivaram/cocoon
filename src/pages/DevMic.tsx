/**
 * /dev/mic — hidden test harness for the two recording hooks.
 *
 * Public route (no auth) so Aruna can hit it directly on her phone over
 * the Vercel preview. This page is NOT part of the user journey; the real
 * recording UI lives on Home (step 7).
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  formatElapsed,
  useAudioRecorder,
  type RecorderError,
} from '@/hooks/useAudioRecorder';
import {
  useSpeechRecognition,
  type SpeechLocale,
} from '@/hooks/useSpeechRecognition';

const PERMISSION_MESSAGES: Record<RecorderError, string> = {
  permission_denied:
    'Microphone access is blocked. On iPhone: Settings → Safari → Microphone. On Chrome: click the lock icon in the address bar → Site settings.',
  no_recorder_support: 'Your browser does not support audio recording in a way Cocoon can use.',
  unknown: 'Something went wrong starting the recording. Try again?',
};

export function DevMic() {
  const recorder = useAudioRecorder();
  const speech = useSpeechRecognition();
  const [locale, setLocale] = useState<SpeechLocale>('en-US');

  async function handleStart() {
    speech.reset();
    speech.start(locale);
    await recorder.start();
  }

  function handleStop() {
    recorder.stop();
    speech.stop();
  }

  async function handleClear() {
    speech.stop();
    speech.reset();
    await recorder.clear();
  }

  const r = recorder.state;
  const s = speech.state;
  const canStart = r.status === 'idle' || r.status === 'saved' || r.status === 'error';
  const canStop = r.status === 'recording' || r.status === 'stopping';

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <p className="label-eyebrow">DEV · /DEV/MIC</p>
        <h1 className="font-serif text-2xl md:text-3xl">Recording hook test harness</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Hidden page for testing <code>useAudioRecorder</code> and{' '}
          <code>useSpeechRecognition</code> on real devices. The real mic card is built in
          step 7.
        </p>
      </header>

      <section className="card-soft space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleStart} disabled={!canStart || recorder.isHydrating}>
            Start
          </Button>
          <Button type="button" variant="outline" onClick={handleStop} disabled={!canStop}>
            Stop
          </Button>
          <Button type="button" variant="ghost" onClick={handleClear}>
            Clear
          </Button>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <label htmlFor="locale" className="text-ink-soft">
              Locale
            </label>
            <select
              id="locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value as SpeechLocale)}
              className="rounded-md border border-rule bg-card px-2 py-1 text-sm"
            >
              <option value="en-US">en-US</option>
              <option value="en-GB">en-GB</option>
            </select>
          </div>
        </div>

        {r.error && (
          <p className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
            {PERMISSION_MESSAGES[r.error]}
          </p>
        )}

        {r.warning && r.status === 'recording' && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            30 seconds left.
          </p>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <StateRow label="recorder.status" value={r.status} />
          <StateRow label="recorder.elapsed" value={formatElapsed(r.elapsedMs)} />
          <StateRow label="recorder.mime" value={r.mimeType ?? '—'} />
          <StateRow label="recorder.warning" value={String(r.warning)} />
          <StateRow label="recorder.blob" value={r.blob ? `${r.blob.size} bytes` : '—'} />
          <StateRow label="recorder.recordedAt" value={r.recordedAt ?? '—'} />
          <StateRow label="speech.supported" value={String(s.supported)} />
          <StateRow label="speech.status" value={s.status} />
          <StateRow label="speech.error" value={s.error ?? '—'} />
          <StateRow label="speech.locale" value={locale} />
        </dl>
      </section>

      <section className="card-soft mt-6 space-y-2 p-5">
        <p className="label-eyebrow">Live words</p>
        {s.supported ? (
          <p className="min-h-[3rem] rounded-md bg-paper p-3 font-serif text-base leading-relaxed">
            {s.finalText}
            {s.interimText && (
              <span className="text-ink-soft">
                {' '}
                <em>{s.interimText}</em>
              </span>
            )}
            {s.status === 'listening' && (
              <span
                aria-hidden
                className="ml-1 inline-block w-[2px] bg-ink align-[-0.1em] [animation-duration:1s] motion-safe:animate-pulse"
                style={{ height: '1em' }}
              />
            )}
            {!s.finalText && !s.interimText && (
              <span className="text-ink-soft">(nothing yet — start speaking)</span>
            )}
          </p>
        ) : (
          <p className="rounded-md bg-paper p-3 text-sm text-ink-soft">
            Your words will appear when you stop. (Live speech isn&apos;t available in this
            browser.)
          </p>
        )}
      </section>

      {r.blobUrl && (
        <section className="card-soft mt-6 space-y-2 p-5">
          <p className="label-eyebrow">Playback</p>
          <audio controls src={r.blobUrl} className="w-full" />
        </section>
      )}

      <p className="mt-10 text-center text-xs text-ink-soft">
        Hidden — dev only. Not part of the user journey.
      </p>
    </main>
  );
}

function StateRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-mono text-ink-soft">{label}</dt>
      <dd className="font-mono text-ink">{value}</dd>
    </>
  );
}
