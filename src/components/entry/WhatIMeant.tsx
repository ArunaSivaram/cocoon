import { Quote, Sparkles } from 'lucide-react';
import { EditableBlock } from './EditableBlock';
import { useInlineEdit } from '@/hooks/useInlineEdit';
import { useUpdateEntry } from '@/hooks/queries';
import type { Entry } from '@/lib/types';

export function WhatIMeant({ entry }: { entry: Entry }) {
  const update = useUpdateEntry(entry.id);
  const interpretationEdit = useInlineEdit<string>({
    initial: entry.interpretation,
    onSave: async (next) => {
      await update.mutateAsync({ interpretation: next });
    },
  });
  const reflectionEdit = useInlineEdit<string>({
    initial: entry.reflection,
    onSave: async (next) => {
      await update.mutateAsync({ reflection: next });
    },
  });

  return (
    <section
      className="mt-6 rounded-[var(--radius-card)] p-5 md:mt-8 md:p-6"
      style={{
        backgroundColor: 'var(--color-parchment)',
        border: '1px solid color-mix(in srgb, var(--color-rule) 70%, transparent)',
      }}
    >
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden className="size-4 text-clay" />
        <p className="label-eyebrow">What I meant</p>
      </div>
      <div className="mt-3">
        <EditableBlock
          edit={interpretationEdit}
          ariaLabel="What I meant — interpretation"
          renderDisplay={() => (
            <p className="whitespace-pre-wrap font-serif text-[1.0625rem] leading-8 text-ink">
              {entry.interpretation}
            </p>
          )}
        />
      </div>

      <hr
        aria-hidden
        className="my-5 border-0 border-t border-rule/60"
      />

      <div className="flex items-center gap-2">
        <Quote aria-hidden className="size-4 text-clay" />
        <p className="label-eyebrow">Key reflection</p>
      </div>
      <div className="mt-3">
        <EditableBlock
          edit={reflectionEdit}
          ariaLabel="Key reflection"
          renderDisplay={() => (
            <p className="font-serif italic text-[1.0625rem] leading-8 text-ink">
              {entry.reflection}
            </p>
          )}
        />
      </div>
    </section>
  );
}
