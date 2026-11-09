import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { useInlineEdit } from './useInlineEdit';

vi.mock('sonner', () => {
  const mock = Object.assign(vi.fn(), { error: vi.fn() });
  return { toast: mock };
});

const toastMock = toast as unknown as ReturnType<typeof vi.fn> & { error: ReturnType<typeof vi.fn> };

beforeEach(() => {
  toastMock.mockClear();
  toastMock.error.mockClear();
});
afterEach(() => {
  toastMock.mockClear();
  toastMock.error.mockClear();
});

describe('useInlineEdit', () => {
  it('starts not editing with draft equal to initial', () => {
    const { result } = renderHook(() =>
      useInlineEdit({ initial: 'hello', onSave: async () => {} }),
    );
    expect(result.current.isEditing).toBe(false);
    expect(result.current.draft).toBe('hello');
    expect(result.current.dirty).toBe(false);
  });

  it('startEditing seeds the draft and flips isEditing', () => {
    const { result } = renderHook(() =>
      useInlineEdit({ initial: 'hello', onSave: async () => {} }),
    );
    act(() => result.current.startEditing());
    expect(result.current.isEditing).toBe(true);
    expect(result.current.draft).toBe('hello');
  });

  it('setDraft marks the state dirty', () => {
    const { result } = renderHook(() =>
      useInlineEdit({ initial: 'hello', onSave: async () => {} }),
    );
    act(() => result.current.startEditing());
    act(() => result.current.setDraft('hello there'));
    expect(result.current.draft).toBe('hello there');
    expect(result.current.dirty).toBe(true);
  });

  it('cancel restores the draft and exits edit mode', () => {
    const { result } = renderHook(() =>
      useInlineEdit({ initial: 'hello', onSave: async () => {} }),
    );
    act(() => result.current.startEditing());
    act(() => result.current.setDraft('changed'));
    act(() => result.current.cancel());
    expect(result.current.isEditing).toBe(false);
    expect(result.current.draft).toBe('hello');
  });

  it('save on success toasts Saved. and leaves edit mode', async () => {
    const onSave = vi.fn(async (_v: string) => {});
    const { result } = renderHook(() => useInlineEdit({ initial: 'a', onSave }));
    act(() => result.current.startEditing());
    act(() => result.current.setDraft('b'));
    await act(async () => {
      await result.current.save();
    });
    expect(onSave).toHaveBeenCalledWith('b');
    expect(result.current.isEditing).toBe(false);
    expect(toastMock).toHaveBeenCalledWith('Saved.');
  });

  it('save on reject toasts the error and stays in edit mode', async () => {
    const onSave = vi.fn(async () => {
      throw new Error('nope');
    });
    const { result } = renderHook(() =>
      useInlineEdit({ initial: 'a', onSave, errorMessage: 'bad!' }),
    );
    act(() => result.current.startEditing());
    act(() => result.current.setDraft('b'));
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.isEditing).toBe(true);
    expect(result.current.draft).toBe('b');
    expect(toastMock.error).toHaveBeenCalledWith('bad!');
    expect(toastMock).not.toHaveBeenCalledWith('Saved.');
  });

  it('mid-edit initial change does not clobber the draft', () => {
    const { result, rerender } = renderHook(
      ({ initial }: { initial: string }) =>
        useInlineEdit({ initial, onSave: async () => {} }),
      { initialProps: { initial: 'a' } },
    );
    act(() => result.current.startEditing());
    act(() => result.current.setDraft('typing…'));
    // API answer arrives
    rerender({ initial: 'server-updated' });
    expect(result.current.draft).toBe('typing…');
    // dirty is computed against the baseline captured at startEditing time.
    expect(result.current.dirty).toBe(true);
  });
});
