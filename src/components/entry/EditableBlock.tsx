import { useEffect, useRef, type ReactNode } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UseInlineEdit } from '@/hooks/useInlineEdit';

export interface EditableBlockProps {
  edit: UseInlineEdit<string>;
  /** Pencil-link label when not editing. Default: "Edit". */
  editLabel?: string;
  /** Input instead of textarea. Default: false. */
  singleLine?: boolean;
  editorPlaceholder?: string;
  /** Class applied to the editor (e.g. `.ruled-lines` for the body). */
  editorClassName?: string;
  renderDisplay: () => ReactNode;
  /** Focus the editor automatically when startEditing fires. Default: true. */
  autoFocusOnEdit?: boolean;
  /** aria-label for the editor. */
  ariaLabel?: string;
}

const EDITOR_BASE =
  'w-full rounded-xl border border-rule/60 bg-paper p-3 font-serif text-base leading-8 text-ink focus:outline-none focus:ring-2 focus:ring-clay/40';

export function EditableBlock({
  edit,
  editLabel = 'Edit',
  singleLine = false,
  editorPlaceholder,
  editorClassName,
  renderDisplay,
  autoFocusOnEdit = true,
  ariaLabel,
}: EditableBlockProps) {
  const editorRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => {
    if (edit.isEditing && autoFocusOnEdit && editorRef.current) {
      editorRef.current.focus();
      // Move the caret to the end for a nicer edit start.
      if ('setSelectionRange' in editorRef.current) {
        const len = editorRef.current.value.length;
        try {
          editorRef.current.setSelectionRange(len, len);
        } catch {
          // Safari may throw on some input types; ignore.
        }
      }
    }
  }, [edit.isEditing, autoFocusOnEdit]);

  if (!edit.isEditing) {
    return (
      <div>
        {renderDisplay()}
        <div className="mt-3">
          <button
            type="button"
            onClick={edit.startEditing}
            className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-clay focus-visible:outline-none focus-visible:text-clay"
          >
            <Pencil aria-hidden className="size-3.5" />
            {editLabel}
          </button>
        </div>
      </div>
    );
  }

  const editorClasses = [EDITOR_BASE, editorClassName ?? ''].filter(Boolean).join(' ');

  return (
    <div>
      {singleLine ? (
        <input
          ref={(el) => {
            editorRef.current = el;
          }}
          value={edit.draft}
          onChange={(e) => edit.setDraft(e.target.value)}
          placeholder={editorPlaceholder}
          aria-label={ariaLabel}
          className={editorClasses}
        />
      ) : (
        <textarea
          ref={(el) => {
            editorRef.current = el;
          }}
          value={edit.draft}
          onChange={(e) => edit.setDraft(e.target.value)}
          placeholder={editorPlaceholder}
          aria-label={ariaLabel}
          rows={6}
          className={`${editorClasses} min-h-[160px]`}
        />
      )}
      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={edit.cancel}
          disabled={edit.saving}
          className="gap-1.5"
        >
          <X aria-hidden className="size-4" /> Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void edit.save()}
          disabled={!edit.dirty || edit.saving}
          className="gap-1.5"
        >
          <Check aria-hidden className="size-4" />
          {edit.saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
