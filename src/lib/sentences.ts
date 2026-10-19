const ABBREVIATIONS = new Set([
  'al',
  'art',
  'dr',
  'godz',
  'im',
  'inż',
  'jw',
  'm.in',
  'mgr',
  'np',
  'nr',
  'ok',
  'pkt',
  'pl',
  'poz',
  'prof',
  'sp',
  'św',
  'tel',
  'tj',
  'tzn',
  'tzw',
  'ul',
  'ust',
  'wg',
  'ww',
  'zał',
  'e.g',
  'i.e',
  'mr',
  'mrs',
  'ms',
  'no',
  'vs',
]);

const TERMINATOR = /[.!?…]+["”»)]*(?= |$)/g;
const SENTENCE_START = /^["„«(]?[\p{Lu}\d]/u;
const INITIAL = /^\p{Lu}$/u;

function isAbbreviation(word: string): boolean {
  const bare = word.replace(/^["„«(]+/, '');
  return INITIAL.test(bare) || ABBREVIATIONS.has(bare.toLowerCase());
}

export function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const sentences: string[] = [];
  let start = 0;

  for (const match of normalized.matchAll(TERMINATOR)) {
    const end = match.index + match[0].length;
    const rest = normalized.slice(end).trimStart();
    if (rest && !SENTENCE_START.test(rest)) continue;
    const lastWord = normalized.slice(start, match.index).split(' ').pop() ?? '';
    if (match[0].startsWith('.') && isAbbreviation(lastWord)) continue;
    sentences.push(normalized.slice(start, end).trim());
    start = end;
  }

  const tail = normalized.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences;
}

export function countSentences(text: string): number {
  return splitSentences(text).length;
}
