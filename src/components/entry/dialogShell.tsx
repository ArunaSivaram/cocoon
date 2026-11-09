import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DialogShellProps {
  open: boolean;
  onClose: () => void;
  /** Blocks Esc + backdrop close while a mutation is in flight. */
  busy?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  children: ReactNode;
  /** Optional extra classes for the centred panel wrapper. */
  panelClassName?: string;
}

/**
 * Portal + dim backdrop + Esc-to-close + body-scroll-lock + focus-on-open.
 * Keeps the step-10 dialogs lean. The two existing modals (PhotoViewer,
 * RemovePhotoDialog) still inline the same pattern; polish step 13 is
 * the right time to migrate them.
 */
export function DialogShell({
  open,
  onClose,
  busy = false,
  ariaLabel,
  ariaLabelledBy,
  children,
  panelClassName,
}: DialogShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first focusable element in the panel so keyboard users can
    // start typing/tabbing immediately.
    const first = panelRef.current?.querySelector<HTMLElement>(
      'input, textarea, button, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={panelClassName ?? 'card-soft w-full max-w-sm px-6 py-5'}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
