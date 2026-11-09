import { Camera, ChevronRight, FileText, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MoodBadge } from '@/components/MoodBadge';
import { formatCardDate } from '@/lib/dates';
import type { EntrySummary } from '@/lib/types';

export function PastEntryCard({ entry }: { entry: EntrySummary }) {
  if (entry.is_locked) return <LockedCard entry={entry} />;

  return (
    <Link
      to={`/entry/${entry.id}`}
      className="group flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-parchment/60 focus-visible:bg-parchment/60 focus-visible:outline-none"
    >
      <Thumbnail url={entry.first_photo_url} />
      <div className="min-w-0 flex-1">
        <p className="label-eyebrow">{formatCardDate(entry.entry_date)}</p>
        <h3 className="mt-1 truncate font-serif text-[1.125rem] leading-snug text-ink">
          {entry.title}
        </h3>
        <div className="mt-2 flex items-center gap-3">
          <MoodBadge mood={entry.mood} size="sm" />
          {entry.photo_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-ink-soft">
              <Camera aria-hidden className="size-3.5" />
              {entry.photo_count}
            </span>
          )}
        </div>
      </div>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-ink-soft group-hover:text-ink"
      />
    </Link>
  );
}

function LockedCard({ entry }: { entry: Extract<EntrySummary, { is_locked: true }> }) {
  return (
    <Link
      to={`/entry/${entry.id}`}
      className="group flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-parchment/60 focus-visible:bg-parchment/60 focus-visible:outline-none"
    >
      <LockThumbnail />
      <div className="min-w-0 flex-1">
        <p className="label-eyebrow">{formatCardDate(entry.entry_date)}</p>
        <p className="mt-1 truncate font-serif text-[1.125rem] italic leading-snug text-ink-soft">
          A private entry
        </p>
        <div className="mt-2">
          <MoodBadge mood={null} size="sm" />
        </div>
      </div>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-ink-soft group-hover:text-ink"
      />
    </Link>
  );
}

function Thumbnail({ url }: { url: string | null }) {
  return url ? (
    <img
      src={url}
      alt=""
      className="size-[72px] shrink-0 rounded-xl object-cover md:size-[80px]"
      loading="lazy"
    />
  ) : (
    <div className="flex size-[72px] shrink-0 items-center justify-center rounded-xl bg-parchment md:size-[80px]">
      <FileText aria-hidden className="size-5 text-clay" />
    </div>
  );
}

function LockThumbnail() {
  return (
    <div className="flex size-[72px] shrink-0 items-center justify-center rounded-xl bg-parchment md:size-[80px]">
      <Lock aria-hidden className="size-5 text-ink-soft" />
    </div>
  );
}
