import type { PageImage, PageText } from './request';

export const CHUNK_CHARS = 60_000;
export const IMAGE_WEIGHT = 4_000;

export interface Chunk {
  pages: PageText[];
  images: PageImage[];
}

type Part = { kind: 'text'; item: PageText } | { kind: 'image'; item: PageImage };

export function splitText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const pieces: string[] = [];
  let rest = text;
  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars);
    const cut = Math.max(window.lastIndexOf('\n'), window.lastIndexOf(' '));
    const end = cut > maxChars / 2 ? cut : maxChars;
    pieces.push(rest.slice(0, end).trim());
    rest = rest.slice(end);
  }
  if (rest.trim()) pieces.push(rest.trim());
  return pieces;
}

function weight(part: Part): number {
  return part.kind === 'text' ? part.item.text.length : IMAGE_WEIGHT;
}

export function chunkDocument(
  pages: PageText[],
  images: PageImage[],
  maxChars: number = CHUNK_CHARS,
): Chunk[] {
  const parts: Part[] = [
    ...pages.flatMap((page) =>
      splitText(page.text, maxChars).map((text): Part => ({
        kind: 'text',
        item: { page: page.page, text },
      })),
    ),
    ...images.map((item): Part => ({ kind: 'image', item })),
  ].sort((a, b) => a.item.page - b.item.page);

  const chunks: Chunk[] = [];
  let current: Chunk = { pages: [], images: [] };
  let size = 0;

  for (const part of parts) {
    const partSize = weight(part);
    const isEmpty = current.pages.length + current.images.length === 0;
    if (!isEmpty && size + partSize > maxChars) {
      chunks.push(current);
      current = { pages: [], images: [] };
      size = 0;
    }
    if (part.kind === 'text') current.pages.push(part.item);
    else current.images.push(part.item);
    size += partSize;
  }

  if (current.pages.length + current.images.length > 0) chunks.push(current);
  return chunks;
}
