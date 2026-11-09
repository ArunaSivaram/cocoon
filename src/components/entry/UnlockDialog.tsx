import { useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOpenEntry } from '@/hooks/queries';
import { isApiError } from '@/lib/api';
import { setSessionPasscode } from '@/lib/sessionPasscodes';
import { DialogShell } from './dialogShell';

interface UnlockDialogProps {
  open: boolean;
  entryId: string;
  onClose: () => void;
  /** Fires after a successful unlock, with the passcode already stored. */
  onUnlocked: () => void;
}

/**
 * Prompts for the entry's passcode, calls POST /api/entries/:id/open, and —
 * on success — stashes the passcode in the session store so section edits
 * and photo mutations can include it (SPEC §2.5 "visit only").
 *
 * Wrong passcode → shake + inline error.
 * 5 wrong tries in 15 minutes (server returns `rate_limited`) → dialog
 * switches to the "Too many tries" state with no input, just Close.
 */
export function UnlockDialog({ open, entryId, onClose, onUnlocked }: UnlockDialogProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const titleId = useId();
  const open_ = useOpenEntry(entryId);

  function reset() {
    setPasscode('');
    setError(null);
    setRateLimited(false);
  }

  function handleClose() {
    if (open_.isPending) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode) return;
    setError(null);
    try {
      await open_.mutateAsync({ passcode });
      setSessionPasscode(entryId, passcode);
      reset();
      onUnlocked();
    } catch (err) {
      if (isApiError(err, 'rate_limited')) {
        setRateLimited(true);
        setPasscode('');
      } else if (isApiError(err, 'wrong_passcode')) {
        setError("That passcode isn't right.");
        setShakeKey((k) => k + 1);
        setPasscode('');
        // Return focus so the user can retype without an extra tap.
        setTimeout(() => inputRef.current?.focus(), 0);
      } else {
        setError("Couldn't open this page. Try again.");
      }
    }
  }

  return (
    <DialogShell
      open={open}
      onClose={handleClose}
      busy={open_.isPending}
      ariaLabelledBy={titleId}
      panelClassName="card-soft w-full max-w-sm px-6 py-5"
    >
      <div
        key={shakeKey}
        className={error && !rateLimited ? 'cocoon-shake' : undefined}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-serif text-xl text-ink">
            {rateLimited ? 'Too many tries' : 'Unlock entry'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="rounded-full p-1 text-ink-soft hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={open_.isPending}
          >
            <X className="size-4" />
          </button>
        </div>

        {rateLimited ? (
          <>
            <p className="mt-3 text-sm text-ink-soft">
              Too many tries. Please wait 15 minutes and try again.
            </p>
            <div className="mt-5 flex justify-end">
              <Button type="button" onClick={handleClose}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <label htmlFor={inputId} className="text-sm text-ink-soft">
              Enter the passcode you set for this page.
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={8}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value.replace(/\D/g, ''));
                if (error) setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-err` : undefined}
              className="h-12 w-full rounded-lg border-2 border-clay/40 bg-paper px-3 text-center font-mono text-xl tracking-[0.5em] text-ink outline-none focus:border-clay"
            />
            {error && (
              <p id={`${inputId}-err`} role="alert" className="text-sm text-[color:var(--color-recording)]">
                {error}
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={open_.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={open_.isPending || !passcode}>
                {open_.isPending ? 'Unlocking…' : 'Unlock'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </DialogShell>
  );
}
