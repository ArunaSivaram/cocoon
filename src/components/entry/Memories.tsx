import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useDeletePhoto, useUploadPhoto } from '@/hooks/queries';
import { isApiError } from '@/lib/api';
import { resizeImageToJpeg } from '@/lib/resizeImage';
import { useSessionPasscode } from '@/lib/sessionPasscodes';
import type { Photo } from '@/lib/types';
import { PhotoViewer } from './PhotoViewer';
import { RemovePhotoDialog } from './RemovePhotoDialog';

const MAX_PHOTOS = 2;

interface MemoriesProps {
  entryId: string;
  photos: Photo[];
  /** True when the containing entry is currently private. Only then do we
   *  thread the session passcode into upload/delete mutations. */
  isLocked: boolean;
}

/**
 * The Memories section on the entry reading view (SPEC §2.4, mockup 08).
 *
 * - Up to 2 photos.
 * - Browser-side resize to JPEG ≤ 1600 px before upload (SPEC §6).
 * - "N/2" counter.
 * - Tap a thumbnail → full-size viewer.
 * - × on a thumbnail → confirm dialog → delete.
 * - The dashed "Add a photo…" button disappears when the entry has 2 photos.
 */
export function Memories({ entryId, photos, isLocked }: MemoriesProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [viewerStart, setViewerStart] = useState<number | null>(null);
  const [pendingRemove, setPendingRemove] = useState<Photo | null>(null);

  const upload = useUploadPhoto(entryId);
  const remove = useDeletePhoto(entryId);
  const passcode = useSessionPasscode(entryId);

  const count = photos.length;
  const canAdd = count < MAX_PHOTOS && !upload.isPending;

  async function handleFile(file: File) {
    try {
      const jpeg = await resizeImageToJpeg(file);
      await upload.mutateAsync({ file: jpeg, ...(isLocked ? { passcode } : {}) });
      toast.success('Photo added.');
    } catch (err) {
      toast.error(uploadErrorMessage(err));
    }
  }

  function openPicker() {
    inputRef.current?.click();
  }

  async function confirmRemove() {
    if (!pendingRemove) return;
    try {
      await remove.mutateAsync({
        photoId: pendingRemove.id,
        ...(isLocked ? { passcode } : {}),
      });
      toast.success('Photo removed.');
      setPendingRemove(null);
    } catch {
      toast.error("Couldn't remove that photo. Try again.");
    }
  }

  return (
    <section className="mt-6 md:mt-8">
      <div className="flex items-end justify-between">
        <p className="label-eyebrow">Memories</p>
        <span className="text-xs text-ink-soft">
          {count}/{MAX_PHOTOS}
        </span>
      </div>

      {count > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {photos.map((photo, i) => (
            <li key={photo.id} className="relative">
              <button
                type="button"
                onClick={() => setViewerStart(i)}
                aria-label="View photo"
                className="block w-full overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                <img
                  src={photo.url}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
                />
              </button>
              <button
                type="button"
                onClick={() => setPendingRemove(photo)}
                aria-label="Remove photo"
                className="absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-full bg-ink/70 text-paper backdrop-blur-sm transition hover:bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper"
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {count < MAX_PHOTOS && (
        <>
          <button
            type="button"
            onClick={openPicker}
            disabled={!canAdd}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-rule bg-transparent px-4 py-4 text-sm text-ink-soft transition hover:bg-parchment/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {upload.isPending ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Adding photo…
              </>
            ) : (
              <>
                <ImagePlus aria-hidden className="size-4" />
                Add a photo or two from this day
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Reset so the same file can be picked twice in a row.
              e.target.value = '';
              if (file) void handleFile(file);
            }}
          />
        </>
      )}

      {viewerStart !== null && (
        <PhotoViewer
          photos={photos}
          startIndex={viewerStart}
          onClose={() => setViewerStart(null)}
        />
      )}

      <RemovePhotoDialog
        open={pendingRemove !== null}
        busy={remove.isPending}
        onKeep={() => {
          if (!remove.isPending) setPendingRemove(null);
        }}
        onRemove={confirmRemove}
      />
    </section>
  );
}

function uploadErrorMessage(err: unknown): string {
  if (isApiError(err, 'too_many_photos')) {
    return 'This entry already has two photos.';
  }
  if (isApiError(err, 'payload_too_large')) {
    return 'That photo is too big — try a smaller one.';
  }
  if (err instanceof Error && /open that photo|save that photo|open image/i.test(err.message)) {
    return "Couldn't open that photo. Try another one.";
  }
  return "Couldn't add that photo. Try again.";
}
