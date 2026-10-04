import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { RoutineDownloadResult } from '../../../../shared/types';

interface CcwFeedbackAlertsProps {
  result: RoutineDownloadResult | null;
  errorMsg: string | null;
}

export const CcwFeedbackAlerts: React.FC<CcwFeedbackAlertsProps> = ({ result, errorMsg }) => (
  <>
    {result && (
      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs space-y-1.5 animate-in fade-in duration-150">
        <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{result.message}</span>
        </div>
        {result.installedPath && (
          <div className="text-[11px] font-mono text-muted-foreground pl-6 break-all">
            Instalado em: <span className="text-foreground font-bold">{result.installedPath}</span>
          </div>
        )}
        {result.backupPath && (
          <div className="text-[11px] font-mono text-muted-foreground pl-6 break-all">
            Backup criado: <span className="text-foreground font-semibold">{result.backupPath}</span>
          </div>
        )}
        {result.extractedFiles && result.extractedFiles.length > 0 && (
          <div className="text-[10px] text-muted-foreground pl-6">
            Arquivos gravados ({result.extractedFiles.length}): {result.extractedFiles.join(', ')}
          </div>
        )}
      </div>
    )}

    {errorMsg && (
      <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-bold block">Falha na operação</span>
          <span className="text-[11px] mt-0.5 block opacity-90">{errorMsg}</span>
        </div>
      </div>
    )}
  </>
);
