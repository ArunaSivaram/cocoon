import { Lock } from 'lucide-react';
import { LOCKED_STYLE, moodStyle, type MoodKey } from '@/lib/moods';

interface MoodBadgeProps {
  /** Pass `null` or omit to render the "Locked" badge. */
  mood?: MoodKey | null;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<MoodBadgeProps['size']>, string> = {
  sm: 'text-[10.5px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export function MoodBadge({ mood, size = 'md', className }: MoodBadgeProps) {
  const locked = mood == null;
  const style = locked ? LOCKED_STYLE : moodStyle(mood);
  const label = locked ? 'Locked' : capitalise(mood as string);

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full font-sans font-medium',
        SIZE_CLASSES[size],
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ backgroundColor: style.badgeBg, color: style.badgeInk }}
    >
      {locked && <Lock aria-hidden className="size-3" />}
      {label}
    </span>
  );
}

function capitalise(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}
