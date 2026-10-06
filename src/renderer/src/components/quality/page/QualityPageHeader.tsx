import React from 'react';
import { AlertTriangle, Check, CheckCheck, Copy, Plus } from 'lucide-react';
import type { QualitySourceConfig } from '../../../../../shared/types';

interface QualityPageHeaderProps {
  activeQualitySource?: QualitySourceConfig;
  releaseVersion: string;
  onReleaseVersionChange: (value: string) => void;
  copiedKey: string | null;
  onCopyReport: () => void;
  onOpenAddModal: () => void;
  onNavigate?: (tab: string) => void;
}

export const QualityPageHeader: React.FC<QualityPageHeaderProps> = ({
  activeQualitySource,
  releaseVersion,
  onReleaseVersionChange,
  copiedKey,
  onCopyReport,
  onOpenAddModal,
  onNavigate
}) => (
  <div className="border-b border-border bg-card px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
    <div>
      <div className="flex items-center space-x-2.5">
        <CheckCheck className="w-5 h-5 text-primary shrink-0" />
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Homologação &amp; Prontidão
            </h2>
            {activeQualitySource ? (
              <span className="px-2 py-0.2 rounded text-2xs font-mono font-medium bg-muted text-foreground border border-border flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Fonte: {activeQualitySource.name} ({activeQualitySource.type}) · sem sincronização
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate?.('settings')}
                className="px-2 py-0.2 rounded text-2xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 transition-colors cursor-pointer flex items-center gap-1"
                title="Cadastrar fontes Zephyr Scale, Jira ou Azure DevOps (sincronização ainda não implementada)"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Cadastrar fonte (Zephyr / Jira)</span>
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Planejamento de testes, critérios de aceite, matriz de validação e prontidão de entregas.
          </p>
        </div>
      </div>
    </div>

    {/* Ações Rápidas de Topo */}
    <div className="flex items-center space-x-2 flex-wrap gap-y-2">
      <div className="flex items-center bg-background border border-border rounded-md px-2.5 py-1 text-xs">
        <span className="text-muted-foreground mr-1.5 font-mono text-[11px]">Release:</span>
        <input
          type="text"
          value={releaseVersion}
          onChange={(e) => onReleaseVersionChange(e.target.value)}
          aria-label="Versão da release em homologação"
          placeholder="ex.: v2.0.0"
          className="bg-transparent border-none text-foreground font-mono font-bold text-xs focus:outline-none w-20"
          title="Identificador da versão / release em homologação"
        />
      </div>

      <button
        type="button"
        onClick={onCopyReport}
        className="px-3 py-1.5 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
        title="Copiar relatório estruturado em Markdown para colar no Teams, Azure DevOps ou Jira"
      >
        {copiedKey === 'report' ? (
          <Check className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <span>Exportar Relatório</span>
      </button>

      <button
        type="button"
        onClick={onOpenAddModal}
        className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Novo Cenário</span>
      </button>
    </div>
  </div>
);
