import React, { useEffect, useMemo, useRef } from 'react';
import { History, Maximize2, Minimize2, Terminal, X } from 'lucide-react';
import { TerminalViewer } from '../TerminalViewer';
import { Modal } from '../ui/Modal';
import { KarafEmbeddedOutputModal } from '../environment/modals/KarafEmbeddedOutputModal';
import { useKarafConsole } from '../../hooks/karafConsole/KarafConsoleContext';
import { useKarafConsoleCommands } from '../../hooks/karafConsole/useKarafConsoleCommands';
import { useKarafTail } from '../../hooks/karafConsole/useKarafTail';
import { useTerminalSessions } from '../../hooks/karafConsole/useTerminalSessions';
import { useKarafHistory } from '../../hooks/environment/useKarafHistory';
import { DOCK_MIN_WIDTH } from '../../utils/karafConsoleBuffer';
import { getShellInputPlaceholder, toDisplayLines } from '../../utils/terminalTabUtils';
import { ConsoleDockActions } from './ConsoleDockActions';
import { TerminalTabBar } from './TerminalTabBar';
import { ShellSessionToolbar } from './ShellSessionToolbar';

/**
 * Painel global de Console & Terminal Integrado (Karaf OSGi + múltiplos shells locais/WSL/SSH)
 * oculto por padrão e acessível em qualquer tela pelo topo ou Ctrl+`.
 */
