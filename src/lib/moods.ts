/**
 * Mood map — single source of truth for Cocoon's mood vocabulary and colours.
 * Stays in sync with CLAUDE.md §Design system and SPEC §3.2. The AI prompt
 * (step 16) will import MOOD_KEYS so it can never return a mood the UI
 * doesn't know how to render.
 */

export const MOOD_KEYS = [
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

export type MoodKey = (typeof MOOD_KEYS)[number];
export type MoodGroup = 'green' | 'amber' | 'lavender' | 'brown' | 'rose' | 'grey';

export interface MoodStyle {
  group: MoodGroup;
  dot: string; // Solid colour for dots / mic — CSS var reference.
  badgeBg: string; // Soft tint for the badge pill background.
  badgeInk: string; // Readable ink colour for the badge label.
}

const GROUP_STYLES: Record<MoodGroup, Omit<MoodStyle, 'group'>> = {
  green: {
    dot: 'var(--color-mood-green)',
    badgeBg: '#E3EFE9',
    badgeInk: '#2C5E4C',
  },
  amber: {
    dot: 'var(--color-mood-amber)',
    badgeBg: '#F7EAD3',
    badgeInk: '#8A5F1E',
  },
  lavender: {
    dot: 'var(--color-mood-lavender)',
    badgeBg: '#EAE3F3',
    badgeInk: '#5A4890',
  },
  brown: {
    dot: 'var(--color-mood-brown)',
    badgeBg: '#EDE3D4',
    badgeInk: '#6E543A',
  },
  rose: {
    dot: 'var(--color-mood-rose)',
    badgeBg: '#F5DEDA',
    badgeInk: '#8E3A2F',
  },
  grey: {
    dot: 'var(--color-mood-grey)',
    badgeBg: '#EBE5DD',
    badgeInk: '#645B52',
  },
};

const MOOD_GROUP: Record<MoodKey, MoodGroup> = {
  calm: 'green',
  content: 'green',
  relieved: 'green',
  joyful: 'amber',
  excited: 'amber',
  hopeful: 'amber',
  proud: 'amber',
  grateful: 'brown',
  reflective: 'lavender',
  tired: 'lavender',
  anxious: 'rose',
  sad: 'rose',
  stressed: 'rose',
  frustrated: 'rose',
  lonely: 'rose',
};

export const MOOD_MAP: Record<MoodKey, MoodStyle> = Object.fromEntries(
  MOOD_KEYS.map((k) => {
    const group = MOOD_GROUP[k];
    return [k, { group, ...GROUP_STYLES[group] }];
  }),
) as Record<MoodKey, MoodStyle>;

export const LOCKED_STYLE: MoodStyle = { group: 'grey', ...GROUP_STYLES.grey };

export function moodStyle(mood: MoodKey | null | undefined): MoodStyle {
  if (!mood) return LOCKED_STYLE;
  return MOOD_MAP[mood];
}

export function isMoodKey(value: unknown): value is MoodKey {
  return typeof value === 'string' && (MOOD_KEYS as readonly string[]).includes(value);
}
