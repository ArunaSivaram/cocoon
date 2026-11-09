import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  addPhoto,
  allUnlockedPhotos,
  calendarForMonth,
  createEntry,
  DB_CONSTANTS,
  deleteEntry,
  getEntry,
  getEntryRaw,
  listEntries,
  lockEntry,
  openEntry,
  removeLock,
  resetDb,
  sendTestReminder,
  updateEntry,
} from './db';

const LOCKED_ID = '66666666-6666-4666-8666-666666666666';
const RELIEVED_ID = '11111111-1111-4111-8111-111111111111';
const ANXIOUS_ID = '44444444-4444-4444-8444-444444444444';
const PROUD_ID = '33333333-3333-4333-8333-333333333333';

beforeEach(() => resetDb());
afterEach(() => resetDb());

describe('listEntries', () => {
  it('returns all 6 fixtures newest first', () => {
    const { entries, next_cursor } = listEntries();
    expect(entries).toHaveLength(6);
    expect(entries[0]!.entry_date).toBe('2026-11-04');
    expect(entries.at(-1)!.entry_date).toBe('2026-10-22');
    expect(next_cursor).toBeNull();
  });

  it('locked cards hide title / mood / photos', () => {
    const { entries } = listEntries();
    const locked = entries.find((e) => e.id === LOCKED_ID);
    expect(locked).toBeDefined();
    expect(locked!.is_locked).toBe(true);
    expect('title' in locked!).toBe(false);
    expect('mood' in locked!).toBe(false);
  });
});

describe('getEntry', () => {
  it('returns 423 locked for the locked fixture', () => {
    const r = getEntry(LOCKED_ID);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(423);
      expect(r.code).toBe('locked');
    }
  });

  it('returns the content for an unlocked entry', () => {
    const r = getEntry(RELIEVED_ID);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.title).toBe('A Calming Evening Walk');
  });
});

describe('openEntry', () => {
  it('rejects the wrong passcode with 401 wrong_passcode', () => {
    const r = openEntry(LOCKED_ID, '0000');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(401);
      expect(r.code).toBe('wrong_passcode');
    }
  });

  it('accepts 1234 and returns the full entry', () => {
    const r = openEntry(LOCKED_ID, '1234');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.title).toBe('A Hard Conversation');
  });

  it('rate-limits after 5 wrong attempts in 15 min', () => {
    for (let i = 0; i < DB_CONSTANTS.UNLOCK_MAX_ATTEMPTS; i++) {
      openEntry(LOCKED_ID, '0000');
    }
    const r = openEntry(LOCKED_ID, '1234');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(429);
      expect(r.code).toBe('rate_limited');
    }
  });
});

describe('createEntry', () => {
  it('appends a new entry at the top of the list', () => {
    const before = listEntries().entries.length;
    const entry = createEntry({
      transcript: 'I ate a mango in the sun.',
      locale: 'en-US',
      timezone: 'Asia/Singapore',
    });
    const { entries } = listEntries();
    expect(entries).toHaveLength(before + 1);
    expect(entries[0]!.id).toBe(entry.id);
    expect(entry.body.includes('mango')).toBe(true);
  });
});

describe('updateEntry', () => {
  it('writes to an unlocked entry without a passcode', () => {
    const r = updateEntry(RELIEVED_ID, { notes: 'edited' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.notes).toBe('edited');
  });

  it('requires a passcode for a locked entry', () => {
    const r = updateEntry(LOCKED_ID, { notes: 'try' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('locked');
  });
});

describe('lock / remove-lock', () => {
  it('locks an unlocked entry and hides it from the summary', () => {
    const locked = lockEntry(PROUD_ID, '4321');
    expect(locked.ok).toBe(true);
    const summary = listEntries().entries.find((e) => e.id === PROUD_ID);
    expect(summary?.is_locked).toBe(true);
  });

  it('removes the lock on correct passcode', () => {
    lockEntry(PROUD_ID, '4321');
    const r = removeLock(PROUD_ID, '4321');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.is_locked).toBe(false);
  });

  it('rejects weak passcodes', () => {
    const r = lockEntry(PROUD_ID, 'nope');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('bad_request');
  });
});

describe('deleteEntry', () => {
  it('deletes an unlocked entry', () => {
    const r = deleteEntry(ANXIOUS_ID, {});
    expect(r.ok).toBe(true);
    expect(getEntryRaw(ANXIOUS_ID)).toBeUndefined();
  });

  it('refuses a locked entry without passcode', () => {
    const r = deleteEntry(LOCKED_ID, {});
    expect(r.ok).toBe(false);
  });

  it('accepts a forgot flag on a locked entry', () => {
    const r = deleteEntry(LOCKED_ID, { forgot: true });
    expect(r.ok).toBe(true);
    expect(getEntryRaw(LOCKED_ID)).toBeUndefined();
  });
});

describe('photos', () => {
  it('rejects a 3rd photo with too_many_photos', () => {
    // Entry 1 already has 2 photos.
    const r = addPhoto(RELIEVED_ID, {
      bytes: 1000,
      width: 100,
      height: 100,
      url: 'blob:dummy',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('too_many_photos');
  });

  it('hides locked-entry photos from the memory wall', () => {
    const photos = allUnlockedPhotos();
    expect(photos.every((p) => p.entry_id !== LOCKED_ID)).toBe(true);
  });
});

describe('calendar', () => {
  it('returns locked days with mood: null', () => {
    const days = calendarForMonth('2026-10');
    const locked = days.find((d) => d.id === LOCKED_ID);
    expect(locked).toBeDefined();
    expect(locked!.mood).toBeNull();
    expect(locked!.is_locked).toBe(true);
  });
});

describe('reminder test cooldown', () => {
  it('rate-limits a second test within 60 seconds', () => {
    const first = sendTestReminder();
    expect(first.ok).toBe(true);
    const second = sendTestReminder();
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe('rate_limited');
  });
});
