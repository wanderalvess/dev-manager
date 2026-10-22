import React, { useState } from 'react';
import { Eye, EyeOff, List, Play, Square } from 'lucide-react';
import { buildWatchCommand } from '../../utils/karafWatchCommand';
import { showToast } from '../ToastHost';

interface ConsoleDockActionsProps {
  isTailing: boolean;
  isTailStarting: boolean;
  onStartTail: () => void;
  onStopTail: () => void;
  onRunCommand: (cmd: string) => void;
}

const BTN =
  'flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-card hover:bg-muted text-2xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

/** Barra do dock: log:tail ao vivo e bundle:watch (o Karaf reinstala o bundle quando o artefato muda). */
export const ConsoleDockActions: React.FC<ConsoleDockActionsProps> = ({
  isTailing,
  isTailStarting,
  onStartTail,
  onStopTail,
  onRunCommand
}) => {
  const [target, setTarget] = useState('');

  const runWatch = (action: 'start' | 'stop' | 'list') => {
    const cmd = buildWatchCommand(action, target);
    if (!cmd) {
      showToast('Alvo inválido. Use ids, nomes ou URLs mvn: separados por vírgula (sem ; | & $).', 'info');
      return;
    }
    onRunCommand(cmd);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
      {isTailing ? (
        <button onClick={onStopTail} className={BTN} title="Parar o log:tail">
          <Square className="w-3 h-3 text-destructive" /> Parar tail
        </button>
      ) : (
        <button
          onClick={onStartTail}
          disabled={isTailStarting}
          className={BTN}
          title="Acompanhar o log do Karaf ao vivo (log:tail)"
        >
          <Play className="w-3 h-3 text-primary" /> Tail do log
        </button>
      )}

      <span className="h-4 w-px bg-border" />

      <input
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        placeholder="bundle:watch: * (todos), ids ou mvn:..."
        title="Alvo do bundle:watch. Vazio monitora todos os bundles (*)."
        className="w-56 px-2 py-1 rounded-lg border border-border bg-background text-2xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
      />
      <button onClick={() => runWatch('start')} className={BTN} title="bundle:watch: atualiza o bundle quando o artefato muda">
        <Eye className="w-3 h-3 text-primary" /> Watch
      </button>
      <button onClick={() => runWatch('stop')} className={BTN} title="bundle:watch --stop">
        <EyeOff className="w-3 h-3" /> Parar watch
      </button>
      <button onClick={() => runWatch('list')} className={BTN} title="bundle:watch --list">
        <List className="w-3 h-3" /> Listar
      </button>
    </div>
  );
};