export const ConsoleDock: React.FC = () => {
  const {
    logs,
    setLogs,
    isOpen,
    width,
    displayMode,
    toggle,
    close,
    setWidth,
    toggleDisplayMode,
    request
  } = useKarafConsole();
  const { isEmbeddedRunning, isBusy, sendCommand } = useKarafConsoleCommands(isOpen);
  const tail = useKarafTail();
  const history = useKarafHistory();
  const terminal = useTerminalSessions(isOpen);
  const { start: startTail } = tail;
  const { setActiveTabId } = terminal;

  const filterRequest = useMemo(
    () => (request && request.filter !== undefined ? { text: request.filter, nonce: request.nonce } : null),
    [request]
  );

  useEffect(() => {
    if (request) setActiveTabId('karaf');
    if (request?.tail) void startTail();
  }, [request, startTail, setActiveTabId]);

  const handleKarafAbort = tail.isTailing
    ? () => void tail.stop()
    : isEmbeddedRunning
      ? () => void window.electronAPI?.sendKarafInterrupt?.()
      : isBusy
        ? () => void window.electronAPI?.abortKarafDiagnostic?.()
        : undefined;

  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Ctrl+` abre/fecha o painel de qualquer página.
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
    dragRef.current = { startX: e.clientX, startWidth: width };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResize = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setWidth(dragRef.current.startWidth + (dragRef.current.startX - e.clientX));
  };
  const endResize = () => {
    dragRef.current = null;
  };

  if (!isOpen && !history.isOpen) return null;

  const isModal = displayMode === 'modal';
  const panelWidth = Math.max(width, DOCK_MIN_WIDTH);
  const activeShell = terminal.activeTabId !== 'karaf' ? terminal.activeSession : null;
  const activeShellLogs = activeShell ? toDisplayLines(activeShell.buffer) : [];

  const headerSubtitle = activeShell
    ? `${activeShell.info.title} · ${activeShell.info.alive ? 'ativo' : 'encerrado'}`
    : `Karaf · ${isEmbeddedRunning ? 'embedded ativo' : 'em espera'}`;

  const consoleContent = (
    <>
      <header className="flex items-center justify-between gap-2 px-3 h-11 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-bold text-foreground whitespace-nowrap">Terminal &amp; Console</span>
          <span className="text-2xs text-muted-foreground hidden sm:inline truncate">
            · {headerSubtitle}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={history.open}
            title="Ver histórico persistido do Karaf embedded (sobrevive a reinícios)"
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-card hover:bg-muted text-2xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer whitespace-nowrap"
          >
            <History className="w-3 h-3" /> Histórico
          </button>
          <button
            type="button"
            onClick={toggleDisplayMode}
            title={isModal ? 'Restaurar painel lateral' : 'Expandir em janela central'}
            aria-label={isModal ? 'Restaurar painel lateral' : 'Expandir console'}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            {isModal ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={close}
            title="Fechar painel (Ctrl+`)"
            aria-label="Fechar Terminal & Console"
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <TerminalTabBar
        profiles={terminal.profiles}
        profilesLoading={terminal.profilesLoading}
        sessions={terminal.sessions}
        activeTabId={terminal.activeTabId}
        karafActive={isEmbeddedRunning || tail.isTailing}
        onSelectTab={terminal.setActiveTabId}
        onOpenDefaultShell={() => void terminal.openDefaultShell()}
        onOpenProfile={terminal.openProfile}
        onCloseSession={terminal.closeSession}
        onRefreshProfiles={() => void terminal.loadProfiles()}
      />

      {terminal.sessionError && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-destructive/10 border-b border-destructive/30 text-2xs text-destructive shrink-0">
          <span className="truncate">{terminal.sessionError}</span>
          <button
            type="button"
            onClick={terminal.clearError}
            aria-label="Fechar aviso"
            className="p-0.5 rounded hover:bg-destructive/15 cursor-pointer shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {!activeShell ? (
        <>
          <ConsoleDockActions
            isTailing={tail.isTailing}
            isTailStarting={tail.isStarting}
            onStartTail={tail.start}
            onStopTail={tail.stop}
            onRunCommand={sendCommand}
          />
          <div className="flex-1 min-h-0 p-2.5">
            <TerminalViewer
              key="karaf"
              logs={logs}
              onClear={() => setLogs([])}
              title="Console do Karaf"
              showTitle={false}
              defaultWordWrap
              isRunning={isEmbeddedRunning || isBusy || tail.isTailing}
              onSendCommand={sendCommand}
              externalSearch={filterRequest}
              onAbort={handleKarafAbort}
              promptLabel="karaf>"
              inputPlaceholder="Comando Karaf (ex: bundle:list, la, feature:list)..."
            />
          </div>
        </>
      ) : (
        <>
          <ShellSessionToolbar
            session={activeShell}
            onInterrupt={(id) => void terminal.interruptSession(id)}
            onRestart={(id) => void terminal.restartSession(id)}
            onClose={terminal.closeSession}
          />
          <div className="flex-1 min-h-0 p-2.5">
            <TerminalViewer
              key={activeShell.info.sessionId}
              logs={activeShellLogs}
              onClear={() => terminal.clearSession(activeShell.info.sessionId)}
              title={activeShell.info.title}
              showTitle={false}
              defaultWordWrap
              isRunning={activeShell.info.alive}
              onSendCommand={(cmd) => void terminal.sendInput(activeShell.info.sessionId, cmd)}
              onAbort={
                activeShell.info.alive ? () => void terminal.interruptSession(activeShell.info.sessionId) : undefined
              }
              promptLabel={activeShell.info.prompt}
              inputDisabled={!activeShell.info.alive}
              inputAutoFocus
              emptyMessage="Terminal pronto. Digite um comando abaixo."
              inputPlaceholder={getShellInputPlaceholder(activeShell.info.kind)}
            />
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {isOpen && !isModal && (
        <aside
          data-tour="console-dock"
          aria-label="Terminal e Console do Karaf"
          style={{ width: `min(100vw, ${panelWidth}px)` }}
          className="fixed top-14 right-0 bottom-0 z-30 flex flex-col border-l border-border bg-card shadow-2xl"
        >
          <div
            onPointerDown={startResize}
            onPointerMove={onResize}
            onPointerUp={endResize}
            title="Arraste para redimensionar a largura"
            className="hidden sm:block absolute left-0 top-0 bottom-0 w-1.5 -translate-x-0.5 cursor-col-resize hover:bg-primary/50 transition-colors z-10"
          />
          {consoleContent}
        </aside>
      )}

      <Modal
        open={isOpen && isModal}
        onClose={toggleDisplayMode}
        ariaLabel="Terminal e Console do Karaf"
        bare
        panelClassName="w-full max-w-6xl h-[84vh] flex flex-col overflow-hidden bg-card border border-border rounded-xl shadow-2xl"
      >
        {consoleContent}
      </Modal>

      {history.isOpen && (
        <KarafEmbeddedOutputModal
          output={history.output}
          filtered={history.filtered}
          search={history.search}
          isLoading={history.isLoading}
          onSearchChange={history.setSearch}
          onClear={history.clear}
          onClose={history.close}
        />
      )}
    </>
  );
};
