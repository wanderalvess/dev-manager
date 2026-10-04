import React from 'react';
import { AlertTriangle, FileText, Layers, ListTree, Package, RotateCcw } from 'lucide-react';
import { DeployDiagCommandButton } from './DeployDiagButtons';

interface DeployDiagQuickTabProps {
  disabled: boolean;
  onRun: (cmd: string, label: string) => void;
}

export const DeployDiagQuickTab: React.FC<DeployDiagQuickTabProps> = ({ disabled, onRun }) => (
  <div className="grid grid-cols-2 gap-2">
    <DeployDiagCommandButton
      icon={<ListTree className="w-3.5 h-3.5 text-primary shrink-0" />}
      label="Features Ativas"
      command="feature:list -i"
      title="feature:list -i"
      disabled={disabled}
      onClick={() => onRun('feature:list -i', 'features-i')}
    />
    <DeployDiagCommandButton
      icon={<Package className="w-3.5 h-3.5 text-primary shrink-0" />}
      label="Bundles Ativos"
      command="bundle:list -s"
      title="bundle:list -s"
      disabled={disabled}
      onClick={() => onRun('bundle:list -s', 'bundles-s')}
    />
    <DeployDiagCommandButton
      icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
      label="Diag Falhas"
      command="bundle:diag"
      title="bundle:diag (diagnostica todos os bundles com falha de resolução)"
      disabled={disabled}
      onClick={() => onRun('bundle:diag', 'bundles-diag')}
    />
    <DeployDiagCommandButton
      icon={<Layers className="w-3.5 h-3.5 text-primary shrink-0" />}
      label="Repositórios"
      command="feature:repo-list"
      title="feature:repo-list"
      disabled={disabled}
      onClick={() => onRun('feature:repo-list', 'repos')}
    />
    <DeployDiagCommandButton
      icon={<FileText className="w-3.5 h-3.5 text-primary shrink-0" />}
      label="Últimos Logs"
      command="log:display -n 50"
      title="log:display -n 50"
      disabled={disabled}
      onClick={() => onRun('log:display -n 50', 'logs-50')}
    />
    <DeployDiagCommandButton
      icon={<RotateCcw className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
      label="Limpar Logs"
      command="log:clear"
      title="log:clear"
      disabled={disabled}
      onClick={() => onRun('log:clear', 'clear')}
    />
  </div>
);
