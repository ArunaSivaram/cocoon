import { useId } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useRemoveLock } from '@/hooks/queries';
import { clearSessionPasscode, useSessionPasscode } from '@/lib/sessionPasscodes';
import { DialogShell } from './dialogShell';

interface RemoveLockConfirmProps {
  open: boolean;
  entryId: string;
  onClose: () => void;
  onRemoved: () => void;
}

/**
 * Confirm removing a lock when the entry is already unlocked for this visit
 * — we reuse the stored passcode so the user doesn't have to retype it.
 */
export function RemoveLockConfirm({
  open,
  entryId,
  onClose,
  onRemoved,
}: RemoveLockConfirmProps) {
  const sessionPasscode = useSessionPasscode(entryId);
  const remove = useRemoveLock(entryId);
  const titleId = useId();

  async function handleRemove() {
    if (!sessionPasscode) {
      // Shouldn't happen — the parent only shows this when unlocked. Fail
      // loudly rather than silently closing.
      toast.error('Please unlock this page first.');
      onClose();
      return;
    }
    try {
      await remove.mutateAsync({ passcode: sessionPasscode });
      clearSessionPasscode(entryId);
      toast.success('Lock removed. This page is no longer private.');
      onRemoved();
    } catch {
      toast.error("Couldn't remove the lock. Try again.");
    }
  }

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      busy={remove.isPending}
      ariaLabelledBy={titleId}
    >
      <h2 id={titleId} className="font-serif text-xl text-ink">
        Remove the lock on this page?
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        This page will no longer be private. You can lock it again later.
      </p>
      <div className="mt-5 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={remove.isPending}>
          Keep locked
        </Button>
        <Button type="button" onClick={handleRemove} disabled={remove.isPending}>
          {remove.isPending ? 'Removing…' : 'Remove lock'}
        </Button>
      </div>
    </DialogShell>
  );
}
