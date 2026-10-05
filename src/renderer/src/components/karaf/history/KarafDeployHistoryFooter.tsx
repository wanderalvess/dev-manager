import React from 'react';

interface KarafDeployHistoryFooterProps {
  onClose: () => void;
}

export const KarafDeployHistoryFooter: React.FC<KarafDeployHistoryFooterProps> = ({ onClose }) => (
  <div className="p-3 px-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between shrink-0">
    <span className="text-[11px] text-slate-500 font-mono">
      Registros persistidos em <code className="text-slate-400">settings.karafDeployHistory</code> (máx: 200)
    </span>
    <button
      type="button"
      onClick={onClose}
      className="px-4 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition cursor-pointer"
    >
      Fechar
    </button>
  </div>
);
