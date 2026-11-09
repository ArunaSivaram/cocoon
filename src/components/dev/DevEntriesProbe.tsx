/**
 * Temporary — proves the data layer works end-to-end against MSW. Delete
 * once step 7 lands the real past-entries card UI.
 */
import { Link } from 'react-router-dom';
import { useEntries } from '@/hooks/queries';
import { moodStyle } from '@/lib/moods';

export function DevEntriesProbe() {
  const { data, isLoading, isError, error } = useEntries();

  if (isLoading) return <p className="text-ink-soft">Loading entries…</p>;
  if (isError) {
    return (
      <p className="text-rose-700">
        Couldn&apos;t load entries ({error instanceof Error ? error.message : 'unknown error'}).
        Have you set <code>VITE_USE_MOCKS=true</code>?
      </p>
    );
  }
  if (!data || data.entries.length === 0) {
    return <p className="text-ink-soft">No entries yet.</p>;
  }

  return (
    <ul className="divide-y divide-rule/60 text-sm">
      {data.entries.map((e) => (
        <li key={e.id} className="py-2">
          <Link to={`/entry/${e.id}`} className="flex items-center gap-3 hover:underline">
            <span className="text-ink-soft">{e.entry_date}</span>
            {e.is_locked ? (
              <span className="italic text-ink-soft">A private entry — Locked</span>
            ) : (
              <>
                <span className="font-serif">{e.title}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{
                    backgroundColor: moodStyle(e.mood).badgeBg,
                    color: moodStyle(e.mood).badgeInk,
                  }}
                >
                  {e.mood}
                </span>
                {e.photo_count > 0 && (
                  <span className="text-ink-soft text-xs">📷 {e.photo_count}</span>
                )}
              </>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
