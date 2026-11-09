/**
 * Six English fixture entries matching mockup `05-past-entries`. Tamil entry
 * from the mockup becomes English #3 (per CLAUDE.md "English only for MVP").
 * Entry #2 is labelled `tired` to match the lavender badge in the mockup.
 */

import type { Entry, Photo, Profile, Reminder } from '@/lib/types';

export const TEST_USER_ID = '00000000-0000-4000-8000-000000000001';

export const INITIAL_PROFILE: Profile = {
  id: TEST_USER_ID,
  email: 'test@cocoon.local',
  name: 'Test User',
  avatar_url: null,
  locale: 'en-US',
  created_at: '2026-10-01T04:00:00.000Z',
};

export const INITIAL_REMINDER: Reminder = {
  enabled: false,
  email: 'test@cocoon.local',
  time_local: '20:00',
  timezone: 'Asia/Singapore',
  last_sent_date: null,
  last_test_at: null,
};

/** Build a picsum.photos placeholder URL from a stable seed. */
function picsum(seed: string, size = 800): string {
  return `https://picsum.photos/seed/${seed}/${size}/${size}`;
}

/** Shape a photo without the parent entry_id (filled below). */
function photo(partial: Omit<Photo, 'entry_id' | 'user_id'>): Omit<Photo, 'entry_id'> {
  return { ...partial, user_id: TEST_USER_ID };
}

// ---- The 6 entries ----

const E1_ID = '11111111-1111-4111-8111-111111111111';
const E2_ID = '22222222-2222-4222-8222-222222222222';
const E3_ID = '33333333-3333-4333-8333-333333333333';
const E4_ID = '44444444-4444-4444-8444-444444444444';
const E5_ID = '55555555-5555-4555-8555-555555555555';
const E6_ID = '66666666-6666-4666-8666-666666666666';

function entry(
  id: string,
  base: Omit<Entry, 'user_id' | 'photos' | 'is_locked' | 'passcode' | 'locale' | 'timezone'> & {
    photos?: Array<Omit<Photo, 'entry_id'>>;
    isLocked?: boolean;
  },
): Entry {
  return {
    user_id: TEST_USER_ID,
    locale: 'en-US',
    timezone: 'Asia/Singapore',
    is_locked: base.isLocked ?? false,
    photos: (base.photos ?? []).map((p) => ({ ...p, entry_id: id })),
    id: base.id,
    entry_date: base.entry_date,
    title: base.title,
    mood: base.mood,
    body: base.body,
    interpretation: base.interpretation,
    reflection: base.reflection,
    notes: base.notes,
    transcript_raw: base.transcript_raw,
    support_note: base.support_note,
    created_at: base.created_at,
    updated_at: base.updated_at,
  };
}

