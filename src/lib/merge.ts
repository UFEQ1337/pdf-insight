import type { AiResult } from './schema';

export type MergedResult = Omit<AiResult, 'summary' | 'keyPoints'>;

const MAX_KEYWORDS = 15;

export function normalizeKey(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = key(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function uniqueStrings(values: string[]): string[] {
  return uniqueBy(
    values.map((value) => value.trim()),
    normalizeKey,
  );
}

function mostCommon<T extends string>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: T | undefined;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

export function mergeResults(results: AiResult[]): MergedResult {
  const [first] = results;
  if (!first) throw new Error('Brak wyników do połączenia');

  return {
    document: {
      language: mostCommon(results.map((r) => r.document.language)) ?? first.document.language,
      type: first.document.type,
      title: results.find((r) => r.document.title)?.document.title ?? null,
      date: results.find((r) => r.document.date)?.document.date ?? null,
    },
    entities: {
      organizations: uniqueStrings(results.flatMap((r) => r.entities.organizations)),
      people: uniqueStrings(results.flatMap((r) => r.entities.people)),
    },
    amounts: uniqueBy(
      results.flatMap((r) => r.amounts),
      (a) => `${a.value}|${a.currency}|${normalizeKey(a.context)}`,
    ),
    dates: uniqueBy(
      results.flatMap((r) => r.dates),
      (d) => `${d.date}|${normalizeKey(d.context)}`,
    ),
    keywords: uniqueStrings(results.flatMap((r) => r.keywords)).slice(0, MAX_KEYWORDS),
    warnings: uniqueStrings(results.flatMap((r) => r.warnings)),
  };
}
