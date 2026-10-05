import React from 'react';
import { Square, Terminal, RotateCcw, History } from 'lucide-react';
import type { TestExecutionResult } from '../../../../../shared/types';
import type { TestRunnersRightTab } from '../../../hooks/quality/testrunners/useTestRunners';
import { ExecutionResultBanner } from './ExecutionResultBanner';
import { HistoryList } from './HistoryList';

interface ConsolePanelProps {
  activeTab: TestRunnersRightTab;
  onTabChange: (tab: TestRunnersRightTab) => void;
  history: TestExecutionResult[];
  runningRunnerId: string | null;
  activeOutput: string;
  activeExecutionResult: TestExecutionResult | null;
  terminalBottomRef: React.MutableRefObject<HTMLDivElement | null>;
  canSync: boolean;
  onAbort: () => void;
  onClearConsole: () => void;
  onClearHistory: () => void;
  onViewLog: (item: TestExecutionResult) => void;
  onSync: (runnerId: string, result: TestExecutionResult) => void;
}

const tabClass = (active: boolean) =>
  `px-3 py-1 rounded-md text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
    active ? 'bg-zinc-800 text-zinc-100 shadow-2xs' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
  }`;

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  activeTab,
  onTabChange,
  history,
  runningRunnerId,
  activeOutput,
  activeExecutionResult,
  terminalBottomRef,
  canSync,
  onAbort,
  onClearConsole,
  onClearHistory,
  onViewLog,
  onSync
}) => (
  <div className="w-full md:w-7/12 lg:w-8/12 flex flex-col overflow-hidden bg-zinc-950 text-zinc-100">
    {/* Header do Terminal */}
    <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/90 flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onTabChange('console')} className={tabClass(activeTab === 'console')}>
          <Terminal className="w-3.5 h-3.5" />
          <span>Console</span>
        </button>
        <button type="button" onClick={() => onTabChange('history')} className={tabClass(activeTab === 'history')}>
          <History className="w-3.5 h-3.5" />
          <span>Histórico ({history.length})</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {runningRunnerId && (
          <button
            type="button"
            onClick={onAbort}
            className="px-2.5 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
          >
            <Square className="w-3 h-3 fill-rose-300" />
            <span>Interromper</span>
          </button>
        )}

        {activeTab === 'console' && (
          <button
            type="button"
            onClick={onClearConsole}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
            title="Limpar console"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        {activeTab === 'history' && history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="px-2 py-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-[11px] font-mono transition cursor-pointer"
          >
            Limpar Registros
          </button>
        )}
      </div>
    </div>

    {/* Banner de Resultado Final da Execução */}
    {activeExecutionResult && activeTab === 'console' && (
      <ExecutionResultBanner result={activeExecutionResult} canSync={canSync} onSync={onSync} />
    )}

    {/* Conteúdo: Console ou Histórico */}
    {activeTab === 'console' ? (
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed select-text whitespace-pre-wrap break-all text-zinc-300">
        {activeOutput ? (
          activeOutput
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600">
            <Terminal className="w-8 h-8 mb-2 opacity-40" />
            <span>Nenhuma saída de execução. Clique em &quot;Executar Agora&quot; em um runner.</span>
          </div>
        )}
        <div ref={terminalBottomRef} />
      </div>
    ) : (
      <HistoryList history={history} canSync={canSync} onViewLog={onViewLog} onSync={onSync} />
    )}
  </div>
);
