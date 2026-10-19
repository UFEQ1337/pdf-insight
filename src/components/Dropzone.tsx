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
    <>
      <button
        type="button"
        className={`dropzone${dragging ? ' dropzone--active' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={handleDrop}
        aria-label="Wybierz plik PDF do analizy lub upuść go tutaj"
        aria-describedby="dropzone-hint"
      >
        <svg className="dropzone__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6M12 18v-6M9 15l3-3 3 3" />
        </svg>
        <span className="dropzone__title">
          {dragging ? 'Upuść plik, aby rozpocząć analizę' : 'Przeciągnij tutaj plik PDF'}
        </span>
        <span className="dropzone__or">albo</span>
        <span className="dropzone__cta">Wybierz plik z dysku</span>
        <span id="dropzone-hint" className="dropzone__hint">
          Jeden plik PDF do 10 MB. Skany bez warstwy tekstowej też zadziałają.
        </span>
      </button>
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
    </>
  );
}
