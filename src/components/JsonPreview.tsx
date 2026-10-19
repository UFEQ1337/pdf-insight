import { useState } from 'react';

interface Props {
  json: string;
}

export function JsonPreview({ json }: Props) {
  const [status, setStatus] = useState('');

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setStatus('Skopiowano JSON do schowka.');
    } catch {
      setStatus('Nie udało się skopiować. Zaznacz tekst ręcznie.');
    }
  }

  return (
    <div className="card json-preview">
      <div className="json-preview__toolbar">
        <button type="button" className="button button--ghost button--small" onClick={copy}>
          Kopiuj JSON
        </button>
        <span role="status" className="json-preview__status">
          {status}
        </span>
      </div>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <pre tabIndex={0} aria-label="Wynik analizy w formacie JSON">
        <code>{json}</code>
      </pre>
    </div>
  );
}
