import React from 'react';
import type { AutomationStep } from '../../../../shared/types';

interface StepTargetFieldsProps {
  step: AutomationStep;
  onUpdate: (fields: Partial<AutomationStep>) => void;
}

/** Campos de kill-port, serviço Windows, finalizar processo e navegador. */
export const StepTargetFields: React.FC<StepTargetFieldsProps> = ({ step, onUpdate }) => (
  <>
    {step.type === 'kill-port' && (
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Porta a Liberar (Kill Process)
        </label>
        <input
          type="number"
          value={step.port || ''}
          onChange={(e) =>
            onUpdate({ port: e.target.value ? parseInt(e.target.value, 10) : undefined })
          }
          placeholder="Ex: 8080, 3000..."
          className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    )}

    {(step.type === 'service-start' || step.type === 'service-stop') && (
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Nome Exato do Serviço do Windows
        </label>
        <input
          type="text"
          value={step.targetName || ''}
          onChange={(e) => onUpdate({ targetName: e.target.value })}
          placeholder="Ex: CoreService.API, AppServer, Spooler... (se vazio, usa o Nome da Etapa)"
          className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Identificador do serviço registrado no Windows (como visto em services.msc ou net start).
        </p>
      </div>
    )}

    {step.type === 'kill-process' && (
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Nome do Processo / Executável (.exe)
        </label>
        <input
          type="text"
          value={step.targetName || ''}
          onChange={(e) => onUpdate({ targetName: e.target.value })}
          placeholder="Ex: pdvsyncclientservicocontrole.exe, node.exe... (se vazio, usa o Nome da Etapa)"
          className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Nome do processo que será encerrado via taskkill /F /IM.
        </p>
      </div>
    )}

    {step.type === 'browser' && (
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          URL para Abrir
        </label>
        <input
          type="text"
          value={step.browserUrl || ''}
          onChange={(e) => onUpdate({ browserUrl: e.target.value })}
          placeholder="Ex: http://localhost:3000 ou http://localhost:8889/web"
          className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    )}
  </>
);
