import React from 'react';
import { Play, Terminal, Check, Copy } from 'lucide-react';
import type { TestExecutionResult } from '../../../../../shared/types';

interface TautConsoleProps {
  isRunning: boolean;
  activeOutput: string;
  lastExecutionResult: TestExecutionResult | null;
  terminalRef: React.RefObject<HTMLDivElement>;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  onClear: () => void;
}

export const TautConsole: React.FC<TautConsoleProps> = ({
  isRunning,
  activeOutput,
  lastExecutionResult,
  terminalRef,
  copiedKey,
  onCopy,
  onClear
}) => (
  <div className="lg:col-span-7 flex flex-col h-[520px] rounded-xl bg-card border border-border shadow-xs overflow-hidden">
    {/* Header do Terminal */}
    <div className="px-3 py-2 bg-muted/60 border-b border-border/60 flex items-center justify-between shrink-0">
      <div className="flex items-center space-x-2">
        <Terminal className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-foreground">Console de Execução Cypress</span>
        {isRunning && (
          <span className="flex items-center space-x-1 text-2xs font-mono text-emerald-400 font-bold animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>AO VIVO</span>
          </span>
        )}
      </div>

      <div className="flex items-center space-x-1.5">
        {activeOutput && (
          <button
            type="button"
            onClick={() => onCopy(activeOutput, 'cypress-output')}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition cursor-pointer"
            title="Copiar log completo"
          >
            {copiedKey === 'cypress-output' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onClear}
          disabled={!activeOutput}
          className="text-2xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition cursor-pointer disabled:opacity-40"
        >
          Limpar
        </button>
      </div>
    </div>

    {/* Corpo do Terminal com Log em Streaming */}
    <div
      ref={terminalRef}
      className="flex-1 p-3 font-mono text-[11px] leading-relaxed bg-[#0B0F17] text-slate-200 overflow-y-auto select-text whitespace-pre-wrap"
    >
      {activeOutput ? (
        activeOutput
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 select-none">
          <Play className="w-8 h-8 opacity-30" />
          <p className="text-xs">Nenhuma execução em andamento.</p>
          <p className="text-2xs text-slate-600">
            Selecione as tags ou arquivos de teste à esquerda e clique em &quot;Rodar Headless&quot;.
          </p>
        </div>
      )}
    </div>

    {/* Rodapé com Resumo da Execução (se finalizada) */}
    {lastExecutionResult && (
      <div className="px-3 py-2 bg-muted/40 border-t border-border/60 flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1">
            <span className="text-muted-foreground">Total:</span>
            <strong>{lastExecutionResult.totalTests}</strong>
          </span>
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <span>Aprovados:</span>
            <span>{lastExecutionResult.passedCount}</span>
          </span>
          {lastExecutionResult.failedCount > 0 && (
            <span className="flex items-center gap-1 text-rose-400 font-bold">
              <span>Falhas:</span>
              <span>{lastExecutionResult.failedCount}</span>
            </span>
          )}
          {lastExecutionResult.skippedCount > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <span>Ignorados:</span>
              <span>{lastExecutionResult.skippedCount}</span>
            </span>
          )}
        </div>

        <div className="text-muted-foreground">
          Duração: {(lastExecutionResult.durationMs / 1000).toFixed(1)}s
        </div>
      </div>
    )}
  </div>
);
