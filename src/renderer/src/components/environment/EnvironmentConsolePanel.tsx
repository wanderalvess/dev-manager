import React from 'react';
import { History } from 'lucide-react';
import { TerminalViewer } from '../TerminalViewer';
import type { EnvironmentLogEntry } from '../../hooks/environment/useEnvironmentLogs';

interface EnvironmentConsolePanelProps {
  logs: EnvironmentLogEntry[];
  title: string;
  isRunning: boolean;
  isKarafEmbeddedRunning: boolean;
  onClear: () => void;
  onSendKarafCommand: (cmd: string) => void;
  onOpenHistory: () => void;
}

/** Console / terminal integrado com atalho para o histórico persistido do Karaf. */
export const EnvironmentConsolePanel: React.FC<EnvironmentConsolePanelProps> = ({
  logs,
  title,
  isRunning,
  isKarafEmbeddedRunning,
  onClear,
  onSendKarafCommand,
  onOpenHistory
}) => (
  <div className="lg:col-span-6 flex flex-col relative min-w-0 min-h-[400px] lg:min-h-0" data-tour="console-terminal">
    <button
      onClick={onOpenHistory}
      title="Ver histórico persistido do Karaf embedded (sobrevive a reinícios)"
      className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 bg-card/90 hover:bg-muted border border-border rounded-lg text-2xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
    >
      <History className="w-3 h-3" /> Histórico
    </button>
    <TerminalViewer
      logs={logs}
      onClear={onClear}
      title={title}
      isRunning={isRunning}
      onSendCommand={isKarafEmbeddedRunning ? onSendKarafCommand : undefined}
      inputPlaceholder="Digite um comando OSGi Karaf ou comando direto..."
    />
  </div>
);
