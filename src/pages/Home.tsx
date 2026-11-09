import { useState } from 'react';
import { Layout } from '@/app/Layout';
import { FirstTimeHint } from '@/components/home/FirstTimeHint';
import { MicCard } from '@/components/home/MicCard';
import { PastEntries } from '@/components/home/PastEntries';
import { TypeCard } from '@/components/home/TypeCard';
import { formatHomeDate } from '@/lib/dates';

export function Home() {
  const [mode, setMode] = useState<'voice' | 'typed'>('voice');
  const today = formatHomeDate(new Date());

  return (
    <Layout title="Today's page" date={today}>
      <FirstTimeHint />
      {mode === 'voice' ? (
        <MicCard onSwitchToTyped={() => setMode('typed')} />
      ) : (
        <TypeCard onSwitchToVoice={() => setMode('voice')} />
      )}
      <PastEntries className="mt-8 md:mt-10" />
    </Layout>
  );
}
