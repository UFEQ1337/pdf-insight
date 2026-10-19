import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="app">
        <section className="panel error" role="alert">
          <h1>Coś poszło nie tak</h1>
          <p className="error__message">
            Wystąpił nieoczekiwany błąd interfejsu. Odśwież stronę, aby spróbować ponownie.
          </p>
          <button
            type="button"
            className="button button--primary"
            onClick={() => window.location.reload()}
          >
            Odśwież stronę
          </button>
        </section>
      </main>
    );
  }
}
