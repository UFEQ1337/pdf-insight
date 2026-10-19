import { useFocusOnMount } from './useFocusOnMount';

interface Props {
  message: string;
  onRetry: (() => void) | null;
  onReset: () => void;
}

export function ErrorView({ message, onRetry, onReset }: Props) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <section className="panel error" role="alert" aria-labelledby="error-title">
      <h2 id="error-title" ref={headingRef} tabIndex={-1}>
        Nie udało się przeanalizować dokumentu
      </h2>
      <p className="error__message">{message}</p>
      <div className="actions">
        {onRetry && (
          <button type="button" className="button button--primary" onClick={onRetry}>
            Spróbuj ponownie
          </button>
        )}
        <button
          type="button"
          className={`button ${onRetry ? 'button--ghost' : 'button--primary'}`}
          onClick={onReset}
        >
          Wybierz inny plik
        </button>
      </div>
    </section>
  );
}
