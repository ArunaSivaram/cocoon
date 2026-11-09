import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Loader2, Lock, Mic, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { signIn } from '@/lib/auth';

interface LocationStateWithFrom {
  from?: { pathname?: string };
}

export function SignIn() {
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  async function handleSignIn() {
    if (loading) return;
    setLoading(true);
    try {
      await signIn();
      const from = (location.state as LocationStateWithFrom | null)?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    } catch {
      toast.error('Sign-in failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-4 py-8">
      <section className="card-soft w-full p-7 md:p-9">
        <div className="mb-6 flex size-14 items-center justify-center rounded-full bg-clay shadow-soft">
          <Mic className="size-6 text-white" aria-hidden />
        </div>

        <p className="label-eyebrow">COCOON</p>
        <h1 className="mt-2 font-serif text-[2rem] leading-tight md:text-[2.25rem]">
          Tell me about your day.
        </h1>
        <p className="mt-3 text-ink-soft">
          A quiet notebook that listens. Speak freely and get a journal entry in your own voice.
        </p>

        <ul className="mt-6 space-y-3 text-sm">
          <Bullet icon={<Mic className="size-4" />}>
            Just talk — I&apos;ll write it the way you would
          </Bullet>
          <Bullet icon={<Sparkles className="size-4" />}>
            Your own words, plus a gentle reflection
          </Bullet>
          <Bullet icon={<Lock className="size-4" />}>
            Your private journal; lock any page with a passcode
          </Bullet>
          <Bullet icon={<CalendarDays className="size-4" />}>
            See how your weeks feel on a mood calendar
          </Bullet>
        </ul>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-7 h-12 w-full gap-3 rounded-full border-rule bg-card text-ink shadow-soft hover:bg-parchment"
          onClick={handleSignIn}
          disabled={loading}
          aria-label="Continue with Google"
        >
          {loading ? (
            <Loader2 className="size-5 animate-spin text-clay" aria-hidden />
          ) : (
            <GoogleIcon className="size-5" />
          )}
          <span className="font-sans text-base">
            {loading ? 'Signing in…' : 'Continue with Google'}
          </span>
        </Button>

        <p className="mt-5 text-center text-xs text-ink-soft">
          Your entries are private to you. Audio is deleted after it&apos;s transcribed.
        </p>
      </section>
    </main>
  );
}

function Bullet({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-parchment text-clay">
        {icon}
      </span>
      <span className="text-ink">{children}</span>
    </li>
  );
}
