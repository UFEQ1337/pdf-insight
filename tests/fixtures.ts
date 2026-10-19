import type { AiResult, Analysis } from '../src/lib/schema';

export function validAiResult(): AiResult {
  return {
    document: {
      language: 'pl',
      type: 'umowa',
      title: 'Umowa serwisowa',
      date: '2026-09-01',
    },
    summary:
      'Umowa określa zasady świadczenia usług serwisowych przez Przykład sp. z o.o. na rzecz Zamawiającego. Okres obowiązywania wynosi 12 mies., a wynagrodzenie to 12 500,00 zł. Płatność następuje do 1 października 2026 r.',
    keyPoints: [
      'Okres umowy 12 mies.',
      'Wynagrodzenie 12 500,00 PLN',
      'Termin płatności 2026-10-01',
    ],
    entities: {
      organizations: ['Przykład sp. z o.o.'],
      people: [],
    },
    amounts: [{ value: 12500, currency: 'PLN', context: 'wynagrodzenie' }],
    dates: [{ date: '2026-10-01', context: 'termin płatności' }],
    keywords: ['serwis', 'SLA'],
    warnings: [],
  };
}

export function validAnalysis(): Analysis {
  const ai = validAiResult();
  return {
    ...ai,
    document: { fileName: 'umowa.pdf', pages: 4, ...ai.document },
    meta: {
      model: 'gemini-test',
      analyzedAt: '2026-10-19T18:00:00.000Z',
      durationMs: 4200,
      chunks: 1,
      ocrPages: [],
    },
  };
}
