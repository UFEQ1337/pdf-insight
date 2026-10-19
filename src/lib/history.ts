import { z } from 'zod';
import { analysisSchema, type Analysis } from './schema';

export const HISTORY_KEY = 'pdf-insight:history:v1';
export const HISTORY_LIMIT = 10;

const entrySchema = z.object({ id: z.string().min(1), result: analysisSchema });

export type HistoryEntry = z.infer<typeof entrySchema>;
export type HistoryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function browserStorage(): HistoryStorage {
  try {
    const storage = window.localStorage;
    storage.getItem(HISTORY_KEY);
    return storage;
  } catch {
    const memory = new Map<string, string>();
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
      removeItem: (key) => void memory.delete(key),
    };
  }
}

export function createHistory(storage: HistoryStorage, createId: () => string) {
  function load(): HistoryEntry[] {
    try {
      const raw = storage.getItem(HISTORY_KEY);
      const data: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(data)) return [];
      return data.flatMap((item) => {
        const parsed = entrySchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      });
    } catch {
      return [];
    }
  }

  function save(entries: HistoryEntry[]): HistoryEntry[] {
    try {
      storage.setItem(HISTORY_KEY, JSON.stringify(entries));
    } catch {
      return load();
    }
    return entries;
  }

  return {
    load,
    add(result: Analysis): HistoryEntry[] {
      return save([{ id: createId(), result }, ...load()].slice(0, HISTORY_LIMIT));
    },
    remove(id: string): HistoryEntry[] {
      return save(load().filter((entry) => entry.id !== id));
    },
    clear(): HistoryEntry[] {
      try {
        storage.removeItem(HISTORY_KEY);
      } catch {
        return load();
      }
      return [];
    },
  };
}

export type History = ReturnType<typeof createHistory>;
