import { describe, expect, it } from 'vitest';
import { countSentences, splitSentences } from '../src/lib/sentences';

describe('splitSentences', () => {
  it('nie dzieli na polskich skrótach i formach prawnych', () => {
    const text =
      'Umowę zawarli Nordwave Logistics sp. z o.o. oraz Kwadrat Software S.A. w Gdańsku. Obejmuje ona m.in. migrację ok. 48 000 kontaktów, tj. całej bazy. Wynagrodzenie wynosi 184 500,00 zł netto.';
    expect(countSentences(text)).toBe(3);
  });

  it('rozpoznaje koniec zdania po dacie z "r." i po formie prawnej', () => {
    const text =
      'Umowa obowiązuje od 1 kwietnia 2026 r. Wykonawcą jest Kwadrat Software S.A. Abonament wynosi 12 300 zł.';
    expect(splitSentences(text)).toEqual([
      'Umowa obowiązuje od 1 kwietnia 2026 r.',
      'Wykonawcą jest Kwadrat Software S.A.',
      'Abonament wynosi 12 300 zł.',
    ]);
  });

  it('nie dzieli na inicjałach i numerach ustępów', () => {
    expect(
      countSentences('Aneks podpisali A. Kowalczyk i P. Dąbrowski zgodnie z § 5 ust. 2 umowy.'),
    ).toBe(1);
  });

  it('obsługuje wykrzyknienia, pytania, cudzysłowy i brak kropki na końcu', () => {
    expect(countSentences('Czy to działa? Tak! Zdanie „w cudzysłowie.” Ostatnie bez kropki')).toBe(
      4,
    );
  });

  it('nie dzieli liczb dziesiętnych i angielskich skrótów', () => {
    expect(
      countSentences('Availability is 99.5%, e.g. in March. It was measured by Dr. Smith.'),
    ).toBe(2);
  });

  it('zwraca pustą listę dla pustego tekstu', () => {
    expect(splitSentences('   ')).toEqual([]);
  });
});
