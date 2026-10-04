import React from 'react';
import { Download, Info, Layers, ListTree, Trash2 } from 'lucide-react';
import { DeployDiagActionButton, DeployDiagCommandButton } from './DeployDiagButtons';

interface DeployDiagFeatureTabProps {
  disabled: boolean;
  onRun: (cmd: string, label: string) => void;
  // Estado elevado ao painel para sobreviver à troca de aba
  featureName: string;
  onFeatureNameChange: (value: string) => void;
}

export const DeployDiagFeatureTab: React.FC<DeployDiagFeatureTabProps> = ({
  disabled,
  onRun,
  featureName,
  onFeatureNameChange
}) => {
  const name = featureName.trim();
  const actionDisabled = !name || disabled;

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <DeployDiagCommandButton
          fill
          icon={<ListTree className="w-3.5 h-3.5 text-primary shrink-0" />}
          label="Listar Instaladas"
          command="feature:list -i"
          disabled={disabled}
          onClick={() => onRun('feature:list -i', 'features-i')}
        />
        <DeployDiagCommandButton
          fill
          icon={<Layers className="w-3.5 h-3.5 text-primary shrink-0" />}
          label="Repositórios"
          command="feature:repo-list"
          disabled={disabled}
          onClick={() => onRun('feature:repo-list', 'repos')}
        />
      </div>

      {/* Ação pontual por Nome da Feature */}
      <div className="p-2.5 bg-muted/20 border border-border/70 rounded-lg space-y-2 text-xs">
        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Feature</span>
          <span className="font-mono text-[10px] text-muted-foreground/70">feature:cmd</span>
        </div>
        <input
          type="text"
          value={featureName}
          onChange={(e) => onFeatureNameChange(e.target.value)}
          placeholder="Ex: winthor-integracao-varejo"
          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-xs font-mono text-foreground focus:outline-none focus:border-primary transition"
        />
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <DeployDiagActionButton
            icon={<Info className="w-3 h-3 text-muted-foreground" />}
            label="Info"
            title="Ver detalhes, bundles e dependências da feature"
            disabled={actionDisabled}
            onClick={() => onRun(`feature:info ${name}`, 'feat-info')}
          />
          <DeployDiagActionButton
            icon={<Download className="w-3 h-3 text-emerald-500" />}
            label="Instalar"
            title="Instalar / atualizar feature (-r -u)"
            disabled={actionDisabled}
            onClick={() => onRun(`feature:install -r -u ${name}`, 'feat-install')}
          />
          <DeployDiagActionButton
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
