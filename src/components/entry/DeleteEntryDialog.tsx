import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useDeleteEntry } from '@/hooks/queries';
import { isApiError } from '@/lib/api';
import { getRecentSignInAt, isSignInRecent, signOut } from '@/lib/auth';
import { clearSessionPasscode, useSessionPasscode } from '@/lib/sessionPasscodes';
import { DialogShell } from './dialogShell';

interface DeleteEntryDialogProps {
  open: boolean;
  entryId: string;
  isLocked: boolean;
  onClose: () => void;
}

type ForgotPhase = 'hidden' | 'confirm' | 'signin-required';

/**
 * Three visual modes rolled into one component:
 *  1. Unlocked entry → warm Keep / Delete confirm.
 *  2. Locked entry (no session passcode) → passcode field + "Forgot passcode?" link.
 *  3. Forgot flow → "Type DELETE to confirm" + recent-sign-in gate.
 *
 * On success we navigate back to Home and show a toast — the step-4
 * useDeleteEntry hook handles cache eviction and list invalidation.
 */
export function DeleteEntryDialog({ open, entryId, isLocked, onClose }: DeleteEntryDialogProps) {
  const navigate = useNavigate();
  const sessionPasscode = useSessionPasscode(entryId);
  const del = useDeleteEntry(entryId);
  const titleId = useId();

  // For the locked passcode path.
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // For the forgot path.
  const [forgot, setForgot] = useState<ForgotPhase>('hidden');
  const [confirmText, setConfirmText] = useState('');

  function reset() {
    setPasscode('');
    setPasscodeError(null);
    setForgot('hidden');
    setConfirmText('');
  }

  function handleClose() {
    if (del.isPending) return;
    reset();
    onClose();
  }

  async function doDelete(body: Parameters<typeof del.mutateAsync>[0]) {
    try {
      await del.mutateAsync(body);
      clearSessionPasscode(entryId);
      toast.success('Page deleted.');
      reset();
      onClose();
      navigate('/', { replace: true });
    } catch (err) {
      if (isApiError(err, 'wrong_passcode')) {
        setPasscodeError("That passcode isn't right.");
        setPasscode('');
      } else if (isApiError(err, 'unauthorized')) {
        setForgot('signin-required');
      } else {
        toast.error("Couldn't delete this page. Try again.");
      }
    }
  }

  async function handleUnlockedDelete() {
    await doDelete({ passcode: undefined });
  }

  async function handlePasscodeDelete(e: React.FormEvent) {
    e.preventDefault();
    const effective = sessionPasscode ?? passcode;
    if (!effective) return;
    setPasscodeError(null);
    await doDelete({ passcode: effective });
  }

  async function handleForgotDelete(e: React.FormEvent) {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== 'DELETE') return;
    if (!isSignInRecent()) {
      setForgot('signin-required');
      return;
    }
    const signedInAt = getRecentSignInAt();
    await doDelete({
      forgot: true,
      signed_in_at: signedInAt ? new Date(signedInAt).toISOString() : '',
    });
  }

  function handleSignInAgain() {
    signOut();
    navigate('/signin', { replace: true });
  }

  const unlockedMode = !isLocked || sessionPasscode !== undefined;

  // ---- Render ----

  return (
    <DialogShell
      open={open}
      onClose={handleClose}
      busy={del.isPending}
      ariaLabelledBy={titleId}
    >
      {unlockedMode && forgot === 'hidden' && (
        <>
          <h2 id={titleId} className="font-serif text-xl text-ink">
            Delete this page?
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Once it&apos;s gone, you can&apos;t get it back.
          </p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={del.isPending}>
              Keep
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (sessionPasscode) {
                  void doDelete({ passcode: sessionPasscode });
                } else {
                  void handleUnlockedDelete();
                }
              }}
              disabled={del.isPending}
            >
              {del.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </>
      )}

      {!unlockedMode && forgot === 'hidden' && (
        <>
          <h2 id={titleId} className="font-serif text-xl text-ink">
            Delete this private page?
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Enter your passcode to delete it, or confirm without one if you&apos;ve forgotten.
          </p>
          <form onSubmit={handlePasscodeDelete} className="mt-4 space-y-3">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={8}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value.replace(/\D/g, ''));
                if (passcodeError) setPasscodeError(null);
              }}
              placeholder="Passcode"
              className="h-12 w-full rounded-lg border-2 border-clay/40 bg-paper px-3 text-center font-mono text-xl tracking-[0.5em] text-ink outline-none focus:border-clay"
            />
            {passcodeError && (
              <p role="alert" className="text-sm text-[color:var(--color-recording)]">
                {passcodeError}
              </p>
            )}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setForgot('confirm')}
                className="text-sm text-clay underline-offset-2 hover:underline"
              >
                Forgot passcode?
              </button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={del.isPending}
                >
                  Keep
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={del.isPending || !passcode}
                >
                  {del.isPending ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </div>
          </form>
        </>
      )}

      {forgot === 'confirm' && (
        <>
          <h2 id={titleId} className="font-serif text-xl text-ink">
            Delete without the passcode?
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            This permanently removes the page. Type <strong className="font-semibold text-ink">DELETE</strong> to
            confirm.
          </p>
          <form onSubmit={handleForgotDelete} className="mt-4 space-y-3">
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              autoCapitalize="characters"
              autoComplete="off"
              className="h-11 w-full rounded-lg border border-rule bg-paper px-3 font-mono text-base tracking-widest text-ink outline-none focus:border-clay focus:ring-2 focus:ring-clay/30"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setForgot('hidden')}
                disabled={del.isPending}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={del.isPending || confirmText.trim().toUpperCase() !== 'DELETE'}
              >
                {del.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </form>
        </>
      )}

      {forgot === 'signin-required' && (
        <>
          <h2 id={titleId} className="font-serif text-xl text-ink">
            Please sign in again
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            For your safety, deleting a locked page without its passcode requires you to sign in
            again first.
          </p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSignInAgain}>
              Sign in again
            </Button>
          </div>
        </>
      )}
    </DialogShell>
  );
}
