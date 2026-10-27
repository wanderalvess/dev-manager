import React from 'react';
import {
  Play,
  RefreshCw,
  Database,
  AlertTriangle,
  Layers,
  Code2,
  Download,
  HelpCircle
} from 'lucide-react';
import type { DatabaseConnectionConfig, QaRegressionTemplate } from '../../../../../shared/types';
import { getQaRunBlocker } from '../../../utils/qaRegressionRendererUtils';

const SECONDARY_ACTION_CLASS =
  'px-2.5 h-8 rounded-lg text-foreground hover:bg-muted text-[13px] font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

interface QaRunnerToolbarProps {
  dbConnections: DatabaseConnectionConfig[];
  templates: QaRegressionTemplate[];
  selectedTemplate: QaRegressionTemplate | null;
  selectedTemplateId: string;
  selectedConnectionId: string;
  isRunning: boolean;
  onSelectConnection: (id: string) => void;
  onSelectTemplate: (id: string) => void;
  onExportTemplate: () => void;
  onOpenHelp: () => void;
  onRun: () => void;
  onNavigate?: (tab: string) => void;
  onOpenTemplatesManager?: () => void;
}

export const QaRunnerToolbar: React.FC<QaRunnerToolbarProps> = ({
  dbConnections,
  templates,
  selectedTemplate,
  selectedTemplateId,
  selectedConnectionId,
  isRunning,
  onSelectConnection,
  onSelectTemplate,
  onExportTemplate,
  onOpenHelp,
  onRun,
  onNavigate,
  onOpenTemplatesManager
}) => {
  const runBlocker = getQaRunBlocker(selectedConnectionId, selectedTemplate);
  return (
    <div className="px-4 py-2.5 border-b border-border bg-card space-y-2 shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Seletor de Conexão */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-muted-foreground" />
            Banco:
          </span>
          {dbConnections.length > 0 ? (
            <select
              value={selectedConnectionId}
              onChange={(e) => onSelectConnection(e.target.value)}
              className="bg-background border border-input text-foreground text-sm rounded-[10px] px-3 h-10 font-medium focus:outline-hidden focus:ring-2 focus:ring-ring min-w-[180px]"
            >
              {dbConnections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type.toUpperCase()}) {c.host ? `— ${c.host}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 px-2.5 py-1 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Nenhuma conexão cadastrada</span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('database')}
                  className="underline font-bold hover:text-warning cursor-pointer ml-1"
                >
                  Cadastrar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Seletor de Cenário / Template */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            Cenário:
          </span>
          <select
            value={selectedTemplateId}
            onChange={(e) => onSelectTemplate(e.target.value)}
            className="bg-background border border-input text-foreground text-sm rounded-[10px] px-3 h-10 font-medium focus:outline-hidden focus:ring-2 focus:ring-ring flex-1 min-w-[200px] max-w-2xl truncate"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.steps.length} {t.steps.length === 1 ? 'passo' : 'passos'}) {t.category ? `[${t.category}]` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Botão de Execução Principal */}
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning || !!runBlocker}
          title={runBlocker ?? undefined}
          className="px-4 h-10 rounded-[10px] bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Executando Queries no Oracle...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Executar Validação Regressiva</span>
            </>
          )}
        </button>
      </div>

      {/* Descrição do cenário + ações secundárias (ficam fora da linha principal para ela não quebrar) */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
        {selectedTemplate?.description ? (
          <p className="text-[13px] text-muted-foreground border-l-2 border-primary/50 pl-2.5 py-0.5 flex-1 min-w-0">
            {selectedTemplate.description}
          </p>
        ) : (
          <span className="flex-1" />
        )}

        <div className="flex items-center gap-1 shrink-0">
          {onOpenTemplatesManager && (
            <button
              type="button"
              onClick={onOpenTemplatesManager}
              className={SECONDARY_ACTION_CLASS}
              title="Abrir Gerenciador de Templates para criar ou editar queries"
            >
              <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Gerenciar Templates</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportTemplate}
            disabled={!selectedTemplate}
            className={SECONDARY_ACTION_CLASS}
            title="Exportar template selecionado para arquivo JSON"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Exportar Template</span>
          </button>

          <button
            type="button"
            onClick={onOpenHelp}
            className={SECONDARY_ACTION_CLASS}
            title="Guia Prático: Como usar, configurar asserções e exportar templates"
          >
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Como Usar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
