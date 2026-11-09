/**
 * Mock auth — stores a session in localStorage so we can simulate the full
 * sign-in/sign-out journey without Google or Supabase. Step 15 replaces
 * this file with a real Supabase client; the rest of the app
 * (useAuth, RequireAuth, SignIn page, AccountMenu) stays untouched.
 */

const STORAGE_KEY = 'cocoon.session.v1';
const FIRST_SIGNIN_KEY = 'cocoon.firstSignIn.v1';
const MOCK_SIGN_IN_DELAY_MS = 600;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface Session {
  accessToken: string;
  user: SessionUser;
}

const MOCK_SESSION: Session = {
  accessToken: 'mock-dev-token',
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Test User',
    email: 'test@cocoon.local',
    avatarUrl: null,
  },
};

// Identity-stable snapshot cache. useSyncExternalStore requires the same
// reference back for the same underlying value — if we re-parsed the JSON
// on every read, React would re-render forever.
let cachedRaw: string | null | undefined;
let cachedParsed: Session | null = null;

function rawFromStorage(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function syncCache(): void {
  const raw = rawFromStorage();
  if (raw === cachedRaw) return;
  cachedRaw = raw;
  try {
    cachedParsed = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    cachedParsed = null;
  }
}

export function getSession(): Session | null {
  syncCache();
  return cachedParsed;
}

export function isSignedIn(): boolean {
  return getSession() !== null;
}

// ---- Event emitter ----

const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

export function onAuthChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---- Sign in / out ----

export async function signIn(): Promise<Session> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_SIGN_IN_DELAY_MS));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_SESSION));
    if (!localStorage.getItem(FIRST_SIGNIN_KEY)) {
      localStorage.setItem(FIRST_SIGNIN_KEY, '1');
    }
  } catch {
    // ignore — in tests we may not have persistent storage
  }
  syncCache();
  emit();
  return MOCK_SESSION;
}

export function signOut(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  syncCache();
  emit();
}

// Cross-tab sync (and helpful for tests that mutate localStorage directly).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      syncCache();
      emit();
    }
  });
}
