import React from 'react';

export type IntegrationTraceTab = 'wsh' | 'readiness' | 'batch';

const TABS: { id: IntegrationTraceTab; label: string }[] = [
  { id: 'wsh', label: 'Monitor do WSH' },
  { id: 'readiness', label: 'Pré-voo' },
  { id: 'batch', label: 'Rastrear lote' }
];

interface IntegrationTraceTabsProps {
  active: IntegrationTraceTab;
  onChange: (tab: IntegrationTraceTab) => void;
}

/** Abas sublinhadas da página, na mesma linha do título (a linha de baixo é do cabeçalho). */
export const IntegrationTraceTabs: React.FC<IntegrationTraceTabsProps> = ({ active, onChange }) => (
  <div role="tablist" aria-label="Seções do Rastreio de Integração" className="flex items-stretch text-sm">
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
