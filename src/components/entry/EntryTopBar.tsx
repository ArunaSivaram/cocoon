import { ArrowLeft, Lock, LockOpen, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface EntryTopBarProps {
  /** Hide the Lock + Delete buttons — used by the "private" screen where
   *  those actions live in the body instead. Only Back-to-journal remains. */
  minimal?: boolean;
  /** Show Lock when the entry is currently unlocked. */
  canLock?: boolean;
  /** Show Remove lock when the entry is locked AND unlocked-for-this-visit. */
  canRemoveLock?: boolean;
  /** Show Delete (locked or unlocked). */
  canDelete?: boolean;
  onLock?: () => void;
  onRemoveLock?: () => void;
  onDelete?: () => void;
}

export function EntryTopBar({
  minimal = false,
  canLock = false,
  canRemoveLock = false,
  canDelete = false,
  onLock,
  onRemoveLock,
  onDelete,
}: EntryTopBarProps) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between">
      <Button
        type="button"
        variant="ghost"
        className="gap-2 px-3 text-ink hover:bg-parchment"
        onClick={() => navigate('/')}
      >
        <ArrowLeft aria-hidden className="size-4" />
        <span className="font-sans text-sm">Back to journal</span>
      </Button>
      {!minimal && (
        <div className="flex items-center gap-1 md:gap-2">
          {canLock && (
            <Button
              type="button"
              variant="ghost"
              onClick={onLock}
              aria-label="Lock this page"
              className="gap-2 px-3 text-ink hover:bg-parchment"
            >
              <Lock aria-hidden className="size-4" />
              <span className="hidden font-sans text-sm md:inline">Lock</span>
            </Button>
          )}
          {canRemoveLock && (
            <Button
              type="button"
              variant="ghost"
              onClick={onRemoveLock}
              aria-label="Remove lock"
              className="gap-2 px-3 text-ink hover:bg-parchment"
            >
              <LockOpen aria-hidden className="size-4" />
              <span className="hidden font-sans text-sm md:inline">Remove lock</span>
            </Button>
          )}
          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={onDelete}
              aria-label="Delete"
              className="gap-2 px-3 text-ink hover:bg-rose-50 hover:text-[color:var(--color-recording)]"
            >
              <Trash2 aria-hidden className="size-4" />
              <span className="hidden font-sans text-sm md:inline">Delete</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
