import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { EntryTopBar } from '@/components/entry/EntryTopBar';
import { DateAndMood } from '@/components/entry/DateAndMood';
import { EditableTitle } from '@/components/entry/EditableTitle';
import { InMyWords } from '@/components/entry/InMyWords';
import { WhatIMeant } from '@/components/entry/WhatIMeant';
import { SupportNoteCard } from '@/components/entry/SupportNoteCard';
import { Memories } from '@/components/entry/Memories';
import { MyNotes } from '@/components/entry/MyNotes';
import { LockDialog } from '@/components/entry/LockDialog';
import { RemoveLockConfirm } from '@/components/entry/RemoveLockConfirm';
import { DeleteEntryDialog } from '@/components/entry/DeleteEntryDialog';
import { LockedPrivateScreen } from '@/components/entry/LockedPrivateScreen';
import { Button } from '@/components/ui/button';
import { useEntry, useOpenEntry } from '@/hooks/queries';
import { isApiError } from '@/lib/api';
import { useSessionPasscode } from '@/lib/sessionPasscodes';
import type { Entry as EntryModel } from '@/lib/types';

export function Entry() {
  const { id = '' } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const { data, isLoading, error, refetch } = useEntry(id);
  const sessionPasscode = useSessionPasscode(id);
  const open = useOpenEntry(id);

  // If the entry is locked but we hold its session passcode, open it
  // behind the scenes so section components can read the full content.
  useEffect(() => {
    if (!id) return;
    const isLocked = isApiError(error, 'locked');
    if (isLocked && sessionPasscode && !open.isPending) {
      open.mutate({ passcode: sessionPasscode });
    }
    // Only re-run on id / locked-state / passcode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, error, sessionPasscode]);

  const [lockOpen, setLockOpen] = useState(false);
  const [removeLockOpen, setRemoveLockOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading || (isApiError(error, 'locked') && sessionPasscode && !data)) {
    return (
      <EntryPageShell>
        <EntryTopBar minimal />
        <EntrySkeleton />
      </EntryPageShell>
    );
  }

  if (isApiError(error, 'locked') && !sessionPasscode) {
    return (
      <EntryPageShell>
        <EntryTopBar minimal />
        <LockedPrivateScreen entryId={id} onUnlocked={() => void refetch()} />
      </EntryPageShell>
    );
  }
  if (isApiError(error, 'not_found')) {
    return (
      <EntryPageShell>
        <EntryTopBar minimal />
        <PlaceholderView
          icon={<SearchX aria-hidden className="size-6 text-ink-soft" />}
          title="I can't find that entry."
          body="It might have been deleted, or the link is wrong. Head back to your journal."
        />
      </EntryPageShell>
    );
  }
  if (error || !data) {
    return (
      <EntryPageShell>
        <EntryTopBar minimal />
        <PlaceholderView
          icon={<SearchX aria-hidden className="size-6 text-ink-soft" />}
          title="Couldn't open this entry."
          body="Please try again in a moment."
        />
      </EntryPageShell>
    );
  }

  const showSupport = shouldShowSupportNote(data, search.get('support'));
  const unlockedForVisit = data.is_locked && sessionPasscode !== undefined;

  return (
    <EntryPageShell>
      <EntryTopBar
        canLock={!data.is_locked}
        canRemoveLock={unlockedForVisit}
        canDelete
        onLock={() => setLockOpen(true)}
        onRemoveLock={() => setRemoveLockOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />
      <article className="entry-sheet mt-4 md:mt-6">
        <DateAndMood entry={data} />
        <EditableTitle entry={data} />
        <InMyWords entry={data} />
        <WhatIMeant entry={data} />
        {showSupport && <SupportNoteCard />}
        <Memories entryId={data.id} photos={data.photos} isLocked={data.is_locked} />
        <MyNotes entry={data} />
      </article>

      <LockDialog
        open={lockOpen}
        entryId={data.id}
        onClose={() => setLockOpen(false)}
        onLocked={() => {
          setLockOpen(false);
          void refetch();
        }}
      />
      <RemoveLockConfirm
        open={removeLockOpen}
        entryId={data.id}
        onClose={() => setRemoveLockOpen(false)}
        onRemoved={() => {
          setRemoveLockOpen(false);
          void refetch();
        }}
      />
      <DeleteEntryDialog
        open={deleteOpen}
        entryId={data.id}
        isLocked={data.is_locked}
        onClose={() => setDeleteOpen(false)}
      />
    </EntryPageShell>
  );
}

function shouldShowSupportNote(entry: EntryModel, override: string | null): boolean {
  if (override === '1' || override === 'true') return true;
  return entry.support_note;
}

function EntryPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-[720px] px-4 pt-5 pb-16 md:pt-8">{children}</div>
    </div>
  );
}

function EntrySkeleton() {
  return (
    <div className="entry-sheet mt-4 md:mt-6">
      <div className="h-3 w-40 animate-pulse rounded bg-parchment" />
      <div className="mt-4 h-8 w-3/4 animate-pulse rounded bg-parchment" />
      <div className="mt-6 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-parchment" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-parchment" />
        <div className="h-3 w-10/12 animate-pulse rounded bg-parchment" />
      </div>
    </div>
  );
}

function PlaceholderView({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="mt-6 flex flex-col items-center gap-4 rounded-[var(--radius-sheet)] bg-paper p-8 text-center shadow-soft md:mt-8 md:p-12">
      <div className="flex size-14 items-center justify-center rounded-full bg-parchment">
        {icon}
      </div>
      <h1 className="font-serif text-[1.5rem] text-ink md:text-[1.75rem]">{title}</h1>
      <p className="max-w-sm text-sm text-ink-soft">{body}</p>
      <Button asChild variant="outline">
        <Link to="/">Back to journal</Link>
      </Button>
    </div>
  );
}
