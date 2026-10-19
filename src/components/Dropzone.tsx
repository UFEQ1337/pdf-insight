import { useRef, useState, type DragEvent } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
}

export function Dropzone({ onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    onFiles([...event.dataTransfer.files]);
  }

  return (
    <section
      className={`dropzone${dragging ? ' dropzone--active' : ''}`}
      aria-labelledby="dropzone-title"
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      <svg className="dropzone__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6M12 18v-6M9 15l3-3 3 3" />
      </svg>
      <h2 id="dropzone-title" className="dropzone__title">
        Przeciągnij i upuść plik PDF
      </h2>
      <p className="dropzone__or">lub</p>
      <button
        type="button"
        className="button button--primary"
        onClick={() => inputRef.current?.click()}
        aria-describedby="dropzone-hint"
      >
        Wybierz plik z dysku
      </button>
      <p id="dropzone-hint" className="dropzone__hint">
        Jeden plik PDF, maksymalnie 10 MB. Skany bez warstwy tekstowej są odczytywane przez OCR.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
    </section>
  );
}
