import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export type ResultTab = 'view' | 'json';

const TABS: { id: ResultTab; label: string }[] = [
  { id: 'view', label: 'Wynik' },
  { id: 'json', label: 'JSON' },
];

interface Props {
  active: ResultTab;
  onChange: (tab: ResultTab) => void;
  children: Record<ResultTab, ReactNode>;
}

export function ResultTabs({ active, onChange, children }: Props) {
  const refs = useRef<Record<ResultTab, HTMLButtonElement | null>>({ view: null, json: null });

  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    const index = TABS.findIndex((tab) => tab.id === active);
    const keys: Record<string, number> = {
      ArrowRight: (index + 1) % TABS.length,
      ArrowLeft: (index - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    };
    const next = TABS[keys[event.key] ?? -1];
    if (!next) return;
    event.preventDefault();
    onChange(next.id);
    refs.current[next.id]?.focus();
  }

  return (
    <>
      <div role="tablist" aria-label="Widok wyniku" className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[tab.id] = element;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            className="tabs__tab"
            onClick={() => onChange(tab.id)}
            onKeyDown={handleKey}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={active !== tab.id}
          className="tabs__panel"
        >
          {children[tab.id]}
        </div>
      ))}
    </>
  );
}
