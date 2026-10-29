import { useCallback, useEffect, useRef, useState } from 'react';
import { estimateAuthLockoutMinutes } from '../../../../../shared/authLockoutCatalog';
import type { AuthLockoutCheckResult, AuthLockoutRunResult } from '../../../../../shared/authLockoutTypes';
import { showToast } from '../../../components/ToastHost';
import { requestConfirm } from '../../../components/ui/confirmService';
import {
  AUTH_LOCKOUT_FORM_STORAGE_KEY,
  buildRunRequest,
  formBlocker,
  formFromDefaults,
  mergeStoredForm,
  parseMinutesList,
  pendingChecks,
  serializeForm,
  type AuthLockoutForm
} from '../../../utils/authLockoutView';

const MAX_ACTIVITY = 300;

export interface ActivityLine {
  at: string;
  message: string;
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(AUTH_LOCKOUT_FORM_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Formulário, execução com progresso ao vivo e resultado do teste de bloqueio de login. */
export function useAuthLockoutRun() {
  const [form, setForm] = useState<AuthLockoutForm | null>(null);
  const [running, setRunning] = useState(false);
  const [checks, setChecks] = useState<AuthLockoutCheckResult[]>(() => pendingChecks([]));
  const [activity, setActivity] = useState<ActivityLine[]>([]);
  const [result, setResult] = useState<AuthLockoutRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(window.electronAPI?.authLockoutGetDefaults?.())
      .then((defaults) => {
        if (cancelled || !defaults) return;
        const merged = mergeStoredForm(formFromDefaults(defaults), readStored());
        setForm(merged);
        setChecks(pendingChecks(merged.checks));
      })
      .catch((err: any) => !cancelled && setError(err?.message || 'Não foi possível ler os padrões do teste.'));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!form) return;
    try {
      window.localStorage.setItem(AUTH_LOCKOUT_FORM_STORAGE_KEY, serializeForm(form));
    } catch {
      // Sem armazenamento local (janela privada): o formulário só não é lembrado
    }
  }, [form]);

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onAuthLockoutProgress?.((progress) => {
      if (!runningRef.current) return;
      setActivity((lines) => [...lines, { at: progress.at, message: progress.message }].slice(-MAX_ACTIVITY));
      const check = progress.check;
      if (check) setChecks((list) => list.map((c) => (c.id === check.id ? check : c)));
    });
    return () => unsubscribe?.();
  }, []);

  const update = useCallback(<K extends keyof AuthLockoutForm>(key: K, value: AuthLockoutForm[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }, []);

  const estimatedMinutes = form
    ? estimateAuthLockoutMinutes(form.checks, Number(form.windowSeconds) || 60, parseMinutesList(form.lockMinutes))
    : 0;
  const blocker = form ? formBlocker(form) : 'Carregando...';

  const run = useCallback(async () => {
    if (!form || runningRef.current || blocker) return;
    const accepted = await requestConfirm({
      title: 'Rodar o teste de bloqueio?',
      message: `As contas ${[form.userALogin, form.userBLogin].filter(Boolean).join(' e ')} serão bloqueadas de propósito no WTA ${form.baseUrl}. Use só em homologação, com usuários de teste. Duração estimada: ~${estimatedMinutes} min.`,
      tone: 'danger',
      confirmLabel: 'Bloquear e testar'
    });
    if (!accepted) return;
    runningRef.current = true;
    setRunning(true);
    setError(null);
    setResult(null);
    setActivity([]);
    setChecks(pendingChecks(form.checks));
    try {
      const response = await window.electronAPI.authLockoutRun(buildRunRequest(form));
      setResult(response);
      if (response.checks.length) setChecks(response.checks);
      if (response.error) setError(response.error);
      else showToast(response.aborted ? 'Teste de bloqueio interrompido.' : 'Teste de bloqueio concluído.', response.aborted ? 'info' : 'success');
    } catch (err: any) {
      setError(err?.message || 'Falha ao rodar o teste de bloqueio.');
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }, [form, blocker, estimatedMinutes]);

  const abort = useCallback(async () => {
    await window.electronAPI?.authLockoutAbort?.();
    showToast('Interrompendo depois da requisição atual...', 'info');
  }, []);

  const copyReport = useCallback(async () => {
    if (!result?.markdown) return;
    try {
      await navigator.clipboard.writeText(result.markdown);
      showToast('Relatório copiado (Markdown para o Jira).');
    } catch {
      showToast('Não foi possível copiar o relatório.', 'error');
    }
  }, [result]);

  return { form, update, running, checks, activity, result, error, blocker, estimatedMinutes, run, abort, copyReport };
}
