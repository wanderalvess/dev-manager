import React from 'react';
import { FileSearch, RefreshCw, Settings, Download, AlertTriangle, Info, Send, Sparkles } from 'lucide-react';
import type { DocsIndexProgress, DocsIndexStatus, LlmProviderConfig } from '../../../../shared/types';
import { DocsIndexProgressBar } from './DocsIndexProgressBar';

interface DocsHeaderPanelProps {
  status: DocsIndexStatus | null;
  hasIndex: boolean;
  isIndexing: boolean;
  progress: DocsIndexProgress | null;
  indexError: string | null;
  settingsCount: number;
  enabledSyncTargetsCount: number;
  activeLlmProvider: LlmProviderConfig | undefined;
  onOpenTour: () => void;
  onOpenSettings: () => void;
  onOpenSync: () => void;
  onReindex: () => void;
  onOpenModelHelp: () => void;
}

export const DocsHeaderPanel: React.FC<DocsHeaderPanelProps> = ({
  status,
  hasIndex,
  isIndexing,
  progress,
  indexError,
  settingsCount,
  enabledSyncTargetsCount,
  activeLlmProvider,
  onOpenTour,
  onOpenSettings,
  onOpenSync,
  onReindex,
  onOpenModelHelp
}) => (
  <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border shrink-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary">
          <FileSearch className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            Documentação
            {hasIndex && status && (
              <span className="text-2xs bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
                {status.totalChunks} trechos · {status.totalFiles} arquivos · {status.totalSources} fontes
                {!status.isTextOnly && ' · IA Neural Ativa'}
              </span>
            )}
            <button
              type="button"
              onClick={onOpenTour}
              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition cursor-pointer"
              title="Rever o tour guiado desta página"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Busca semântica local (RAG) sobre o README/docs dos projetos e das pastas adicionais configuradas.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          data-tour="doc-settings-button"
          onClick={onOpenSettings}
          className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          title="Configurar pastas locais, projetos Git, Confluence, Jira e Assistente IA"
        >
          <Settings className="w-3.5 h-3.5 text-primary" />
          <span>Configurações ({settingsCount})</span>
          {activeLlmProvider && activeLlmProvider.enabled && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" title={`IA Ativa: ${activeLlmProvider.name}`} />
          )}
        </button>

        <button
          onClick={onOpenSync}
          className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
          title="Gerenciar e enviar documentos vetorizados para APIs externas (ex: Espaço Ágil)"
        >
          <Send className="w-3.5 h-3.5 text-primary" />
          <span>Sincronizações ({enabledSyncTargetsCount})</span>
        </button>

        <button
          data-tour="reindex-button"
          onClick={onReindex}
          disabled={isIndexing}
          className="px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer active:scale-95"
          title="Escanear projetos e (re)gerar o índice de busca"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isIndexing ? 'animate-spin' : ''}`} />
          <span>{isIndexing ? 'Indexando...' : hasIndex ? 'Reindexar' : 'Indexar Documentação'}</span>
        </button>
      </div>
    </div>

    {indexError && (
      <div className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="font-semibold">Erro ao indexar documentação:</span> {indexError}
        </div>
      </div>
    )}

    {hasIndex && status?.isTextOnly && (
      <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            <strong>Modo Textual Ativo:</strong> Busca por termos e palavras-chave habilitada ({status.totalFiles} arquivos). Para habilitar a busca semântica neural por IA, instale o modelo local.
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenModelHelp}
          className="text-[11px] underline hover:no-underline font-semibold shrink-0 cursor-pointer"
        >
          Como instalar modelo offline
        </button>
      </div>
    )}

    {!status?.modelDownloaded && !status?.isTextOnly && (
      <div className="mt-3 pt-3 border-t border-border/60 flex items-start justify-between gap-2 text-[11px] text-amber-600 dark:text-amber-400">
        <div className="flex items-start gap-2">
          <Download className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Na primeira indexação, o modelo de embeddings (~90MB) é baixado da internet. Em redes corporativas com bloqueio, a busca textual simples funcionará automaticamente.
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenModelHelp}
          className="text-[11px] underline hover:no-underline font-semibold shrink-0 cursor-pointer"
        >
          Instalação manual
        </button>
      </div>
    )}

    {isIndexing && progress && <DocsIndexProgressBar progress={progress} />}
  </div>
);
