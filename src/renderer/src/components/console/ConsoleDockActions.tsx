import React from 'react';
import { Play, Square } from 'lucide-react';
import { ConsoleQuickCommandsMenu } from './ConsoleQuickCommandsMenu';
import { ConsoleWatchMenu } from './ConsoleWatchMenu';

interface ConsoleDockActionsProps {
  isTailing: boolean;
  isTailStarting: boolean;
  onStartTail: () => void;
  onStopTail: () => void;
  onRunCommand: (cmd: string) => void;
}

const BTN =
  'flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-card hover:bg-muted text-2xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';

/** Barra compacta de ações rápidas do painel Karaf (log:tail, comandos rápidos e bundle:watch). */
export const ConsoleDockActions: React.FC<ConsoleDockActionsProps> = ({
  isTailing,
  isTailStarting,
  onStartTail,
  onStopTail,
  onRunCommand
}) => (
  <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/70 shrink-0">
    <div className="flex items-center gap-1.5 min-w-0">
      {isTailing ? (
        <button type="button" onClick={onStopTail} className={BTN} title="Parar o log:tail">
          <Square className="w-3 h-3 text-destructive" /> Parar tail
        </button>
      ) : (
        <button
          type="button"
          onClick={onStartTail}
          disabled={isTailStarting}
          className={BTN}
          title="Acompanhar o log do Karaf ao vivo (log:tail)"
        >
          <Play className="w-3 h-3 text-primary" /> Tail do log
        </button>
      )}
      <ConsoleQuickCommandsMenu onRunCommand={onRunCommand} />
    </div>
    <ConsoleWatchMenu onRunCommand={onRunCommand} />
  </div>
);
