import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { server } from '@/mocks/server';
import { resetDb } from '@/mocks/db';
import { api, APIError } from './api';
import type { EntriesListResponse, Entry, Profile } from './types';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetDb();
});
afterAll(() => server.close());

describe('api.get', () => {
  it('returns the profile', async () => {
    const me = await api.get<Profile>('/me');
    expect(me.email).toBe('test@cocoon.local');
  });

  it('returns the entries list', async () => {
    const list = await api.get<EntriesListResponse>('/entries');
    expect(list.entries).toHaveLength(6);
  });

  it('throws APIError with code "locked" for the locked entry (423)', async () => {
    const lockedId = '66666666-6666-4666-8666-666666666666';
    await expect(api.get<Entry>(`/entries/${lockedId}`)).rejects.toSatisfy((err: unknown) => {
      return err instanceof APIError && err.status === 423 && err.code === 'locked';
    });
  });

  it('throws APIError with code "wrong_passcode" (401) for a bad passcode', async () => {
    const lockedId = '66666666-6666-4666-8666-666666666666';
    await expect(
      api.post<{ passcode: string }, Entry>(`/entries/${lockedId}/open`, { passcode: '0000' }),
    ).rejects.toSatisfy((err: unknown) => {
      return err instanceof APIError && err.status === 401 && err.code === 'wrong_passcode';
    });
  });

  it('opens the locked entry with passcode 1234', async () => {
    const lockedId = '66666666-6666-4666-8666-666666666666';
    const entry = await api.post<{ passcode: string }, Entry>(`/entries/${lockedId}/open`, {
      passcode: '1234',
    });
    expect(entry.title).toBe('A Hard Conversation');
  });
});
