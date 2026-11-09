import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnlockDialog } from './UnlockDialog';
import { DeleteEntryDialog } from './DeleteEntryDialog';

interface LockedPrivateScreenProps {
  entryId: string;
  /** Called after a successful unlock so the parent can refetch/open the entry. */
  onUnlocked: () => void;
}

/**
 * "This page is private" screen (mockup 10). Shown when GET /entries/:id
 * returns 423 and we don't have a session passcode. The Unlock button
 * opens the step-11 dialog; Delete opens the locked-mode delete flow.
 */
export function LockedPrivateScreen({ entryId, onUnlocked }: LockedPrivateScreenProps) {
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="mt-6 flex flex-col items-center gap-4 rounded-[var(--radius-sheet)] bg-paper p-8 text-center shadow-soft md:mt-8 md:p-12">
        <div className="flex size-14 items-center justify-center rounded-full bg-parchment">
          <Lock aria-hidden className="size-6 text-clay" />
        </div>
        <h1 className="font-serif text-[1.5rem] text-ink md:text-[1.75rem]">
          This page is private
        </h1>
        <p className="max-w-sm text-sm text-ink-soft">Enter your passcode to read it.</p>
        <div className="mt-2 flex items-center gap-3">
          <Button type="button" onClick={() => setUnlockOpen(true)}>
            Unlock
          </Button>
          <Button type="button" variant="ghost" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      <UnlockDialog
        open={unlockOpen}
        entryId={entryId}
        onClose={() => setUnlockOpen(false)}
        onUnlocked={() => {
          setUnlockOpen(false);
          onUnlocked();
        }}
      />
      <DeleteEntryDialog
        open={deleteOpen}
        entryId={entryId}
        isLocked
        onClose={() => setDeleteOpen(false)}
      />
    </>
  );
}
