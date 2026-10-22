import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { BuildQueueResult } from '../../../../../shared/deployQueue';

interface DeployQueuePreviewProps {
  queue: BuildQueueResult;
  includeDependencies: boolean;
  skipTests: boolean;
  installBundles: boolean;
  onIncludeDependenciesChange: (value: boolean) => void;
  onSkipTestsChange: (value: boolean) => void;
  onInstallBundlesChange: (value: boolean) => void;
}

const OPTION = 'flex items-start gap-2 text-xs text-foreground cursor-pointer';

/** Fila resultante, na ordem de build, com as opções que mudam as etapas geradas. */
export const DeployQueuePreview: React.FC<DeployQueuePreviewProps> = ({
  queue,
  includeDependencies,
  skipTests,
  installBundles,
  onIncludeDependenciesChange,
  onSkipTestsChange,
  onInstallBundlesChange
}) => (
  <div className="flex flex-col min-h-0 min-w-0 gap-3">
    <div className="space-y-1.5 shrink-0">
      <label className={OPTION}>
        <input type="checkbox" checked={includeDependencies} onChange={(e) => onIncludeDependenciesChange(e.target.checked)} className="mt-0.5 accent-primary" />
        <span>Incluir projetos do workspace de que os selecionados dependem</span>
      </label>
      <label className={OPTION}>
        <input type="checkbox" checked={skipTests} onChange={(e) => onSkipTestsChange(e.target.checked)} className="mt-0.5 accent-primary" />
        <span>Pular testes no build Maven</span>
      </label>
      <label className={OPTION}>
        <input type="checkbox" checked={installBundles} onChange={(e) => onInstallBundlesChange(e.target.checked)} className="mt-0.5 accent-primary" />
        <span>Instalar no Karaf os projetos com packaging bundle (etapas ao fim da fila)</span>
      </label>
    </div>

    {queue.cycleMembers.length > 0 && (
      <div className="flex items-start gap-2 p-2.5 rounded-lg border border-warning/40 bg-warning/10 text-xs text-warning shrink-0">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Dependência circular entre {queue.cycleMembers.length} projetos. Eles entram no fim da fila na ordem da
          seleção; revise a ordem depois de aplicar.
        </span>
      </div>
    )}

    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        Ordem de build ({queue.ordered.length})
      </div>
      {queue.ordered.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Selecione ao menos um projeto à esquerda.</p>
      ) : (
        <ol className="space-y-1">
          {queue.ordered.map((p, i) => (
            <li key={p.path} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/60 bg-muted/20 text-xs">
              <span className="font-mono tabular-nums text-muted-foreground w-5 text-right">{i + 1}</span>
              <span className="font-semibold text-foreground truncate">{p.artifactId}</span>
              <span className="font-mono text-2xs text-muted-foreground">{p.version}</span>
              {queue.cycleMembers.includes(p.path) && <span className="ml-auto text-2xs text-warning">ciclo</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  </div>
);
