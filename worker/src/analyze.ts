import type { z } from 'zod';
import { chunkDocument } from '../../src/lib/chunk';
import { INJECTION_WARNING, containsPromptInjection } from '../../src/lib/injection';
import { mergeResults } from '../../src/lib/merge';
import type { AnalyzeRequest } from '../../src/lib/request';
import {
  aiResultSchema,
  analysisSchema,
  formatIssues,
  summaryResultSchema,
  type Analysis,
} from '../../src/lib/schema';
import { HttpError } from './errors';
import { generateJson, type GeminiConfig, type GeminiContent } from './gemini';

export interface AnalyzeConfig {
  apiKey: string;
  models: string[];
}
import {
  ANALYSIS_RESPONSE_SCHEMA,
  ANALYSIS_SYSTEM_PROMPT,
  SUMMARY_RESPONSE_SCHEMA,
  SUMMARY_SYSTEM_PROMPT,
  buildChunkContents,
  buildSummaryContents,
} from './prompt';

const MAX_ATTEMPTS = 2;
const MAX_CHUNKS = 8;
const TIME_BUDGET_MS = 28_000;

type Validation<T> = { ok: true; data: T } | { ok: false; feedback: string };

function validate<T>(text: string, schema: z.ZodType<T>): Validation<T> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, feedback: 'The response was not valid JSON.' };
  }
  const result = schema.safeParse(json);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, feedback: formatIssues(result.error) };
}

async function generateValidated<T>(
  config: GeminiConfig,
  systemInstruction: string,
  contents: GeminiContent[],
  responseSchema: object,
  schema: z.ZodType<T>,
  usedModels: Set<string>,
): Promise<T> {
  const history = [...contents];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { text, model } = await generateJson(config, {
      systemInstruction,
      contents: history,
      responseSchema,
    });
    usedModels.add(model);
    const result = validate(text, schema);
    if (result.ok) return result.data;
    if (text) {
      history.push(
        { role: 'model', parts: [{ text }] },
        {
          role: 'user',
          parts: [
            {
              text: `Your previous answer failed validation:
${result.feedback}
Return the complete, corrected JSON object.`,
            },
          ],
        },
      );
    }
  }
  throw new HttpError(
    502,
    'AI_INVALID_OUTPUT',
    'Model AI zwrócił dane niezgodne ze schematem (również po ponownej próbie). Spróbuj ponownie.',
  );
}

function skippedPagesWarning(pages: number[]): string[] {
  if (pages.length === 0) return [];
  return [
    `Strony bez warstwy tekstowej pominięte z powodu limitu OCR: ${pages.join(', ')}. Dane z tych stron nie zostały uwzględnione.`,
  ];
}

export async function analyzeDocument(
  request: AnalyzeRequest,
  { apiKey, models }: AnalyzeConfig,
): Promise<Analysis> {
  const startedAt = Date.now();
  const config: GeminiConfig = { apiKey, models, deadline: startedAt + TIME_BUDGET_MS };
  const usedModels = new Set<string>();
  const chunks = chunkDocument(request.pages, request.images);
  if (chunks.length > MAX_CHUNKS) {
    throw new HttpError(413, 'DOCUMENT_TOO_LONG', 'Dokument jest zbyt długi do analizy.');
  }

  const results = await Promise.all(
    chunks.map((chunk, index) =>
      generateValidated(
        config,
        ANALYSIS_SYSTEM_PROMPT,
        buildChunkContents(chunk, {
          fileName: request.fileName,
          pageCount: request.pageCount,
          index,
          total: chunks.length,
        }),
        ANALYSIS_RESPONSE_SCHEMA,
        aiResultSchema,
        usedModels,
      ),
    ),
  );

  const merged = mergeResults(results);
  const [single] = results;
  const { summary, keyPoints } =
    results.length === 1 && single
      ? single
      : await generateValidated(
          config,
          SUMMARY_SYSTEM_PROMPT,
          buildSummaryContents(results, merged.document.language),
          SUMMARY_RESPONSE_SCHEMA,
          summaryResultSchema,
          usedModels,
        );

  const warnings = [...merged.warnings, ...skippedPagesWarning(request.skippedPages)];
  const injectionFound = request.pages.some((page) => containsPromptInjection(page.text));
  if (injectionFound && merged.warnings.length === 0) warnings.unshift(INJECTION_WARNING);

  const analysis: Analysis = {
    document: {
      fileName: request.fileName,
      pages: request.pageCount,
      ...merged.document,
    },
    summary,
    keyPoints,
    entities: merged.entities,
    amounts: merged.amounts,
    dates: merged.dates,
    keywords: merged.keywords,
    warnings,
    meta: {
      model: [...usedModels].join(', '),
      analyzedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      chunks: chunks.length,
      ocrPages: request.images.map((image) => image.page),
    },
  };

  const checked = analysisSchema.safeParse(analysis);
  if (!checked.success) {
    throw new HttpError(502, 'AI_INVALID_OUTPUT', 'Wynik analizy nie przeszedł walidacji.');
  }
  return checked.data;
}
