import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2 } from 'lucide-react';

interface KarafFeaturesLogDrawerProps {
  logs: string | null;
  onClear: () => void;
}

export const KarafFeaturesLogDrawer: React.FC<KarafFeaturesLogDrawerProps> = ({
  logs,
  onClear
}) => {
  const logContainerRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!logs) return null;

  return (
    <div className="border-t border-border bg-slate-950 text-slate-200 shrink-0 flex flex-col max-h-48 overflow-hidden animate-in fade-in duration-150">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-2xs font-mono">
        <div className="flex items-center space-x-2 text-indigo-400">
          <Terminal className="w-3.5 h-3.5" />
          <span className="font-bold tracking-wider uppercase">Log de Execução Karaf SSH</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onClear}
            className="text-slate-400 hover:text-slate-200 flex items-center space-x-1 cursor-pointer transition-colors"
            title="Limpar saída"
          >
            <Trash2 className="w-3 h-3" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      <pre
        ref={logContainerRef}
        className="p-3 text-2xs font-mono whitespace-pre-wrap break-all overflow-y-auto leading-relaxed select-text"
      >
        {logs}
      </pre>
    </div>
  );
};
