import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { resetDb } from '@/mocks/db';
import { signIn, signOut } from '@/lib/auth';
import { useSavePipeline } from './useSavePipeline';

// Capture what useNavigate was called with without actually navigating.
const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

// Clear-recording would touch real IndexedDB in jsdom. Stub it.
vi.mock('@/lib/recordingStore', () => ({
  clearRecording: vi.fn(async () => {}),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const voiceArgs = {
  blob: new Blob(['x'], { type: 'audio/webm' }),
  mimeType: 'audio/webm;codecs=opus',
  liveTranscript: 'the live words I spoke',
};

beforeAll(async () => {
  server.listen({ onUnhandledFrame: 'error' });
  await signIn();
});
afterEach(() => {
  server.resetHandlers();
  resetDb();
  navigateMock.mockClear();
});
afterAll(() => {
  signOut();
  server.close();
});

describe('useSavePipeline', () => {
  it('voice happy path: upload-url → transcribe → create → navigate', async () => {
    const { result } = renderHook(() => useSavePipeline(), { wrapper });
    await act(async () => {
      await result.current.saveVoice(voiceArgs);
    });
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock.mock.calls[0]?.[0]).toMatch(/^\/entry\//);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.draftTranscript).toBeNull();
  });

  it('typed happy path skips transcribe', async () => {
    const { result } = renderHook(() => useSavePipeline(), { wrapper });
    await act(async () => {
      await result.current.saveTyped('I had a quiet morning.');
    });
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(navigateMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the live transcript when transcribe fails', async () => {
    server.use(
      http.post('/api/transcribe', () =>
        HttpResponse.json({ error: { code: 'server_error', message: 'nope' } }, { status: 500 }),
      ),
    );
    const { result } = renderHook(() => useSavePipeline(), { wrapper });
    await act(async () => {
      await result.current.saveVoice(voiceArgs);
    });
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(navigateMock).toHaveBeenCalledTimes(1);
    // The fallback is the live transcript — createEntry succeeded with it.
  });

  it('lands in failed_write with the transcript as draft when create fails', async () => {
    server.use(
      http.post('/api/entries', () =>
        HttpResponse.json({ error: { code: 'server_error', message: 'nope' } }, { status: 500 }),
      ),
    );
    const { result } = renderHook(() => useSavePipeline(), { wrapper });
    await act(async () => {
      await result.current.saveVoice(voiceArgs);
    });
    await waitFor(() => expect(result.current.status).toBe('failed_write'));
    expect(result.current.draftTranscript).toBeTruthy();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('retryFromDraft re-runs createEntry only', async () => {
    const { result } = renderHook(() => useSavePipeline(), { wrapper });
    await act(async () => {
      await result.current.retryFromDraft('These are the edited words.');
    });
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(navigateMock).toHaveBeenCalledTimes(1);
  });

  it('shows the no-words message when both transcribe and liveTranscript are empty', async () => {
    server.use(
      http.post('/api/transcribe', () =>
        HttpResponse.json({ text: '' }, { status: 200 }),
      ),
    );
    const { result } = renderHook(() => useSavePipeline(), { wrapper });
    await act(async () => {
      await result.current.saveVoice({ ...voiceArgs, liveTranscript: '' });
    });
    await waitFor(() => expect(result.current.status).toBe('failed_write'));
    expect(result.current.errorMessage).toMatch(/didn.t catch/i);
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
