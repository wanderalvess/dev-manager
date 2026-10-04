import React from 'react';
import { Sparkles } from 'lucide-react';
import type { DeployStep } from '../../../../shared/types';
import { parseOptionalInt } from '../../utils/deployEditorUtils';

interface DeployStepAdvancedSettingsProps {
  step: DeployStep;
  onUpdate: (fields: Partial<DeployStep>) => void;
}

const DYNAMIC_VARIABLES = [
  { token: '{PROJECTS_PATH}', desc: 'Pasta de projetos' },
  { token: '{KARAF_PATH}', desc: 'Pasta do Karaf' },
  { token: '{JDK_PATH}', desc: 'Pasta do JDK' },
  { token: '{DATE}', desc: 'AAAA-MM-DD' },
  { token: '{TIMESTAMP}', desc: 'Data e hora' }
];

export const DeployStepAdvancedSettings: React.FC<DeployStepAdvancedSettingsProps> = ({
  step,
  onUpdate
}) => (
  <div className="pt-4 border-t border-border/80 space-y-3">
    <div className="flex items-center justify-between">
      <label className="flex items-start gap-2.5 cursor-pointer text-xs">
        <input
          type="checkbox"
          checked={step.continueOnError ?? false}
          onChange={(e) => onUpdate({ continueOnError: e.target.checked })}
          className="rounded border-border text-amber-500 focus:ring-amber-500 mt-0.5"
        />
        <div>
          <span className="text-foreground font-semibold flex items-center gap-1.5">
            Tolerar falha nesta etapa (continueOnError)
          </span>
          <span className="text-[11px] text-muted-foreground block">
            Se ativado, um código de erro ou falha nesta etapa emitirá um aviso no log mas não interromperá as próximas etapas.
          </span>
        </div>
      </label>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Timeout Máximo (segundos, opcional)
        </label>
        <input
          type="number"
          min={0}
          value={step.timeoutSeconds ?? ''}
          onChange={(e) => onUpdate({ timeoutSeconds: parseOptionalInt(e.target.value) })}
          placeholder="Sem limite de tempo (padrão)"
          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>

    {/* Dica de Variáveis Dinâmicas */}
    <div className="bg-muted/20 border border-border/60 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-1.5">
        <Sparkles className="w-3 h-3 text-primary" /> Variáveis dinâmicas para comandos e caminhos:
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DYNAMIC_VARIABLES.map((v) => (
          <span
            key={v.token}
            className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-card border border-border text-foreground"
            title={v.desc}
          >
            <code className="text-primary font-bold">{v.token}</code>
            <span className="text-muted-foreground text-[9px]">({v.desc})</span>
          </span>
        ))}
      </div>
    </div>
  </div>
);
