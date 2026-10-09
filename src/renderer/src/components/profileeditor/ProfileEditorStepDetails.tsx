import React from 'react';
import { Layers, Clock } from 'lucide-react';
import type { AutomationStep, DatabaseConnectionConfig } from '../../../../shared/types';
import { STEP_TYPE_OPTIONS } from './stepTypeOptions';
import { StepCommandFields } from './StepCommandFields';
import { StepKarafFields } from './StepKarafFields';
import { StepTargetFields } from './StepTargetFields';
import { StepDbQueryFields } from './StepDbQueryFields';

interface ProfileEditorStepDetailsProps {
  step: AutomationStep | null;
  stepIndex: number | null;
  dbConnections: DatabaseConnectionConfig[];
  globalDebugPort: number;
  onUpdate: (fields: Partial<AutomationStep>) => void;
  onSelectFile: () => void;
  onSelectDirectory: () => void;
}

export const ProfileEditorStepDetails: React.FC<ProfileEditorStepDetailsProps> = ({
  step,
  stepIndex,
  dbConnections,
  globalDebugPort,
  onUpdate,
  onSelectFile,
  onSelectDirectory
}) => (
  <div className="flex-1 overflow-y-auto p-6 bg-background">
    {step ? (
      <div className="space-y-5 max-w-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Configurar Passo #{stepIndex! + 1}:</span>
              <span className="text-primary">{step.name}</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Ajuste o comando, pasta, porta e tempo de espera deste passo
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
                    <p className="text-xs font-semibold text-foreground">{opt.label.split('(')[0]}</p>
                    <p className="text-2xs text-muted-foreground leading-tight">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nome do Passo */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Nome da Etapa / Título do Serviço
          </label>
          <input
            type="text"
            value={step.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Ex: Docker Postgres, SSO Auth, Gateway, API Backend..."
            className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        {step.type === 'command' && (
          <StepCommandFields
            step={step}
            onUpdate={onUpdate}
            onSelectFile={onSelectFile}
            onSelectDirectory={onSelectDirectory}
          />
        )}
        {step.type === 'karaf' && (
          <StepKarafFields step={step} globalDebugPort={globalDebugPort} onUpdate={onUpdate} />
        )}
        <StepTargetFields step={step} onUpdate={onUpdate} />
        {step.type === 'db-query' && (
          <StepDbQueryFields step={step} dbConnections={dbConnections} onUpdate={onUpdate} />
        )}

        {/* Regras de Sequenciamento / Delay */}
        <div className="pt-3 border-t border-border/60 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Delay após execução (segundos)
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={step.delayAfterSeconds ?? 2}
              onChange={(e) =>
                onUpdate({ delayAfterSeconds: parseInt(e.target.value || '0', 10) })
              }
              className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
            <p className="text-2xs text-muted-foreground mt-1">
              Tempo de espera antes de chamar o próximo passo na esteira.
            </p>
          </div>

          {step.port ? (
            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={step.waitForPort ?? false}
                  onChange={(e) => onUpdate({ waitForPort: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Aguardar porta :{step.port} responder antes do próximo</span>
              </label>
              <p className="text-2xs text-muted-foreground mt-1 ml-6">
                Pausa a esteira até o serviço abrir a porta (timeout 30s).
              </p>
            </div>
          ) : null}
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-20">
        <Layers className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-semibold">Nenhuma etapa selecionada</p>
        <p className="text-xs">Selecione uma etapa à esquerda ou adicione uma nova para editar.</p>
      </div>
    )}
  </div>
);
