import React, { useState } from 'react';
import { Bot, Check, Copy, RefreshCw, Settings, Sparkles, AlertTriangle } from 'lucide-react';
import type { LlmProviderConfig } from '../../../../shared/types';
import { AiMarkdownViewer } from '../AiMarkdownViewer';
import { DocsAiSources } from './DocsAiSources';

interface DocsAiAnswerCardProps {
  query: string;
  isAskingLlm: boolean;
  llmAnswer: string | null;
  llmError: string | null;
  llmSources: Array<{ title: string; path: string; score: number }>;
  activeLlmProvider: LlmProviderConfig | undefined;
  onAskLlm: (q?: string) => void;
  onNavigateToSettings?: () => void;
  onOpenPreview: (filePath: string, title: string) => void;
}

export const DocsAiAnswerCard: React.FC<DocsAiAnswerCardProps> = ({
  query,
  isAskingLlm,
  llmAnswer,
  llmError,
  llmSources,
  activeLlmProvider,
  onAskLlm,
  onNavigateToSettings,
  onOpenPreview
}) => {
  const [copiedLlmAnswer, setCopiedLlmAnswer] = useState<boolean>(false);

  return (
    <div className="cockpit-card rounded-2xl p-4.5 border border-primary/40 bg-card shadow-md space-y-3.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <Bot className="w-4.5 h-4.5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                Copilot Técnico WinThor {activeLlmProvider ? `· ${activeLlmProvider.name}` : ''}
              </span>
              {activeLlmProvider && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/25 font-bold shrink-0">
                  {activeLlmProvider.model}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground block truncate">
              Síntese contextual gerada com base na documentação dos projetos e wikis indexadas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {llmAnswer && (
            <>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(llmAnswer);
                  setCopiedLlmAnswer(true);
                  setTimeout(() => setCopiedLlmAnswer(false), 2000);
                }}
                className="px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-foreground border border-border hover:border-border/80 transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Copiar síntese gerada"
              >
                {copiedLlmAnswer ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isAskingLlm}
                onClick={() => onAskLlm(query)}
                className="px-3 py-1.5 rounded-xl bg-card hover:bg-primary/10 text-primary border border-border hover:border-primary/40 transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                title="Regenerar resposta"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAskingLlm ? 'animate-spin' : ''}`} />
                <span>Regenerar</span>
              </button>
            </>
          )}
          {!llmAnswer && !isAskingLlm && (
            <button
              type="button"
              onClick={() => onAskLlm(query)}
              className="px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gerar Resposta com IA</span>
            </button>
          )}
        </div>
      </div>

      {isAskingLlm && (
        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Consultando {activeLlmProvider?.name || 'modelo de IA'} ({activeLlmProvider?.model || 'LLM'})...</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              RAG Vector Search
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Analisando trechos indexados para responder "{query.trim()}"...
          </p>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-pulse w-3/4 rounded-full" />
          </div>
        </div>
      )}

      {llmError && !isAskingLlm && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-xs space-y-2 font-mono">
          <div className="flex items-center justify-between text-destructive font-semibold">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Erro ao consultar motor de IA
            </span>
            <div className="flex items-center gap-2">
              {onNavigateToSettings && (
                <button
                  type="button"
                  onClick={onNavigateToSettings}
                  className="text-foreground/90 hover:text-foreground text-[11px] font-semibold flex items-center gap-1 cursor-pointer font-sans"
                >
                  <Settings className="w-3 h-3" />
                  <span>Configurar Motor</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onAskLlm(query)}
                className="text-primary hover:underline text-[11px] font-semibold cursor-pointer font-sans"
              >
                Tentar de novo
              </button>
            </div>
          </div>
          <p className="text-[11px] text-destructive/80 break-all">{llmError}</p>
        </div>
      )}

      {llmAnswer && !isAskingLlm && (
        <div className="space-y-3 pt-1">
          <div className="bg-card/90 p-4.5 rounded-xl border border-border/80 shadow-2xs">
            <AiMarkdownViewer content={llmAnswer} />
          </div>

          {llmSources.length > 0 && <DocsAiSources sources={llmSources} onOpenPreview={onOpenPreview} />}
        </div>
      )}
    </div>
  );
};
