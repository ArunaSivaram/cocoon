import { describe, expect, it } from 'vitest';
import { mimeToExt } from './mime';

describe('mimeToExt', () => {
  it('maps audio/webm;codecs=opus → webm', () => {
    expect(mimeToExt('audio/webm;codecs=opus')).toBe('webm');
  });

  it('maps bare audio/webm → webm', () => {
    expect(mimeToExt('audio/webm')).toBe('webm');
  });

  it('maps audio/mp4 → mp4', () => {
    expect(mimeToExt('audio/mp4')).toBe('mp4');
  });

  it('is case-insensitive and tolerates whitespace', () => {
    expect(mimeToExt('AUDIO/MP4; codecs=mp4a.40.2')).toBe('mp4');
  });

  it('throws on an unknown MIME', () => {
    expect(() => mimeToExt('audio/ogg')).toThrow(/audio\/ogg/);
  });
});
