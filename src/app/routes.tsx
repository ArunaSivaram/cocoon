import { Route, Routes } from 'react-router-dom';
import { SignIn } from '@/pages/SignIn';
import { Home } from '@/pages/Home';
import { Entry } from '@/pages/Entry';
import { MoodCalendar } from '@/pages/MoodCalendar';
import { MemoryWall } from '@/pages/MemoryWall';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/" element={<Home />} />
      <Route path="/entry/:id" element={<Entry />} />
      <Route path="/calendar" element={<MoodCalendar />} />
      <Route path="/memories" element={<MemoryWall />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NotFound() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Not found</h1>
      <p>This page doesn&apos;t exist yet.</p>
    </main>
  );
}
