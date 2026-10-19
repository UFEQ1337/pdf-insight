const STEPS = [
  { title: 'Wgraj PDF', text: 'Umowę, fakturę, ofertę lub raport.' },
  { title: 'Analiza AI', text: 'Zwykle trwa 10–25 sekund.' },
  { title: 'Wynik i JSON', text: 'Podsumowanie, dane i plik do pobrania.' },
];

const OUTPUTS = [
  'Podsumowanie',
  'Kluczowe punkty',
  'Kwoty i waluty',
  'Daty',
  'Osoby i firmy',
  'Plik JSON',
];

export function HowItWorks() {
  return (
    <section className="how" aria-labelledby="how-title">
      <h2 id="how-title" className="visually-hidden">
        Jak to działa
      </h2>
      <ol className="how__steps">
        {STEPS.map((step, index) => (
          <li key={step.title} className="how__step">
            <span className="how__number" aria-hidden="true">
              {index + 1}
            </span>
            <span>
              <strong>{step.title}</strong>
              <span className="how__text">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="how__label">Co otrzymasz:</p>
      <ul className="tags how__outputs">
        {OUTPUTS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
