import React from 'react';
import { ExternalLink, GitBranchPlus, Play, RotateCw } from 'lucide-react';
import { describeEnvironment } from '../../../../../../shared/infrActiveEnv';
import type { InfrContainerInfo, InfrEnvironment } from '../../../../../../shared/infrWinthorVersion';
import { infrContainerStateText, infrImageVersion } from '../../../../utils/infrBootstrapModalUtils';

const NODE_TONE = {
  up: { box: 'border-success/40 bg-success/5', dot: 'bg-success', text: 'text-foreground/80' },
  wait: { box: 'border-warning/50 bg-warning/5', dot: 'bg-warning', text: 'text-foreground/80' },
  down: { box: 'border-danger/40 bg-danger/5', dot: 'bg-danger', text: 'text-danger' },
  none: { box: 'border-dashed border-border', dot: 'bg-muted-foreground/40', text: 'text-muted-foreground' }
} as const;

const toneOf = (c?: InfrContainerInfo): keyof typeof NODE_TONE =>
  !c ? 'none' : c.state === 'running' ? 'up' : c.state === 'restarting' || c.state === 'created' ? 'wait' : 'down';

const Node: React.FC<{ label: string; c?: InfrContainerInfo; port?: number }> = ({ label, c, port }) => {
  const t = NODE_TONE[toneOf(c)];
  return (
    <div className={`flex-1 min-w-[7.5rem] flex flex-col gap-0.5 px-3 py-2 rounded-lg border ${t.box}`} title={c?.name}>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <span className={`w-2 h-2 rounded-full shrink-0 ${t.dot}`} />
        {label}
        {port && <span className="ml-auto font-mono font-medium text-2xs text-muted-foreground">:{port}</span>}
      </span>
      <span className={`text-2xs ${t.text}`}>{infrContainerStateText(c)}</span>
    </div>
  );
};

const Wire = () => <span aria-hidden="true" className="w-4 h-px bg-border shrink-0 self-center" />;

const BTN = 'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

/** Um ambiente da distro: nome, versão, o pipeline Oracle → WTA → WSH e a ação que faz sentido agora. */
export const InfrHomeEnvRow: React.FC<{
  env: InfrEnvironment;
  starting: boolean;
  onStart: () => void;
  onVerify: () => void;
  onCopy: () => void;
  onOpenUrl: (url: string) => void;
}> = ({ env, starting, onStart, onVerify, onCopy, onOpenUrl }) => {
  const info = describeEnvironment(env);
  const version = infrImageVersion(env.wta?.image);
  const up = info.status === 'up';
  const statusText = up ? 'no ar' : info.status === 'down' ? 'parado' : 'parte no ar';
  const wtaRunning = env.wta?.state === 'running';

  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 md:px-5 py-4 border-t border-border/70 first:border-t-0">
      <div className="w-36 shrink-0 pt-1.5">
        <p className="font-mono text-sm font-semibold text-foreground truncate">{env.name}</p>
        <p className={`text-2xs mt-0.5 ${up ? 'text-muted-foreground' : info.status === 'down' ? 'text-danger' : 'text-warning'}`}>
          {version ? `WinThor ${version} · ` : ''}
          {statusText}
        </p>
      </div>

      <div className="flex-[999_1_24rem] min-w-0 space-y-2.5">
        <div className="flex items-stretch" aria-label={`Partes do ${env.name}`}>
          <Node label="Oracle" c={env.oracle} port={info.ports.oracle} />
          <Wire />
          <Node label="WTA" c={env.wta} port={info.ports.web} />
          <Wire />
          <Node label="WSH" c={env.wsh} port={env.wsh ? info.ports.wsh : undefined} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {up ? (
            info.wtaUrl && (
              <button type="button" onClick={() => onOpenUrl(info.wtaUrl!)} className={`${BTN} border-border bg-card text-foreground hover:bg-muted`}>
                <ExternalLink className="w-3.5 h-3.5" /> Abrir o WinThor
              </button>
            )
          ) : (
            <button type="button" onClick={onStart} disabled={starting} className={`${BTN} border-warning bg-warning text-white hover:bg-warning/90`}>
              {starting ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {starting ? 'Iniciando...' : 'Iniciar'}
            </button>
          )}
          <button type="button" onClick={onVerify} className={`${BTN} border-transparent text-warning hover:bg-warning/10`}>
            Verificar
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={!wtaRunning}
            title={wtaRunning ? 'Nova versão a partir deste ambiente' : 'Inicie o ambiente antes: a Nova versão lê as features do WTA dele'}
            className={`${BTN} border-transparent text-warning hover:bg-warning/10`}
          >
            <GitBranchPlus className="w-3.5 h-3.5" /> Copiar para outra versão
          </button>
        </div>
      </div>
    </li>
  );
};
