import { describe, expect, it } from 'vitest';
import { mergeResults } from '../src/lib/merge';
import { validAiResult } from './fixtures';

describe('mergeResults', () => {
  it('deduplikuje encje, kwoty, daty i słowa kluczowe bez względu na wielkość liter', () => {
    const a = validAiResult();
    const b = validAiResult();
    b.document.title = null;
    b.entities.organizations = ['PRZYKŁAD SP. Z O.O.', 'Inna Firma S.A.'];
    b.entities.people = ['Anna Kowalczyk'];
    b.amounts.push({ value: 12500, currency: 'EUR', context: 'wynagrodzenie' });
    b.keywords = ['Serwis', 'umowa'];

    const merged = mergeResults([a, b]);

    expect(merged.entities.organizations).toEqual(['Przykład sp. z o.o.', 'Inna Firma S.A.']);
    expect(merged.entities.people).toEqual(['Anna Kowalczyk']);
    expect(merged.amounts).toHaveLength(2);
    expect(merged.dates).toHaveLength(1);
    expect(merged.keywords).toEqual(['serwis', 'SLA', 'umowa']);
  });

  it('zachowuje tę samą kwotę o różnym kontekście', () => {
    const a = validAiResult();
    const b = validAiResult();
    b.amounts = [{ value: 12500, currency: 'PLN', context: 'kara umowna' }];
    expect(mergeResults([a, b]).amounts).toHaveLength(2);
  });

  it('bierze pierwszy niepusty tytuł i datę oraz najczęstszy język', () => {
    const a = validAiResult();
    a.document.title = null;
    a.document.date = null;
    const b = validAiResult();
    b.document.language = 'en';
    const c = validAiResult();
    c.document.title = 'Inny tytuł';

    const merged = mergeResults([a, b, c]);

    expect(merged.document.title).toBe('Umowa serwisowa');
    expect(merged.document.date).toBe('2026-09-01');
    expect(merged.document.language).toBe('pl');
  });

  it('rzuca błąd dla pustej listy', () => {
    expect(() => mergeResults([])).toThrow();
  });
});
