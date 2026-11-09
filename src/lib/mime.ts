/**
 * MIME → file extension for /api/audio/upload-url.
 *
 * Covers the two containers CLAUDE.md "Browsers" says Cocoon uses:
 *  - audio/webm (Chrome, with or without `;codecs=opus`)
 *  - audio/mp4 (iOS/macOS Safari)
 */

export type AudioExt = 'webm' | 'mp4';

export function mimeToExt(mime: string): AudioExt {
  const base = mime.split(';')[0]?.trim().toLowerCase() ?? '';
  if (base === 'audio/webm') return 'webm';
  if (base === 'audio/mp4') return 'mp4';
  throw new Error(`Unexpected audio MIME type: ${mime}`);
}
