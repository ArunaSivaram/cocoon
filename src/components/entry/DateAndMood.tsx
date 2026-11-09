import { MoodBadge } from '@/components/MoodBadge';
import { formatEntryHeaderDate } from '@/lib/dates';
import type { Entry } from '@/lib/types';

export function DateAndMood({ entry }: { entry: Entry }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      <p className="label-eyebrow">{formatEntryHeaderDate(entry.entry_date)}</p>
      <MoodBadge mood={entry.mood} />
    </div>
  );
}
