import { z } from 'zod';
import { countSentences } from './sentences';

export const DOCUMENT_TYPES = ['faktura', 'umowa', 'oferta', 'raport', 'inne'] as const;

export const SUMMARY_SENTENCES = { min: 3, max: 5 } as const;
export const KEY_POINTS = { min: 3, max: 7 } as const;

function loadCurrencies(): ReadonlySet<string> | null {
  try {
    return new Set(Intl.supportedValuesOf('currency'));
  } catch {
    return null;
  }
}

const CURRENCIES = loadCurrencies();

function isCalendarDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const text = z.string().trim().min(1, 'Pole nie może być puste');

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data musi mieć format RRRR-MM-DD (ISO 8601)')
  .refine(isCalendarDate, 'Data nie istnieje w kalendarzu');

export const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, 'Waluta musi być 3-literowym kodem ISO 4217')
  .refine((code) => CURRENCIES?.has(code) ?? true, 'Nieznany kod waluty ISO 4217');

export const summarySchema = text.refine((value) => {
  const sentences = countSentences(value);
  return sentences >= SUMMARY_SENTENCES.min && sentences <= SUMMARY_SENTENCES.max;
}, `Podsumowanie musi mieć od ${SUMMARY_SENTENCES.min} do ${SUMMARY_SENTENCES.max} zdań`);

export const keyPointsSchema = z.array(text).min(KEY_POINTS.min).max(KEY_POINTS.max);

export const aiDocumentSchema = z.object({
  language: z.string().regex(/^[a-z]{2}$/, 'Język musi być kodem ISO 639-1'),
  type: z.enum(DOCUMENT_TYPES),
  title: text.nullable(),
  date: isoDateSchema.nullable(),
});

export const amountSchema = z.object({
  value: z.number().finite(),
  currency: currencySchema,
  context: text,
});

export const dateEntrySchema = z.object({
  date: isoDateSchema,
  context: text,
});

export const aiResultSchema = z.object({
  document: aiDocumentSchema,
  summary: summarySchema,
  keyPoints: keyPointsSchema,
  entities: z.object({
    organizations: z.array(text),
    people: z.array(text),
  }),
  amounts: z.array(amountSchema),
  dates: z.array(dateEntrySchema),
  keywords: z.array(text),
  warnings: z.array(text),
});

export const summaryResultSchema = z.object({
  summary: summarySchema,
  keyPoints: keyPointsSchema,
});

export const analysisSchema = aiResultSchema.extend({
  document: aiDocumentSchema.extend({
    fileName: text,
    pages: z.number().int().positive(),
  }),
  meta: z.object({
    model: text,
    analyzedAt: z.iso.datetime(),
    durationMs: z.number().int().nonnegative(),
    chunks: z.number().int().positive(),
    ocrPages: z.array(z.number().int().positive()),
  }),
});

export type AiResult = z.infer<typeof aiResultSchema>;
export type SummaryResult = z.infer<typeof summaryResultSchema>;
export type Analysis = z.infer<typeof analysisSchema>;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export function formatIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 10)
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}
