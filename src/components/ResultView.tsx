import { useEffect, useMemo, useState } from 'react';
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
import { ResultTabs, type ResultTab } from './ResultTabs';
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
  const [tab, setTab] = useState<ResultTab>('view');
  const [status, setStatus] = useState('');
  const { document: doc, meta } = result;
  const title = doc.title ?? doc.fileName;

  useEffect(() => {
    const previous = document.title;
    document.title = `${title} – PDF Insight`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  function download() {
    const fileName = jsonFileName(doc.fileName);
    downloadJson(result, fileName);
    setStatus(`Pobrano plik ${fileName}`);
  }

  const stats = [
    { label: 'Strony', value: String(doc.pages) },
    { label: 'Kwoty', value: String(result.amounts.length) },
    { label: 'Daty', value: String(result.dates.length) },
    { label: 'Osoby', value: String(result.entities.people.length) },
    { label: 'Organizacje', value: String(result.entities.organizations.length) },
    { label: 'Czas', value: formatSeconds(meta.durationMs) },
  ];

  const view = (
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
  );

  return (
    <section className="result fade-in" aria-labelledby="result-title">
      <header className="result__header">
        <p className="eyebrow">{TYPE_LABELS[doc.type]}</p>
        <h2 id="result-title" ref={headingRef} tabIndex={-1}>
          {title}
        </h2>
      </header>

      <dl className="stats">
        {stats.map((stat) => (
          <div key={stat.label} className="stats__item">
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>

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

      <ResultTabs active={tab} onChange={setTab}>
        {{ view, json: <JsonPreview json={json} /> }}
      </ResultTabs>

      <p className="result__meta">
        Model: {meta.model} · fragmenty: {meta.chunks}
        {meta.ocrPages.length > 0 && ` · OCR stron: ${meta.ocrPages.join(', ')}`}
      </p>

      <div className="action-bar">
        <button type="button" className="button button--primary" onClick={download}>
          Pobierz JSON
        </button>
        <button type="button" className="button button--ghost" onClick={onReset}>
          Kolejny plik
        </button>
        <span role="status" className="action-bar__status">
          {status}
        </span>
      </div>
    </section>
  );
}
