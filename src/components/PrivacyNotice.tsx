export function PrivacyNotice() {
  return (
    <aside className="notice" aria-label="Informacja o przetwarzaniu danych">
      <svg className="notice__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </svg>
      <p>
        <strong>Treść pliku trafia do zewnętrznego API AI (Google Gemini).</strong> Wysyłany jest
        odczytany tekst oraz obrazy stron bez warstwy tekstowej. W darmowym planie Google może
        wykorzystywać przesłane dane do ulepszania usług, dlatego nie wgrywaj dokumentów poufnych
        ani zawierających dane osobowe. Historia analiz jest zapisywana wyłącznie w tej
        przeglądarce.
      </p>
    </aside>
  );
}