export const INITIAL_ENTRIES: Entry[] = [
  entry(E1_ID, {
    id: E1_ID,
    entry_date: '2026-11-04',
    title: 'A Calming Evening Walk',
    mood: 'relieved',
    body:
      "I went for a walk along the water after work today. The sky was all pink and gold, and I could hear the waves really softly. I didn't think about anything in particular, which honestly felt like a small gift. By the time I got home I felt lighter than I had all week.",
    interpretation:
      "The walk gave me something I didn't know I needed — a bit of quiet. I think I'd been carrying more than I realised, and letting the sky do the talking for a while was enough to put it down.",
    reflection: 'A slow walk can undo a tight week.',
    notes: '',
    transcript_raw:
      "so i went for a walk along the water after work today um the sky was all pink and gold and i could hear the waves really softly i didn't think about anything in particular which honestly felt like like a small gift and by the time i got home i felt lighter than i had all week",
    support_note: false,
    created_at: '2026-11-04T12:34:00.000Z',
    updated_at: '2026-11-04T12:34:00.000Z',
    photos: [
      photo({
        id: `${E1_ID.slice(0, 29)}aaaa`,
        storage_path: `${TEST_USER_ID}/${E1_ID}/aaaa.jpg`,
        content_type: 'image/jpeg',
        size_bytes: 180_000,
        width: 800,
        height: 800,
        created_at: '2026-11-04T12:35:00.000Z',
        url: picsum('cocoon-sunset-walk'),
      }),
      photo({
        id: `${E1_ID.slice(0, 29)}bbbb`,
        storage_path: `${TEST_USER_ID}/${E1_ID}/bbbb.jpg`,
        content_type: 'image/jpeg',
        size_bytes: 175_000,
        width: 800,
        height: 800,
        created_at: '2026-11-04T12:36:00.000Z',
        url: picsum('cocoon-quiet-path'),
      }),
    ],
  }),
  entry(E2_ID, {
    id: E2_ID,
    entry_date: '2026-11-02',
    title: 'Tired Day, Light Evening',
    mood: 'tired',
    body:
      "Today was long. The morning calls kept running over and I barely got lunch. In the evening I made noodles and sat by the window with the lamp on. It wasn't much but I think it saved me.",
    interpretation:
      "There wasn't anything to fix today — just a tired day that wanted a small, warm ending. The noodles and the lamp weren't the point; stopping was.",
    reflection: "Sometimes the evening is the whole day's apology.",
    notes: 'Remember to block the calendar before 1pm on Mondays.',
    transcript_raw:
      "today was long the morning calls kept running over and i barely got lunch in the evening i made noodles and sat by the window with the lamp on it wasn't much but i think it saved me",
    support_note: false,
    created_at: '2026-11-02T14:15:00.000Z',
    updated_at: '2026-11-02T14:15:00.000Z',
    photos: [
      photo({
        id: `${E2_ID.slice(0, 29)}aaaa`,
        storage_path: `${TEST_USER_ID}/${E2_ID}/aaaa.jpg`,
        content_type: 'image/jpeg',
        size_bytes: 165_000,
        width: 800,
        height: 800,
        created_at: '2026-11-02T14:16:00.000Z',
        url: picsum('cocoon-warm-noodles'),
      }),
      photo({
        id: `${E2_ID.slice(0, 29)}bbbb`,
        storage_path: `${TEST_USER_ID}/${E2_ID}/bbbb.jpg`,
        content_type: 'image/jpeg',
        size_bytes: 155_000,
        width: 800,
        height: 800,
        created_at: '2026-11-02T14:17:00.000Z',
        url: picsum('cocoon-evening-lamp'),
      }),
    ],
  }),
  entry(E3_ID, {
    id: E3_ID,
    entry_date: '2026-10-30',
    title: 'A Cake for Mum',
    mood: 'proud',
    body:
      "I finally made the orange cake for Mum. I'd been putting it off because the icing scared me, but it actually turned out. Her face when she saw the candles — I'll keep that one.",
    interpretation:
      'This wasn\'t about the cake; it was about showing up with something I made myself. I felt a bit shy and really glad at the same time.',
    reflection: 'Doing one small thing for someone I love is worth more than a hundred bigger plans.',
    notes: '',
    transcript_raw:
      "i finally made the orange cake for mum i'd been putting it off because the icing scared me but it actually turned out her face when she saw the candles i'll keep that one",
    support_note: false,
    created_at: '2026-10-30T13:05:00.000Z',
    updated_at: '2026-10-30T13:05:00.000Z',
    photos: [
      photo({
        id: `${E3_ID.slice(0, 29)}aaaa`,
        storage_path: `${TEST_USER_ID}/${E3_ID}/aaaa.jpg`,
        content_type: 'image/jpeg',
        size_bytes: 195_000,
        width: 800,
        height: 800,
        created_at: '2026-10-30T13:06:00.000Z',
        url: picsum('cocoon-orange-cake'),
      }),
    ],
  }),
  entry(E4_ID, {
    id: E4_ID,
    entry_date: '2026-10-27',
    title: 'Deadline Worries Keeping Me Up',
    mood: 'anxious',
    body:
      "I couldn't sleep again last night. My head kept running through the launch checklist, the demo, the things I haven't written yet. Every time I closed my eyes it was another list. I know it will be fine but my chest doesn't know it yet.",
    interpretation:
      "Part of me is being asked to carry a lot this week. The to-do list is noisy but the real thing is that I want this to go well and I don't fully trust it yet. Both things can be true.",
    reflection: 'I can plan tomorrow in the morning, not at 2 a.m.',
    notes: '',
    transcript_raw:
      "i couldn't sleep again last night my head kept running through the launch checklist the demo the things i haven't written yet every time i closed my eyes it was another list i know it will be fine but my chest doesn't know it yet",
    support_note: false,
    created_at: '2026-10-27T18:14:00.000Z',
    updated_at: '2026-10-27T18:14:00.000Z',
    photos: [],
  }),
  entry(E5_ID, {
    id: E5_ID,
    entry_date: '2026-10-24',
    title: 'Tea and Rain on the Balcony',
    mood: 'calm',
    body:
      'It rained most of the morning. I made chai with ginger and just sat with it on the balcony, watching the garden get drenched. Nothing to do, nothing to prove.',
    interpretation:
      'A quiet Saturday with no plans found me instead of me finding it. I think I needed the silence as much as the tea.',
    reflection: 'Rain is a good excuse to slow down.',
    notes: '',
    transcript_raw:
      'it rained most of the morning i made chai with ginger and just sat with it on the balcony watching the garden get drenched nothing to do nothing to prove',
    support_note: false,
    created_at: '2026-10-24T04:40:00.000Z',
    updated_at: '2026-10-24T04:40:00.000Z',
    photos: [],
  }),
  entry(E6_ID, {
    id: E6_ID,
    entry_date: '2026-10-22',
    title: 'A Hard Conversation',
    mood: 'reflective',
    body:
      "I had a difficult talk with my brother tonight. Things were said that I don't want to write down anywhere that could be read easily. But I want to keep the memory, carefully.",
    interpretation:
      'Writing it feels important because forgetting would be a waste, but keeping it private feels important too. Both can be true.',
    reflection: 'I can hold a hard memory without carrying it everywhere.',
    notes: '',
    transcript_raw:
      "i had a difficult talk with my brother tonight things were said that i don't want to write down anywhere that could be read easily but i want to keep the memory carefully",
    support_note: false,
    created_at: '2026-10-22T15:50:00.000Z',
    updated_at: '2026-10-22T15:50:00.000Z',
    isLocked: true,
    photos: [],
  }),
];

/**
 * Passcode map for locked entries. Plain-text here because this is a
 * browser-only mock; the real server (step 17) uses PBKDF2-SHA256 (210 000
 * iterations) with a per-entry salt.
 */
export const INITIAL_PASSCODES: Record<string, string> = {
  [E6_ID]: '1234',
};
