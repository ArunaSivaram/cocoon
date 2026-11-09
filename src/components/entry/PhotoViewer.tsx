import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Photo } from '@/lib/types';

interface PhotoViewerProps {
  photos: Photo[];
  startIndex: number;
  onClose: () => void;
}

/**
 * Full-screen photo viewer (SPEC §2.4). Opens when the user taps a thumbnail.
 * Tap backdrop / press Esc / tap × closes. Arrow keys and on-screen chevrons
 * cycle between the entry's photos (max 2, so this is just prev/next).
 */
export function PhotoViewer({ photos, startIndex, onClose }: PhotoViewerProps) {
  const [index, setIndex] = useState(() => clampIndex(startIndex, photos.length));
  const closeRef = useRef<HTMLButtonElement>(null);
  const hasMultiple = photos.length > 1;

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight' && hasMultiple) {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' && hasMultiple) {
        e.preventDefault();
        prev();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hasMultiple, next, prev, onClose]);

  const photo = photos[index];
  if (!photo) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <Button
        ref={closeRef}
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Close photo"
        className="absolute top-4 right-4 text-paper hover:bg-white/10 hover:text-paper"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X />
      </Button>

      {hasMultiple && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-paper hover:bg-white/10 hover:text-paper md:left-6"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-paper hover:bg-white/10 hover:text-paper md:right-6"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
          >
            <ChevronRight />
          </Button>
        </>
      )}

      <img
        src={photo.url}
        alt=""
        className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-lift"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

function clampIndex(i: number, length: number): number {
  if (length <= 0) return 0;
  if (i < 0) return 0;
  if (i >= length) return length - 1;
  return i;
}
