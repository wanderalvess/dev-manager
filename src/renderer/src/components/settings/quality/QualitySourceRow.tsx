import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { QualitySourceConfig } from '../../../../../shared/types';
import { getQualityProviderBadge } from '../../../utils/qualityTabUtils';

interface QualitySourceRowProps {
  source: QualitySourceConfig;
  isCurrentActive: boolean;
  isTesting: boolean;
  testResult: { success: boolean; message: string } | undefined;
  onTest: (source: QualitySourceConfig) => void;
  onSetActive: (id: string) => void;
  onEdit: (source: Partial<QualitySourceConfig>) => void;
  onDelete: (id: string) => void;
}

export const QualitySourceRow: React.FC<QualitySourceRowProps> = ({
  source,
  isCurrentActive,
  isTesting,
  testResult,
  onTest,
  onSetActive,
  onEdit,
  onDelete
}) => {
  const badge = getQualityProviderBadge(source.type);

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isCurrentActive
          ? 'bg-card border-primary/40 shadow-xs'
          : 'bg-card/50 border-border opacity-70 hover:opacity-100'
      }`}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-foreground">{source.name}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>{badge.label}</span>
          {source.projectKey && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border">
              Projeto: {source.projectKey}
            </span>
          )}
          {isCurrentActive && (
            <span className="text-[10px] font-bold text-emerald-500 font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Padrão / Ativa
            </span>
          )}
        </div>
        <div className="text-[11px] font-mono text-muted-foreground truncate">{source.baseUrl}</div>
        {testResult && (
          <div
            className={`text-[11px] font-medium flex items-center gap-1 ${
              testResult.success ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {testResult.success ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <button
          type="button"
          onClick={() => onTest(source)}
          disabled={isTesting}
          className="px-2.5 py-1 text-xs rounded-lg border border-border hover:bg-muted text-foreground transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          title="Validar parâmetros da conexão"
        >
          <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
          <span>{isTesting ? 'Testando...' : 'Testar'}</span>
        </button>

        <button
          type="button"
          onClick={() => onSetActive(source.id)}
          className={`px-2.5 py-1 text-xs rounded-lg border transition cursor-pointer ${
            isCurrentActive
              ? 'bg-primary/10 border-primary/30 text-primary font-bold'
              : 'border-border hover:bg-muted text-muted-foreground'
          }`}
          title="Definir esta fonte como ativa no QA Hub"
        >
          {isCurrentActive ? 'Ativa' : 'Definir Ativa'}
        </button>

        <button
          type="button"
          onClick={() => onEdit(source)}
          className="px-2.5 py-1 text-xs rounded-lg border border-border hover:bg-muted text-foreground transition cursor-pointer"
        >
          Editar
        </button>

        <button
          type="button"
          onClick={() => onDelete(source.id)}
          className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-muted transition cursor-pointer"
          title="Excluir fonte"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
