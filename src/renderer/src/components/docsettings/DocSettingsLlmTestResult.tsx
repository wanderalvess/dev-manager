import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import type { LlmTestResult } from '../../../../shared/types';

export const DocSettingsLlmTestResult: React.FC<{ result: LlmTestResult }> = ({ result }) => (
  <div
    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
      result.success
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
        : 'bg-destructive/10 border-destructive/30 text-destructive'
    }`}
  >
    {result.success ? (
      <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
    ) : (
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
    )}
    <div className="flex-1 min-w-0">
      <div className="font-bold">
        {result.success ? 'Conexão Estabelecida!' : 'Falha no Teste de Conexão'}
        {result.latencyMs !== undefined && (
          <span className="ml-2 text-[10px] font-mono font-normal opacity-80">({result.latencyMs}ms)</span>
        )}
      </div>
      <p className="text-[11px] mt-0.5">{result.message}</p>
    </div>
  </div>
);
