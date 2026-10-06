import { useCallback, useEffect, useRef, useState } from 'react';
import type { DatabaseConnectionConfig, DbSessionState, QueryResult } from '../../../../shared/types';
import { showToast } from '../../components/ToastHost';
import { requestConfirm } from '../../components/ui/confirmService';
import {
  buildSwitchToAutoMessage,
  readStoredTxMode,
  resolveInitialTxMode,
  storeTxMode,
  type TxMode
} from '../../utils/databaseSessionUtils';

const SESSION_LOST = /Sessão não encontrada|conexão da sessão foi perdida/;

/**
 * Sessão dedicada do editor SQL para a conexão ativa: conexão própria no banco, com modo auto-commit ou
 * manual, commit/rollback e cancelamento. Uma sessão por conexão, aberta no primeiro comando; ao trocar de
 * conexão a anterior continua aberta (com o que estiver pendente) até o usuário voltar a ela.
 * Sem a API de sessões (ex.: versão antiga do servidor web), cai para a conexão compartilhada em auto-commit.
 */
export function useDatabaseSession(activeConnection: DatabaseConnectionConfig | null) {
  const connId = activeConnection?.id ?? '';
  const [modes, setModes] = useState<Record<string, TxMode>>({});
  const [states, setStates] = useState<Record<string, DbSessionState>>({});
  const sessionIds = useRef<Record<string, string>>({});
  const opening = useRef<Partial<Record<string, Promise<string | null>>>>({});

  // Aba fechada: encerra as sessões desta aba no banco (o que estiver pendente sofre rollback)
  useEffect(() => {
    const ids = sessionIds.current;
    return () => {
      for (const id of Object.values(ids)) {
        window.electronAPI?.closeDbSession?.(id).catch(() => {});
      }
    };
  }, []);

  const mode: TxMode = modes[connId] ?? resolveInitialTxMode(activeConnection, connId ? readStoredTxMode(connId) : null);
  const state = states[connId] ?? null;
  const supported = typeof window !== 'undefined' && !!window.electronAPI?.openDbSession;

  const remember = useCallback((id: string, next: DbSessionState) => {
    setStates((prev) => ({ ...prev, [id]: next }));
  }, []);

  const forget = useCallback((id: string) => {
    delete sessionIds.current[id];
    setStates((prev) => {
      const rest = { ...prev };
      delete rest[id];
      return rest;
    });
  }, []);

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (!activeConnection || !window.electronAPI?.openDbSession) return null;
    const existing = sessionIds.current[connId];
    if (existing) return existing;
    const inFlight = opening.current[connId];
    if (inFlight) return inFlight;

    const opener = (async () => {
      try {
        const st = await window.electronAPI.openDbSession(activeConnection, mode === 'auto');
        sessionIds.current[connId] = st.sessionId;
        remember(connId, st);
        return st.sessionId;
      } finally {
        delete opening.current[connId];
      }
    })();
    opening.current[connId] = opener;
    return opener;
  }, [activeConnection, connId, mode, remember]);

  const execute = useCallback(
    async (sql: string, maxRows: number, binds?: Record<string, any>): Promise<QueryResult> => {
      if (!activeConnection) throw new Error('Nenhuma conexão selecionada.');

      const run = async (canRetry: boolean): Promise<QueryResult> => {
        const sid = await ensureSession();
        if (!sid) return window.electronAPI.executeDbQuery(activeConnection, sql, maxRows, binds);

        const res = await window.electronAPI.executeDbSession(sid, sql, maxRows, binds);
        remember(connId, res.session);
        if (!res.success && SESSION_LOST.test(res.error ?? '')) {
          forget(connId);
          // Sessão expirada (nada pendente a perder): reabre e repete uma vez. Queda de conexão: só avisa.
          if (canRetry && /Sessão não encontrada/.test(res.error ?? '')) return run(false);
        }
        return res;
      };
      return run(true);
    },
    [activeConnection, connId, ensureSession, remember, forget]
  );

  const commit = useCallback(async (): Promise<void> => {
    const sid = sessionIds.current[connId];
    if (!sid) return;
    try {
      remember(connId, await window.electronAPI.commitDbSession(sid));
      showToast('Alterações confirmadas (commit).', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Falha ao confirmar as alterações.', 'error');
    }
  }, [connId, remember]);

  const rollback = useCallback(async (): Promise<void> => {
    const sid = sessionIds.current[connId];
    if (!sid) return;
    try {
      remember(connId, await window.electronAPI.rollbackDbSession(sid));
      showToast('Alterações desfeitas (rollback).', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Falha ao desfazer as alterações.', 'error');
    }
  }, [connId, remember]);

  const cancel = useCallback(async (): Promise<void> => {
    const sid = sessionIds.current[connId];
    if (!sid) return;
    try {
      await window.electronAPI.cancelDbSession(sid);
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível cancelar a consulta.', 'error');
    }
  }, [connId]);

  const changeMode = useCallback(
    async (next: TxMode): Promise<void> => {
      if (!connId || next === mode) return;
      const sid = sessionIds.current[connId];

      if (sid) {
        if (next === 'auto') {
          const warning = buildSwitchToAutoMessage(state);
          if (warning && !(await requestConfirm({ title: 'Trocar para auto-commit?', message: warning, confirmLabel: 'Trocar', tone: 'warning' }))) return;
        }
        try {
          remember(connId, await window.electronAPI.setDbSessionAutoCommit(sid, next === 'auto'));
        } catch (err: any) {
          showToast(err?.message || 'Não foi possível trocar o modo de transação.', 'error');
          return;
        }
      }
      storeTxMode(connId, next);
      setModes((prev) => ({ ...prev, [connId]: next }));
    },
    [connId, mode, state, remember]
  );

  /** Id da sessão atual, para rotear as edições do grid pela mesma transação do editor. */
  const getSessionId = useCallback((): string | undefined => sessionIds.current[connId], [connId]);

  return { supported, mode, state, execute, commit, rollback, cancel, changeMode, getSessionId };
}
