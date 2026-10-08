import React from 'react';
import { FolderOpen } from 'lucide-react';
import type { GitProjectInfo } from '../../../../shared/types';
import type { StepFieldsProps } from './deployEditorStepTypes';

interface DeployMavenFieldsProps extends StepFieldsProps {
  projects: GitProjectInfo[];
}

export const DeployMavenFields: React.FC<DeployMavenFieldsProps> = ({
  step,
  onUpdate,
  onSelectDirectory,
  projects
}) => (
  <>
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">
        Projeto Git (opcional, preenche o diretório)
      </label>
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) onUpdate({ projectPath: e.target.value });
        }}
        className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
      >
        <option value="">-- Selecionar projeto --</option>
        {projects.map((p) => (
          <option key={p.path} value={p.path}>
            {p.name} {p.pomInfo?.version ? `[${p.pomInfo.version}]` : ''}
          </option>
        ))}
      </select>
    </div>
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-muted-foreground">
          Diretório do Projeto
        </label>
        <button
          type="button"
          onClick={() => onSelectDirectory('projectPath')}
          className="text-[11px] text-primary hover:underline flex items-center gap-1"
        >
          <FolderOpen className="w-3 h-3" /> Procurar Pasta
        </button>
      </div>
      <input
        type="text"
        value={step.projectPath || ''}
        onChange={(e) => onUpdate({ projectPath: e.target.value })}
        placeholder="Ex: C:\projetos\meu-servico"
        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
      />
    </div>
    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
      <input
        type="checkbox"
        checked={step.skipTests ?? true}
        onChange={(e) => onUpdate({ skipTests: e.target.checked })}
        className="rounded border-border text-primary focus:ring-primary"
      />
      <span>
        Pular testes unitários (<code className="font-mono text-primary">-DskipTests</code>)
      </span>
    </label>
  </>
);
