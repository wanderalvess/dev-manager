import React, { useRef, useEffect, useState } from 'react';
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  Search,
  ArrowDown,
  CornerDownLeft
} from 'lucide-react';
import { EnvironmentLog } from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface TerminalViewerProps {
  logs: (string | EnvironmentLog)[];
  onClear: () => void;
  title?: string;
  isRunning?: boolean;
  onSendCommand?: (cmd: string) => void;
  inputPlaceholder?: string;
}

export const TerminalViewer: React.FC<TerminalViewerProps> = ({
  logs,
  onClear,
  title = 'Console de Execução',
  isRunning = false,
  onSendCommand,
  inputPlaceholder = 'Digite um comando OSGi Karaf (ex: bundle:list, la, feature:list, log:tail)...'
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { copy: copyLogs, copiedKey } = useCopyToClipboard(2000);
  const copied = copiedKey === 'logs';
  const [filterType, setFilterType] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  // Input de comando interativo
  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopy = () => {
    const text = logs
      .map((l) => (typeof l === 'string' ? l : `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`))
      .join('\n');
    copyLogs(text, 'logs');
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputCommand.trim() || !onSendCommand) return;

    onSendCommand(inputCommand);
    setHistory((prev) => [...prev, inputCommand]);
    setHistoryIndex(-1);
    setInputCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setInputCommand(history[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= history.length) {
        setHistoryIndex(-1);
        setInputCommand('');
      } else {
        setHistoryIndex(nextIdx);
        setInputCommand(history[nextIdx] || '');
      }
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (typeof log === 'string') {
      if (searchFilter && !log.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      if (filterType === 'error') return log.includes('[ERRO]') || log.includes('ERROR') || log.includes('[FALHA]');
      if (filterType === 'success') return log.includes('[ OK ]') || log.includes('SUCCESS') || log.includes('✨');
      if (filterType === 'warning') return log.includes('[AVISO]') || log.includes('WARN');
      return true;
    } else {
      if (searchFilter && !log.message.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      if (filterType !== 'all' && log.type !== filterType) return false;
      return true;
    }
  });

  const renderLogLine = (log: string | EnvironmentLog, index: number) => {
    if (typeof log === 'string') {
      let color = 'text-slate-300';
      if (log.includes('[ERRO]') || log.includes('[FALHA]') || log.includes('ERROR')) {
        color = 'text-rose-400 font-semibold bg-rose-950/20 px-1 py-0.5 rounded';
      } else if (log.includes('[ OK ]') || log.includes('SUCCESS') || log.includes('sucesso') || log.includes('✨')) {
        color = 'text-emerald-400 font-medium';
      } else if (log.includes('[AVISO]') || log.includes('[INFO]') || log.includes('WARN')) {
        color = 'text-amber-300';
      } else if (log.startsWith('>')) {
        color = 'text-primary font-semibold';
      }

      return (
        <div key={index} className="flex items-start space-x-2 font-mono text-[11px] leading-relaxed group hover:bg-slate-800/40 px-1 rounded">
          <span className="text-slate-600 select-none w-6 text-right text-[10px] shrink-0 font-mono opacity-60">
            {index + 1}
          </span>
          <span className={`flex-1 whitespace-pre-wrap ${color}`}>{log}</span>
        </div>
      );
    }

    let color = 'text-slate-200';
    let badge = 'bg-slate-800 text-slate-400 border-slate-700';

    switch (log.type) {
      case 'success':
        color = 'text-emerald-300 font-medium';
        badge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        break;
      case 'error':
        color = 'text-rose-400 font-semibold bg-rose-950/20 px-1 py-0.5 rounded';
        badge = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
        break;
      case 'warning':
        color = 'text-amber-300';
        badge = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
        break;
      case 'info':
      default:
        color = 'text-primary-foreground';
        badge = 'bg-primary/10 text-primary border-primary/30';
        break;
    }

    return (
      <div key={index} className="flex items-start space-x-2 font-mono text-[11px] py-0.5 leading-relaxed group hover:bg-slate-800/40 px-1 rounded">
        <span className="text-slate-600 select-none w-6 text-right text-[10px] shrink-0 font-mono opacity-60">
          {index + 1}
        </span>
        <span className="text-slate-500 select-none text-[10px] shrink-0">{log.timestamp}</span>
        <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded border font-semibold select-none shrink-0 ${badge}`}>
          {log.type}
        </span>
        <span className={`flex-1 whitespace-pre-wrap ${color}`}>{log.message}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-[#070b12] border border-border rounded-2xl overflow-hidden shadow-2xl h-full">
      {/* Topo do Terminal com Controles */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#0e1422] border-b border-[#1b283f] gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-1 rounded-lg bg-primary/15 border border-primary/30 text-primary">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-wide">{title}</span>
            <span className="text-[10px] font-mono text-slate-400 ml-2">
              ({filteredLogs.length} {filteredLogs.length === 1 ? 'linha' : 'linhas'})
            </span>
          </div>

          {isRunning && (
            <span className="flex items-center space-x-1.5 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-semibold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Execução Ativa</span>
            </span>
          )}
        </div>

        {/* Filtros e Busca */}
        <div className="flex items-center space-x-2">
          {/* Busca no log */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filtrar logs..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-[#080d17] border border-slate-700 hover:border-slate-500 rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-100 placeholder-slate-400 focus:outline-none focus:border-primary font-mono w-28 md:w-36 transition-colors"
            />
          </div>

          {/* Filtros por Tipo */}
          <div className="hidden sm:flex items-center space-x-1 bg-[#080d17] p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                filterType === 'all'
                  ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('error')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                filterType === 'error'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-rose-300 hover:bg-rose-950/40'
              }`}
            >
              Erros
            </button>
          </div>

          {/* Ações */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              autoScroll
                ? 'bg-primary/20 border-primary/50 text-primary font-bold'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={autoScroll ? 'Auto-rolagem Ativa' : 'Auto-rolagem Pausada'}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            disabled={logs.length === 0}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-xs transition-colors disabled:opacity-30 cursor-pointer"
            title="Copiar Conteúdo do Console"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClear}
            disabled={logs.length === 0}
            className="p-1.5 text-slate-300 hover:text-rose-300 bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/50 rounded-lg text-xs transition-colors disabled:opacity-30 cursor-pointer"
            title="Limpar Console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Conteúdo com Estilo Phosphor Terminal */}
      <div
        ref={scrollRef}
        className="flex-1 p-3 overflow-y-auto space-y-0.5 select-text bg-[#070b12]"
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
          filteredLogs.map((log, idx) => renderLogLine(log, idx))
        )}
      </div>

      {/* Linha Interativa de Comando CLI */}
      {onSendCommand && (
        <form
          onSubmit={handleSend}
          className="bg-[#0b101c] border-t border-[#1b283f] px-3 py-2 flex items-center space-x-2"
        >
          <span className="text-amber-400 font-mono font-bold text-xs shrink-0 select-none">
            karaf@root()&gt;
          </span>
          <input
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            className="flex-1 bg-transparent border-none text-xs text-slate-200 font-mono focus:outline-none placeholder-slate-600"
          />
          <button
            type="submit"
            disabled={!inputCommand.trim()}
            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-40"
          >
            <span>Enviar</span>
            <CornerDownLeft className="w-3 h-3" />
          </button>
        </form>
      )}
    </div>
  );
};
