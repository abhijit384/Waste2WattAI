import { fetchAuthSession } from 'aws-amplify/auth';
import { z } from 'zod';
import {
  apiErrorSchema,
  createScanResponseSchema,
  paginatedScanListSchema,
  uploadResponseSchema,
  wasteScanSchema,
  type CreateScanRequest,
  type UploadRequest,
  type UploadResponse,
} from '@waste2watt/shared';
import type { FrontendConfig } from './config';

export class ApiClientError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export function createApi(config: FrontendConfig) {
  async function request<T>(path: string, schema: z.ZodType<T>, options: RequestInit = {}) {
    if (!config.configured) throw new ApiClientError('AWS configuration is required.', 0);
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken;
    if (!token) throw new ApiClientError('Your session has expired. Sign in again.', 401);
    const response = await fetch(`${config.VITE_API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.toString()}` },
      cache: 'no-store',
    });
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new ApiClientError('The service returned an invalid response.', response.status);
    }
    if (!response.ok) {
      const error = apiErrorSchema.safeParse(data);
      throw new ApiClientError(
        error.success ? error.data.error.message : 'The service could not complete this request.',
        response.status,
      );
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success)
      throw new ApiClientError('The service returned an unexpected response. Please retry.', 502);
    return parsed.data;
  }
  return {
    create: (input: CreateScanRequest, signal?: AbortSignal) =>
      request('/scans', createScanResponseSchema, {
        method: 'POST',
        body: JSON.stringify(input),
        ...(signal ? { signal } : {}),
      }),
    upload: (id: string, input: UploadRequest, signal?: AbortSignal) =>
      request(`/scans/${encodeURIComponent(id)}/upload-url`, uploadResponseSchema, {
        method: 'POST',
        body: JSON.stringify(input),
        ...(signal ? { signal } : {}),
      }),
    get: (id: string, signal?: AbortSignal) =>
      request(`/scans/${encodeURIComponent(id)}`, wasteScanSchema, {
        ...(signal ? { signal } : {}),
      }),
    list: (cursor?: string, signal?: AbortSignal) =>
      request(
        `/scans?limit=12${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
        paginatedScanListSchema,
        { ...(signal ? { signal } : {}) },
      ),
  };
}
export type ScanApi = ReturnType<typeof createApi>;
export function uploadImage(
  file: File,
  upload: UploadResponse,
  progress: (percent: number) => void,
  signal: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const data = new FormData();
    Object.entries(upload.fields).forEach(([key, value]) => data.append(key, value));
    data.append('file', file);
    const stop = () => xhr.abort();
    signal.addEventListener('abort', stop, { once: true });
    const finish = () => signal.removeEventListener('abort', stop);
    xhr.open('POST', upload.url);
    xhr.timeout = 120_000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        progress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      finish();
      if (xhr.status >= 200 && xhr.status < 300) {
        progress(100);
        resolve();
      } else reject(new Error('Image upload was rejected. Check your connection and retry.'));
    };
    xhr.onerror = xhr.ontimeout = () => {
      finish();
      reject(new Error('Image upload could not finish. Check your connection.'));
    };
    xhr.onabort = () => {
      finish();
      reject(new DOMException('Upload cancelled', 'AbortError'));
    };
    if (signal.aborted) {
      finish();
      reject(new DOMException('Upload cancelled', 'AbortError'));
      return;
    }
    xhr.send(data);
  });
}
