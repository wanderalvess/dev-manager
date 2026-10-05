import React from 'react';
import { Plus, Terminal, RefreshCw } from 'lucide-react';
import {
  TestRunnerConfig,
  DEFAULT_TEST_RUNNER_PRESETS,
  TestRunnerPreset
} from '../../../../../shared/types';
import { TYPE_ICONS } from './testRunnerTypeVisuals';
import { RunnerCard } from './RunnerCard';

interface RunnerListPanelProps {
  runners: TestRunnerConfig[];
  loading: boolean;
  runningRunnerId: string | null;
  onCreate: () => void;
  onAddPreset: (preset: TestRunnerPreset) => void;
  onExecute: (runner: TestRunnerConfig) => void;
  onEdit: (runner: TestRunnerConfig) => void;
  onDelete: (id: string, name: string) => void;
}

export const RunnerListPanel: React.FC<RunnerListPanelProps> = ({
  runners,
  loading,
  runningRunnerId,
  onCreate,
  onAddPreset,
  onExecute,
  onEdit,
  onDelete
}) => (
  <div className="w-full md:w-5/12 lg:w-4/12 border-r border-border/80 flex flex-col overflow-hidden bg-card/40">
    {/* Barra superior de ações */}
    <div className="p-4 border-b border-border/70 flex items-center justify-between gap-3 shrink-0 bg-card/60">
      <div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
            Suítes &amp; Runners
          </h3>
          <span className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
            {runners.length}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">Pipelines de teste locais com captura de saída</p>
      </div>

      <button
        type="button"
        onClick={onCreate}
        className="px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Criar Runner</span>
      </button>
    </div>

    {/* Presets de Início Rápido */}
    <div className="p-3 border-b border-border/60 bg-muted/20 shrink-0">
      <div className="text-2xs font-mono font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span>Modelos rápidos:</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DEFAULT_TEST_RUNNER_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => onAddPreset(preset)}
            className="px-2 py-1 rounded bg-background hover:bg-muted border border-border/70 text-[11px] font-mono text-foreground flex items-center gap-1.5 transition cursor-pointer hover:border-primary/50 shadow-2xs"
            title={preset.description}
          >
            {TYPE_ICONS[preset.type]}
            <span className="truncate max-w-[130px]">{preset.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>

    {/* Lista de Runners */}
    <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
      {loading ? (
        <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin mb-2" />
          <span className="text-xs font-mono">Carregando suítes...</span>
        </div>
      ) : runners.length === 0 ? (
        <div className="text-center p-6 border border-dashed border-border/80 rounded-xl bg-card/20">
          <Terminal className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-xs font-bold text-foreground">Nenhum runner cadastrado</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
            Adicione um executor acima ou use um dos modelos rápidos para começar.
          </p>
        </div>
      ) : (
        runners.map((runner) => (
          <RunnerCard
            key={runner.id}
            runner={runner}
            runningRunnerId={runningRunnerId}
            onExecute={onExecute}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  </div>
);
