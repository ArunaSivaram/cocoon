import { ArrowLeft, Lock, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const comingSoon = () => toast('Coming in step 10');

export function EntryTopBar() {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between">
      <Button
        type="button"
        variant="ghost"
        className="gap-2 px-3 text-ink hover:bg-parchment"
        onClick={() => navigate('/')}
      >
        <ArrowLeft aria-hidden className="size-4" />
        <span className="font-sans text-sm">Back to journal</span>
      </Button>
      <div className="flex items-center gap-1 md:gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={comingSoon}
          aria-label="Lock"
          className="gap-2 px-3 text-ink hover:bg-parchment"
        >
          <Lock aria-hidden className="size-4" />
          <span className="hidden font-sans text-sm md:inline">Lock</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={comingSoon}
          aria-label="Delete"
          className="gap-2 px-3 text-ink hover:bg-rose-50 hover:text-[color:var(--color-recording)]"
        >
          <Trash2 aria-hidden className="size-4" />
          <span className="hidden font-sans text-sm md:inline">Delete</span>
        </Button>
      </div>
    </div>
  );
}
