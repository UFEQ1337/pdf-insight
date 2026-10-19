import { describe, expect, it } from 'vitest';
import { normalizeText, removeRepeatedLines } from '../src/lib/cleanup';

const header = 'Umowa ramowa nr 14/2026 — Nordwave Logistics / Kwadrat Software';
const footer = (n: number) => `Wersja 1.3 · 12.03.2026 Strona ${n} z 4`;
const words = ['alfa', 'beta', 'gamma', 'delta'];
const body = (n: number) => {
  const w = words[n - 1] ?? 'omega';
  return [
    `Sekcja ${w}`,
    `Wstęp ${w}`,
    `Opis ${w}`,
    `Pozycja ${n}: 27 675,00 zł`,
    `Dalszy ${w}`,
    `Uwagi ${w}`,
    `Koniec ${w}`,
  ].join('\n');
};

describe('removeRepeatedLines', () => {
  it('usuwa nagłówki i stopki powtarzające się na stronach, także ze zmiennym numerem', () => {
    const pages = [1, 2, 3, 4].map((n) => `${header}\nPOUFNE\n${body(n)}\n${footer(n)}`);
    expect(removeRepeatedLines(pages)).toEqual([1, 2, 3, 4].map(body));
  });

  it('nie usuwa treści ze środka strony różniącej się tylko liczbami', () => {
    const pages = [1, 2, 3, 4].map(body);
    const result = removeRepeatedLines(pages);
    expect(result.every((page, i) => page.includes(`Pozycja ${i + 1}: 27 675,00 zł`))).toBe(true);
  });

  it('nie zmienia krótkich dokumentów', () => {
    const pages = [`${header}\nA`, `${header}\nB`];
    expect(removeRepeatedLines(pages)).toEqual(pages);
  });

  it('pomija puste strony (skany) przy liczeniu powtórzeń', () => {
    const pages = [`${header}\nA`, '', `${header}\nB`, `${header}\nC`];
    expect(removeRepeatedLines(pages)).toEqual(['A', '', 'B', 'C']);
  });

  it('zostawia linie występujące tylko na części stron', () => {
    const pages = ['Razem 100%\nA', 'B', 'C', 'D', 'Razem 50%\nE'];
    expect(removeRepeatedLines(pages)).toEqual(pages);
  });
});

describe('normalizeText', () => {
  it('scala spacje (także twarde), końce linii CRLF i wielokrotne puste linie', () => {
    const nbsp = String.fromCharCode(160);
    expect(normalizeText(`  a${nbsp}${nbsp}b \r\n\n\n\n c  `)).toBe('a b\n\nc');
  });
});
