import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { BackupResult } from '../../../../../shared/types';
import { backupResultToneClass } from '../../../utils/backupModalUtils';
import { BackupHelpPanel } from './BackupHelpPanel';

interface BackupResultBoxProps {
  result: BackupResult;
  /** Detalhes extras do sucesso (tamanho, hash...). */
  children?: React.ReactNode;
}

/** Resultado de backup, restauração ou teste de restauração, com o "Como resolver" quando falha. */
export const BackupResultBox: React.FC<BackupResultBoxProps> = ({ result, children }) => (
  <div role="status" className={`p-4 rounded-xl border ${backupResultToneClass(result.success)}`}>
    <div className="flex items-start gap-2.5">
      {result.success ? (
        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-success" aria-hidden="true" />
      ) : (
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-danger" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        {/* Quebra só onde precisa (caminhos longos), sem partir palavras comuns no meio */}
        <span className="text-xs font-bold [overflow-wrap:anywhere]">{result.message}</span>
        {!result.success && result.help && <BackupHelpPanel help={result.help} />}
        {result.success && children}
      </div>
    </div>
  </div>
);
