import {
  GlobalWorkerOptions,
  InvalidPDFException,
  PasswordException,
  getDocument,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
  type PDFPageProxy,
} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { normalizeText, removeRepeatedLines } from './cleanup';
import { PdfError } from './pdfError';
import { LIMITS, type AnalyzeRequest, type PageImage } from './request';

GlobalWorkerOptions.workerSrc = workerUrl;

const MIN_PAGE_CHARS = 30;
const OCR_MAX_SIDE = 1600;
const JPEG_QUALITIES = [0.75, 0.55, 0.4];

export type ExtractStep = 'reading' | 'ocr';
export type ExtractProgress = (step: ExtractStep, detail: string) => void;

async function openDocument(task: PDFDocumentLoadingTask): Promise<PDFDocumentProxy> {
  try {
    return await task.promise;
  } catch (error) {
    if (error instanceof PasswordException) {
      throw new PdfError('Plik PDF jest zabezpieczony hasłem. Usuń hasło i spróbuj ponownie.');
    }
    if (error instanceof InvalidPDFException) {
      throw new PdfError('Plik jest uszkodzony lub nie jest poprawnym dokumentem PDF.');
    }
    throw new PdfError('Nie udało się otworzyć pliku PDF.');
  }
}

async function readPageText(page: PDFPageProxy): Promise<string> {
  const content = await page.getTextContent();
  let text = '';
  for (const item of content.items) {
    if (!('str' in item)) continue;
    text += item.str;
    if (item.hasEOL) text += '\n';
  }
  return text;
}

async function renderPageJpeg(page: PDFPageProxy): Promise<string | null> {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2, OCR_MAX_SIDE / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  try {
    await page.render({ canvas, viewport, intent: 'print' }).promise;
    for (const quality of JPEG_QUALITIES) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      if (base64.length <= LIMITS.maxImageBase64Chars) return base64;
    }
    return null;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('Przerwano', 'AbortError');
}

export async function extractPdf(
  file: File,
  signal: AbortSignal,
  onProgress: ExtractProgress,
): Promise<AnalyzeRequest> {
  const task = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    stopAtErrors: false,
  });
  try {
    const pdf = await openDocument(task);
    if (pdf.numPages > LIMITS.maxPages) {
      throw new PdfError(
        `Dokument ma zbyt wiele stron (${pdf.numPages}). Limit to ${LIMITS.maxPages}.`,
      );
    }
    const rawTexts: string[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      throwIfAborted(signal);
      onProgress('reading', `Strona ${n} z ${pdf.numPages}`);
      rawTexts.push(normalizeText(await readPageText(await pdf.getPage(n))));
    }

    const texts = removeRepeatedLines(rawTexts);
    const scanPages = texts.flatMap((text, i) =>
      text.replace(/\s/g, '').length < MIN_PAGE_CHARS ? [i + 1] : [],
    );

    const images: PageImage[] = [];
    const skippedPages = scanPages.slice(LIMITS.maxOcrPages);
    for (const pageNumber of scanPages.slice(0, LIMITS.maxOcrPages)) {
      throwIfAborted(signal);
      onProgress('ocr', `Przygotowanie skanu strony ${pageNumber}`);
      const data = await renderPageJpeg(await pdf.getPage(pageNumber)).catch(() => null);
      if (data) images.push({ page: pageNumber, mimeType: 'image/jpeg', data });
      else skippedPages.push(pageNumber);
    }

    const pages = texts
      .map((text, i) => ({ page: i + 1, text }))
      .filter((page) => page.text.length > 0);

    if (pages.length === 0 && images.length === 0) {
      throw new PdfError('Nie znaleziono w dokumencie tekstu do analizy.');
    }
    if (pages.reduce((total, page) => total + page.text.length, 0) > LIMITS.maxTextChars) {
      throw new PdfError('Dokument jest zbyt długi do analizy (limit to ok. 400 000 znaków).');
    }

    return {
      fileName: file.name,
      pageCount: pdf.numPages,
      pages,
      images,
      skippedPages: skippedPages.sort((a, b) => a - b),
    };
  } catch (error) {
    if (
      error instanceof PdfError ||
      (error instanceof DOMException && error.name === 'AbortError')
    ) {
      throw error;
    }
    throw new PdfError('Nie udało się odczytać treści PDF. Plik może być uszkodzony.');
  } finally {
    await task.destroy();
  }
}
