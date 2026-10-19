import { describe, expect, it } from 'vitest';
import { validatePdfFile } from '../src/lib/file';
import { jsonFileName } from '../src/lib/format';

const pdfBytes = '%PDF-1.7\n%âãÏÓ\n1 0 obj\n';

describe('validatePdfFile', () => {
  it('akceptuje poprawny PDF', async () => {
    const file = new File([pdfBytes], 'umowa.pdf', { type: 'application/pdf' });
    expect(await validatePdfFile(file)).toBeNull();
  });

  it('akceptuje PDF z pustym typem MIME, rozpoznany po rozszerzeniu i sygnaturze', async () => {
    expect(await validatePdfFile(new File([pdfBytes], 'skan.PDF', { type: '' }))).toBeNull();
  });

  it('odrzuca plik inny niż PDF', async () => {
    const file = new File(['hello'], 'notatka.txt', { type: 'text/plain' });
    expect(await validatePdfFile(file)).toMatch(/wyłącznie pliki PDF/);
  });

  it('odrzuca plik z rozszerzeniem .pdf bez sygnatury PDF', async () => {
    const file = new File(['<html></html>'], 'faktura.pdf', { type: 'application/pdf' });
    expect(await validatePdfFile(file)).toMatch(/nie jest poprawnym dokumentem PDF/);
  });

  it('odrzuca pusty plik', async () => {
    expect(await validatePdfFile(new File([], 'pusty.pdf'))).toMatch(/pusty/);
  });

  it('odrzuca plik większy niż 10 MB', async () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'duzy.pdf', {
      type: 'application/pdf',
    });
    expect(await validatePdfFile(file)).toMatch(/za duży/);
  });
});

describe('jsonFileName', () => {
  it('tworzy bezpieczną nazwę pliku wyniku', () => {
    expect(jsonFileName('Umowa 14/2026.pdf')).toBe('Umowa 14_2026.insight.json');
    expect(jsonFileName('.pdf')).toBe('dokument.insight.json');
  });
});
