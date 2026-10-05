import React from 'react';
import { History, X, RotateCw } from 'lucide-react';

interface KarafDeployHistoryHeaderProps {
  isLoading: boolean;
  onReload: () => void;
  onClose: () => void;
}

export const KarafDeployHistoryHeader: React.FC<KarafDeployHistoryHeaderProps> = ({
  isLoading,
  onReload,
  onClose
}) => (
  <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between shrink-0">
    <div className="flex items-center space-x-3">
      <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-sm shadow-sky-500/10">
        <History className="w-5 h-5" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-100 tracking-tight">Histórico & Telemetria de Deploys</h3>
          <span className="text-2xs uppercase font-mono tracking-wider px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30 font-semibold">
            OSGi Audit Rail
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Auditoria de compilações Maven, hot-deploys e ativações em tempo real (UI & MCP Agent).
        </p>
      </div>
    </div>

    <div className="flex items-center space-x-2">
      <button
        type="button"
        onClick={onReload}
        disabled={isLoading}
        className="p-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
        title="Recarregar histórico de deploys"
      >
        <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
      </button>
      <button
        type="button"
        onClick={onClose}
        className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
        title="Fechar histórico"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);
