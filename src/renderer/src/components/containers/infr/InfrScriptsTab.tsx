import React from 'react';
import type { InfrDockerScriptStatus } from '../../../../../shared/types';

interface InfrScriptsTabProps {
  customPath: string;
  scripts: InfrDockerScriptStatus[];
  isLoading: boolean;
  onCustomPathChange: (value: string) => void;
  onVerify: () => void;
}

export const InfrScriptsTab: React.FC<InfrScriptsTabProps> = ({
  customPath,
  scripts,
  isLoading,
  onCustomPathChange,
  onVerify
}) => (
  <div className="space-y-4">
    <div className="p-3 bg-muted/30 border border-border/80 rounded-xl space-y-2">
      <label className="text-[11px] font-semibold text-muted-foreground block">
        Caminho do repositório INFR-Docker
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={customPath}
          onChange={(e) => onCustomPathChange(e.target.value)}
          placeholder="Vazio = detectar em Projetos/INFR-Docker. Ex: C:\Projetos\INFR-Docker"
          className="flex-1 bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        <button
          onClick={onVerify}
          disabled={isLoading}
          className="px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer"
        >
          Verificar
        </button>
      </div>
    </div>

    <div className="space-y-2">
      {scripts.map((s) => (
        <div
          key={s.script}
          className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
            s.exists ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-rose-500/5 border-rose-500/25'
          }`}
        >
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-foreground">{s.name}</span>
              <span
                className={`text-2xs font-bold px-1.5 py-0.2 rounded uppercase border ${
                  s.exists
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                }`}
              >
                {s.exists ? 'Disponível' : 'Não Encontrado'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">{s.description}</p>
            <div className="text-2xs font-mono text-muted-foreground/80 truncate">{s.path}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
