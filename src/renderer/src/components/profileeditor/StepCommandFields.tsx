import React from 'react';
import { FolderOpen } from 'lucide-react';
import type { AutomationStep } from '../../../../shared/types';

interface StepFieldsProps {
  step: AutomationStep;
  onUpdate: (fields: Partial<AutomationStep>) => void;
}

interface StepCommandFieldsProps extends StepFieldsProps {
  onSelectFile: () => void;
  onSelectDirectory: () => void;
}

export const StepCommandFields: React.FC<StepCommandFieldsProps> = ({
  step,
  onUpdate,
  onSelectFile,
  onSelectDirectory
}) => (
  <>
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-muted-foreground">
          Comando de Execução
        </label>
        <button
          type="button"
          onClick={onSelectFile}
          className="text-2xs text-primary hover:underline flex items-center gap-1"
        >
          <FolderOpen className="w-3 h-3" /> Selecionar arquivo .bat/.cmd
        </button>
      </div>
      <input
        type="text"
        value={step.command || ''}
        onChange={(e) => onUpdate({ command: e.target.value })}
        placeholder="Ex: .\gradlew.bat bootRun, npm run dev, docker start banco-re, bats\_run-api.bat"
        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
      />
    </div>

    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-muted-foreground">
          Diretório de Trabalho (CWD)
        </label>
        <button
          type="button"
          onClick={onSelectDirectory}
          className="text-2xs text-primary hover:underline flex items-center gap-1"
        >
          <FolderOpen className="w-3 h-3" /> Procurar Pasta
        </button>
      </div>
      <input
        type="text"
        value={step.cwd || ''}
        onChange={(e) => onUpdate({ cwd: e.target.value })}
        placeholder="Ex: C:\projetos\minha-api ou .\minha-api"
        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Modo de Terminal
        </label>
        <select
          value={step.launchMode || 'wt'}
          onChange={(e) => onUpdate({ launchMode: e.target.value as 'wt' | 'cmd' | 'background' })}
          className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        >
          <option value="wt">Windows Terminal (Abas agrupadas)</option>
          <option value="cmd">Janela CMD Externa independente</option>
          <option value="background">Segundo Plano (Processo oculto)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Porta Monitorada (Status & Stop)
        </label>
        <input
          type="number"
          value={step.port || ''}
          onChange={(e) =>
            onUpdate({ port: e.target.value ? parseInt(e.target.value, 10) : undefined })
          }
          placeholder="Ex: 8787, 8080, 8888, 3000..."
          className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  </>
);
