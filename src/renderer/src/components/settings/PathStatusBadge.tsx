import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { PathStatusInfo } from '../../../../shared/types';

/** Selo "caminho acessível / não localizado" ao lado dos campos de caminho. Sem status ainda, não mostra nada. */
export const PathStatusBadge: React.FC<{ status: PathStatusInfo | undefined }> = ({ status }) => {
  if (!status) return null;

  if (status.exists) {
    return (
      <div className="flex items-center space-x-1.5 text-[11px] text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
        <span className="font-medium">{status.message || 'Caminho acessível'}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1.5 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 rounded-lg">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
      <span className="font-medium">{status.message || 'Caminho não localizado no disco'}</span>
    </div>
  );
};
