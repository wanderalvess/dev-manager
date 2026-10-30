import React from 'react';
import { VALIDATION_SCENARIOS, type ValidationScenarioId } from '../../../utils/validationScenarios';

interface ValidationScenarioTabsProps {
  active: ValidationScenarioId;
  onChange: (id: ValidationScenarioId) => void;
  /** Ações da página no fim da barra (o botão Histórico, que vale para todos os cenários). */
  actions?: React.ReactNode;
}

const INACTIVE_CLASS = 'text-muted-foreground hover:text-foreground border-transparent';
const TAB_BASE =
  'py-3 text-sm whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer border-b-2 -mb-px';

/** Uma aba por cenário de validação, no mesmo estilo das abas da Homologação. */
export const ValidationScenarioTabs: React.FC<ValidationScenarioTabsProps> = ({ active, onChange, actions }) => (
  <div className="border-b border-border bg-card px-4 md:px-5 shrink-0 flex items-center gap-4">
    <div role="tablist" aria-label="Cenários de validação" className="flex-1 min-w-0 flex items-center gap-6 overflow-x-auto">
      {VALIDATION_SCENARIOS.map(({ id, label, icon: Icon, description }) => {
        const selected = id === active;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            title={description}
            onClick={() => onChange(id)}
            className={`${TAB_BASE} ${selected ? 'text-foreground font-medium border-primary' : INACTIVE_CLASS}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
    {actions}
  </div>
);
