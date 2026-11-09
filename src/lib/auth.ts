/**
 * Mock-only auth for now.
 *
 * - When VITE_USE_MOCKS === 'true' the browser is always signed in as the
 *   test user; the session's accessToken is a fake string that the mock API
 *   accepts without validation.
 * - Otherwise there's no session — until step 5 adds a sign-in flow and
 *   step 15 wires Supabase.
 */

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

const mocksEnabled = import.meta.env.VITE_USE_MOCKS === 'true';

export function getSession(): Session | null {
  if (mocksEnabled) return MOCK_SESSION;
  return null;
}

export function isSignedIn(): boolean {
  return getSession() !== null;
}
