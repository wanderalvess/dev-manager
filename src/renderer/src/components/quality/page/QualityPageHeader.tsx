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
  <div className="border-b border-border bg-card px-7 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
    <div>
      <div className="flex items-center space-x-2.5">
        <CheckCheck className="w-5 h-5 text-muted-foreground shrink-0" />
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-foreground tracking-tight leading-tight">
              Homologação &amp; Prontidão
            </h1>
            {activeQualitySource ? (
              <span className="px-2.5 py-0.5 rounded-full text-[13px] font-medium bg-muted text-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                Fonte: {activeQualitySource.name} ({activeQualitySource.type}) · sem sincronização
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate?.('settings')}
                className="px-2.5 py-0.5 rounded-full text-[13px] font-medium bg-warning/10 hover:bg-warning/20 text-warning transition-colors cursor-pointer flex items-center gap-1"
                title="Cadastrar fontes Zephyr Scale, Jira ou Azure DevOps (sincronização ainda não implementada)"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Cadastrar fonte (Zephyr / Jira)</span>
              </button>
            )}
          </div>
          <p className="text-[13px] text-muted-foreground">
            Planejamento de testes, critérios de aceite, matriz de validação e prontidão de entregas.
          </p>
        </div>
      </div>
    </div>

    {/* Ações Rápidas de Topo */}
    <div className="flex items-center space-x-2 flex-wrap gap-y-2">
      <div className="flex items-center bg-background border border-input rounded-[10px] px-3 h-10 text-sm">
        <span className="text-muted-foreground mr-1.5 text-[13px]">Release</span>
        <input
          type="text"
          value={releaseVersion}
          onChange={(e) => onReleaseVersionChange(e.target.value)}
          aria-label="Versão da release em homologação"
          placeholder="ex.: v2.0.0"
          className="bg-transparent border-none text-foreground font-mono font-medium text-[13px] focus:outline-hidden w-20"
          title="Identificador da versão / release em homologação"
        />
      </div>

      <button
        type="button"
        onClick={onCopyReport}
        className="px-3 h-10 rounded-[10px] bg-background hover:bg-muted text-foreground border border-border text-sm font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
        title="Copiar relatório estruturado em Markdown para colar no Teams, Azure DevOps ou Jira"
      >
        {copiedKey === 'report' ? (
          <Check className="w-3.5 h-3.5 text-success" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <span>Exportar Relatório</span>
      </button>

      <button
        type="button"
        onClick={onOpenAddModal}
        className="px-4 h-10 rounded-[10px] bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Novo Cenário</span>
      </button>
    </div>
  </div>
);
