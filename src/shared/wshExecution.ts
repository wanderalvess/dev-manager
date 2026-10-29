/**
 * Execuções de um fluxo do WSH, lidas da gestão de execução (PCINTEGRACAOGESTAOFLUXO, uma linha por execução do fluxo;
 * PCINTEGRACAOGESTAORECURSO, uma por etapa; PCINTEGRACAOGESTAODETALHES, o erro da etapa). Conferido num banco real
 * (2026-10-29): STATUSEXECUCAO 2 = concluída e 3 = com erro (com RECURSOFALHA); 4 apareceu uma vez sem erro gravado.
 * O CONTADOR cresce também nas execuções concluídas, então não é contagem de tentativas: fica de fora.
 */

export type WshRunTone = 'ok' | 'error' | 'other';

export interface WshFlowRunStep {
  /** NOMERECURSO: a etapa do motor do WSH ("BUSCAROTASERVICOPAGINADA", "AUTENTICADORREFRESHTOKENAPI"). */
  name: string;
  statusLabel: string;
  tone: WshRunTone;
  fetched?: number;
  sent?: number;
  error?: string;
}

export interface WshFlowRun {
  id: number;
  startedAt?: number;
  finishedAt?: number;
  statusLabel: string;
  tone: WshRunTone;
  /** RECURSOFALHA: a etapa em que a execução parou. */
  failedStep?: string;
  /** O erro resumido: o da execução ou, sem ele, o da primeira etapa com erro. */
  error?: string;
  steps: WshFlowRunStep[];
}

const STATUS: Record<number, { label: string; tone: WshRunTone }> = {
  1: { label: 'Em execução', tone: 'other' },
  2: { label: 'Concluída', tone: 'ok' },
  3: { label: 'Com erro', tone: 'error' },
  4: { label: 'Interrompida', tone: 'other' }
};

export function describeRunStatus(status: number | undefined): { label: string; tone: WshRunTone } {
  return (status !== undefined && STATUS[status]) || { label: status === undefined ? 'Sem status' : `Status ${status}`, tone: 'other' };
}

/**
 * Erro gravado pelo WSH em uma frase. O WTA responde HTML quando a API não existe ("Error 404 Not Found",
 * "Problem accessing /api/..."): vira "HTTP 404 em /api/...: a API não existe neste WTA". O resto, a primeira linha útil.
 */
export function summarizeExecutionError(text: string | undefined): string | undefined {
  const raw = (text ?? '').trim();
  if (!raw) return undefined;
  if (/<html|<title>/i.test(raw)) {
    const code = /Error\s+(\d{3})/i.exec(raw)?.[1] ?? /HTTP ERROR\s+(\d{3})/i.exec(raw)?.[1];
    const path = /Problem accessing\s+([^\s<.]+(?:\.[^\s<.]+)*)/i.exec(raw)?.[1];
    const where = path ? ` em ${path}` : '';
    if (code === '404') return `HTTP 404${where}: a API não existe neste WTA (falta instalar ou atualizar o bundle que a publica).`;
    return code ? `HTTP ${code}${where}.` : 'O WTA respondeu uma página de erro em HTML.';
  }
  const line = raw.split(/\r?\n/).map((part) => part.trim()).find(Boolean) ?? raw;
  return line.length > 300 ? `${line.slice(0, 297)}...` : line;
}

/** Execuções seguidas com o mesmo resultado (status, etapa e erro) viram uma linha só, com a contagem. */
export function collapseRuns(runs: WshFlowRun[]): { run: WshFlowRun; times: number }[] {
  const out: { run: WshFlowRun; times: number }[] = [];
  for (const run of runs) {
    const last = out[out.length - 1];
    const same = last && last.run.statusLabel === run.statusLabel && last.run.failedStep === run.failedStep && last.run.error === run.error;
    if (same) last.times += 1;
    else out.push({ run, times: 1 });
  }
  return out;
}
