import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './app/App';

describe('App', () => {
  it("renders the Home page at /", () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: "Today's page" })).toBeInTheDocument();
    expect(screen.getByText('COCOON')).toBeInTheDocument();
  });
});
