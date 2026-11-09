import { Bell, CalendarDays, Images } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AccountMenu } from './AccountMenu';

interface HeaderProps {
  title: string;
  /** Shown on ≥ md next to the title, e.g. "Wednesday, November 4". */
  date?: string;
}

export function Header({ title, date }: HeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1 md:flex-row md:items-end md:gap-4">
        <div className="min-w-0">
          <p className="label-eyebrow">COCOON</p>
          <h1 className="font-serif text-2xl leading-tight md:text-[2rem]">{title}</h1>
        </div>
        {date && (
          <span className="hidden text-sm text-ink-soft md:block md:pb-1.5">{date}</span>
        )}
      </div>

      <nav className="flex shrink-0 items-center gap-1.5 md:gap-3" aria-label="Quick actions">
        <HeaderAction
          icon={<Bell />}
          label="Reminder"
          onClick={() => toast('Coming in step 12')}
        />
        <HeaderAction icon={<CalendarDays />} label="Mood calendar" to="/calendar" />
        <HeaderAction icon={<Images />} label="Memories" to="/memories" />
        <AccountMenu />
      </nav>
    </header>
  );
}

interface HeaderActionProps {
  icon: React.ReactNode;
  label: string;
  to?: string;
  onClick?: () => void;
}

function HeaderAction({ icon, label, to, onClick }: HeaderActionProps) {
  const className =
    'h-10 w-10 md:h-10 md:w-auto rounded-full border border-rule bg-card text-ink shadow-soft gap-2 px-0 md:px-4 hover:bg-parchment';

  const children = (
    <>
      {icon}
      <span className="hidden md:inline">{label}</span>
    </>
  );

  if (to) {
    return (
      <Button asChild variant="outline" size="default" aria-label={label} className={className}>
        <Link to={to}>{children}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      onClick={onClick}
      aria-label={label}
      className={className}
    >
      {children}
    </Button>
  );
}
