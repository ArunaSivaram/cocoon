import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useLockEntry } from '@/hooks/queries';
import { setSessionPasscode } from '@/lib/sessionPasscodes';
import { DialogShell } from './dialogShell';

interface LockDialogProps {
  open: boolean;
  entryId: string;
  onClose: () => void;
  /** Fires after the server confirms the lock succeeded. */
  onLocked: () => void;
}

/** 4–8 digits per SPEC §2.5 / mock db validator. */
const PASSCODE_RE = /^\d{4,8}$/;

export function LockDialog({ open, entryId, onClose, onLocked }: LockDialogProps) {
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [error, setError] = useState<string | null>(null);
  const firstId = useId();
  const secondId = useId();
  const titleId = useId();
  const lock = useLockEntry(entryId);

  function reset() {
    setFirst('');
    setSecond('');
    setError(null);
  }

  function handleClose() {
    if (lock.isPending) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!PASSCODE_RE.test(first)) {
      setError('Use 4 to 8 digits.');
      return;
    }
    if (first !== second) {
      setError("Those don't match. Try again.");
      return;
    }
    setError(null);
    try {
      await lock.mutateAsync({ passcode: first });
      setSessionPasscode(entryId, first);
      toast.success('This page is now private.');
      reset();
      onLocked();
    } catch {
      setError("Couldn't lock this page. Try again.");
    }
  }

  return (
    <DialogShell
      open={open}
      onClose={handleClose}
      busy={lock.isPending}
      ariaLabelledBy={titleId}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="font-serif text-xl text-ink">
          Lock this page
        </h2>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="rounded-full p-1 text-ink-soft hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={lock.isPending}
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        If you forget it, this page can&apos;t be read again. You can still delete it.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor={firstId} className="text-xs font-medium text-ink-soft">
            New passcode
          </label>
          <input
            id={firstId}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="new-password"
            maxLength={8}
            value={first}
            onChange={(e) => setFirst(e.target.value.replace(/\D/g, ''))}
            className="mt-1 h-11 w-full rounded-lg border border-rule bg-paper px-3 font-mono text-lg tracking-widest text-ink outline-none focus:border-clay focus:ring-2 focus:ring-clay/30"
          />
        </div>
        <div>
          <label htmlFor={secondId} className="text-xs font-medium text-ink-soft">
            Type it again
          </label>
          <input
            id={secondId}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="new-password"
            maxLength={8}
            value={second}
            onChange={(e) => setSecond(e.target.value.replace(/\D/g, ''))}
            className="mt-1 h-11 w-full rounded-lg border border-rule bg-paper px-3 font-mono text-lg tracking-widest text-ink outline-none focus:border-clay focus:ring-2 focus:ring-clay/30"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-[color:var(--color-recording)]">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={lock.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={lock.isPending || !first || !second}>
            {lock.isPending ? 'Locking…' : 'Lock'}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
