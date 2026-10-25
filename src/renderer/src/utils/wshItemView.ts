import type { IntegrationTraceResult, IntegrationTraceStep } from '../../../shared/integrationTypes';
import type { WshItem } from '../../../shared/wshMonitorTypes';
import { formatWshError } from '../../../shared/wshObservation';
import type { ReadinessVerdict } from './integrationReadinessView';

/**
 * Apresentação pura de um item do Monitor do WSH: o veredito em uma frase, os oito passos para a vista animada
 * e o resumo para o Jira. O que a PCINTEGRACAOCORE não registra (abertura e fechamento do lote, baixa nas lojas)
 * fica "sem evidência", nunca ok.
 */

const when = (epoch?: number) =>
  epoch === undefined
    ? '?'
    : new Date(epoch).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

const unknown = (id: IntegrationTraceStep['id'], message: string): IntegrationTraceStep => ({ id, status: 'unknown', source: 'none', message });

export function describeWshItem(item: WshItem): ReadinessVerdict {
  if (item.tone === 'ok') {
    return { tone: 'success', title: 'Integrado no PDVSync', detail: 'O PDVSync aceitou o envio. A baixa nas lojas não aparece no monitor do WSH.' };
  }
  if (item.tone === 'error') {
    if (item.ownErrors.length > 0) {
      return { tone: 'danger', title: 'O PDVSync recusou este item', detail: item.ownErrors.map(formatWshError).join(' | ') };
    }
    if (item.otherErrors.length > 0) {
      return {
        tone: 'danger',
        title: 'Recusado junto com o envio',
        detail: `Este item não tem erro próprio: o PDVSync recusou a requisição inteira por erro em ${item.otherErrors.length} outro(s) item(ns) do mesmo envio. Corrija esses itens e o envio passa.`
      };
    }
    return { tone: 'danger', title: 'Erro no envio', detail: item.observation?.raw.slice(0, 300) || 'O WSH marcou erro sem detalhar na OBSERVACAO.' };
  }
  return { tone: 'muted', title: item.statusLabel, detail: 'Status sem significado confirmado; veja a OBSERVACAO.' };
}

function sendStep(item: WshItem): IntegrationTraceStep {
  const base = { id: 'send' as const, source: 'sql' as const, startedAt: item.syncedAt, durationMs: item.observation?.totalTimeMs };
  if (item.tone === 'ok') {
    const records = item.observation?.records;
    return { ...base, status: 'ok', message: `Enviado por ${item.sendRoute ?? 'rota de envio'} em ${when(item.syncedAt)}${records ? `, com ${records} registro(s) na requisição` : ''}.` };
  }
  if (item.tone === 'error') return { ...base, status: 'failed', message: describeWshItem(item).detail };
  return { ...base, status: 'pending', message: item.syncedAt ? `Status ${item.status} depois do envio.` : 'Ainda não enviado ao PDVSync.' };
}

/** Os oito passos do rastreio montados a partir da linha do WSH, para reaproveitar o Percurso do lote. */
export function wshItemTrace(item: WshItem): Pick<IntegrationTraceResult, 'id' | 'steps' | 'brokenAt' | 'stores'> {
  const sent = Boolean(item.sendRoute || item.syncedAt);
  const steps: IntegrationTraceStep[] = [
    { id: 'winthor-login', status: 'ok', source: 'sql', message: 'Implícito: a rota de busca só grava depois do login no WinThor.' },
    { id: 'winthor-fetch', status: 'ok', source: 'sql', startedAt: item.createdAt, message: `Buscado pela rota ${item.route} em ${when(item.createdAt)}.` },
    item.hasTransformedData
      ? { id: 'jolt', status: 'ok', source: 'sql', message: 'O WSH gravou o dado transformado (DADOSTRANSFORMADOS).' }
      : unknown('jolt', 'Sem dado transformado gravado.'),
    sent
      ? { id: 'pdvsync-login', status: 'ok', source: 'sql', message: 'Implícito: o envio só acontece depois do login no PDVSync.' }
      : unknown('pdvsync-login', 'Ainda não houve envio.'),
    unknown('open-batch', 'O WSH não grava a abertura do lote na PCINTEGRACAOCORE.'),
    sendStep(item),
    unknown('close-batch', 'O WSH não grava o fechamento do lote na PCINTEGRACAOCORE.'),
    unknown('pdv-arrival', 'A baixa nas lojas não aparece no monitor do WSH.')
  ];
  const broken = steps.find((step) => step.status === 'failed');
  return { id: `wsh-${item.id}`, steps, ...(broken ? { brokenAt: broken.id } : {}), stores: [] };
}

/** Resumo em Markdown para colar no Jira. */
export function wshItemMarkdown(item: WshItem): string {
  const verdict = describeWshItem(item);
  const lines = [
    `**${verdict.title}** — \`${item.externalId}\``,
    '',
    `- Status no WSH: ${item.statusLabel} (STATUS ${item.status || '?'})${item.attempts !== undefined ? `, ${item.attempts} tentativa(s)` : ''}`,
    `- Busca: ${item.route} em ${when(item.createdAt)}`,
    `- Envio: ${item.sendRoute ?? 'sem rota de envio'}${item.syncedAt ? ` em ${when(item.syncedAt)}` : ''}${item.requestId ? ` (requisição ${item.requestId})` : ''}`,
    `- ${verdict.detail}`
  ];
  if (item.ownErrors.length > 0) lines.push('', 'Erros do item:', ...item.ownErrors.map((error) => `- ${formatWshError(error)}`));
  if (item.otherErrors.length > 0) lines.push('', 'Erros de outros itens do mesmo envio:', ...item.otherErrors.map((error) => `- ${formatWshError(error)}`));
  if (item.observation?.truncated) lines.push('', '_A OBSERVACAO foi lida em parte; pode haver mais erros._');
  return lines.join('\n');
}
