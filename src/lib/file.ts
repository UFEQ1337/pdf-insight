import { LIMITS } from './request';

const PDF_SIGNATURE = '%PDF-';
const SIGNATURE_WINDOW = 1024;

export function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export async function validatePdfFile(file: File): Promise<string | null> {
  if (file.size === 0) return 'Plik jest pusty.';
  if (file.size > LIMITS.maxFileBytes) {
    return `Plik jest za duży (${formatFileSize(file.size)}). Maksymalny rozmiar to 10 MB.`;
  }
  const declaredPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!declaredPdf) return 'Obsługiwane są wyłącznie pliki PDF.';

  const head = new Uint8Array(await file.slice(0, SIGNATURE_WINDOW).arrayBuffer());
  if (!new TextDecoder('latin1').decode(head).includes(PDF_SIGNATURE)) {
    return 'Plik ma rozszerzenie PDF, ale nie jest poprawnym dokumentem PDF.';
  }
  return null;
}
