import React from 'react';
import { Terminal } from 'lucide-react';
import { EnvironmentLog } from '../../../shared/types';
import { useTerminalViewer } from '../hooks/terminal/useTerminalViewer';
import { useTerminalCommandInput } from '../hooks/terminal/useTerminalCommandInput';
import { TerminalToolbar } from './terminal/TerminalToolbar';
import { TerminalLogLine } from './terminal/TerminalLogLine';
import { TerminalCommandInput } from './terminal/TerminalCommandInput';

interface TerminalViewerProps {
  logs: (string | EnvironmentLog)[];
  onClear: () => void;
  title?: string;
  isRunning?: boolean;
  onSendCommand?: (cmd: string) => void;
  inputPlaceholder?: string;
  defaultWordWrap?: boolean;
  onToggleMaximize?: () => void;
  isMaximized?: boolean;
}

export const TerminalViewer: React.FC<TerminalViewerProps> = ({
  logs,
  onClear,
  title = 'Console de Execução',
  isRunning = false,
  onSendCommand,
  inputPlaceholder = 'Digite um comando OSGi Karaf (ex: bundle:list, la, feature:list, log:tail)...',
  defaultWordWrap = false,
  onToggleMaximize,
  isMaximized = false
}) => {
  const viewer = useTerminalViewer(logs, defaultWordWrap);
  const command = useTerminalCommandInput(onSendCommand);
  const { wordWrap, filteredLogs } = viewer;

  return (
    <div className="flex flex-col bg-[#070b12] border border-border/80 rounded-xl overflow-hidden shadow-xl h-full w-full min-w-0">
      <TerminalToolbar
        title={title}
        lineCount={filteredLogs.length}
        isRunning={isRunning}
        searchFilter={viewer.searchFilter}
        onSearchChange={viewer.setSearchFilter}
        filterType={viewer.filterType}
        onFilterTypeChange={viewer.setFilterType}
        onToggleMaximize={onToggleMaximize}
        isMaximized={isMaximized}
        wordWrap={wordWrap}
        onToggleWordWrap={() => viewer.setWordWrap(!wordWrap)}
        autoScroll={viewer.autoScroll}
        onToggleAutoScroll={() => viewer.setAutoScroll(!viewer.autoScroll)}
        copied={viewer.copied}
        onCopy={viewer.handleCopy}
        onClear={onClear}
        hasLogs={logs.length > 0}
      />

      {/* Conteúdo com Estilo Phosphor Terminal */}
      <div
        ref={viewer.scrollRef}
        className={`flex-1 p-3 overflow-y-auto space-y-0.5 select-text bg-[#070b12] min-w-0 ${wordWrap ? 'overflow-x-hidden' : 'overflow-x-auto'}`}
        style={{
          backgroundImage:
            'radial-gradient(rgba(0, 132, 255, 0.03) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 font-mono text-xs italic space-y-1">
            <Terminal className="w-8 h-8 opacity-20 text-primary" />
            <span>Nenhum registro de log no momento.</span>
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <TerminalLogLine key={idx} log={log} index={idx} wordWrap={wordWrap} />
          ))
        )}
      </div>

      {onSendCommand && (
        <TerminalCommandInput
          value={command.inputCommand}
          placeholder={inputPlaceholder}
          onChange={command.setInputCommand}
          onKeyDown={command.handleKeyDown}
          onSubmit={command.handleSend}
        />
      )}
    </div>
  );
};
