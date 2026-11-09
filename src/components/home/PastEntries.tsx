import { Button } from '@/components/ui/button';
import { useEntries } from '@/hooks/queries';
import { PastEntryCard } from './PastEntryCard';

export function PastEntries({ className }: { className?: string }) {
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useEntries();

  const entries = data?.pages.flatMap((p) => p.entries) ?? [];
  const totalCount = data?.pages[0]?.total_count ?? 0;

  return (
    <section className={className} aria-labelledby="past-entries-heading">
      <header className="flex items-end justify-between">
        <h2
          id="past-entries-heading"
          className="font-serif text-[1.5rem] leading-none text-ink md:text-[1.75rem]"
        >
          Past entries
        </h2>
        {totalCount > 0 && (
          <span className="text-sm text-ink-soft">
            {totalCount} {totalCount === 1 ? 'page' : 'pages'}
          </span>
        )}
      </header>

      <div className="mt-4 divide-y divide-rule/60">
        {isLoading && <Skeleton />}
        {isError && (
          <p className="py-6 text-sm text-ink-soft">
            Couldn&apos;t load your past entries. Try again in a moment.
          </p>
        )}
        {!isLoading && !isError && entries.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-soft">
            Your first page starts here. Tap the mic above when you&apos;re ready.
          </p>
        )}
        {entries.map((entry) => (
          <PastEntryCard key={entry.id} entry={entry} />
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading…' : 'Show earlier pages'}
          </Button>
        </div>
      )}
    </section>
  );
}

function Skeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <div className="size-[72px] shrink-0 animate-pulse rounded-xl bg-parchment/70 md:size-[80px]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-parchment/70" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-parchment/70" />
            <div className="h-3 w-16 animate-pulse rounded bg-parchment/70" />
          </div>
        </div>
      ))}
    </>
  );
}
