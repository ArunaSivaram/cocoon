import type { ReactNode } from 'react';
import { Header } from '@/components/header/Header';

interface LayoutProps {
  title: string;
  /** Shown next to the title on ≥ md, e.g. "Wednesday, November 4". */
  date?: string;
  children: ReactNode;
}

export function Layout({ title, date, children }: LayoutProps) {
  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-[720px] px-4 pt-6 md:max-w-[960px] md:pt-10">
        <Header title={title} date={date} />
        <main className="mt-6 md:mt-8">{children}</main>
      </div>
    </div>
  );
}
