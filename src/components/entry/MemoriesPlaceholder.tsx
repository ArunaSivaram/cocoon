import { ImagePlus } from 'lucide-react';
import type { Photo } from '@/lib/types';

export function MemoriesPlaceholder({ photos }: { photos: Photo[] }) {
  const count = photos.length;
  const showAdd = count < 2;

  return (
    <section className="mt-6 md:mt-8">
      <div className="flex items-end justify-between">
        <p className="label-eyebrow">Memories</p>
        <span className="text-xs text-ink-soft">{count}/2</span>
      </div>

      {count > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {photos.map((p) => (
            <img
              key={p.id}
              src={p.url}
              alt=""
              loading="lazy"
              className="aspect-square w-full rounded-xl object-cover"
            />
          ))}
        </div>
      )}

      {showAdd && (
        <button
          type="button"
          disabled
          title="Coming in step 9"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-rule bg-transparent px-4 py-4 text-sm text-ink-soft opacity-70 hover:opacity-100 disabled:cursor-not-allowed"
        >
          <ImagePlus aria-hidden className="size-4" />
          Add a photo or two from this day
        </button>
      )}
    </section>
  );
}
