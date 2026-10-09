import React from 'react';
import { Sparkles } from 'lucide-react';
import type { DeployStep, GitProjectInfo } from '../../../../shared/types';

interface DeployKarafCommandFieldsProps {
  step: DeployStep;
  onUpdate: (fields: Partial<DeployStep>) => void;
  projects: GitProjectInfo[];
  suggestProjectPath: string;
  onSuggestProjectPathChange: (value: string) => void;
  isSuggesting: boolean;
  onSuggestFromPom: (target: 'repo' | 'install') => void;
}

export const DeployKarafCommandFields: React.FC<DeployKarafCommandFieldsProps> = ({
  step,
  onUpdate,
  projects,
  suggestProjectPath,
  onSuggestProjectPathChange,
  isSuggesting,
  onSuggestFromPom
}) => (
  <>
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">
        Comando Karaf
      </label>
      <textarea
        value={step.command || ''}
        onChange={(e) => onUpdate({ command: e.target.value })}
        rows={2}
        placeholder='Ex: feature:repo-add mvn:com.empresa/meu-servico/1.0.0/xml/features'
        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
      />
    </div>
    <div className="bg-muted/30 border border-border/60 rounded-lg p-3 space-y-2">
      <p className="text-2xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" /> Sugerir comando a partir de um pom.xml
      </p>
      <select
        value={suggestProjectPath}
        onChange={(e) => onSuggestProjectPathChange(e.target.value)}
        className="w-full bg-input/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
      >
        <option value="">-- Selecionar projeto --</option>
        {projects.map((p) => (
          <option key={p.path} value={p.path}>
            {p.name} {p.pomInfo?.version ? `[${p.pomInfo.version}]` : ''}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!suggestProjectPath || isSuggesting}
          onClick={() => onSuggestFromPom('repo')}
          className="flex-1 px-2 py-1.5 bg-card hover:bg-muted border border-border rounded-lg text-2xs font-semibold text-foreground disabled:opacity-50 transition-colors"
        >
          Preencher com repo-add
        </button>
        <button
          type="button"
          disabled={!suggestProjectPath || isSuggesting}
          onClick={() => onSuggestFromPom('install')}
          className="flex-1 px-2 py-1.5 bg-card hover:bg-muted border border-border rounded-lg text-2xs font-semibold text-foreground disabled:opacity-50 transition-colors"
        >
          Preencher com install
        </button>
      </div>
    </div>
  </>
);

interface DeployKarafBundleFieldsProps {
  step: DeployStep;
  onUpdate: (fields: Partial<DeployStep>) => void;
}

export const DeployKarafBundleFields: React.FC<DeployKarafBundleFieldsProps> = ({
  step,
  onUpdate
}) => (
  <div className="space-y-3">
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">
        Ação no Bundle
      </label>
      <select
        value={step.bundleAction || 'reinstall'}
        onChange={(e) => onUpdate({ bundleAction: e.target.value as DeployStep['bundleAction'] })}
        className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
      >
        <option value="reinstall">Reinstalar (bundle:update + refresh + start)</option>
        <option value="install">Instalar Novo (bundle:install)</option>
        <option value="restart">Reiniciar (bundle:restart)</option>
        <option value="refresh">Atualizar Fiações (bundle:refresh)</option>
        <option value="start">Iniciar (bundle:start)</option>
        <option value="stop">Parar (bundle:stop)</option>
        <option value="uninstall">Desinstalar (bundle:uninstall)</option>
      </select>
    </div>

    {step.bundleAction !== 'install' && (
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          ID do Bundle OSGi (numérico)
        </label>
        <input
          type="text"
          value={step.bundleId || ''}
          onChange={(e) => onUpdate({ bundleId: e.target.value })}
          placeholder="Ex: 154"
          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
    )}

    {(step.bundleAction === 'install' || step.bundleAction === 'reinstall') && (
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Localização / Coordenada Maven {step.bundleAction === 'reinstall' ? '(opcional)' : ''}
        </label>
        <input
          type="text"
          value={step.bundleLocation || ''}
          onChange={(e) => onUpdate({ bundleLocation: e.target.value })}
          placeholder="mvn:com.minhaempresa/meu-modulo/1.0.0 ou file:/..."
          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
    )}

    {step.bundleAction === 'install' && (
      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
        <input
          type="checkbox"
          checked={step.bundleStart ?? true}
          onChange={(e) => onUpdate({ bundleStart: e.target.checked })}
          className="rounded border-border text-primary focus:ring-primary"
        />
        <span>
          Iniciar bundle automaticamente após instalação (<code className="font-mono text-primary">-s</code>)
        </span>
      </label>
    )}
  </div>
);
