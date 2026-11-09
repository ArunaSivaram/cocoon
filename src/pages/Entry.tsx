import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Lock as LockIcon, SearchX } from 'lucide-react';
import { EntryTopBar } from '@/components/entry/EntryTopBar';
import { DateAndMood } from '@/components/entry/DateAndMood';
import { EditableTitle } from '@/components/entry/EditableTitle';
import { InMyWords } from '@/components/entry/InMyWords';
import { WhatIMeant } from '@/components/entry/WhatIMeant';
import { SupportNoteCard } from '@/components/entry/SupportNoteCard';
import { MemoriesPlaceholder } from '@/components/entry/MemoriesPlaceholder';
import { MyNotes } from '@/components/entry/MyNotes';
import { Button } from '@/components/ui/button';
import { useEntry } from '@/hooks/queries';
import { isApiError } from '@/lib/api';
import type { Entry as EntryModel } from '@/lib/types';

export function Entry() {
  const { id = '' } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const { data, isLoading, error } = useEntry(id);

  if (isLoading) return <EntryPageShell><EntrySkeleton /></EntryPageShell>;

  if (isApiError(error, 'locked')) {
    return (
      <EntryPageShell>
        <EntryTopBar />
        <LockedView />
      </EntryPageShell>
    );
  }
  if (isApiError(error, 'not_found')) {
    return (
      <EntryPageShell>
        <EntryTopBar />
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
        <EntryTopBar />
        <PlaceholderView
          icon={<SearchX aria-hidden className="size-6 text-ink-soft" />}
          title="Couldn't open this entry."
          body="Please try again in a moment."
        />
      </EntryPageShell>
    );
  }

  const showSupport = shouldShowSupportNote(data, search.get('support'));

  return (
    <EntryPageShell>
      <EntryTopBar />
      <article className="entry-sheet mt-4 md:mt-6">
        <DateAndMood entry={data} />
        <EditableTitle entry={data} />
        <InMyWords entry={data} />
        <WhatIMeant entry={data} />
        {showSupport && <SupportNoteCard />}
        <MemoriesPlaceholder photos={data.photos} />
        <MyNotes entry={data} />
      </article>
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
    <>
      <EntryTopBar />
      <div className="entry-sheet mt-4 md:mt-6">
        <div className="h-3 w-40 animate-pulse rounded bg-parchment" />
        <div className="mt-4 h-8 w-3/4 animate-pulse rounded bg-parchment" />
        <div className="mt-6 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-parchment" />
          <div className="h-3 w-11/12 animate-pulse rounded bg-parchment" />
          <div className="h-3 w-10/12 animate-pulse rounded bg-parchment" />
        </div>
      </div>
    </>
  );
}

function LockedView() {
  return (
    <div className="mt-6 flex flex-col items-center gap-4 rounded-[var(--radius-sheet)] bg-paper p-8 text-center shadow-soft md:mt-8 md:p-12">
      <div className="flex size-14 items-center justify-center rounded-full bg-parchment">
        <LockIcon aria-hidden className="size-6 text-ink-soft" />
      </div>
      <h1 className="font-serif text-[1.5rem] text-ink md:text-[1.75rem]">
        This page is private.
      </h1>
      <p className="max-w-sm text-sm text-ink-soft">
        It&apos;s locked with a passcode. The unlock flow lands in step 10 of the build.
      </p>
      <Button asChild variant="outline">
        <Link to="/">Back to journal</Link>
      </Button>
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
