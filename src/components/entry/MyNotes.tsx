import { PencilLine, Plus } from 'lucide-react';
import { EditableBlock } from './EditableBlock';
import { useInlineEdit } from '@/hooks/useInlineEdit';
import { useUpdateEntry } from '@/hooks/queries';
import type { Entry } from '@/lib/types';

export function MyNotes({ entry }: { entry: Entry }) {
  const update = useUpdateEntry(entry.id);
  const edit = useInlineEdit<string>({
    initial: entry.notes,
    onSave: async (next) => {
      await update.mutateAsync({ notes: next });
    },
  });

  const hasNotes = entry.notes.trim().length > 0;

  return (
    <section className="mt-6 md:mt-8">
      <div className="flex items-center gap-2">
        <PencilLine aria-hidden className="size-4 text-clay" />
        <p className="label-eyebrow">My notes</p>
      </div>

      {edit.isEditing ? (
        <div className="mt-3">
          <EditableBlock
            edit={edit}
            ariaLabel="My notes"
            editorPlaceholder="Your own reflections and bullet points…"
            renderDisplay={() => null /* unused — we only use the edit path */}
          />
        </div>
      ) : hasNotes ? (
        <div className="mt-3">
          <p className="whitespace-pre-wrap font-serif text-[1.0625rem] leading-8 text-ink">
            {entry.notes}
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={edit.startEditing}
              className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-clay focus-visible:outline-none focus-visible:text-clay"
            >
              <PencilLine aria-hidden className="size-3.5" />
              Edit my notes
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p className="font-serif italic text-ink-soft">
            Your own reflections and bullet points will live here.
          </p>
          <button
            type="button"
            onClick={edit.startEditing}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-clay hover:underline focus-visible:outline-none focus-visible:underline"
          >
            <Plus aria-hidden className="size-4" />
            Add my own thoughts
          </button>
        </div>
      )}
    </section>
  );
}
