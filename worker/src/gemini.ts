import { z } from 'zod';
import { HttpError } from './errors';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const CALL_TIMEOUT_MS = 25_000;
const MIN_CALL_MS = 3_000;
const MAX_OUTPUT_TOKENS = 8192;

export type GeminiPart = Record<string, unknown>;

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiConfig {
  apiKey: string;
  models: string[];
  deadline: number;
}

export interface GenerateRequest {
  systemInstruction: string;
  contents: GeminiContent[];
  responseSchema: object;
}

export interface GenerateResult {
  text: string;
  model: string;
}

const responseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z
              .array(
                z.looseObject({ text: z.string().optional(), thought: z.boolean().optional() }),
              )
              .optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
});

const ERRORS = {
  rateLimit: () =>
    new HttpError(
      429,
      'AI_RATE_LIMIT',
      'Wyczerpano chwilowy limit darmowego API AI. Spróbuj ponownie za minutę.',
    ),
  unavailable: () =>
    new HttpError(
      503,
      'AI_UNAVAILABLE',
      'Usługa AI jest chwilowo przeciążona. Spróbuj ponownie za chwilę.',
    ),
  timeout: () =>
    new HttpError(504, 'AI_TIMEOUT', 'Model AI nie odpowiedział na czas. Spróbuj ponownie.'),
  rejected: (status: number) =>
    new HttpError(502, 'AI_REQUEST_FAILED', `Usługa AI odrzuciła żądanie (HTTP ${status}).`),
  badResponse: () =>
    new HttpError(502, 'AI_BAD_RESPONSE', 'Usługa AI zwróciła nieoczekiwaną odpowiedź.'),
  blocked: () =>
    new HttpError(422, 'AI_BLOCKED', 'Usługa AI odmówiła przetworzenia tego dokumentu.'),
};

class TransientError extends Error {
  constructor(readonly httpError: HttpError) {
    super(httpError.message);
  }
}

async function callModel(
  model: string,
  apiKey: string,
  request: GenerateRequest,
  timeoutMs: number,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.systemInstruction }] },
        contents: request.contents,
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: request.responseSchema,
          thinkingConfig: { thinkingLevel: 'low' },
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw new TransientError(timedOut ? ERRORS.timeout() : ERRORS.unavailable());
  }

  if (response.status === 429) throw new TransientError(ERRORS.rateLimit());
  if (response.status === 403 || response.status >= 500) {
    throw new TransientError(ERRORS.unavailable());
  }
  if (!response.ok) throw ERRORS.rejected(response.status);

  const parsed = responseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new TransientError(ERRORS.badResponse());
  if (parsed.data.promptFeedback?.blockReason) throw ERRORS.blocked();

  return (parsed.data.candidates?.[0]?.content?.parts ?? [])
    .filter((part) => !part.thought && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
}

export async function generateJson(
  config: GeminiConfig,
  request: GenerateRequest,
): Promise<GenerateResult> {
  let lastError: HttpError = ERRORS.timeout();
  for (const model of config.models) {
    const remaining = config.deadline - Date.now();
    if (remaining < MIN_CALL_MS) break;
    try {
      const text = await callModel(
        model,
        config.apiKey,
        request,
        Math.min(CALL_TIMEOUT_MS, remaining),
      );
      return { text, model };
    } catch (error) {
      if (!(error instanceof TransientError)) throw error;
      lastError = error.httpError;
    }
  }
  throw lastError;
}
