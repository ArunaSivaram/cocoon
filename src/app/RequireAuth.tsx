import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Gate for protected routes. If the user isn't signed in, we redirect to
 * /signin and remember where they were trying to go so SignIn can bounce
 * them back after they sign in.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { signedIn } = useAuth();
  const location = useLocation();
  if (!signedIn) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
