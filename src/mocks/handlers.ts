/**
 * MSW handlers for every SPEC §5 endpoint. Keep in sync with handlers in
 * the real server (steps 15–17). Business rules live in db.ts; this file
 * just translates between HTTP and db calls.
 */
import { delay, http, HttpResponse } from 'msw';
import type {
  ApiErrorBody,
  CalendarResponse,
  CreateEntryRequest,
  DeleteEntryRequest,
  EntriesListResponse,
  HealthResponse,
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
import * as db from './db';

const API = '/api';
const AI_DELAY_MS = 2000;

function requireAuth(request: Request): Response | null {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return HttpResponse.json(errorBody('unauthorized', 'Sign in to continue.'), { status: 401 });
  }
  return null;
}

function errorBody(code: ApiErrorBody['error']['code'], message: string): ApiErrorBody {
  return { error: { code, message } };
}

function dbResultToResponse<T>(
  result: db.DbResult<T>,
  success: (value: T) => Response,
): Response {
  if (result.ok) return success(result.value);
  return HttpResponse.json(errorBody(result.code, result.message), { status: result.status });
}

export const handlers = [
  // ---- Health (public) ----
  http.get(`${API}/health`, () => HttpResponse.json<HealthResponse>({ ok: true })),

  // ---- Profile ----
  http.get(`${API}/me`, ({ request }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    return HttpResponse.json<Profile>(db.getProfile());
  }),
  http.patch(`${API}/me`, async ({ request }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const body = (await request.json()) as UpdateMeRequest;
    return HttpResponse.json<Profile>(db.updateLocale(body.locale));
  }),

  // ---- Audio upload + transcription ----
  http.post(`${API}/audio/upload-url`, async ({ request }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const body = (await request.json()) as UploadUrlRequest;
    return HttpResponse.json<UploadUrlResponse>({
      path: `${db.getProfile().id}/${crypto.randomUUID()}.${body.ext}`,
      token: 'mock-upload-token',
    });
  }),
  http.post(`${API}/transcribe`, async ({ request }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const body = (await request.json()) as TranscribeRequest;
    await delay(AI_DELAY_MS);
    return HttpResponse.json<TranscribeResponse>({
      text:
        body.audio_path.length > 0
          ? "I'm testing out the recording. It's working the way I expected."
          : '',
    });
  }),

  // ---- Entries ----
  http.get(`${API}/entries`, ({ request }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor') ?? undefined;
    return HttpResponse.json<EntriesListResponse>(db.listEntries(cursor));
  }),
  http.post(`${API}/entries`, async ({ request }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const body = (await request.json()) as CreateEntryRequest;
    await delay(AI_DELAY_MS);
    const entry = db.createEntry(body);
    return HttpResponse.json(entry, { status: 201 });
  }),
  http.get(`${API}/entries/:id`, ({ request, params }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const result = db.getEntry(String(params.id));
    return dbResultToResponse(result, (entry) => HttpResponse.json(entry));
  }),
  http.post(`${API}/entries/:id/open`, async ({ request, params }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const body = (await request.json()) as OpenEntryRequest;
    const result = db.openEntry(String(params.id), body.passcode);
    return dbResultToResponse(result, (entry) => HttpResponse.json(entry));
  }),
  http.patch(`${API}/entries/:id`, async ({ request, params }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const body = (await request.json()) as UpdateEntryRequest;
    const result = db.updateEntry(String(params.id), body);
    return dbResultToResponse(result, (entry) => HttpResponse.json(entry));
  }),
  http.post(`${API}/entries/:id/lock`, async ({ request, params }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const body = (await request.json()) as LockEntryRequest;
    const result = db.lockEntry(String(params.id), body.passcode);
    return dbResultToResponse(result, (entry) => HttpResponse.json(entry));
  }),
  http.post(`${API}/entries/:id/remove-lock`, async ({ request, params }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const body = (await request.json()) as RemoveLockRequest;
    const result = db.removeLock(String(params.id), body.passcode);
    return dbResultToResponse(result, (entry) => HttpResponse.json(entry));
  }),
  http.post(`${API}/entries/:id/delete`, async ({ request, params }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const body = (await request.json()) as DeleteEntryRequest;
    const result = db.deleteEntry(String(params.id), body);
    return dbResultToResponse(result, () => new HttpResponse(null, { status: 204 }));
  }),

  // ---- Photos ----
  http.post(`${API}/entries/:id/photos`, async ({ request, params }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const form = await request.formData();
    const file = form.get('file');
    const passcode = form.get('passcode');
    if (!(file instanceof File)) {
      return HttpResponse.json(errorBody('bad_request', 'file is required.'), { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) {
      return HttpResponse.json(errorBody('payload_too_large', 'Max 4 MB per photo.'), {
        status: 413,
      });
    }
    // Mock doesn't actually store bytes — just a blob URL the browser can render.
    const url = URL.createObjectURL(file);
    const result = db.addPhoto(
      String(params.id),
      { bytes: file.size, width: 1600, height: 1600, url },
      typeof passcode === 'string' ? passcode : undefined,
    );
    return dbResultToResponse(result, (photo) =>
      HttpResponse.json<PhotoUploadResponse>({ photo }, { status: 201 }),
    );
  }),
  http.post(`${API}/entries/:id/photos/:pid/delete`, async ({ request, params }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const body = (await request.json().catch(() => ({}))) as { passcode?: string };
    const result = db.deletePhoto(String(params.id), String(params.pid), body.passcode);
    return dbResultToResponse(result, () => new HttpResponse(null, { status: 204 }));
  }),
  http.get(`${API}/photos`, ({ request }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    return HttpResponse.json<MemoryWallResponse>({ photos: db.allUnlockedPhotos() });
  }),

  // ---- Calendar ----
  http.get(`${API}/calendar`, ({ request }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const url = new URL(request.url);
    const month = url.searchParams.get('month');
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return HttpResponse.json(errorBody('bad_request', 'month must be YYYY-MM'), { status: 400 });
    }
    return HttpResponse.json<CalendarResponse>({ days: db.calendarForMonth(month) });
  }),

  // ---- Reminder ----
  http.get(`${API}/reminder`, ({ request }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    return HttpResponse.json<Reminder>(db.getReminder());
  }),
  http.put(`${API}/reminder`, async ({ request }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const body = (await request.json()) as ReminderInput;
    return HttpResponse.json<Reminder>(db.updateReminder(body));
  }),
  http.post(`${API}/reminder/test`, ({ request }) => {
    const unauth = requireAuth(request);
    if (unauth) return unauth;
    const result = db.sendTestReminder();
    return dbResultToResponse(result, () => new HttpResponse(null, { status: 204 }));
  }),
];
