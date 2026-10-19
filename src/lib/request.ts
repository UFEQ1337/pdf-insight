import { z } from 'zod';

export const LIMITS = {
  maxFileBytes: 10 * 1024 * 1024,
  maxTextChars: 400_000,
  maxOcrPages: 5,
  maxImageBase64Chars: 1_200_000,
  maxRequestBytes: 8 * 1024 * 1024,
} as const;

export const pageTextSchema = z.object({
  page: z.number().int().positive(),
  text: z.string().min(1),
});

export const pageImageSchema = z.object({
  page: z.number().int().positive(),
  mimeType: z.literal('image/jpeg'),
  data: z.string().min(1).max(LIMITS.maxImageBase64Chars),
});

export const analyzeRequestSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    pageCount: z.number().int().positive().max(5000),
    pages: z.array(pageTextSchema).max(5000),
    images: z.array(pageImageSchema).max(LIMITS.maxOcrPages),
    skippedPages: z.array(z.number().int().positive()).max(5000),
  })
  .refine((request) => request.pages.length + request.images.length > 0, {
    message: 'Dokument nie zawiera tekstu ani stron do OCR',
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
