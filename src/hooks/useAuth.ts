import { useSyncExternalStore } from 'react';
import { getSession, onAuthChange, type Session } from '@/lib/auth';

export interface UseAuth {
  session: Session | null;
  signedIn: boolean;
}

export function useAuth(): UseAuth {
  const session = useSyncExternalStore(onAuthChange, getSession, () => null);
  return { session, signedIn: session !== null };
}
