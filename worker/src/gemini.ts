import { z } from 'zod';
import { HttpError } from './errors';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_OUTPUT_TOKENS = 8192;

export type GeminiPart = Record<string, unknown>;

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export interface GenerateRequest {
  systemInstruction: string;
  contents: GeminiContent[];
  responseSchema: object;
}

export interface GenerateResult {
  text: string;
  content: GeminiContent;
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
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
});

async function send(config: GeminiConfig, request: GenerateRequest): Promise<Response> {
  try {
    return await fetch(`${API_BASE}/${encodeURIComponent(config.model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new HttpError(
        504,
        'AI_TIMEOUT',
        'Model AI nie odpowiedział w wymaganym czasie. Spróbuj ponownie.',
      );
    }
    throw new HttpError(502, 'AI_UNREACHABLE', 'Nie udało się połączyć z usługą AI.');
  }
}

export async function generateJson(
  config: GeminiConfig,
  request: GenerateRequest,
): Promise<GenerateResult> {
  const response = await send(config, request);

  if (response.status === 429) {
    throw new HttpError(
      429,
      'AI_RATE_LIMIT',
      'Wyczerpano chwilowy limit darmowego API AI. Spróbuj ponownie za minutę.',
    );
  }
  if (response.status >= 500) {
    throw new HttpError(
      503,
      'AI_UNAVAILABLE',
      'Usługa AI jest chwilowo niedostępna. Spróbuj ponownie za chwilę.',
    );
  }
  if (!response.ok) {
    throw new HttpError(
      502,
      'AI_REQUEST_FAILED',
      `Usługa AI odrzuciła żądanie (HTTP ${response.status}).`,
    );
  }

  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new HttpError(502, 'AI_BAD_RESPONSE', 'Usługa AI zwróciła nieoczekiwaną odpowiedź.');
  }
  if (parsed.data.promptFeedback?.blockReason) {
    throw new HttpError(422, 'AI_BLOCKED', 'Usługa AI odmówiła przetworzenia tego dokumentu.');
  }

  const parts = parsed.data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((part) => !part.thought && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');

  return { text, content: { role: 'model', parts } };
}
