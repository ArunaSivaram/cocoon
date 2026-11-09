import { format, parseISO } from 'date-fns';

/**
 * Short date for past-entry cards and the reading view header, e.g.
 * "Wed, 4 Nov 2026" (matches mockup 05).
 *
 * Accepts either an ISO datetime (`2026-11-04T12:34:00.000Z`) or an
 * ISO date (`2026-11-04`). The latter form is used for entry_date
 * from SPEC §4, which is calculated in the user's timezone.
 */
export function formatCardDate(iso: string): string {
  const date = iso.includes('T') ? parseISO(iso) : parseISO(`${iso}T00:00:00`);
  return format(date, 'EEE, d MMM yyyy');
}

/** "Wednesday, November 4" — the header greeting on Home. */
export function formatHomeDate(d: Date): string {
  return format(d, 'EEEE, MMMM d');
}
