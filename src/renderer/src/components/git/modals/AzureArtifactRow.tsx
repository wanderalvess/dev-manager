import React, { useState } from 'react';
import { Download, Package, RefreshCw, CheckCircle2, AlertCircle, Wrench } from 'lucide-react';
import type { AzureBuildArtifact } from '../../../../../shared/types';
import type { ArtifactActionState } from '../../../hooks/git/useAzureArtifacts';

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const Feedback: React.FC<{ ok: boolean; text: string }> = ({ ok, text }) => (
  <p className={`text-2xs font-mono flex items-start gap-1 break-all ${ok ? 'text-success' : 'text-danger'}`}>
    {ok ? <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" /> : <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />}
    <span>{text}</span>
  </p>
);

interface AzureArtifactRowProps {
  artifact: AzureBuildArtifact;
  state?: ArtifactActionState;
  onDownload: () => void;
  onInstall: (routineCodeOrName: string) => void;
}

export const AzureArtifactRow: React.FC<AzureArtifactRowProps> = ({ artifact, state, onDownload, onInstall }) => {
  const [routineCode, setRoutineCode] = useState('');
  const downloaded = state?.download?.success ? state.download : undefined;

  return (
    <div className="p-3 rounded-xl bg-card border border-border/70 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-bold text-foreground truncate">{artifact.name}</span>
          <span className="text-2xs text-muted-foreground font-mono shrink-0">{formatSize(artifact.sizeBytes)}</span>
        </div>
        <button
          type="button"
          onClick={onDownload}
          disabled={state?.busy}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 cursor-pointer shrink-0"
        >
          {state?.busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          <span>{downloaded ? 'Baixar de novo' : 'Baixar .zip'}</span>
        </button>
      </div>

      {state?.download && <Feedback ok={state.download.success} text={state.download.message} />}

      {downloaded && (
        <div className="flex items-center gap-2 pt-1 border-t border-border/60">
          <input
            value={routineCode}
            onChange={(e) => setRoutineCode(e.target.value)}
            placeholder="Código ou nome da rotina (ex.: 1234 ou PCSIS1234.EXE)"
            className="flex-1 bg-card border border-border rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-hidden focus:border-primary"
          />
          <button
            type="button"
            onClick={() => onInstall(routineCode)}
            disabled={state?.busy}
            title="Extrai o .zip no diretório Prod do WinThor, com backup da versão atual"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-muted disabled:opacity-60 cursor-pointer shrink-0"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Instalar como rotina</span>
          </button>
        </div>
      )}

      {state?.install && <Feedback ok={state.install.success} text={state.install.message} />}
    </div>
  );
};
