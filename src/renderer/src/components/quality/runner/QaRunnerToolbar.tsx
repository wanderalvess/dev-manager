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
  return (
    <div className="px-4 py-2.5 border-b border-border bg-card space-y-2 shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Seletor de Conexão */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-primary" />
            Banco:
          </span>
          {dbConnections.length > 0 ? (
            <select
              value={selectedConnectionId}
              onChange={(e) => onSelectConnection(e.target.value)}
              className="bg-background border border-border text-foreground text-xs rounded-md px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-primary min-w-[180px]"
            >
              {dbConnections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type.toUpperCase()}) {c.host ? `— ${c.host}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Nenhuma conexão cadastrada</span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('database')}
                  className="underline font-bold hover:text-amber-400 cursor-pointer ml-1"
                >
                  Cadastrar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Seletor de Cenário / Template */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            Cenário:
          </span>
          <select
            value={selectedTemplateId}
            onChange={(e) => onSelectTemplate(e.target.value)}
            className="bg-background border border-border text-foreground text-xs rounded-md px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-primary flex-1 max-w-md truncate"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.steps.length} passos) {t.category ? `[${t.category}]` : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onExportTemplate}
            disabled={!selectedTemplate}
            className="px-2.5 py-1.5 rounded-md bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            title="Exportar template selecionado para arquivo JSON"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Exportar Template</span>
          </button>

          {onOpenTemplatesManager && (
            <button
              type="button"
              onClick={onOpenTemplatesManager}
              className="px-2.5 py-1.5 rounded-md bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Abrir Gerenciador de Templates para criar ou editar queries"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Gerenciar Templates</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenHelp}
            className="px-2.5 py-1.5 rounded-md bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Guia Prático: Como usar, configurar asserções e exportar templates"
          >
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            <span>Como Usar</span>
          </button>
        </div>

        {/* Botão de Execução Principal */}
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning || !selectedConnectionId || !selectedTemplate}
          className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

      {/* Descrição do Template Ativo */}
      {selectedTemplate?.description && (
        <p className="text-[11px] text-muted-foreground border-l-2 border-primary/50 pl-2.5 py-0.5 font-mono">
          {selectedTemplate.description}
        </p>
      )}
    </div>
  );
};
