import { Layout } from '@/app/Layout';

export function MemoryWall() {
  return (
    <Layout title="Little pieces of my days">
      <section className="paper-sheet p-6 md:p-8">
        <p className="label-eyebrow">Memory wall</p>
        <p className="mt-2 text-ink-soft">
          Placeholder — photos from unlocked entries, grouped by month, are built in step 11
          (SPEC §2.7).
        </p>
      </section>
    </Layout>
  );
}
