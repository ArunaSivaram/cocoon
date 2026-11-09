import { describe, expect, it } from 'vitest';
import {
  formatElapsed,
  pickRecorderMimeType,
  RECORDER_MAX_MS,
  RECORDER_WARN_MS,
  shouldStopAtCap,
  shouldWarn,
} from './useAudioRecorder';

describe('pickRecorderMimeType', () => {
  it('prefers Chrome-style opus when available', () => {
    const supported = new Set(['audio/webm;codecs=opus', 'audio/webm']);
    const result = pickRecorderMimeType((t) => supported.has(t));
    expect(result).toEqual({ mimeType: 'audio/webm;codecs=opus', container: 'webm' });
  });

  it('falls back to Safari mp4 when webm is unsupported', () => {
    const supported = new Set(['audio/mp4']);
    const result = pickRecorderMimeType((t) => supported.has(t));
    expect(result).toEqual({ mimeType: 'audio/mp4', container: 'mp4' });
  });

  it('returns null when nothing is supported', () => {
    const result = pickRecorderMimeType(() => false);
    expect(result).toBeNull();
  });
});

describe('formatElapsed', () => {
  it.each([
    [0, '00:00'],
    [500, '00:00'],
    [30_500, '00:30'],
    [60_000, '01:00'],
    [9 * 60_000 + 30_000, '09:30'],
    [RECORDER_MAX_MS, '10:00'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatElapsed(ms)).toBe(expected);
  });
});

describe('shouldWarn', () => {
  it('is false before 9:30', () => {
    expect(shouldWarn(RECORDER_WARN_MS - 1)).toBe(false);
  });
  it('is true at 9:30 and after', () => {
    expect(shouldWarn(RECORDER_WARN_MS)).toBe(true);
    expect(shouldWarn(RECORDER_WARN_MS + 1_000)).toBe(true);
  });
});

describe('shouldStopAtCap', () => {
  it('is false before 10:00', () => {
    expect(shouldStopAtCap(RECORDER_MAX_MS - 1)).toBe(false);
  });
  it('is true at 10:00 and after', () => {
    expect(shouldStopAtCap(RECORDER_MAX_MS)).toBe(true);
    expect(shouldStopAtCap(RECORDER_MAX_MS + 1)).toBe(true);
  });
});
