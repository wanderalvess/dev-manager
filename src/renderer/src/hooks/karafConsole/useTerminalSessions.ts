import { useCallback, useEffect, useState } from 'react';
import type { TerminalProfile, TerminalSessionInfo } from '../../../../shared/terminalTypes';
import {
  appendTerminalChunk,
  formatPromptEcho,
  getDefaultShellProfile,
  isLocalClearCommand,
  type ShellBufferState
} from '../../utils/terminalTabUtils';

export interface TerminalTabSession {
  info: TerminalSessionInfo;
  buffer: ShellBufferState;
  exitCode: number | null;
}

export function useTerminalSessions(isOpen: boolean) {
  const [profiles, setProfiles] = useState<TerminalProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [sessions, setSessions] = useState<TerminalTabSession[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('karaf');
  const [sessionError, setSessionError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    const listFn = window.electronAPI?.listTerminalProfiles;
    if (!listFn) return;
    setProfilesLoading(true);
    try {
      const detected = await listFn();
      setProfiles(Array.isArray(detected) ? detected : []);
    } catch {
      setProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && profiles.length === 0) {
      void loadProfiles();
    }
  }, [isOpen, profiles.length, loadProfiles]);

  useEffect(() => {
    const unsubData = window.electronAPI?.onTerminalData?.(({ sessionId, chunk }) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.info.sessionId === sessionId ? { ...s, buffer: appendTerminalChunk(s.buffer, chunk) } : s
        )
      );
    });
    const unsubExit = window.electronAPI?.onTerminalExit?.(({ sessionId, code }) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.info.sessionId === sessionId
            ? {
                ...s,
                info: { ...s.info, alive: false },
                exitCode: code,
                buffer: appendTerminalChunk(s.buffer, `\n[Sessão encerrada · código ${code ?? 0}]\n`)
              }
            : s
        )
      );
    });
    return () => {
      unsubData?.();
      unsubExit?.();
    };
  }, []);

  const openProfile = useCallback(
    async (profileId: string, options?: { sshTarget?: string; sshPort?: number; cwd?: string }) => {
      if (profileId === 'karaf') {
        setActiveTabId('karaf');
        setSessionError(null);
        return true;
      }
      const createFn = window.electronAPI?.createTerminalSession;
      if (!createFn) {
        setSessionError('API de terminal integrado indisponível neste ambiente.');
        return false;
      }
      setSessionError(null);
      try {
        const info = await createFn({
          profileId,
          cwd: options?.cwd,
          sshTarget: options?.sshTarget,
          sshPort: options?.sshPort
        });
        setSessions((prev) => [
          ...prev,
          {
            info,
            buffer: {
              lines: [`Sessão iniciada: ${info.title} · ${info.cwd}`],
              partialLine: ''
            },
            exitCode: null
          }
        ]);
        setActiveTabId(info.sessionId);
        return true;
      } catch (err: unknown) {
        setSessionError(err instanceof Error ? err.message : 'Falha ao iniciar terminal.');
        return false;
      }
    },
    []
  );

  const openDefaultShell = useCallback(async () => {
    let available = profiles;
    if (available.length === 0 && window.electronAPI?.listTerminalProfiles) {
      available = await window.electronAPI.listTerminalProfiles().catch(() => []);
      setProfiles(available);
    }
    const target = getDefaultShellProfile(available);
    if (!target) {
      setSessionError('Nenhum shell local compatível foi detectado no sistema.');
      return false;
    }
    return openProfile(target.id);
  }, [profiles, openProfile]);

  const sendInput = useCallback(async (sessionId: string, cmd: string) => {
    const clean = cmd.trim();
    if (!clean) return;
    if (isLocalClearCommand(clean)) {
      setSessions((prev) =>
        prev.map((s) =>
          s.info.sessionId === sessionId ? { ...s, buffer: { lines: [], partialLine: '' } } : s
        )
      );
      return;
    }
    setSessions((prev) =>
      prev.map((s) =>
        s.info.sessionId === sessionId
          ? {
              ...s,
              buffer: appendTerminalChunk(
                s.buffer,
                `\n${formatPromptEcho(s.info.prompt, clean)}\n`
              )
            }
          : s
      )
    );
    await window.electronAPI?.sendTerminalInput?.(sessionId, clean);
  }, []);

  const interruptSession = useCallback(async (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.info.sessionId === sessionId
          ? { ...s, buffer: appendTerminalChunk(s.buffer, '\n^C\n') }
          : s
      )
    );
    await window.electronAPI?.interruptTerminalSession?.(sessionId);
  }, []);

  const closeSession = useCallback((sessionId: string) => {
    void window.electronAPI?.closeTerminalSession?.(sessionId);
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.info.sessionId === sessionId);
      const next = prev.filter((s) => s.info.sessionId !== sessionId);
      setActiveTabId((cur) => {
        if (cur !== sessionId) return cur;
        const neighbor = next[idx] || next[idx - 1];
        return neighbor ? neighbor.info.sessionId : 'karaf';
      });
      return next;
    });
  }, []);

  const clearSession = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.info.sessionId === sessionId ? { ...s, buffer: { lines: [], partialLine: '' } } : s
      )
    );
  }, []);

  const restartSession = useCallback(
    async (sessionId: string) => {
      const target = sessions.find((s) => s.info.sessionId === sessionId);
      if (!target) return;
      closeSession(sessionId);
      await openProfile(target.info.profileId, { cwd: target.info.cwd });
    },
    [sessions, closeSession, openProfile]
  );

  const activeSession = sessions.find((s) => s.info.sessionId === activeTabId) || null;

  return {
    profiles,
    profilesLoading,
    sessions,
    activeTabId,
    activeSession,
    sessionError,
    clearError: () => setSessionError(null),
    setActiveTabId,
    loadProfiles,
    openProfile,
    openDefaultShell,
    sendInput,
    interruptSession,
    closeSession,
    clearSession,
    restartSession
  };
}
