import { useEffect, useRef, useState } from 'react';
import { ApiError, analyzeDocument } from './api/client';
import { Dropzone } from './components/Dropzone';
import { ErrorView } from './components/ErrorView';
import { HistoryList } from './components/HistoryList';
import { HowItWorks } from './components/HowItWorks';
import { PrivacyNotice } from './components/PrivacyNotice';
import { ProcessingView, type ProcessingStep } from './components/ProcessingView';
import { ResultView } from './components/ResultView';
import { validatePdfFile } from './lib/file';
import { browserStorage, createHistory, type HistoryEntry } from './lib/history';
import { PdfError } from './lib/pdfError';
import type { AnalyzeRequest } from './lib/request';
import type { Analysis } from './lib/schema';

type State =
  | { status: 'idle'; notice: string | null }
  | {
      status: 'processing';
      fileName: string;
      step: ProcessingStep;
      detail: string;
      startedAt: number;
    }
  | { status: 'error'; message: string; retry: AnalyzeRequest | null }
  | { status: 'success'; result: Analysis };

const history = createHistory(browserStorage(), () => crypto.randomUUID());

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function errorMessage(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof ApiError) return { message: error.message, retryable: error.retryable };
  if (error instanceof PdfError) return { message: error.message, retryable: false };
  return {
    message: 'Wystąpił nieoczekiwany błąd podczas przetwarzania pliku. Spróbuj ponownie.',
    retryable: false,
  };
}

export function App() {
  const [state, setState] = useState<State>({ status: 'idle', notice: null });
  const [entries, setEntries] = useState<HistoryEntry[]>(history.load);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const prevent = (event: DragEvent) => event.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
      controllerRef.current?.abort();
    };
  }, []);

  const processing = state.status === 'processing';

  useEffect(() => {
    if (!processing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      controllerRef.current?.abort();
      setState({ status: 'idle', notice: 'Analiza została anulowana.' });
    };
    const onLeave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [processing]);

  function startController(): AbortController {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    return controller;
  }

  async function runAnalysis(request: AnalyzeRequest, controller: AbortController) {
    setState((prev) => ({
      status: 'processing',
      fileName: request.fileName,
      step: 'analyzing',
      detail: 'Wysyłanie treści do analizy AI…',
      startedAt: prev.status === 'processing' ? prev.startedAt : Date.now(),
    }));
    try {
      const result = await analyzeDocument(request, controller.signal);
      if (controller.signal.aborted) return;
      setEntries(history.add(result));
      setState({ status: 'success', result });
    } catch (error) {
      if (controller.signal.aborted || isAbort(error)) return;
      const { message, retryable } = errorMessage(error);
      setState({ status: 'error', message, retry: retryable ? request : null });
    }
  }

  async function handleFiles(files: File[]) {
    if (state.status === 'processing') return;
    const [file] = files;
    if (!file) return;
    if (files.length > 1) {
      setState({ status: 'idle', notice: 'Wgraj jeden plik naraz.' });
      return;
    }

    const controller = startController();
    try {
      const invalid = await validatePdfFile(file);
      if (invalid) {
        setState({ status: 'idle', notice: invalid });
        return;
      }

      setState({
        status: 'processing',
        fileName: file.name,
        step: 'reading',
        detail: 'Otwieranie pliku…',
        startedAt: Date.now(),
      });
      const { extractPdf } = await import('./lib/pdf').catch(() => {
        throw new PdfError('Nie udało się załadować modułu odczytu PDF. Odśwież stronę.');
      });
      const request = await extractPdf(file, controller.signal, (step, detail) => {
        if (controller.signal.aborted) return;
        setState((prev) => (prev.status === 'processing' ? { ...prev, step, detail } : prev));
      });
      if (controller.signal.aborted) return;
      await runAnalysis(request, controller);
    } catch (error) {
      if (controller.signal.aborted || isAbort(error)) return;
      const { message } = errorMessage(error);
      setState({ status: 'error', message, retry: null });
    }
  }

  function cancel() {
    controllerRef.current?.abort();
    setState({ status: 'idle', notice: 'Analiza została anulowana.' });
  }

  function reset() {
    controllerRef.current?.abort();
    setState({ status: 'idle', notice: null });
  }

  const retryRequest = state.status === 'error' ? state.retry : null;

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="brand">
          <a href="./">
            <svg viewBox="0 0 32 32" aria-hidden="true" className="brand__logo">
              <path d="M9 6h10l5 5v15H9z" />
              <path d="M13 16h7M13 20h7" />
            </svg>
            PDF Insight
          </a>
        </h1>
        <p className="app__tagline">
          Wgraj PDF, a w kilka sekund otrzymasz krótkie podsumowanie i uporządkowane dane JSON.
        </p>
      </header>

      <main className="app__main">
        {state.status === 'idle' && (
          <>
            {state.notice && (
              <p className="inline-alert" role="alert">
                {state.notice}
              </p>
            )}
            <Dropzone onFiles={(files) => void handleFiles(files)} />
            <PrivacyNotice />
            <HowItWorks />
            <HistoryList
              entries={entries}
              onOpen={(entry) => setState({ status: 'success', result: entry.result })}
              onRemove={(id) => setEntries(history.remove(id))}
              onClear={() => setEntries(history.clear())}
            />
          </>
        )}

        {state.status === 'processing' && (
          <ProcessingView
            fileName={state.fileName}
            step={state.step}
            detail={state.detail}
            startedAt={state.startedAt}
            onCancel={cancel}
          />
        )}

        {state.status === 'error' && (
          <ErrorView
            message={state.message}
            onRetry={retryRequest ? () => void runAnalysis(retryRequest, startController()) : null}
            onReset={reset}
          />
        )}

        {state.status === 'success' && <ResultView result={state.result} onReset={reset} />}
      </main>

      <footer className="app__footer">
        <p>
          PDF Insight · zadanie rekrutacyjne ·{' '}
          <a href="https://github.com/UFEQ1337/pdf-insight" target="_blank" rel="noreferrer">
            kod źródłowy
          </a>
        </p>
      </footer>
    </div>
  );
}
