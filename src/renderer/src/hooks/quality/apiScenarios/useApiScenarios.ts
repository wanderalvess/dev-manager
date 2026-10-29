import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiScenario, ApiScenarioRunResult } from '../../../../../shared/apiScenarioTypes';
import type { AuthLockoutLogEntry } from '../../../../../shared/authLockoutTypes';
import type { DatabaseConnectionConfig } from '../../../../../shared/types';
import { showToast } from '../../../components/ToastHost';
import { requestConfirm } from '../../../components/ui/confirmService';
import { appendActivity, progressToEntry } from '../../../utils/authLockoutView';
import { isSameScenario, isUntouchedDraft, newExceptionScenario, newScenario, scenarioProblem } from '../../../utils/apiScenarioView';
import { copyText } from '../../useCopyToClipboard';

/** Validação de API: cenários salvos, rascunho em edição, execução com passo a passo e último resultado de cada um. */
export function useApiScenarios() {
  const [scenarios, setScenarios] = useState<ApiScenario[]>([]);
  const [draft, setDraft] = useState<ApiScenario>(newScenario);
  const [results, setResults] = useState<Record<string, ApiScenarioRunResult>>({});
  const [current, setCurrent] = useState<ApiScenarioRunResult | null>(null);
  const [activity, setActivity] = useState<AuthLockoutLogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<DatabaseConnectionConfig[]>([]);
  const runningRef = useRef(false);

  const reload = useCallback(async () => {
    try {
      setScenarios((await window.electronAPI?.apiScenarioList?.()) ?? []);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível ler os cenários.');
    }
  }, []);

  useEffect(() => {
    void reload();
    // Conexões do DB Studio para a regra "Campo × banco" (só id, nome e tipo são usados aqui)
    Promise.resolve(window.electronAPI?.getSettings?.())
      .then((settings) => setConnections(settings?.databaseConnections ?? []))
      .catch(() => setConnections([]));
  }, [reload]);

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onApiScenarioProgress?.((progress) => {
      if (runningRef.current) setActivity((lines) => appendActivity(lines, progressToEntry(progress)));
    });
    return () => unsubscribe?.();
  }, []);

  const saved = scenarios.find((s) => s.id === draft.id);
  const dirty = !saved || !isSameScenario(saved, draft);
  const problem = scenarioProblem(draft);

  const select = useCallback(
    async (scenario: ApiScenario | null, template: () => ApiScenario = newScenario) => {
      if (dirty && !isUntouchedDraft(draft) && (draft.id !== (scenario?.id ?? '') || !scenario)) {
        const discard = await requestConfirm({ title: 'Descartar alterações?', message: 'O cenário em edição tem alterações não salvas.', tone: 'warning' });
        if (!discard) return;
      }
      setDraft(scenario ? structuredClone(scenario) : template());
      setCurrent(scenario ? results[scenario.id] ?? null : null);
      setActivity([]);
      setError(null);
    },
    [dirty, draft, results]
  );

  const save = useCallback(async () => {
    if (problem) return;
    const response = await window.electronAPI.apiScenarioSave(draft);
    if (!response.success) {
      setError(response.error);
      return;
    }
    setError(null);
    setDraft(response.scenario);
    await reload();
    showToast('Cenário salvo.');
  }, [draft, problem, reload]);

  const remove = useCallback(async () => {
    if (!saved) return;
    const accepted = await requestConfirm({ title: 'Apagar cenário?', message: `"${saved.name}" será apagado.`, tone: 'danger', confirmLabel: 'Apagar' });
    if (!accepted) return;
    await window.electronAPI.apiScenarioDelete(saved.id);
    setDraft(newScenario());
    setCurrent(null);
    await reload();
  }, [saved, reload]);

  const track = async <T,>(work: () => Promise<T>): Promise<T | undefined> => {
    runningRef.current = true;
    setRunning(true);
    setActivity([]);
    setError(null);
    try {
      return await work();
    } catch (err: any) {
      setError(err?.message || 'Falha ao rodar.');
      return undefined;
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  };

  /** Roda o que está na tela, salvo ou não: dá para ajustar as regras e conferir antes de salvar. */
  const run = useCallback(async () => {
    if (problem || runningRef.current) return;
    const response = await track(() => window.electronAPI.apiScenarioRun(saved && !dirty ? { id: saved.id } : { scenario: draft }));
    if (!response) return;
    if (!('rules' in response)) {
      setError(response.error);
      return;
    }
    setCurrent(response);
    if (saved && !dirty) setResults((all) => ({ ...all, [saved.id]: response }));
  }, [draft, dirty, problem, saved]);

  const runAll = useCallback(async () => {
    if (runningRef.current) return;
    const list = await track(() => window.electronAPI.apiScenarioRunAll());
    if (!list) return;
    setResults(Object.fromEntries(list.map((r) => [r.scenarioId, r])));
    const ok = list.filter((r) => r.success).length;
    showToast(`${ok} de ${list.length} cenário(s) OK.`, ok === list.length ? 'success' : 'error');
    const mine = list.find((r) => r.scenarioId === draft.id);
    if (mine) setCurrent(mine);
  }, [draft.id]);

  const copyReport = useCallback(async () => {
    if (!current) return;
    if (await copyText(current.markdown)) showToast('Relatório copiado (Markdown para o Jira).');
    else showToast('Não foi possível copiar o relatório.', 'error');
  }, [current]);

  const newException = useCallback(() => select(null, newExceptionScenario), [select]);

  return { connections, newException, scenarios, draft, setDraft, saved, dirty, problem, results, current, activity, running, error, select, save, remove, run, runAll, copyReport };
}
