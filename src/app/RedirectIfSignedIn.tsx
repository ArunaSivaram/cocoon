import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface LocationStateWithFrom {
  from?: { pathname?: string };
}

/**
 * Mirror of RequireAuth, for /signin: a signed-in user shouldn't see the
 * sign-in card; send them to wherever they were trying to reach (or /).
 */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { signedIn } = useAuth();
  const location = useLocation();
  if (signedIn) {
    const from = (location.state as LocationStateWithFrom | null)?.from?.pathname ?? '/';
    return <Navigate to={from} replace />;
  }
  return <>{children}</>;
}
