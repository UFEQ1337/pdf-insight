import { z } from 'zod';
import type { AnalyzeRequest } from '../lib/request';
import { analysisSchema, type Analysis } from '../lib/schema';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
const TIMEOUT_MS = 90_000;
const NON_RETRYABLE = new Set([400, 403, 413, 415, 422]);

const errorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export class ApiError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function send(request: AnalyzeRequest, signal: AbortSignal): Promise<Response> {
  try {
    return await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new ApiError('Analiza trwa zbyt długo. Spróbuj ponownie za chwilę.', true);
    }
    throw new ApiError(
      'Brak połączenia z serwerem analizy. Sprawdź połączenie z internetem i spróbuj ponownie.',
      true,
    );
  }
}

export async function analyzeDocument(
  request: AnalyzeRequest,
  signal: AbortSignal,
): Promise<Analysis> {
  if (!API_URL) {
    throw new ApiError('Aplikacja nie ma skonfigurowanego adresu API (VITE_API_URL).', false);
  }

  const response = await send(request, signal);
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = errorBodySchema.safeParse(body);
    throw new ApiError(
      parsedError.success
        ? parsedError.data.error.message
        : `Serwer analizy zwrócił błąd (HTTP ${response.status}).`,
      !NON_RETRYABLE.has(response.status),
    );
  }

  const parsed = analysisSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('Wynik analizy nie przeszedł walidacji schematu. Spróbuj ponownie.', true);
  }
  return parsed.data;
}
