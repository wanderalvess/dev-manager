import React from 'react';
import { Server } from 'lucide-react';
import type { AutomationStep } from '../../../../shared/types';

interface StepKarafFieldsProps {
  step: AutomationStep;
  globalDebugPort: number;
  onUpdate: (fields: Partial<AutomationStep>) => void;
}

export const StepKarafFields: React.FC<StepKarafFieldsProps> = ({
  step,
  globalDebugPort,
  onUpdate
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Modo de Inicialização / Terminal
        </label>
        <select
          value={step.launchMode || 'wt'}
          onChange={(e) =>
            onUpdate({ launchMode: e.target.value as 'wt' | 'cmd' | 'embedded' })
          }
          className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        >
          <option value="wt">Windows Terminal (Abas agrupadas)</option>
          <option value="cmd">Janela CMD Externa independente</option>
          <option value="embedded">Console Embutido no Painel</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center justify-between">
          <span>Porta de Debug (JDWP)</span>
          <span className="text-2xs text-muted-foreground font-normal">
            Padrão global: {globalDebugPort}
          </span>
        </label>
        <input
          type="number"
          value={step.port ?? globalDebugPort}
          onChange={(e) =>
            onUpdate({ port: e.target.value ? parseInt(e.target.value, 10) : undefined })
          }
          placeholder={`Ex: 5005, 5006, 5050... (Padrão: ${globalDebugPort})`}
          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>

    <div className="p-3 bg-muted/30 border border-border/60 rounded-lg text-xs space-y-2 text-muted-foreground">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-foreground flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-primary" /> Configuração do Karaf OSGi Debug
        </p>
        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-[11px] font-bold border border-primary/20">
          Porta JDWP: :{step.port ?? globalDebugPort}
        </span>
      </div>
      <p>
        Dispara o script configurado (<code>winthor.bat</code> ou <code>karaf.bat</code>) com o argumento <code>debug</code> a partir da pasta <code>bin</code>.
      </p>
      <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90 bg-amber-500/10 border border-amber-500/20 p-2 rounded">
        ⚠️ <strong>Dica de conexão:</strong> Se o Windows exibir <em>"transport error 202: bind failed: Permission denied"</em> na porta 5005 (bloqueio do Hyper-V / WSL2), altere para <strong>5006</strong> ou <strong>5050</strong> neste campo e utilize a mesma porta no IntelliJ IDEA (Remote JVM Debug).
      </p>
    </div>
  </div>
);
