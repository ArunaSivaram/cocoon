import { HeartHandshake } from 'lucide-react';

export function SupportNoteCard() {
  return (
    <aside
      className="mt-5 flex items-start gap-3 rounded-[var(--radius-card)] p-4 md:p-5"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-parchment) 70%, white)',
        border: '1px solid color-mix(in srgb, var(--color-clay) 25%, transparent)',
      }}
      role="note"
    >
      <HeartHandshake aria-hidden className="mt-0.5 size-5 shrink-0 text-clay" />
      <div className="font-serif text-ink">
        <p className="text-[1rem] leading-7">
          If today feels heavy, you don&apos;t have to carry it alone.
        </p>
        <a
          href="https://findahelpline.com"
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-sm text-clay underline underline-offset-4 hover:no-underline"
        >
          Find someone to talk to
        </a>
      </div>
    </aside>
  );
}
