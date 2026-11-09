/**
 * Typed fetch wrapper for the Cocoon API.
 *
 * Usage:
 *   const me = await api.get<Profile>('/me');
 *   const entry = await api.post<CreateEntryRequest, Entry>('/entries', body);
 *
 * Errors are thrown as APIError with a typed code taken from
 * SPEC §5's error envelope `{error: {code, message}}`.
 */

import { getSession } from './auth';
import type { ApiErrorCode, ApiErrorBody } from './types';

const BASE_URL = '/api';

export class APIError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  /** Pass `true` for /api/health which doesn't require a bearer token. */
  public?: boolean;
  signal?: AbortSignal;
}

async function request(
  method: string,
  path: string,
  body?: BodyInit | null,
  extraHeaders?: HeadersInit,
  options: RequestOptions = {},
): Promise<Response> {
  const headers = new Headers(extraHeaders);
  if (!options.public) {
    const session = getSession();
    if (!session) {
      throw new APIError(401, 'unauthorized', 'You are signed out.');
    }
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ?? undefined,
    signal: options.signal,
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return res;
}

async function toApiError(res: Response): Promise<APIError> {
  let code: ApiErrorCode = 'server_error';
  let message = res.statusText || 'Something went wrong.';
  try {
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = (await res.json()) as Partial<ApiErrorBody>;
      if (body?.error?.code) code = body.error.code;
      if (body?.error?.message) message = body.error.message;
    }
  } catch {
    // Fall through with defaults.
  }
  // Map common status codes when the body didn't give us a code.
  if (code === 'server_error') {
    code = statusToCode(res.status);
  }
  return new APIError(res.status, code, message);
}

function statusToCode(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 413:
      return 'payload_too_large';
    case 423:
      return 'locked';
    case 429:
      return 'rate_limited';
    default:
      return status >= 500 ? 'server_error' : 'bad_request';
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function buildQuery(params?: Record<string, string | number | undefined | null>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(
    (pair): pair is [string, string | number] => pair[1] !== undefined && pair[1] !== null,
  );
  if (entries.length === 0) return '';
  const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
  return `?${qs}`;
}

export const api = {
  async get<T>(
    path: string,
    params?: Record<string, string | number | undefined | null>,
    options?: RequestOptions,
  ): Promise<T> {
    const res = await request('GET', `${path}${buildQuery(params)}`, undefined, undefined, options);
    return parseJson<T>(res);
  },
  async post<TReq, TRes>(path: string, body?: TReq, options?: RequestOptions): Promise<TRes> {
    const res = await request(
      'POST',
      path,
      body === undefined ? null : JSON.stringify(body),
      body === undefined ? undefined : { 'content-type': 'application/json' },
      options,
    );
    return parseJson<TRes>(res);
  },
  async patch<TReq, TRes>(path: string, body: TReq, options?: RequestOptions): Promise<TRes> {
    const res = await request(
      'PATCH',
      path,
      JSON.stringify(body),
      { 'content-type': 'application/json' },
      options,
    );
    return parseJson<TRes>(res);
  },
  async put<TReq, TRes>(path: string, body: TReq, options?: RequestOptions): Promise<TRes> {
    const res = await request(
      'PUT',
      path,
      JSON.stringify(body),
      { 'content-type': 'application/json' },
      options,
    );
    return parseJson<TRes>(res);
  },
  async multipart<TRes>(path: string, form: FormData, options?: RequestOptions): Promise<TRes> {
    // Browser sets the multipart boundary automatically — don't set content-type.
    const res = await request('POST', path, form, undefined, options);
    return parseJson<TRes>(res);
  },
};
