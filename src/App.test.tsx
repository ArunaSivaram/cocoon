import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './app/App';
import { signIn, signOut } from './lib/auth';

beforeEach(() => {
  localStorage.clear();
  signOut();
});
afterEach(() => {
  localStorage.clear();
  signOut();
});

describe('App', () => {
  it('redirects unauthenticated / to the sign-in card', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Tell me about your day.' }),
    ).toBeInTheDocument();
  });

  it('shows Home when a session is present', async () => {
    await signIn();
    render(<App />);
    expect(screen.getByRole('heading', { name: "Today's page" })).toBeInTheDocument();
    expect(screen.getByText('COCOON')).toBeInTheDocument();
  });
});
