import { describe, expect, it } from 'vitest';
import {
  LOCKED_STYLE,
  MOOD_KEYS,
  MOOD_MAP,
  isMoodKey,
  moodStyle,
  type MoodGroup,
} from './moods';

const SPEC_MOODS = [
  'calm',
  'content',
  'relieved',
  'joyful',
  'excited',
  'hopeful',
  'proud',
  'grateful',
  'reflective',
  'tired',
  'anxious',
  'sad',
  'stressed',
  'frustrated',
  'lonely',
] as const;

describe('mood map', () => {
  it('matches the 15 moods in SPEC §3.2 exactly', () => {
    expect([...MOOD_KEYS].sort()).toEqual([...SPEC_MOODS].sort());
  });

  it('assigns every mood to a known group', () => {
    const validGroups: MoodGroup[] = ['green', 'amber', 'lavender', 'brown', 'rose', 'grey'];
    for (const key of MOOD_KEYS) {
      expect(validGroups).toContain(MOOD_MAP[key].group);
    }
  });

  it('covers every non-grey group with at least one mood', () => {
    const colouredGroups: MoodGroup[] = ['green', 'amber', 'lavender', 'brown', 'rose'];
    const usedGroups = new Set(MOOD_KEYS.map((k) => MOOD_MAP[k].group));
    for (const g of colouredGroups) {
      expect(usedGroups.has(g)).toBe(true);
    }
  });

  it('falls back to the locked style for unknown / null moods', () => {
    expect(moodStyle(null).group).toBe('grey');
    expect(moodStyle(undefined)).toEqual(LOCKED_STYLE);
  });

  it('isMoodKey narrows strings correctly', () => {
    expect(isMoodKey('calm')).toBe(true);
    expect(isMoodKey('ecstatic')).toBe(false);
    expect(isMoodKey(42)).toBe(false);
  });
});
