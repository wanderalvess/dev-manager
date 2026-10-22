import React, { useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, History, Terminal } from 'lucide-react';
import { TerminalViewer } from '../TerminalViewer';
import { KarafHistoryModal } from '../environment/modals/KarafHistoryModal';
import { useKarafConsole } from '../../hooks/karafConsole/KarafConsoleContext';
import { useKarafConsoleCommands } from '../../hooks/karafConsole/useKarafConsoleCommands';
import { useKarafHistory } from '../../hooks/environment/useKarafHistory';
import { DOCK_MIN_HEIGHT } from '../../utils/karafConsoleBuffer';

/** Console global do Karaf: fica abaixo de qualquer página, com o mesmo buffer para Ambiente e Deploy. */
export const ConsoleDock: React.FC = () => {
  const { logs, setLogs, isOpen, height, toggle, setHeight } = useKarafConsole();
  const { isEmbeddedRunning, isBusy, sendCommand } = useKarafConsoleCommands(isOpen);
  const history = useKarafHistory();
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  // Ctrl+` abre/fecha o dock de qualquer página.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.altKey && !e.metaKey && e.key === '`') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  const startResize = (e: React.PointerEvent) => {
    dragRef.current = { startY: e.clientY, startHeight: height };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResize = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setHeight(dragRef.current.startHeight + (dragRef.current.startY - e.clientY));
  };
  const endResize = () => {
    dragRef.current = null;
  };

  return (
    <section className="shrink-0 border-t border-border bg-card" data-tour="console-dock" aria-label="Console do Karaf">
      {isOpen && (
        <div
          onPointerDown={startResize}
          onPointerMove={onResize}
          onPointerUp={endResize}
          title="Arraste para redimensionar"
          className="h-1 cursor-row-resize bg-border/60 hover:bg-primary/60 transition"
        />
      )}
      <div className="flex items-center gap-2 px-3 h-7 text-2xs font-semibold text-muted-foreground">
        <button
          onClick={toggle}
          title="Abrir/fechar o console (Ctrl+`)"
          className="flex items-center gap-1.5 hover:text-foreground transition cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5 text-primary" />
          Console Karaf
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>
        <span className={`w-1.5 h-1.5 rounded-full ${isEmbeddedRunning ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
        <span>{isEmbeddedRunning ? 'embedded ativo' : 'sem Karaf embedded'}</span>
        <span className="ml-auto">{logs.length} linhas</span>
        <button
          onClick={history.open}
          title="Ver histórico persistido do Karaf embedded (sobrevive a reinícios)"
          className="flex items-center gap-1 hover:text-foreground transition cursor-pointer"
        >
          <History className="w-3 h-3" /> Histórico
        </button>
      </div>

      {isOpen && (
        <div style={{ height: Math.max(height, DOCK_MIN_HEIGHT) }} className="px-3 pb-3">
          <TerminalViewer
            logs={logs}
            onClear={() => setLogs([])}
            title="Console do Karaf"
            isRunning={isEmbeddedRunning || isBusy}
            onSendCommand={sendCommand}
            inputPlaceholder="Comando Karaf (ex: bundle:list, la, feature:list, log:display)..."
          />
        </div>
      )}

      {history.isOpen && (
        <KarafHistoryModal
          output={history.output}
          filtered={history.filtered}
          search={history.search}
          isLoading={history.isLoading}
          onSearchChange={history.setSearch}
          onClear={history.clear}
          onClose={history.close}
        />
      )}
    </section>
  );
};
