import { useEffect, useState } from 'react';
import { formatSeconds } from '../lib/format';
import { useFocusOnMount } from './useFocusOnMount';

export type ProcessingStep = 'reading' | 'ocr' | 'analyzing';

const SLOW_AFTER_MS = 30_000;

const STEPS: { id: ProcessingStep; label: string }[] = [
  { id: 'reading', label: 'Odczyt tekstu z PDF' },
  { id: 'ocr', label: 'Przygotowanie skanów do OCR' },
  { id: 'analyzing', label: 'Analiza AI i walidacja wyniku' },
];

interface Props {
  fileName: string;
  step: ProcessingStep;
  detail: string;
  startedAt: number;
  onCancel: () => void;
}

export function ProcessingView({ fileName, step, detail, startedAt, onCancel }: Props) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const [now, setNow] = useState(() => Date.now());
  const currentIndex = STEPS.findIndex((s) => s.id === step);
  const elapsed = Math.max(0, now - startedAt);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      className="panel processing fade-in"
      aria-busy="true"
      aria-labelledby="processing-title"
    >
      <div className="spinner" aria-hidden="true" />
      <h2 id="processing-title" ref={headingRef} tabIndex={-1}>
        Analizuję dokument
      </h2>
      <p className="processing__file">{fileName}</p>
      <ol className="steps">
        {STEPS.map((s, index) => {
          const state = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'todo';
          return (
            <li key={s.id} className={`steps__item steps__item--${state}`}>
              <span className="steps__marker" aria-hidden="true" />
              <span>
                {s.label}
                <span className="visually-hidden">
                  {state === 'done' ? ' (zakończono)' : state === 'active' ? ' (w toku)' : ''}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="processing__detail" aria-live="polite">
        {detail}
      </p>
      <p className="processing__timer">{formatSeconds(elapsed)}</p>
      <p className="processing__hint" aria-live="polite">
        {elapsed < SLOW_AFTER_MS
          ? 'Zwykle trwa to 10–25 sekund.'
          : 'Model AI jest teraz mocno obciążony, to może potrwać dłużej.'}
      </p>
      <button
        type="button"
        className="button button--ghost"
        onClick={onCancel}
        aria-keyshortcuts="Escape"
      >
        Anuluj <kbd aria-hidden="true">Esc</kbd>
      </button>
    </section>
  );
}
