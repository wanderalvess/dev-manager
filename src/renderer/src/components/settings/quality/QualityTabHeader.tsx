import React from 'react';
import { CheckCheck, AlertTriangle, Plus } from 'lucide-react';
import { QualitySourceConfig } from '../../../../../shared/types';
import { getQualityProviderBadge } from '../../../utils/qualityTabUtils';

interface QualityTabHeaderProps {
  activeSource: QualitySourceConfig | undefined;
  onAddManual: () => void;
}

export const QualityTabHeader: React.FC<QualityTabHeaderProps> = ({ activeSource, onAddManual }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
    <div className="space-y-1">
      <div className="flex items-center gap-2.5">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <CheckCheck className="w-5 h-5 text-primary" />
          Fontes de Informação de Qualidade &amp; Testes (QA / PO)
        </h3>
        {activeSource ? (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 font-mono text-[10px] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ATIVA · {activeSource.name} ({getQualityProviderBadge(activeSource.type).label})
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 font-mono text-[10px] font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            NENHUMA FONTE ATIVA
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Conecte ferramentas de gestão de testes (Zephyr Scale, Zephyr Squad, Jira e Azure DevOps) para sincronizar cenários, casos de teste e planos de homologação.
      </p>
    </div>

    <button
      type="button"
      onClick={onAddManual}
      className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      <span>Adicionar Fonte Manual</span>
    </button>
  </div>
);
