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
  /**
   * ISO-8601 timestamp of when the session was established. Checked by the
   * "Forgot passcode" delete path (SPEC §2.5 / §5 — "requires a sign-in
   * within the last 10 minutes"). Missing on pre-step-10 sessions, which
   * are treated as stale.
   */
  signed_in_at?: string;
}

/** SPEC §2.5 — forgot-delete requires a sign-in within this window. */
export const RECENT_SIGNIN_WINDOW_MS = 10 * 60 * 1000;

function makeMockSession(): Session {
  return {
    accessToken: 'mock-dev-token',
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Test User',
      email: 'test@cocoon.local',
      avatarUrl: null,
    },
    signed_in_at: new Date().toISOString(),
  };
}

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
  const session = makeMockSession();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    if (!localStorage.getItem(FIRST_SIGNIN_KEY)) {
      localStorage.setItem(FIRST_SIGNIN_KEY, '1');
    }
  } catch {
    // ignore — in tests we may not have persistent storage
  }
  syncCache();
  emit();
  return session;
}

/**
 * Returns the current session's sign-in timestamp (ms) if present, else null.
 * The "Forgot passcode" delete flow uses this to decide whether to force a
 * re-sign-in first.
 */
export function getRecentSignInAt(): number | null {
  const session = getSession();
  if (!session?.signed_in_at) return null;
  const t = Date.parse(session.signed_in_at);
  return Number.isNaN(t) ? null : t;
}

export function isSignInRecent(windowMs = RECENT_SIGNIN_WINDOW_MS): boolean {
  const t = getRecentSignInAt();
  if (t === null) return false;
  return Date.now() - t <= windowMs;
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
