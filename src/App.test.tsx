import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './app/App';

describe('App', () => {
  it('renders the Home placeholder at /', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });
});
