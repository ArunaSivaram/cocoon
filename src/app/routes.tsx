import { Route, Routes } from 'react-router-dom';
import { SignIn } from '@/pages/SignIn';
import { Home } from '@/pages/Home';
import { Entry } from '@/pages/Entry';
import { MoodCalendar } from '@/pages/MoodCalendar';
import { MemoryWall } from '@/pages/MemoryWall';
import { DevMic } from '@/pages/DevMic';
import { RequireAuth } from './RequireAuth';
import { RedirectIfSignedIn } from './RedirectIfSignedIn';

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/signin"
        element={
          <RedirectIfSignedIn>
            <SignIn />
          </RedirectIfSignedIn>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/entry/:id"
        element={
          <RequireAuth>
            <Entry />
          </RequireAuth>
        }
      />
      <Route
        path="/calendar"
        element={
          <RequireAuth>
            <MoodCalendar />
          </RequireAuth>
        }
      />
      <Route
        path="/memories"
        element={
          <RequireAuth>
            <MemoryWall />
          </RequireAuth>
        }
      />
      {/* Hidden dev page, public so it's easy to hit on a phone over HTTPS. */}
      <Route path="/dev/mic" element={<DevMic />} />
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
