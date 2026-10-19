const MIN_PAGES = 3;
const MIN_SHARE = 0.6;
const EDGE_LINES = 3;

function signature(line: string): string {
  return line.trim().replace(/\d+/g, '#').replace(/\s+/g, ' ').toLocaleLowerCase();
}

function edgeIndexes(lineCount: number): Set<number> {
  const indexes = new Set<number>();
  for (let i = 0; i < Math.min(EDGE_LINES, lineCount); i++) {
    indexes.add(i);
    indexes.add(lineCount - 1 - i);
  }
  return indexes;
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function removeRepeatedLines(pages: string[]): string[] {
  const split = pages.map((page) => page.split('\n'));
  const textPages = split.filter((lines) => lines.some((line) => line.trim()));
  if (textPages.length < MIN_PAGES) return pages;

  const counts = new Map<string, number>();
  for (const lines of textPages) {
    const edges = new Set(
      [...edgeIndexes(lines.length)]
        .map((i) => lines[i] ?? '')
        .filter((line) => line.trim())
        .map(signature),
    );
    for (const sig of edges) counts.set(sig, (counts.get(sig) ?? 0) + 1);
  }

  const threshold = Math.max(MIN_PAGES, Math.ceil(textPages.length * MIN_SHARE));
  const repeated = new Set([...counts].filter(([, count]) => count >= threshold).map(([s]) => s));
  if (repeated.size === 0) return pages;

  return split.map((lines) => {
    const edges = edgeIndexes(lines.length);
    return lines
      .filter((line, i) => !(edges.has(i) && repeated.has(signature(line))))
      .join('\n')
      .trim();
  });
}
