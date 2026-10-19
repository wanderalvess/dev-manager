import React from 'react';
import { Package, X, RefreshCw, AlertCircle, CheckCircle2, XCircle, CircleDashed } from 'lucide-react';
import type { AzureBuildInfo, GitProjectInfo } from '../../../../../shared/types';
import type { AzureArtifactsState } from '../../../hooks/git/useAzureArtifacts';
import { Modal } from '../../ui/Modal';
import { AzureArtifactRow } from './AzureArtifactRow';

const ResultIcon: React.FC<{ result?: string }> = ({ result }) => {
  if (result === 'succeeded') return <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />;
  if (result === 'failed' || result === 'canceled') return <XCircle className="w-3.5 h-3.5 text-danger shrink-0" />;
  return <CircleDashed className="w-3.5 h-3.5 text-warning shrink-0" />;
};

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

interface AzureArtifactsModalProps {
  project: GitProjectInfo;
  state: AzureArtifactsState;
}

export const AzureArtifactsModal: React.FC<AzureArtifactsModalProps> = ({ project, state }) => {
  const renderBuild = (b: AzureBuildInfo) => (
    <button
      key={b.id}
      type="button"
      onClick={() => state.selectBuild(b)}
      className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer space-y-0.5 ${
        state.selectedBuild?.id === b.id ? 'border-primary bg-primary/10' : 'border-border/70 bg-card hover:border-border'
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs">
        <ResultIcon result={b.result} />
        <span className="font-bold text-foreground font-mono truncate">{b.buildNumber}</span>
      </div>
      <div className="text-2xs text-muted-foreground truncate">{b.pipelineName}</div>
      <div className="text-2xs text-muted-foreground font-mono truncate">
        {b.sourceBranch} {b.sourceVersion ? `· ${b.sourceVersion}` : ''} · {formatDate(b.finishTime)}
      </div>
    </button>
  );

  return (
    <Modal
      open
      onClose={state.close}
      bare
      panelClassName="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in"
      closeOnBackdrop={false}
    >
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
        <div className="flex items-center space-x-2">
          <Package className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-sm font-bold text-foreground">Artefatos do Azure Pipelines - {project.name}</h3>
            <span className="text-2xs text-muted-foreground font-mono">
              {project.azureOrg}/{project.azureProject} · destino: {state.artifactsDir || '...'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={state.close}
          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-2 border-b border-border flex items-center gap-2 text-xs shrink-0">
        <span className="text-muted-foreground font-medium">Branch:</span>
        <input
          value={state.branchFilter}
          onChange={(e) => state.setBranchFilter(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && state.reload()}
          placeholder="todas"
          className="bg-card border border-border rounded-lg px-2.5 py-1 text-xs font-mono w-56 focus:outline-hidden focus:border-primary"
        />
        <button
          type="button"
          onClick={state.reload}
          disabled={state.isLoadingBuilds}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border hover:bg-muted cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${state.isLoadingBuilds ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {state.error && (
        <div className="mx-4 mt-3 p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger flex items-center gap-1.5 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3 p-4 overflow-hidden min-h-[300px]">
        <div className="md:col-span-2 overflow-y-auto space-y-1.5 pr-1">
          {state.isLoadingBuilds ? (
            <p className="text-xs text-muted-foreground p-2">Carregando builds...</p>
          ) : state.builds.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">Nenhum build concluído encontrado.</p>
          ) : (
            state.builds.map(renderBuild)
          )}
        </div>

        <div className="md:col-span-3 overflow-y-auto space-y-2 pr-1">
          {!state.selectedBuild ? (
            <p className="text-xs text-muted-foreground p-2">Selecione um build para ver os artefatos publicados.</p>
          ) : state.isLoadingArtifacts ? (
            <p className="text-xs text-muted-foreground p-2">Carregando artefatos...</p>
          ) : state.artifacts.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">Este build não publicou artefatos.</p>
          ) : (
            state.artifacts.map((a) => (
              <AzureArtifactRow
                key={a.name}
                artifact={a}
                state={state.actions[`${state.selectedBuild!.id}:${a.name}`]}
                onDownload={() => state.download(a)}
                onInstall={(code) => state.installAsRoutine(a, code)}
              />
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
