import React from 'react';
import { Download, Info, ListTree, Search, Trash2 } from 'lucide-react';
import { KarafDiagActionButton } from './KarafDiagButtons';

interface KarafDiagFeatureTabProps {
  disabled: boolean;
  onRun: (cmd: string, label: string) => void;
  // Estado elevado ao painel para sobreviver à troca de aba
  featureName: string;
  onFeatureNameChange: (value: string) => void;
}

export const KarafDiagFeatureTab: React.FC<KarafDiagFeatureTabProps> = ({
  disabled,
  onRun,
  featureName,
  onFeatureNameChange
}) => {
  const name = featureName.trim();
  const actionDisabled = !name || disabled;

  return (
    <div className="space-y-2.5">
      {/* Ação pontual por Nome da Feature */}
      <div className="p-2.5 bg-muted/20 border border-border/70 rounded-lg space-y-2 text-xs">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>Feature</span>
          <span className="font-mono text-2xs text-muted-foreground/70">feature:cmd</span>
        </div>
        <input
          type="text"
          value={featureName}
          onChange={(e) => onFeatureNameChange(e.target.value)}
          placeholder="Ex: winthor-integracao-varejo"
          className="w-full px-2.5 py-2.5 bg-background border border-input rounded-[10px] text-sm font-mono text-foreground focus:outline-hidden transition"
        />
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <KarafDiagActionButton
            icon={<Search className="w-3 h-3 text-muted-foreground" />}
            label="Repos"
            title="feature:repo-list | grep: acha o repositório de features que contém o nome"
            disabled={actionDisabled}
            onClick={() => onRun(`feature:repo-list | grep ${name}`, 'feat-repo-grep')}
          />
          <KarafDiagActionButton
            icon={<ListTree className="w-3 h-3 text-muted-foreground" />}
            label="Listar"
            title="feature:list | grep: mostra o estado da feature (instalada ou não)"
            disabled={actionDisabled}
            onClick={() => onRun(`feature:list | grep ${name}`, 'feat-list-grep')}
          />
          <KarafDiagActionButton
            icon={<Info className="w-3 h-3 text-muted-foreground" />}
            label="Info"
            title="Ver detalhes, bundles e dependências da feature"
            disabled={actionDisabled}
            onClick={() => onRun(`feature:info ${name}`, 'feat-info')}
          />
          <KarafDiagActionButton
            icon={<Download className="w-3 h-3 text-success" />}
            label="Instalar"
            title="Instalar / atualizar feature (-r -u)"
            disabled={actionDisabled}
            onClick={() => onRun(`feature:install -r -u ${name}`, 'feat-install')}
          />
          <KarafDiagActionButton
            danger
            icon={<Trash2 className="w-3 h-3" />}
            label="Desinstalar (-r)"
            title="Desinstalar feature com -r (definitivo)"
            disabled={actionDisabled}
            onClick={() => onRun(`feature:uninstall -r ${name}`, 'feat-uninstall')}
          />
        </div>
      </div>
    </div>
  );
};
