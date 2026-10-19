const PATTERNS = [
  /(zignoruj|zignorować|ignoruj|ignorować|pomiń|pominąć|zapomnij|zapomnieć)\s+(o\s+)?(wszystkie\s+|wszystkich\s+)?(wcześniejsze|wcześniejszych|poprzednie|poprzednich|powyższe|dotychczasowe)\s+(polecenia|poleceniach|instrukcje|instrukcjach)/iu,
  /instrukcj\w*\s+dla\s+(systemu\s+|modelu\s+)?(AI|SI|LLM|asystenta|sztucznej\s+inteligencji)/iu,
  /ignore\s+(all\s+)?(the\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|messages)/iu,
  /disregard\s+(all\s+)?(the\s+)?(previous|prior|above)\s+/iu,
  /\b(system\s+prompt|prompt\s+systemowy)\b/iu,
];

export const INJECTION_WARNING =
  'Dokument zawiera tekst wyglądający na polecenia dla systemu AI. Potraktowano go wyłącznie jako treść dokumentu i nie wykonano zawartych w nim instrukcji.';

export function containsPromptInjection(text: string): boolean {
  const flat = text.replace(/\s+/g, ' ');
  return PATTERNS.some((pattern) => pattern.test(flat));
}
