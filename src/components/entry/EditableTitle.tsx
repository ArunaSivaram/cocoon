import { EditableBlock } from './EditableBlock';
import { useInlineEdit } from '@/hooks/useInlineEdit';
import { useUpdateEntry } from '@/hooks/queries';
import type { Entry } from '@/lib/types';

export function EditableTitle({ entry }: { entry: Entry }) {
  const update = useUpdateEntry(entry.id);
  const edit = useInlineEdit<string>({
    initial: entry.title,
    onSave: async (next) => {
      await update.mutateAsync({ title: next });
    },
  });

  return (
    <div className="mt-4 md:mt-5">
      <EditableBlock
        edit={edit}
        singleLine
        editLabel="Edit title"
        ariaLabel="Entry title"
        renderDisplay={() => (
          <h1 className="font-serif text-[1.75rem] leading-[1.15] text-ink md:text-[2.25rem]">
            {entry.title}
          </h1>
        )}
      />
    </div>
  );
}
