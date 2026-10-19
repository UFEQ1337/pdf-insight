import { z } from 'zod';

export const LIMITS = {
  maxFileBytes: 10 * 1024 * 1024,
  maxPages: 500,
  maxTextChars: 400_000,
  maxOcrPages: 5,
  maxImageBase64Chars: 1_200_000,
  maxRequestBytes: 8 * 1024 * 1024,
} as const;

const pageNumber = z.number().int().positive().max(LIMITS.maxPages);

export const pageTextSchema = z.object({
  page: pageNumber,
  text: z.string().min(1),
});

export const pageImageSchema = z.object({
  page: pageNumber,
  mimeType: z.literal('image/jpeg'),
  data: z
    .string()
    .min(1)
    .max(LIMITS.maxImageBase64Chars)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Obraz musi być zakodowany w base64'),
});

function pageNumbers(request: { pages: PageText[]; images: PageImage[]; skippedPages: number[] }) {
  return [...request.pages.map((p) => p.page), ...request.images.map((i) => i.page)].concat(
    request.skippedPages,
  );
}

export const analyzeRequestSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    pageCount: pageNumber,
    pages: z.array(pageTextSchema).max(LIMITS.maxPages),
    images: z.array(pageImageSchema).max(LIMITS.maxOcrPages),
    skippedPages: z.array(pageNumber).max(LIMITS.maxPages),
  })
  .refine((request) => request.pages.length + request.images.length > 0, {
    message: 'Dokument nie zawiera tekstu ani stron do OCR',
  })
  .refine((request) => pageNumbers(request).every((page) => page <= request.pageCount), {
    message: 'Numer strony przekracza liczbę stron dokumentu',
  })
  .refine(
    (request) =>
      request.pages.reduce((total, page) => total + page.text.length, 0) <= LIMITS.maxTextChars,
    { message: `Tekst dokumentu przekracza ${LIMITS.maxTextChars} znaków` },
  );

export type PageText = z.infer<typeof pageTextSchema>;
export type PageImage = z.infer<typeof pageImageSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export interface ApiErrorBody {
  error: { code: string; message: string };
}
