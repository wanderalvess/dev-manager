import React from 'react';
import { AlertTriangle, Check, RefreshCw } from 'lucide-react';
import type { DocSyncProgress, DocSyncResult } from '../../../../../shared/types';

interface DocsSyncFeedbackProps {
  isSyncing: boolean;
  syncProgress: DocSyncProgress | null;
  syncResults: DocSyncResult[] | null;
}

export const DocsSyncFeedback: React.FC<DocsSyncFeedbackProps> = ({ isSyncing, syncProgress, syncResults }) => (
  <>
    {/* Barra de Progresso com Pulso e Indicadores Precisos */}
    {isSyncing && syncProgress && (
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/25 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-primary flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
            Transmitindo para {syncProgress.targetName}...
          </span>
          <span className="font-mono text-xs text-foreground font-semibold">
            Lote {syncProgress.currentBatch}/{syncProgress.totalBatches} · {syncProgress.sentChunks} chunks{syncProgress.totalArticles ? ` · ${syncProgress.sentArticles || 0}/${syncProgress.totalArticles} artigos` : ''}
          </span>
        </div>
        <div className="w-full bg-primary/15 rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300 rounded-full"
            style={{
              width: `${syncProgress.totalChunks ? Math.round((syncProgress.sentChunks / syncProgress.totalChunks) * 100) : 0}%`
            }}
          />
        </div>
      </div>
    )}

    {/* Feedback de Resultados com estilo de Alerta de Cockpit */}
    {syncResults && (
      <div className="space-y-2">
        {syncResults.map((res, i) => (
          <div
            key={i}
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 shadow-xs ${
              res.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            }`}
          >
            {res.success ? <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-foreground">{res.targetName}</div>
              <div className="text-[11px] mt-0.5">
                {res.success
                  ? `Sincronização concluída com sucesso! ${res.totalChunksSent || 0} chunks${res.totalArticlesSent ? ` e ${res.totalArticlesSent} artigos` : ''} entregues em ${res.totalBatches} lote(s).`
                  : `Falha: ${res.error || 'Não foi possível conectar com o endpoint remoto'}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </>
);
