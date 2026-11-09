import { Layout } from '@/app/Layout';

export function MoodCalendar() {
  return (
    <Layout title="How my days have felt">
      <section className="paper-sheet p-6 md:p-8">
        <p className="label-eyebrow">Mood calendar</p>
        <p className="mt-2 text-ink-soft">
          Placeholder — the month grid and &ldquo;This month, I felt mostly…&rdquo; summary are
          built in step 11 (SPEC §2.6).
        </p>
      </section>
    </Layout>
  );
}
