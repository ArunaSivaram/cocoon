import { format } from 'date-fns';
import { Layout } from '@/app/Layout';
import { DevEntriesProbe } from '@/components/dev/DevEntriesProbe';

export function Home() {
  const today = format(new Date(), 'EEEE, MMMM d');

  return (
    <Layout title="Today's page" date={today}>
      <section className="paper-sheet p-6 md:p-8">
        <p className="text-ink-soft">
          Placeholder — the mic card, &ldquo;Rather type it?&rdquo; mode, and past entries are
          built in step 7 (SPEC §2.2 &amp; §2.3).
        </p>
        <div className="mt-6 border-t border-rule/60 pt-4">
          <p className="label-eyebrow mb-2">Dev probe · past entries</p>
          <DevEntriesProbe />
        </div>
      </section>
    </Layout>
  );
}
