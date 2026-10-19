import { describe, expect, it } from 'vitest';
import { aiResultSchema, analysisSchema, formatIssues } from '../src/lib/schema';
import { validAiResult, validAnalysis } from './fixtures';

function issuesFor(input: unknown): string[] {
  const result = aiResultSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('aiResultSchema', () => {
  it('akceptuje poprawny wynik', () => {
    expect(aiResultSchema.safeParse(validAiResult()).success).toBe(true);
  });

  it('akceptuje null dla brakujących danych dokumentu i puste listy', () => {
    const input = validAiResult();
    input.document.title = null;
    input.document.date = null;
    input.entities = { organizations: [], people: [] };
    input.amounts = [];
    input.dates = [];
    input.keywords = [];
    expect(aiResultSchema.safeParse(input).success).toBe(true);
  });

  it.each(['2026-02-30', '12.03.2026', '2026-3-1', '2026-13-01'])(
    'odrzuca nieprawidłową datę %s',
    (date) => {
      const input = validAiResult();
      input.dates = [{ date, context: 'termin' }];
      expect(issuesFor(input)).toContain('dates.0.date');
    },
  );

  it('akceptuje 29 lutego w roku przestępnym', () => {
    const input = validAiResult();
    input.document.date = '2028-02-29';
    expect(aiResultSchema.safeParse(input).success).toBe(true);
  });

  it.each(['zł', 'pln', 'PLNN', 'XYZ'])('odrzuca walutę spoza ISO 4217: %s', (currency) => {
    const input = validAiResult();
    input.amounts = [{ value: 100, currency, context: 'opłata' }];
    expect(issuesFor(input)).toContain('amounts.0.currency');
  });

  it('odrzuca kwotę zapisaną jako tekst', () => {
    const input = {
      ...validAiResult(),
      amounts: [{ value: '12 500,00', currency: 'PLN', context: 'x' }],
    };
    expect(issuesFor(input)).toContain('amounts.0.value');
  });

  it('odrzuca typ dokumentu spoza listy', () => {
    const input = { ...validAiResult(), document: { ...validAiResult().document, type: 'pismo' } };
    expect(issuesFor(input)).toContain('document.type');
  });

  it.each(['pol', 'PL', 'polski'])('odrzuca kod języka %s', (language) => {
    const input = validAiResult();
    input.document.language = language;
    expect(issuesFor(input)).toContain('document.language');
  });

  it('odrzuca podsumowanie krótsze niż 3 zdania', () => {
    const input = validAiResult();
    input.summary = 'Umowa serwisowa. Okres 12 miesięcy.';
    expect(issuesFor(input)).toContain('summary');
  });

  it('odrzuca podsumowanie dłuższe niż 5 zdań', () => {
    const input = validAiResult();
    input.summary = 'Jeden. Dwa. Trzy. Cztery. Pięć. Sześć.';
    expect(issuesFor(input)).toContain('summary');
  });

  it('odrzuca mniej niż 3 i więcej niż 7 kluczowych punktów', () => {
    const tooFew = { ...validAiResult(), keyPoints: ['a', 'b'] };
    const tooMany = { ...validAiResult(), keyPoints: ['1', '2', '3', '4', '5', '6', '7', '8'] };
    expect(issuesFor(tooFew)).toContain('keyPoints');
    expect(issuesFor(tooMany)).toContain('keyPoints');
  });

  it('odrzuca brak wymaganych pól', () => {
    const input: Record<string, unknown> = { ...validAiResult() };
    delete input.entities;
    expect(issuesFor(input)).toContain('entities');
  });

  it('odrzuca puste napisy w listach', () => {
    const input = validAiResult();
    input.keywords = ['  '];
    expect(issuesFor(input)).toContain('keywords.0');
  });
});

describe('analysisSchema', () => {
  it('akceptuje pełny wynik analizy', () => {
    expect(analysisSchema.safeParse(validAnalysis()).success).toBe(true);
  });

  it('wymaga nazwy pliku, liczby stron i metadanych', () => {
    const withoutMeta: Record<string, unknown> = { ...validAnalysis() };
    delete withoutMeta.meta;
    const badPages = validAnalysis();
    badPages.document.pages = 0;
    expect(analysisSchema.safeParse(withoutMeta).success).toBe(false);
    expect(analysisSchema.safeParse(badPages).success).toBe(false);
  });

  it('zachowuje kolejność i nazwy kluczy ze schematu briefu', () => {
    const parsed = analysisSchema.parse(validAnalysis());
    expect(Object.keys(parsed.document)).toEqual(
      expect.arrayContaining(['fileName', 'pages', 'language', 'type', 'title', 'date']),
    );
    expect(Object.keys(parsed)).toEqual(
      expect.arrayContaining(['summary', 'keyPoints', 'entities', 'amounts', 'dates', 'keywords']),
    );
  });
});

describe('formatIssues', () => {
  it('zwraca czytelną listę błędów ze ścieżkami', () => {
    const result = aiResultSchema.safeParse({ ...validAiResult(), keyPoints: [] });
    expect(result.success).toBe(false);
    if (!result.success) expect(formatIssues(result.error)).toMatch(/^keyPoints: /);
  });
});
