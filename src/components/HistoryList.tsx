import { TYPE_LABELS } from '../lib/format';
import type { HistoryEntry } from '../lib/history';

interface Props {
  entries: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const dateTime = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'short' });

export function HistoryList({ entries, onOpen, onRemove, onClear }: Props) {
  if (entries.length === 0) return null;

  return (
    <section className="history" aria-labelledby="history-title">
      <div className="history__header">
        <h2 id="history-title">Ostatnie analizy</h2>
        <button type="button" className="button button--ghost button--small" onClick={onClear}>
          Wyczyść historię
        </button>
      </div>
      <ul className="history__list">
        {entries.map((entry) => {
          const { document: doc, meta } = entry.result;
          return (
            <li key={entry.id} className="history__item">
              <button type="button" className="history__open" onClick={() => onOpen(entry)}>
                <span className="history__name">{doc.title ?? doc.fileName}</span>
                <span className="history__meta">
                  {TYPE_LABELS[doc.type]} · {doc.fileName} ·{' '}
                  {dateTime.format(new Date(meta.analyzedAt))}
                </span>
              </button>
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={() => onRemove(entry.id)}
                aria-label={`Usuń z historii: ${doc.fileName}`}
              >
                Usuń
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
