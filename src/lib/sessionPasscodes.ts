/**
 * In-memory store for passcodes the user has unlocked **during this tab's
 * lifetime**. SPEC §2.5: *"Unlocking shows the page for this visit only; it
 * stays locked."* We deliberately never touch localStorage/sessionStorage —
 * a refresh or new tab must re-prompt.
 *
 * Shape mirrors the auth.ts pattern (module-level state + listeners +
 * useSyncExternalStore) so React re-renders whenever a passcode is
 * added/removed.
 */

import { useSyncExternalStore } from 'react';

type EntryId = string;

const passcodes = new Map<EntryId, string>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionPasscode(entryId: EntryId): string | undefined {
  return passcodes.get(entryId);
}

export function setSessionPasscode(entryId: EntryId, passcode: string): void {
  passcodes.set(entryId, passcode);
  emit();
}

export function clearSessionPasscode(entryId: EntryId): void {
  if (passcodes.delete(entryId)) emit();
}

export function clearAllSessionPasscodes(): void {
  if (passcodes.size === 0) return;
  passcodes.clear();
  emit();
}

/**
 * React hook — returns the passcode held for this entry (or undefined).
 * Re-renders when the store changes, so a section component reflects the
 * passcode arriving mid-session.
 */
export function useSessionPasscode(entryId: EntryId | undefined): string | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (entryId ? passcodes.get(entryId) : undefined),
    () => undefined,
  );
}
