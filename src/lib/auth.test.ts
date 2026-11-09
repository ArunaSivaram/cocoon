import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSession, isSignedIn, onAuthChange, signIn, signOut } from './auth';

function clear() {
  localStorage.clear();
  // Force the identity-stable cache to notice the wipe.
  signOut();
}

beforeEach(() => clear());
afterEach(() => clear());

describe('mock auth', () => {
  it('is signed out initially', () => {
    expect(isSignedIn()).toBe(false);
    expect(getSession()).toBeNull();
  });

  it('signIn() writes a session and flips isSignedIn', async () => {
    const session = await signIn();
    expect(session.user.email).toBe('test@cocoon.local');
    expect(isSignedIn()).toBe(true);
    expect(getSession()?.user.id).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('signOut() clears the session', async () => {
    await signIn();
    signOut();
    expect(isSignedIn()).toBe(false);
    expect(localStorage.getItem('cocoon.session.v1')).toBeNull();
  });

  it('getSession() returns identity-stable references for unchanged state', async () => {
    await signIn();
    const a = getSession();
    const b = getSession();
    expect(a).toBe(b);
  });

  it('onAuthChange fires on signIn and signOut', async () => {
    const listener = vi.fn();
    const off = onAuthChange(listener);
    await signIn();
    signOut();
    off();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('first sign-in sets the firstSignIn flag', async () => {
    await signIn();
    expect(localStorage.getItem('cocoon.firstSignIn.v1')).toBe('1');
  });
});
