import React from 'react';
import { GitMerge, FolderGit2, ShieldCheck } from 'lucide-react';
import type { DeployStep, GitProjectInfo } from '../../../../shared/types';

interface DeployPomSyncFieldsProps {
  step: DeployStep;
  projects: GitProjectInfo[];
  onUpdate: (fields: Partial<DeployStep>) => void;
  onSelectDirectory: (field: 'projectPath' | 'cwd' | 'dockerContextPath') => void;
}

export const DeployPomSyncFields: React.FC<DeployPomSyncFieldsProps> = ({
  step,
  projects,
  onUpdate
}) => {
  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-primary/10 text-xs text-foreground flex items-start gap-2.5">
        <GitMerge className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-primary">Sincronização Automática de Versões entre Projetos (POM)</p>
          <p className="text-muted-foreground leading-relaxed">
            Esta etapa lê a versão produzida no <strong>Projeto de Origem</strong> (upstream) e atualiza cirurgicamente a tag{' '}
            <code className="text-primary font-mono">&lt;version&gt;</code> correspondente no{' '}
            <strong>Projeto de Destino</strong> (downstream).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Origem */}
        <div className="space-y-1.5 p-3 rounded-xl border border-border bg-card">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-primary" />
            <span>Projeto de Origem (Upstream)</span>
          </label>
          <p className="text-2xs text-muted-foreground">Projeto cuja versão será lida do pom.xml</p>
          <select
            value={step.sourceProjectPath || ''}
            onChange={(e) => onUpdate({ sourceProjectPath: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono"
          >
            <option value="">Selecione o projeto de origem...</option>
            {projects.map((p) => (
              <option key={p.path} value={p.path}>
                {p.name} ({p.path})
              </option>
            ))}
          </select>
        </div>

        {/* Destino */}
        <div className="space-y-1.5 p-3 rounded-xl border border-border bg-card">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-success" />
            <span>Projeto de Destino (Downstream)</span>
          </label>
          <p className="text-2xs text-muted-foreground">Projeto cujo pom.xml receberá a nova versão</p>
          <select
            value={step.targetProjectPath || ''}
            onChange={(e) => onUpdate({ targetProjectPath: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono"
          >
            <option value="">Selecione o projeto de destino...</option>
            {projects.map((p) => (
              <option key={p.path} value={p.path}>
                {p.name} ({p.path})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">ArtifactId no POM de Destino (Opcional)</label>
          <input
            type="text"
            value={step.targetDependencyArtifactId || ''}
            onChange={(e) => onUpdate({ targetDependencyArtifactId: e.target.value })}
            placeholder="Deixe em branco para usar o mesmo artifactId da origem"
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-mono"
          />
          <span className="text-2xs text-muted-foreground">
            Ex: se a origem for "winthor-venda" mas a dependência for "winthor-venda-service", informe aqui.
          </span>
        </div>

        <div className="flex items-center gap-2 pt-5">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={step.createPomBackup ?? true}
              onChange={(e) => onUpdate({ createPomBackup: e.target.checked })}
              className="rounded border-border text-primary focus:ring-0"
            />
            <ShieldCheck className="w-4 h-4 text-success" />
            <span>Criar cópia de segurança (.bak) do pom.xml antes de alterar</span>
          </label>
        </div>
      </div>
    </div>
  );
};
