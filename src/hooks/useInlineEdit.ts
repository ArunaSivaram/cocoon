/**
 * useInlineEdit — shared state machine for the Entry page's editable
 * sections. One source of truth for isEditing/draft/dirty/saving,
 * one place to show the "Saved." toast, one error-recovery policy.
 *
 * Deliberately generic over T so step 12's locale picker (Locale) or
 * step 9's photo list could reuse it if needed.
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface UseInlineEditArgs<T> {
  initial: T;
  onSave: (next: T) => Promise<unknown>;
  isEqual?: (a: T, b: T) => boolean;
  /** Shown as toast.error when onSave rejects. Default: "Couldn't save. Try again." */
  errorMessage?: string;
}

export interface UseInlineEdit<T> {
  isEditing: boolean;
  draft: T;
  dirty: boolean;
  saving: boolean;
  startEditing: () => void;
  cancel: () => void;
  save: () => Promise<void>;
  setDraft: (next: T) => void;
}

const DEFAULT_ERROR = "Couldn't save. Try again.";

function defaultIsEqual<T>(a: T, b: T): boolean {
  return Object.is(a, b);
}

export function useInlineEdit<T>({
  initial,
  onSave,
  isEqual = defaultIsEqual,
  errorMessage = DEFAULT_ERROR,
}: UseInlineEditArgs<T>): UseInlineEdit<T> {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<T>(initial);
  const [saving, setSaving] = useState(false);

  // Baseline captured at edit-start. Kept in state (not a ref) so dirty
  // is reactive AND so the React 19 lint rule about ref reads during
  // render stays happy. A late API response that mutates `initial`
  // won't change `baseline`, so the user's mid-edit draft is safe.
  const [baseline, setBaseline] = useState<T>(initial);

  const startEditing = useCallback(() => {
    setBaseline(initial);
    setDraft(initial);
    setIsEditing(true);
  }, [initial]);

  const cancel = useCallback(() => {
    setDraft(baseline);
    setIsEditing(false);
  }, [baseline]);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(draft);
      toast('Saved.');
      setIsEditing(false);
    } catch {
      toast.error(errorMessage);
      // Stay in edit mode so the user doesn't lose their input.
    } finally {
      setSaving(false);
    }
  }, [draft, errorMessage, onSave, saving]);

  const dirty = !isEqual(draft, baseline);

  return { isEditing, draft, dirty, saving, startEditing, cancel, save, setDraft };
}
