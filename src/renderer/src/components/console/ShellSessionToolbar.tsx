import React from 'react';
import { Folder, RotateCcw, Square, Terminal, X } from 'lucide-react';
import type { TerminalTabSession } from '../../hooks/karafConsole/useTerminalSessions';

interface ShellSessionToolbarProps {
  session: TerminalTabSession;
  onInterrupt: (sessionId: string) => void;
  onRestart: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
}

const BTN =
  'flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-card hover:bg-muted text-2xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer whitespace-nowrap';

/** Barra compacta exibida quando uma aba de terminal de sistema/SSH está ativa. */
export const ShellSessionToolbar: React.FC<ShellSessionToolbarProps> = ({
  session,
  onInterrupt,
  onRestart,
  onClose
}) => {
  const { info, exitCode } = session;

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border/70 shrink-0 min-w-0">
      <div className="flex items-center gap-2 min-w-0 text-2xs">
        <Terminal className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="font-semibold text-foreground shrink-0">{info.title}</span>
        <span className="text-muted-foreground shrink-0">·</span>
        <span
          className="inline-flex items-center gap-1 text-muted-foreground font-mono truncate min-w-0"
          title={info.cwd}
        >
          <Folder className="w-3 h-3 shrink-0" />
          <span className="truncate">{info.cwd}</span>
        </span>
        <span
          className={`shrink-0 font-semibold tabular-nums ${
            info.alive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {info.alive ? 'Ativo' : `Encerrado (${exitCode ?? 0})`}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {info.alive ? (
          <button
            type="button"
            onClick={() => onInterrupt(info.sessionId)}
            title="Enviar sinal de interrupção (Ctrl+C)"
            className={BTN}
          >
            <Square className="w-3 h-3 text-destructive" /> Interromper (^C)
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onRestart(info.sessionId)}
              title="Abrir nova sessão com este perfil"
              className={BTN}
            >
              <RotateCcw className="w-3 h-3 text-primary" /> Reiniciar
            </button>
            <button
              type="button"
              onClick={() => onClose(info.sessionId)}
              title="Fechar esta aba"
              className={BTN}
            >
              <X className="w-3 h-3" /> Fechar
            </button>
          </>
        )}
      </div>
    </div>
  );
};
