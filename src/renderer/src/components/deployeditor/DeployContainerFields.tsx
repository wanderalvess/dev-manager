import React from 'react';
import { FolderOpen } from 'lucide-react';
import type { StepFieldsProps } from './deployEditorStepTypes';

type ContainerFieldsProps = Pick<StepFieldsProps, 'step' | 'onUpdate'>;

export const DeployDockerBuildFields: React.FC<StepFieldsProps> = ({
  step,
  onUpdate,
  onSelectDirectory
}) => (
  <>
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-muted-foreground">
          Diretório de Contexto
        </label>
        <button
          type="button"
          onClick={() => onSelectDirectory('dockerContextPath')}
          className="text-[11px] text-primary hover:underline flex items-center gap-1"
        >
          <FolderOpen className="w-3 h-3" /> Procurar Pasta
        </button>
      </div>
      <input
        type="text"
        value={step.dockerContextPath || ''}
        onChange={(e) => onUpdate({ dockerContextPath: e.target.value })}
        placeholder="Ex: C:\projetos\minha-api"
        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Dockerfile / Containerfile (opcional)
        </label>
        <input
          type="text"
          value={step.dockerFile || ''}
          onChange={(e) => onUpdate({ dockerFile: e.target.value })}
          placeholder="Dockerfile"
          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Tag da Imagem
        </label>
        <input
          type="text"
          value={step.dockerImageTag || ''}
          onChange={(e) => onUpdate({ dockerImageTag: e.target.value })}
          placeholder="Ex: minha-api:latest"
          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  </>
);

export const DeployDockerPushFields: React.FC<ContainerFieldsProps> = ({ step, onUpdate }) => (
  <div>
    <label className="block text-xs font-semibold text-muted-foreground mb-1">
      Tag da Imagem
    </label>
    <input
      type="text"
      value={step.dockerImageTag || ''}
      onChange={(e) => onUpdate({ dockerImageTag: e.target.value })}
      placeholder="Ex: registro.com/minha-api:latest"
      className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    />
  </div>
);

export const DeployDockerRestartFields: React.FC<ContainerFieldsProps> = ({ step, onUpdate }) => (
  <div>
    <label className="block text-xs font-semibold text-muted-foreground mb-1">
      Nome ou ID do Container
    </label>
    <input
      type="text"
      value={step.dockerContainer || ''}
      onChange={(e) => onUpdate({ dockerContainer: e.target.value })}
      placeholder="Ex: minha-api-container"
      className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    />
  </div>
);
