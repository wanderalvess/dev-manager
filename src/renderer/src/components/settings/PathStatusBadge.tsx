import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { PathStatusInfo } from '../../../../shared/types';

/** Selo "caminho acessível / não localizado" ao lado dos campos de caminho. Sem status ainda, não mostra nada. */
export const PathStatusBadge: React.FC<{ status: PathStatusInfo | undefined }> = ({ status }) => {
  if (!status) return null;

  if (status.exists) {
    return (
      <div className="flex items-center space-x-1.5 text-2xs text-success bg-success/10 border border-success/30 px-2.5 py-0.5 rounded-lg">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-success" />
        <span className="font-medium">{status.message || 'Caminho acessível'}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1.5 text-2xs text-danger bg-danger/10 border border-danger/30 px-2.5 py-0.5 rounded-lg">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-danger" />
      <span className="font-medium">{status.message || 'Caminho não localizado no disco'}</span>
    </div>
  );
};
