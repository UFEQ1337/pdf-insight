import { describe, expect, it } from 'vitest';
import { HISTORY_KEY, HISTORY_LIMIT, createHistory, type HistoryStorage } from '../src/lib/history';
import { validAnalysis } from './fixtures';

function memoryStorage(initial: Record<string, string> = {}): HistoryStorage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

function counter() {
  let n = 0;
  return () => `id-${++n}`;
}

describe('createHistory', () => {
  it('dodaje wyniki na początek i ogranicza ich liczbę', () => {
    const history = createHistory(memoryStorage(), counter());
    for (let i = 0; i < HISTORY_LIMIT + 2; i++) history.add(validAnalysis());
    const entries = history.load();
    expect(entries).toHaveLength(HISTORY_LIMIT);
    expect(entries[0]?.id).toBe(`id-${HISTORY_LIMIT + 2}`);
  });

  it('pomija uszkodzone i niezgodne ze schematem wpisy', () => {
    const storage = memoryStorage({
      [HISTORY_KEY]: JSON.stringify([
        { id: 'ok', result: validAnalysis() },
        { id: 'zly', result: { summary: 'x' } },
      ]),
    });
    expect(
      createHistory(storage, counter())
        .load()
        .map((e) => e.id),
    ).toEqual(['ok']);
  });

  it('zwraca pustą listę dla niepoprawnego JSON', () => {
    const storage = memoryStorage({ [HISTORY_KEY]: '{nie-json' });
    expect(createHistory(storage, counter()).load()).toEqual([]);
  });

  it('usuwa pojedynczy wpis i czyści historię', () => {
    const history = createHistory(memoryStorage(), counter());
    history.add(validAnalysis());
    history.add(validAnalysis());
    expect(history.remove('id-1').map((e) => e.id)).toEqual(['id-2']);
    expect(history.clear()).toEqual([]);
    expect(history.load()).toEqual([]);
  });

  it('działa, gdy przeglądarka blokuje zapis (np. tryb prywatny)', () => {
    const storage: HistoryStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => undefined,
    };
    expect(createHistory(storage, counter()).add(validAnalysis())).toEqual([]);
  });
});
