import { useState } from 'react';
import { Keyboard, Loader2, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSavePipeline } from '@/hooks/useSavePipeline';

interface TypeCardProps {
  onSwitchToVoice: () => void;
}

export function TypeCard({ onSwitchToVoice }: TypeCardProps) {
  const [text, setText] = useState('');
  const pipeline = useSavePipeline();

  const isWriting = pipeline.status === 'writing';

  async function handleWrite() {
    await pipeline.saveTyped(text);
    // On failure, pipeline.status flips to 'failed_write' and we show the
    // editable retry UI below.
  }

  if (pipeline.status === 'failed_write') {
    return (
      <section className="paper-sheet p-6 md:p-8">
        <h2 className="font-serif text-[1.375rem] text-ink">Your words are safe.</h2>
        <p className="mt-2 text-sm text-ink-soft">
          {pipeline.errorMessage ?? "The AI couldn't finish writing. Your words are saved."}
        </p>
        <textarea
          value={pipeline.draftTranscript ?? text}
          onChange={(e) => setText(e.target.value)}
          className="ruled-lines mt-4 min-h-[180px] w-full rounded-xl bg-paper p-4 font-serif text-base leading-8 text-ink focus:outline-none focus:ring-2 focus:ring-clay/40"
        />
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            onClick={() => pipeline.retryFromDraft(text || pipeline.draftTranscript || '')}
            disabled={isWriting}
          >
            Try again
          </Button>
          <Button type="button" variant="ghost" onClick={pipeline.reset}>
            Start over
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="paper-sheet p-6 md:p-8">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-serif text-[1.5rem] leading-snug md:text-[1.75rem]">
          Write a few lines about today.
        </h2>
        <button
          type="button"
          onClick={onSwitchToVoice}
          className="inline-flex items-center gap-1.5 text-sm text-clay underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
        >
          <Mic className="size-4" aria-hidden /> Back to voice
        </button>
      </div>

      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What did today feel like?"
        disabled={isWriting}
        className="ruled-lines mt-5 min-h-[200px] w-full rounded-xl bg-paper p-4 font-serif text-base leading-8 text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-clay/40 disabled:opacity-60"
      />

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-xs text-ink-soft">{text.trim().length} characters</span>
        <Button type="button" onClick={handleWrite} disabled={isWriting || !text.trim()}>
          {isWriting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Writing your entry…
            </>
          ) : (
            <>
              <Keyboard className="size-4" aria-hidden /> Write my entry
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
