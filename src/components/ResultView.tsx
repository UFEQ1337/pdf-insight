import { useMemo } from 'react';
import { downloadJson } from '../lib/download';
import {
  TYPE_LABELS,
  formatAmount,
  formatDate,
  formatSeconds,
  jsonFileName,
  languageName,
} from '../lib/format';
import type { Analysis } from '../lib/schema';
import { JsonPreview } from './JsonPreview';
import { useFocusOnMount } from './useFocusOnMount';

interface Props {
  result: Analysis;
  onReset: () => void;
}

function Empty() {
  return <p className="muted">Brak danych w dokumencie.</p>;
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return <Empty />;
  return (
    <ul className="tags">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function ResultView({ result, onReset }: Props) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const json = useMemo(() => JSON.stringify(result, null, 2), [result]);
  const { document: doc, meta } = result;

  return (
    <section className="result" aria-labelledby="result-title">
      <header className="result__header">
        <div>
          <p className="eyebrow">{TYPE_LABELS[doc.type]}</p>
          <h2 id="result-title" ref={headingRef} tabIndex={-1}>
            {doc.title ?? doc.fileName}
          </h2>
        </div>
        <div className="actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => downloadJson(result, jsonFileName(doc.fileName))}
          >
            Pobierz JSON
          </button>
          <button type="button" className="button button--ghost" onClick={onReset}>
            Analizuj kolejny plik
          </button>
        </div>
      </header>

      {result.warnings.length > 0 && (
        <div className="card card--warning" role="note" aria-label="Ostrzeżenia">
          <h3>Uwaga</h3>
          <ul>
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid">
        <article className="card card--wide">
          <h3>Podsumowanie</h3>
          <p className="summary">{result.summary}</p>
        </article>

        <article className="card">
          <h3>Dokument</h3>
          <dl className="facts">
            <dt>Plik</dt>
            <dd>{doc.fileName}</dd>
            <dt>Typ</dt>
            <dd>{TYPE_LABELS[doc.type]}</dd>
            <dt>Data</dt>
            <dd>{doc.date ? formatDate(doc.date) : 'brak'}</dd>
            <dt>Język</dt>
            <dd>{languageName(doc.language)}</dd>
            <dt>Strony</dt>
            <dd>
              {doc.pages}
              {meta.ocrPages.length > 0 && ` (OCR: ${meta.ocrPages.join(', ')})`}
            </dd>
          </dl>
        </article>

        <article className="card">
          <h3>Kluczowe punkty</h3>
          <ul className="list">
            {result.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h3>Organizacje</h3>
          <TagList items={result.entities.organizations} />
          <h3>Osoby</h3>
          <TagList items={result.entities.people} />
        </article>

        <article className="card">
          <h3>Słowa kluczowe</h3>
          <TagList items={result.keywords} />
        </article>

        <article className="card card--wide">
          <h3>Kwoty</h3>
          {result.amounts.length === 0 ? (
            <Empty />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Kwota</th>
                    <th scope="col">Kontekst</th>
                  </tr>
                </thead>
                <tbody>
                  {result.amounts.map((amount, index) => (
                    <tr key={`${amount.value}-${amount.currency}-${index}`}>
                      <td className="nowrap">{formatAmount(amount.value, amount.currency)}</td>
                      <td>{amount.context}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="card card--wide">
          <h3>Daty</h3>
          {result.dates.length === 0 ? (
            <Empty />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Kontekst</th>
                  </tr>
                </thead>
                <tbody>
                  {result.dates.map((entry, index) => (
                    <tr key={`${entry.date}-${index}`}>
                      <td className="nowrap">
                        <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                      </td>
                      <td>{entry.context}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>

      <JsonPreview json={json} />

      <p className="result__meta">
        Model: {meta.model} · czas analizy: {formatSeconds(meta.durationMs)} · fragmenty:{' '}
        {meta.chunks}
      </p>
    </section>
  );
}
