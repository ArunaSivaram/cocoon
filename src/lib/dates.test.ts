import { describe, expect, it } from 'vitest';
import { formatCardDate, formatHomeDate } from './dates';

describe('formatCardDate', () => {
  it('formats an entry_date date-only string', () => {
    expect(formatCardDate('2026-11-04')).toBe('Wed, 4 Nov 2026');
  });

  it('formats a full ISO timestamp', () => {
    // Local date at midnight — safe across most timezones.
    expect(formatCardDate('2026-10-30T13:05:00.000Z')).toMatch(/Fri, 30 Oct 2026|Sat, 31 Oct 2026/);
  });

  it('handles an older weekend date', () => {
    expect(formatCardDate('2026-10-24')).toBe('Sat, 24 Oct 2026');
  });
});

describe('formatHomeDate', () => {
  it('returns the long weekday + month + day', () => {
    expect(formatHomeDate(new Date('2026-11-04T10:00:00'))).toBe('Wednesday, November 4');
  });
});
