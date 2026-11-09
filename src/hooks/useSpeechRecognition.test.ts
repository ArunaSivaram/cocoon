import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  accumulateSpeechResults,
  getSpeechRecognitionConstructor,
  speechRecognitionLang,
} from './useSpeechRecognition';

type MockResult = { isFinal: boolean; transcript: string };

function makeEvent(resultIndex: number, results: MockResult[]): SpeechRecognitionEvent {
  const list = results.map((r) => ({
    length: 1,
    isFinal: r.isFinal,
    0: { transcript: r.transcript, confidence: 0.9 },
    item: () => ({ transcript: r.transcript, confidence: 0.9 }),
  })) as unknown as SpeechRecognitionResultList;
  Object.defineProperty(list, 'length', { value: results.length });
  (list as unknown as { [k: number]: unknown })[0] = list[0];
  return {
    resultIndex,
    results: list,
  } as unknown as SpeechRecognitionEvent;
}

describe('getSpeechRecognitionConstructor', () => {
  const originalSR = window.SpeechRecognition;
  const originalWebkit = window.webkitSpeechRecognition;

  beforeEach(() => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });
  afterEach(() => {
    window.SpeechRecognition = originalSR;
    window.webkitSpeechRecognition = originalWebkit;
  });

  it('returns null when neither global is present', () => {
    expect(getSpeechRecognitionConstructor()).toBeNull();
  });

  it('prefers the un-prefixed SpeechRecognition', () => {
    const prefixed = vi.fn();
    const unprefixed = vi.fn();
    (window.webkitSpeechRecognition as unknown) = prefixed;
    (window.SpeechRecognition as unknown) = unprefixed;
    expect(getSpeechRecognitionConstructor()).toBe(unprefixed);
  });

  it('falls back to webkitSpeechRecognition when the un-prefixed is missing', () => {
    const prefixed = vi.fn();
    (window.webkitSpeechRecognition as unknown) = prefixed;
    expect(getSpeechRecognitionConstructor()).toBe(prefixed);
  });
});

describe('accumulateSpeechResults', () => {
  it('replaces interimText while leaving finalText alone', () => {
    const result = accumulateSpeechResults(
      { finalText: 'Hello', interimText: '' },
      makeEvent(0, [{ isFinal: false, transcript: 'there' }]),
    );
    expect(result).toEqual({ finalText: 'Hello', interimText: 'there' });
  });

  it('appends a final result to finalText and clears interim', () => {
    const result = accumulateSpeechResults(
      { finalText: 'Hello', interimText: 'maybe' },
      makeEvent(0, [{ isFinal: true, transcript: 'there' }]),
    );
    expect(result).toEqual({ finalText: 'Hello there', interimText: '' });
  });

  it('trims whitespace around a final chunk', () => {
    const result = accumulateSpeechResults(
      { finalText: '', interimText: '' },
      makeEvent(0, [{ isFinal: true, transcript: '  friend ' }]),
    );
    expect(result).toEqual({ finalText: 'friend', interimText: '' });
  });

  it('handles mixed final + interim within one event', () => {
    const result = accumulateSpeechResults(
      { finalText: 'Hi', interimText: '' },
      makeEvent(0, [
        { isFinal: true, transcript: 'there' },
        { isFinal: false, transcript: 'how are' },
      ]),
    );
    expect(result).toEqual({ finalText: 'Hi there', interimText: 'how are' });
  });
});

describe('speechRecognitionLang', () => {
  it('returns en-US as-is', () => {
    expect(speechRecognitionLang('en-US')).toBe('en-US');
  });
  it('returns en-GB as-is', () => {
    expect(speechRecognitionLang('en-GB')).toBe('en-GB');
  });
});
