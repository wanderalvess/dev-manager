/** Baixa um texto como arquivo (o relatório .md), pelo mesmo caminho dos outros downloads do app: link com Blob. */
export function downloadTextFile(fileName: string, text: string, mime = 'text/markdown;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Avisa a página que uma execução entrou no histórico, para o botão Histórico atualizar a contagem. */
export const SCENARIO_HISTORY_CHANGED = 'devmanager:scenario-history-changed';

export function notifyScenarioHistoryChanged(): void {
  window.dispatchEvent(new Event(SCENARIO_HISTORY_CHANGED));
}
