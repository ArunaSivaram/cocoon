/**
 * TanStack Query hooks — one per SPEC §5 endpoint.
 *
 * Query keys are tuples so they can be invalidated with the right scope:
 *   ['entries']           — list cache(s)
 *   ['entries', cursor]   — a specific page
 *   ['entry', id]         — a single entry
 *   ['calendar', month]   — month view
 *   ['photos']            — memory wall
 *   ['me'] / ['reminder'] — singletons
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CalendarResponse,
  CreateEntryRequest,
  DeleteEntryRequest,
  EntriesListResponse,
  Entry,
  LockEntryRequest,
  MemoryWallResponse,
  OpenEntryRequest,
  PhotoUploadResponse,
  Profile,
  RemoveLockRequest,
  Reminder,
  ReminderInput,
  TranscribeRequest,
  TranscribeResponse,
  UpdateEntryRequest,
  UpdateMeRequest,
  UploadUrlRequest,
  UploadUrlResponse,
} from '@/lib/types';

// ---------- Queries ----------

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Profile>('/me'),
  });
}

export function useEntries(cursor?: string) {
  return useQuery({
    queryKey: ['entries', cursor ?? null],
    queryFn: () => api.get<EntriesListResponse>('/entries', { cursor: cursor ?? null }),
  });
}

export function useEntry(id: string | undefined) {
  return useQuery({
    queryKey: ['entry', id ?? ''],
    queryFn: () => api.get<Entry>(`/entries/${id}`),
    enabled: typeof id === 'string' && id.length > 0,
  });
}

export function useCalendar(month: string) {
  return useQuery({
    queryKey: ['calendar', month],
    queryFn: () => api.get<CalendarResponse>('/calendar', { month }),
  });
}

export function useMemoryWall() {
  return useQuery({
    queryKey: ['photos'],
    queryFn: () => api.get<MemoryWallResponse>('/photos'),
  });
}

export function useReminder() {
  return useQuery({
    queryKey: ['reminder'],
    queryFn: () => api.get<Reminder>('/reminder'),
  });
}

// ---------- Mutations ----------

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeRequest) => api.patch<UpdateMeRequest, Profile>('/me', body),
    onSuccess: (profile) => qc.setQueryData(['me'], profile),
  });
}

export function useRequestUploadUrl() {
  return useMutation({
    mutationFn: (body: UploadUrlRequest) =>
      api.post<UploadUrlRequest, UploadUrlResponse>('/audio/upload-url', body),
  });
}

export function useTranscribe() {
  return useMutation({
    mutationFn: (body: TranscribeRequest) =>
      api.post<TranscribeRequest, TranscribeResponse>('/transcribe', body),
  });
}

export function useCreateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEntryRequest) =>
      api.post<CreateEntryRequest, Entry>('/entries', body),
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: ['calendar'] });
      qc.setQueryData(['entry', entry.id], entry);
    },
  });
}

export function useOpenEntry(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OpenEntryRequest) =>
      api.post<OpenEntryRequest, Entry>(`/entries/${id}/open`, body),
    onSuccess: (entry) => qc.setQueryData(['entry', id], entry),
  });
}

export function useUpdateEntry(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateEntryRequest) =>
      api.patch<UpdateEntryRequest, Entry>(`/entries/${id}`, body),
    onSuccess: (entry) => {
      qc.setQueryData(['entry', id], entry);
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useLockEntry(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LockEntryRequest) =>
      api.post<LockEntryRequest, Entry>(`/entries/${id}/lock`, body),
    onSuccess: (entry) => {
      qc.setQueryData(['entry', id], entry);
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: ['calendar'] });
      qc.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

export function useRemoveLock(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RemoveLockRequest) =>
      api.post<RemoveLockRequest, Entry>(`/entries/${id}/remove-lock`, body),
    onSuccess: (entry) => {
      qc.setQueryData(['entry', id], entry);
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: ['calendar'] });
      qc.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

export function useDeleteEntry(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DeleteEntryRequest) =>
      api.post<DeleteEntryRequest, void>(`/entries/${id}/delete`, body),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['entry', id] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: ['calendar'] });
      qc.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

export function useUploadPhoto(entryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, passcode }: { file: File; passcode?: string }) => {
      const form = new FormData();
      form.set('file', file);
      if (passcode) form.set('passcode', passcode);
      return api.multipart<PhotoUploadResponse>(`/entries/${entryId}/photos`, form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', entryId] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

export function useDeletePhoto(entryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ photoId, passcode }: { photoId: string; passcode?: string }) =>
      api.post<{ passcode?: string }, void>(
        `/entries/${entryId}/photos/${photoId}/delete`,
        passcode ? { passcode } : {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', entryId] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

export function useUpdateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReminderInput) => api.put<ReminderInput, Reminder>('/reminder', body),
    onSuccess: (reminder) => qc.setQueryData(['reminder'], reminder),
  });
}

export function useSendTestReminder() {
  return useMutation({
    mutationFn: () => api.post<undefined, void>('/reminder/test'),
  });
}
