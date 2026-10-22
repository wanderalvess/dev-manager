import React, { useState } from 'react';
import { ListOrdered, RefreshCw, X } from 'lucide-react';
import type { DeployProfile } from '../../../../../shared/types';
import { Modal } from '../../ui/Modal';
import { useDeployQueueBuilder } from '../../../hooks/deploy/useDeployQueueBuilder';
import type { QueueApplyMode } from '../../../utils/deployQueueBuilderUtils';
import { DeployQueueProjectList } from '../queue/DeployQueueProjectList';
import { DeployQueuePreview } from '../queue/DeployQueuePreview';

interface DeployQueueBuilderModalProps {
  isOpen: boolean;
  activeProfile: DeployProfile | null;
  onClose: () => void;
  onApply: (profile: DeployProfile) => Promise<void>;
}

/** Escolhe projetos do workspace e gera as etapas de build já ordenadas por dependência. */
export const DeployQueueBuilderModal: React.FC<DeployQueueBuilderModalProps> = ({
  isOpen,
  activeProfile,
  onClose,
  onApply
}) => {
  const builder = useDeployQueueBuilder(isOpen);
  const [mode, setMode] = useState<QueueApplyMode>('append');
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const canApply = Boolean(activeProfile) && builder.queue.ordered.length > 0 && !isApplying;

  const handleApply = async () => {
    if (!activeProfile) return;
    setIsApplying(true);
    try {
      await onApply(builder.applyTo(activeProfile, mode));
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] overflow-hidden animate-fade-in flex flex-col"
      closeOnBackdrop={false}
      ariaLabel="Montar fila de deploy"
    >
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Montar fila de deploy</h3>
          <span className="text-2xs text-muted-foreground truncate max-w-[40ch]" title={builder.projectsPath}>
            {builder.projectsPath}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={builder.rescan} title="Reler os projetos" className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${builder.isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {builder.loadError && <div className="px-4 pt-3 text-xs text-destructive">Falha ao ler os projetos: {builder.loadError}</div>}
      {!builder.isLoading && !builder.loadError && builder.projects.length === 0 && (
        <div className="px-4 pt-3 text-xs text-muted-foreground">
          Nenhum projeto Maven (pasta com pom.xml) encontrado em "Pasta de projetos" nas Configurações.
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        <DeployQueueProjectList
          projects={builder.projects}
          visibleProjects={builder.visibleProjects}
          selected={builder.selected}
          pulledIn={builder.queue.pulledIn}
          search={builder.search}
          onSearchChange={builder.setSearch}
          onToggle={builder.toggle}
        />
        <DeployQueuePreview
          queue={builder.queue}
          includeDependencies={builder.includeDependencies}
          skipTests={builder.skipTests}
          installBundles={builder.installBundles}
          onIncludeDependenciesChange={builder.setIncludeDependencies}
          onSkipTestsChange={builder.setSkipTests}
          onInstallBundlesChange={builder.setInstallBundles}
        />
      </div>

      <div className="p-3 border-t border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 text-xs text-foreground">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as QueueApplyMode)}
            className="bg-background border border-border rounded-lg px-2 py-1 text-xs"
            aria-label="Como aplicar ao perfil"
          >
            <option value="append">Acrescentar ao fim das etapas</option>
            <option value="replace">Substituir as etapas do perfil</option>
          </select>
          <span className="text-muted-foreground truncate">Perfil: {activeProfile?.name || 'nenhum'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={builder.clearSelection} className="text-2xs text-muted-foreground hover:text-foreground cursor-pointer">
            Limpar seleção
          </button>
          <button
            onClick={handleApply}
            disabled={!canApply}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            Aplicar ao perfil ({builder.queue.ordered.length})
          </button>
        </div>
      </div>
    </Modal>
  );
};
