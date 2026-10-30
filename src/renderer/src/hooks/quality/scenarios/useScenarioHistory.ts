import { useCallback, useEffect, useState } from 'react';
import { recordMarkdown, type ScenarioRunKind, type ScenarioRunListItem, type ScenarioRunRecord } from '../../../../../shared/scenarioHistoryTypes';
import { showToast } from '../../../components/ToastHost';
import { requestConfirm } from '../../../components/ui/confirmService';
import { reportFileName } from '../../../../../shared/scenarioExports';
import { SCENARIO_HISTORY_CHANGED, downloadTextFile } from '../../../utils/downloadText';

export type ScenarioHistoryFilter = ScenarioRunKind | 'all';

/**
 * Histórico de execuções da Validação de Cenários (o mesmo que o modo Web e o MCP leem). A lista recarrega quando
 * uma execução termina (evento da página) e a cada abertura do modal.
 */
export function useScenarioHistory() {
  const [runs, setRuns] = useState<ScenarioRunListItem[]>([]);
  const [filter, setFilter] = useState<ScenarioHistoryFilter>('all');
  const [opened, setOpened] = useState<ScenarioRunRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRuns(await window.electronAPI.scenarioHistoryList());
    } catch {
      // Sem histórico legível: a lista só fica vazia
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const onChanged = () => void reload();
    window.addEventListener(SCENARIO_HISTORY_CHANGED, onChanged);
    return () => window.removeEventListener(SCENARIO_HISTORY_CHANGED, onChanged);
  }, [reload]);

  const open = useCallback(async (id: string) => {
    const record = await window.electronAPI.scenarioHistoryGet(id);
    if (record) setOpened(record);
    else showToast('Essa execução não está mais no histórico.', 'error');
  }, []);

  /** Baixa o .md direto da lista: o relatório vem do registro completo, porque a lista só traz o resumo. */
  const download = useCallback(async (id: string) => {
    const record = await window.electronAPI.scenarioHistoryGet(id);
    const markdown = record && recordMarkdown(record);
    if (!record || !markdown) {
      showToast('Essa execução não tem relatório para baixar.', 'error');
      return;
    }
    const fileName = reportFileName(record.name, record.startedAt);
    downloadTextFile(fileName, markdown);
    showToast(`Relatório salvo como ${fileName}.`);
  }, []);

  const remove = useCallback(
    async (run: ScenarioRunListItem) => {
      const ok = await requestConfirm({
        title: 'Apagar execução do histórico?',
        message: `${run.name} — ${new Date(run.startedAt).toLocaleString()}.`,
        confirmLabel: 'Apagar',
        tone: 'danger'
      });
      if (!ok) return;
      await window.electronAPI.scenarioHistoryDelete(run.id);
      if (opened?.id === run.id) setOpened(null);
      await reload();
    },
    [opened, reload]
  );

  const clear = useCallback(async () => {
    const ok = await requestConfirm({
      title: 'Limpar o histórico?',
      message: `Apaga as ${runs.length} execução(ões) guardadas, para o app, o modo Web e o MCP. Não tem volta.`,
      confirmLabel: 'Limpar histórico',
      tone: 'danger'
    });
    if (!ok) return;
    const removed = await window.electronAPI.scenarioHistoryClear();
    setOpened(null);
    await reload();
    showToast(`${removed} execução(ões) apagada(s).`);
  }, [runs.length, reload]);

  const visible = filter === 'all' ? runs : runs.filter((r) => r.kind === filter);
  return { runs, visible, filter, setFilter, opened, setOpened, loading, reload, open, download, remove, clear };
}
