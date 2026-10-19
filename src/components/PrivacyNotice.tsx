export function PrivacyNotice() {
  return (
    <details className="notice">
      <summary>
        <svg className="notice__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
        <span>
          <strong>Treść pliku trafia do zewnętrznego API AI (Google Gemini).</strong> Nie wgrywaj
          dokumentów poufnych. <span className="notice__more">Szczegóły</span>
        </span>
      </summary>
      <p>
        Do analizy wysyłany jest odczytany tekst oraz obrazy stron bez warstwy tekstowej. W darmowym
        planie Google może wykorzystywać przesłane dane do ulepszania usług, dlatego nie wgrywaj
        dokumentów zawierających tajemnice firmy ani dane osobowe. Plik nie jest przechowywany na
        serwerze aplikacji, a historia analiz zapisuje się wyłącznie w tej przeglądarce i możesz ją
        w każdej chwili usunąć.
      </p>
    </details>
  );
}
