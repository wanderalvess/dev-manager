import React from 'react';
import { RefreshCw } from 'lucide-react';
import { activeEnvStatusText } from '../../../../shared/infrActiveEnv';
import type { ActiveEnvironmentState } from '../../hooks/containers/useActiveEnvironment';

/**
 * Seletor do ambiente ativo: qual ambiente (oracle-, wta-, wsh-<nome>) o Hub usa. Escolher aponta Subir WinThor, a
 * topologia, a URL do WTA, a Rotina 801 e o SSH do Karaf para ele; o texto embaixo diz o que mudou.
 */
export const WinthorActiveEnv: React.FC<{ env: ActiveEnvironmentState }> = ({ env }) => {
  const { list, loading, message, active } = env;
  const envs = list?.environments ?? [];
  if (!list || (list.success && envs.length === 0 && !loading)) return null;

  return (
    <div className="flex flex-col gap-1 min-w-0" data-tour="winthor-active-env">
      <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <span className="shrink-0">Ambiente</span>
        <select
          value={list.active ?? ''}
          onChange={(e) => void env.apply(e.target.value)}
          disabled={loading || !list.success}
          aria-label="Ambiente ativo"
          title="O ambiente que o Hub usa: Subir WinThor, topologia, WTA, Rotina 801 e SSH do Karaf apontam para ele"
          className="h-9 max-w-[16rem] px-2.5 rounded-lg border border-border bg-card text-xs font-mono text-foreground cursor-pointer disabled:opacity-60"
        >
          <option value="">Detectar pelos nomes</option>
          {envs.map((e) => (
            <option key={e.name} value={e.name}>
              {e.name} · {activeEnvStatusText(e.status)}
            </option>
          ))}
        </select>
        {list.stale && active && (
          <button
            type="button"
            onClick={() => void env.apply(active.name)}
            className="inline-flex items-center gap-1 h-9 px-2.5 rounded-lg border border-warning/60 text-warning text-xs font-semibold hover:bg-warning/10 cursor-pointer"
            title="A URL do WTA nas Configurações não é a deste ambiente (a porta mudou?). Aponta de novo."
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar portas
          </button>
        )}
      </label>
      {!list.success && <span className="text-2xs text-danger break-words max-w-[24rem]">{list.error}</span>}
      {message && (
        <span role="status" className="text-2xs text-muted-foreground max-w-[28rem] break-words" title={message}>
          {message}
        </span>
      )}
    </div>
  );
};
