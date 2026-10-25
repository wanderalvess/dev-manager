import React from 'react';
import { Settings } from 'lucide-react';
import { INTEGRATION_LAYER_LABELS, INTEGRATION_LAYER_ORDER } from '../../../../shared/integrationTypes';

interface ReadinessEmptyStateProps {
  onOpenSettings: () => void;
}

/** Antes do primeiro pré-voo: mostra a cadeia que será conferida e leva à configuração. */
export const ReadinessEmptyState: React.FC<ReadinessEmptyStateProps> = ({ onOpenSettings }) => (
  <div className="bg-card border border-border rounded-xl p-6 space-y-4">
    <div>
      <h2 className="text-sm font-semibold text-foreground">A cadeia que o Hub confere</h2>
      <p className="text-xs text-muted-foreground mt-1">
        O pré-voo verifica cada ponta antes de você testar uma integração, e só olha o que estiver preenchido em Configurações.
      </p>
    </div>
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {INTEGRATION_LAYER_ORDER.map((layer, index) => (
        <li key={layer} className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-muted text-foreground font-medium">{INTEGRATION_LAYER_LABELS[layer]}</span>
          {index < INTEGRATION_LAYER_ORDER.length - 1 && <span aria-hidden="true" className="text-muted-foreground">→</span>}
        </li>
      ))}
    </ol>
    <button
      type="button"
      onClick={onOpenSettings}
      className="h-10 px-4 bg-muted hover:bg-muted/80 text-foreground border border-border font-medium text-sm rounded-[10px] transition-colors flex items-center gap-2"
    >
      <Settings className="w-4 h-4" />
      <span>Configurar camadas e fluxos</span>
    </button>
  </div>
);
