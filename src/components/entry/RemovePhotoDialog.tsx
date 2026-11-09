import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';

interface RemovePhotoDialogProps {
  open: boolean;
  busy: boolean;
  onKeep: () => void;
  onRemove: () => void;
}

/**
 * Small confirm dialog shown before deleting a photo (SPEC §2.4 "× removes
 * after a confirm"). Esc and backdrop click = Keep. Remove button stays
 * disabled with a label change while the mutation runs so the user can't
 * fire it twice.
 */
export function RemovePhotoDialog({ open, busy, onKeep, onRemove }: RemovePhotoDialogProps) {
  const removeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    removeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault();
        onKeep();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, busy, onKeep]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-photo-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!busy) onKeep();
      }}
    >
      <div
        className="card-soft w-full max-w-sm px-6 py-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="remove-photo-title"
          className="font-serif text-xl text-ink"
        >
          Remove this photo?
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          You can always add another one.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button type="button" variant="ghost" onClick={onKeep} disabled={busy}>
            Keep
          </Button>
          <Button
            ref={removeRef}
            type="button"
            variant="destructive"
            onClick={onRemove}
            disabled={busy}
          >
            {busy ? 'Removing…' : 'Remove'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
