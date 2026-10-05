import React from 'react';
import { Layers } from 'lucide-react';
import type { DeployStep, GitProjectInfo } from '../../../../shared/types';
import { STEP_TYPE_OPTIONS } from './deployEditorStepTypes';
import type { DeployDirectoryField } from '../../hooks/deployeditor/useDeployProfileEditor';
import { DeployMavenFields } from './DeployMavenFields';
import { DeployKarafBundleFields, DeployKarafCommandFields } from './DeployKarafFields';
import {
  DeployDockerBuildFields,
  DeployDockerPushFields,
  DeployDockerRestartFields
} from './DeployContainerFields';
import {
  DeployCommandFields,
  DeployHealthcheckFields,
  DeployServiceFields,
  DeployWaitFields
} from './DeployRuntimeFields';
import { DeployStepAdvancedSettings } from './DeployStepAdvancedSettings';

interface DeployStepEditorProps {
  step: DeployStep | null;
  stepIndex: number | null;
  projects: GitProjectInfo[];
  suggestProjectPath: string;
  onSuggestProjectPathChange: (value: string) => void;
  isSuggesting: boolean;
  onSuggestFromPom: (target: 'repo' | 'install') => void;
  onUpdate: (fields: Partial<DeployStep>) => void;
  onSelectDirectory: (field: DeployDirectoryField) => void;
}

export const DeployStepEditor: React.FC<DeployStepEditorProps> = ({
  step,
  stepIndex,
  projects,
  suggestProjectPath,
  onSuggestProjectPathChange,
  isSuggesting,
  onSuggestFromPom,
  onUpdate,
  onSelectDirectory
}) => {
  if (!step) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-20">
        <Layers className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-semibold">Nenhuma etapa selecionada</p>
        <p className="text-xs">Selecione uma etapa à esquerda ou adicione uma nova para editar.</p>
      </div>
    );
  }

  const fieldProps = { step, onUpdate, onSelectDirectory };

  return (
    <div className="space-y-6 max-w-4xl xl:max-w-5xl">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>Configurar Etapa #{stepIndex! + 1}:</span>
            <span className="text-primary">{step.name}</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Ajuste o tipo de ação e os parâmetros desta etapa do deploy
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={step.enabled !== false}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            className="rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-foreground font-medium">Habilitado</span>
        </label>
      </div>

      {/* Tipo de Ação */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          Tipo de Ação
        </label>
        <div className="grid grid-cols-2 gap-2">
          {STEP_TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isChosen = step.type === opt.type;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => onUpdate({ type: opt.type })}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                  isChosen
                    ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                    : 'border-border/70 hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isChosen ? 'text-primary' : ''}`} />
                <div>
                  <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                  <p className="text-2xs text-muted-foreground leading-tight">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nome da Etapa */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Nome da Etapa
        </label>
        <input
          type="text"
          value={step.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Ex: Build Maven, Instalar Feature, Build Imagem Container..."
          className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {step.type === 'maven-build' && <DeployMavenFields {...fieldProps} projects={projects} />}
      {step.type === 'karaf-command' && (
        <DeployKarafCommandFields
          step={step}
          onUpdate={onUpdate}
          projects={projects}
          suggestProjectPath={suggestProjectPath}
          onSuggestProjectPathChange={onSuggestProjectPathChange}
          isSuggesting={isSuggesting}
          onSuggestFromPom={onSuggestFromPom}
        />
      )}
      {step.type === 'karaf-bundle' && <DeployKarafBundleFields step={step} onUpdate={onUpdate} />}
      {step.type === 'docker-build' && <DeployDockerBuildFields {...fieldProps} />}
      {step.type === 'docker-push' && <DeployDockerPushFields step={step} onUpdate={onUpdate} />}
      {step.type === 'docker-restart' && (
        <DeployDockerRestartFields step={step} onUpdate={onUpdate} />
      )}
      {step.type === 'command' && <DeployCommandFields {...fieldProps} />}
      {step.type === 'wait' && <DeployWaitFields step={step} onUpdate={onUpdate} />}
      {step.type === 'http-healthcheck' && <DeployHealthcheckFields step={step} onUpdate={onUpdate} />}
      {step.type === 'service-action' && <DeployServiceFields step={step} onUpdate={onUpdate} />}

      <DeployStepAdvancedSettings step={step} onUpdate={onUpdate} />
    </div>
  );
};
