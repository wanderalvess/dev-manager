import React from 'react';

export type IntegrationTraceTab = 'readiness' | 'batch';

const TABS: { id: IntegrationTraceTab; label: string }[] = [
  { id: 'readiness', label: 'Pré-voo' },
  { id: 'batch', label: 'Rastrear lote' }
];

interface IntegrationTraceTabsProps {
  active: IntegrationTraceTab;
  onChange: (tab: IntegrationTraceTab) => void;
}

/** Abas sublinhadas da página, no mesmo padrão das Configurações. */
export const IntegrationTraceTabs: React.FC<IntegrationTraceTabsProps> = ({ active, onChange }) => (
  <div role="tablist" aria-label="Seções do Rastreio de Integração" className="flex items-center border-b border-border text-sm">
    {TABS.map(({ id, label }) => (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={active === id}
        onClick={() => onChange(id)}
        className={`px-3 py-2.5 font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
          active === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);
