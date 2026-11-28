import React from 'react';

export type DocsMode = 'local' | 'shared';

const OPTIONS: Array<{ id: DocsMode; label: string }> = [
  { id: 'local', label: 'Documentação local' },
  { id: 'shared', label: 'Base compartilhada (APIs Java + TDN)' }
];

interface DocsModeSwitchProps {
  mode: DocsMode;
  onChange: (mode: DocsMode) => void;
}

/** Alterna a página Docs entre a busca nas pastas locais e o chat da Base de Conhecimento compartilhada. */
export const DocsModeSwitch: React.FC<DocsModeSwitchProps> = ({ mode, onChange }) => (
  <div role="tablist" aria-label="Fonte da documentação" className="inline-flex self-start rounded-lg border border-border bg-muted/40 p-0.5">
    {OPTIONS.map((o) => (
      <button
        key={o.id}
        type="button"
        role="tab"
        aria-selected={mode === o.id}
        onClick={() => onChange(o.id)}
        className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
          mode === o.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);
