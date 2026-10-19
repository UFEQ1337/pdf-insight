import { describe, expect, it } from 'vitest';
import { IMAGE_WEIGHT, chunkDocument, splitText } from '../src/lib/chunk';
import type { PageImage } from '../src/lib/request';

const page = (n: number, length: number) => ({ page: n, text: 'a'.repeat(length) });
const image = (n: number): PageImage => ({ page: n, mimeType: 'image/jpeg', data: 'AAAA' });

describe('chunkDocument', () => {
  it('zwraca jeden fragment dla krótkiego dokumentu', () => {
    const chunks = chunkDocument([page(1, 100), page(2, 100)], [], 1000);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.pages.map((p) => p.page)).toEqual([1, 2]);
  });

  it('dzieli po granicach stron, zachowując kolejność', () => {
    const chunks = chunkDocument([page(1, 600), page(2, 600), page(3, 300)], [], 1000);
    expect(chunks.map((c) => c.pages.map((p) => p.page))).toEqual([[1], [2, 3]]);
  });

  it('dzieli bardzo długą stronę na kilka części', () => {
    const chunks = chunkDocument([page(1, 2500)], [], 1000);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.every((c) => c.pages.every((p) => p.text.length <= 1000))).toBe(true);
  });

  it('umieszcza skany we fragmencie zgodnie z numerem strony', () => {
    const chunks = chunkDocument([page(1, 900), page(3, 100)], [image(2)], 1000 + IMAGE_WEIGHT);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.images.map((i) => i.page)).toEqual([2]);
  });

  it('obsługuje dokument złożony wyłącznie ze skanów', () => {
    const chunks = chunkDocument([], [image(1), image(2)], 1000);
    expect(chunks.flatMap((c) => c.images)).toHaveLength(2);
  });
});

describe('splitText', () => {
  it('tnie na granicy słowa, nie gubiąc treści', () => {
    const text = Array.from({ length: 300 }, (_, i) => `slowo${i}`).join(' ');
    const pieces = splitText(text, 500);
    expect(pieces.every((p) => p.length <= 500)).toBe(true);
    expect(pieces.join(' ')).toBe(text);
  });
});
