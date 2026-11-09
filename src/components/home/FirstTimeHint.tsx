import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

const FIRST_SIGNIN_KEY = 'cocoon.firstSignIn.v1';

function hasHint(): boolean {
  try {
    return localStorage.getItem(FIRST_SIGNIN_KEY) !== null;
  } catch {
    return false;
  }
}

export function FirstTimeHint() {
  const [show, setShow] = useState<boolean>(hasHint);

  function dismiss() {
    try {
      localStorage.removeItem(FIRST_SIGNIN_KEY);
    } catch {
      // ignore
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-clay/30 bg-parchment/80 px-4 py-3 text-sm text-ink shadow-soft">
      <Sparkles aria-hidden className="size-4 shrink-0 text-clay" />
      <p className="flex-1 font-serif">Try it now — tell me one thing about today.</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss hint"
        className="rounded-full p-1 text-ink-soft hover:bg-card/60 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
