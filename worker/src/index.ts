import { LIMITS, analyzeRequestSchema, type ApiErrorBody } from '../../src/lib/request';
import { formatIssues } from '../../src/lib/schema';
import { analyzeDocument } from './analyze';
import { HttpError } from './errors';

export interface Env {
  GEMINI_API_KEY: string;
  GEMINI_MODELS: string;
  ALLOWED_ORIGINS: string;
  RATE_LIMITER: RateLimit;
}

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...headers } });
}

function errorResponse(error: HttpError, headers: Record<string, string> = {}): Response {
  const body: ApiErrorBody = { error: { code: error.code, message: error.message } };
  return json(body, error.status, headers);
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function list(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function payloadTooLarge(): HttpError {
  return new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Dokument jest zbyt duży do analizy.');
}

async function readBody(request: Request, maxBytes: number): Promise<string> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const result = await reader.read();
    if (result.done) break;
    const chunk: Uint8Array = result.value;
    size += chunk.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw payloadTooLarge();
    }
    chunks.push(chunk);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Oczekiwano danych w formacie JSON.');
  }
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > LIMITS.maxRequestBytes) throw payloadTooLarge();
  const body = await readBody(request, LIMITS.maxRequestBytes);
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Nieprawidłowy format żądania.');
  }
}

async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Dozwolona jest tylko metoda POST.');
  }
  const models = list(env.GEMINI_MODELS ?? '');
  if (!env.GEMINI_API_KEY || models.length === 0) {
    throw new HttpError(500, 'MISCONFIGURED', 'Serwer analizy nie jest skonfigurowany.');
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { success } = await env.RATE_LIMITER.limit({ key: ip });
  if (!success) {
    throw new HttpError(
      429,
      'RATE_LIMITED',
      'Zbyt wiele analiz w krótkim czasie. Odczekaj minutę i spróbuj ponownie.',
    );
  }

  const parsed = analyzeRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    throw new HttpError(
      400,
      'INVALID_REQUEST',
      `Nieprawidłowe dane wejściowe:\n${formatIssues(parsed.error)}`,
    );
  }

  const analysis = await analyzeDocument(parsed.data, {
    apiKey: env.GEMINI_API_KEY,
    models,
  });
  return json(analysis, 200);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ status: 'ok' }, 200);

    const origin = request.headers.get('Origin') ?? '';
    if (!list(env.ALLOWED_ORIGINS).includes(origin)) {
      return errorResponse(
        new HttpError(403, 'FORBIDDEN_ORIGIN', 'Żądania z tego źródła są niedozwolone.'),
      );
    }

    const cors = corsHeaders(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (url.pathname !== '/analyze') throw new HttpError(404, 'NOT_FOUND', 'Nie znaleziono.');
      const response = await handleAnalyze(request, env);
      for (const [name, value] of Object.entries(cors)) response.headers.set(name, value);
      return response;
    } catch (error) {
      const httpError =
        error instanceof HttpError
          ? error
          : new HttpError(500, 'INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd serwera.');
      return errorResponse(httpError, cors);
    }
  },
} satisfies ExportedHandler<Env>;
