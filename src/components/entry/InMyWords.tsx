import { useState } from 'react';
import { EditableBlock } from './EditableBlock';
import { useInlineEdit } from '@/hooks/useInlineEdit';
import { useUpdateEntry } from '@/hooks/queries';
import type { Entry } from '@/lib/types';

export function InMyWords({ entry }: { entry: Entry }) {
  const update = useUpdateEntry(entry.id);
  const edit = useInlineEdit<string>({
    initial: entry.body,
    onSave: async (next) => {
      await update.mutateAsync({ body: next });
    },
  });
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <section className="mt-6 md:mt-8">
      <p className="label-eyebrow mb-2">In my words</p>
      <EditableBlock
        edit={edit}
        editLabel="Edit my words"
        editorClassName="ruled-lines bg-paper leading-8"
        ariaLabel="In my words — your words, lightly tidied"
        renderDisplay={() => (
          <p className="ruled-lines whitespace-pre-wrap rounded-md bg-paper/0 font-serif text-[1.0625rem] leading-8 text-ink">
            {entry.body}
          </p>
        )}
      />

      <div className="mt-3 border-t border-rule/50 pt-3">
        <button
          type="button"
          onClick={() => setShowTranscript((v) => !v)}
          aria-expanded={showTranscript}
          className="text-xs text-ink-soft hover:text-clay focus-visible:outline-none focus-visible:text-clay"
        >
          {showTranscript ? 'Hide original transcript' : 'See original transcript'}
        </button>
        {showTranscript && (
          <p className="mt-2 rounded-lg bg-parchment/60 p-3 font-mono text-xs leading-6 text-ink-soft">
            {entry.transcript_raw || '(no transcript stored)'}
          </p>
        )}
      </div>
    </section>
  );
}
