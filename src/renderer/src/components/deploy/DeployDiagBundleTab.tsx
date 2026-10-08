import React from 'react';
import { AlertTriangle, FileText, Package, RotateCw, Trash2 } from 'lucide-react';
import { DeployDiagActionButton, DeployDiagCommandButton } from './DeployDiagButtons';

interface DeployDiagBundleTabProps {
  disabled: boolean;
  onRun: (cmd: string, label: string) => void;
  // Estado elevado ao painel para sobreviver à troca de aba
  bundleId: string;
  onBundleIdChange: (value: string) => void;
}

export const DeployDiagBundleTab: React.FC<DeployDiagBundleTabProps> = ({
  disabled,
  onRun,
  bundleId,
  onBundleIdChange
}) => {
  const id = bundleId.trim();
  const actionDisabled = !id || disabled;

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <DeployDiagCommandButton
          fill
          icon={<Package className="w-3.5 h-3.5 text-primary shrink-0" />}
          label="Listar Bundles"
          command="bundle:list -s"
          disabled={disabled}
          onClick={() => onRun('bundle:list -s', 'bundles-s')}
        />
        <DeployDiagCommandButton
          fill
          icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
          label="Diag Falhas"
          command="bundle:diag"
          disabled={disabled}
          onClick={() => onRun('bundle:diag', 'bundles-diag')}
        />
      </div>

      {/* Ação pontual por ID do Bundle */}
      <div className="p-2.5 bg-muted/20 border border-border/70 rounded-lg space-y-2 text-xs">
        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Bundle ID</span>
          <span className="font-mono text-2xs text-muted-foreground/70">bundle:cmd</span>
        </div>
        <input
          type="text"
          value={bundleId}
          onChange={(e) => onBundleIdChange(e.target.value.replace(/\D/g, ''))}
          placeholder="Ex: 185"
          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-xs font-mono text-foreground focus:outline-hidden focus:border-primary transition"
        />
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <DeployDiagActionButton
            icon={<AlertTriangle className="w-3 h-3 text-amber-500" />}
            label="Diag"
            title="Diagnosticar falha de resolução do bundle"
            disabled={actionDisabled}
            onClick={() => onRun(`bundle:diag ${id}`, 'b-diag')}
          />
          <DeployDiagActionButton
            icon={<FileText className="w-3 h-3 text-muted-foreground" />}
            label="Headers"
            title="Ver headers e Manifest do bundle"
            disabled={actionDisabled}
            onClick={() => onRun(`bundle:headers ${id}`, 'b-headers')}
          />
          <DeployDiagActionButton
            icon={<RotateCw className="w-3 h-3 text-muted-foreground" />}
            label="Restart"
            title="Reiniciar bundle"
            disabled={actionDisabled}
            onClick={() => onRun(`bundle:restart ${id}`, 'b-restart')}
          />
          <DeployDiagActionButton
            danger
            icon={<Trash2 className="w-3 h-3" />}
            label="Desinstalar"
            title="Desinstalar bundle da memória"
            disabled={actionDisabled}
            onClick={() => onRun(`bundle:uninstall ${id}`, 'b-uninstall')}
          />
        </div>
      </div>
    </div>
  );
};
