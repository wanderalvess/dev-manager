import type { IntegrationStepId, IntegrationTraceStep } from '../../../shared/integrationTypes';
import type { PdvSyncBatch, PdvSyncLookup, PdvSyncStore } from './pdvSyncClient';

/**
 * Traduz o que o PDVSync respondeu em estado dos passos do rastreio (decisão 0003). Funções puras. O princípio é o
 * mesmo do resto do rastreio: o que não dá para provar fica `unknown`, e só a prova vira `ok`.
 */

export function unknownStep(id: IntegrationStepId, reason: string): IntegrationTraceStep {
  return { id, status: 'unknown', source: 'none', message: `Sem evidência: ${reason}` };
}

export interface PdvSyncSteps {
  open: IntegrationTraceStep;
  close: IntegrationTraceStep;
  arrival: IntegrationTraceStep;
  notes: string[];
}

const MAX_EVIDENCE_LINES = 8;

function storeEvidence(stores: PdvSyncStore[]): string | undefined {
  const lines: string[] = [];
  for (const store of stores) {
    for (const error of store.errors) {
      lines.push(`loja ${store.branchId ?? '?'}${error.id ? ` · ${error.id}` : ''}: ${error.message}`);
    }
    if (store.statusCode !== undefined && store.status.kind === 'error' && store.errors.length === 0) {
      lines.push(`loja ${store.branchId ?? '?'}: ${store.status.name}`);
    }
  }
  if (lines.length === 0) return undefined;
  const shown = lines.slice(0, MAX_EVIDENCE_LINES);
  const extra = lines.length - shown.length;
  return extra > 0 ? `${shown.join('\n')}\n(+${extra} linha(s))` : shown.join('\n');
}

/** Chegada pelo status de cada loja: é o dado mais preciso, porque diz quem já baixou o lote. */
function arrivalFromStores(stores: PdvSyncStore[]): IntegrationTraceStep {
  const base = { id: 'pdv-arrival' as const, source: 'ch-api' as const };
  const total = stores.length;
  const failed = stores.filter((store) => store.status.kind === 'error');
  const downloaded = stores.filter((store) => store.status.kind === 'downloaded').length;
  const waiting = stores.filter((store) => ['available', 'downloading', 'preparing', 'processing'].includes(store.status.kind)).length;

  if (failed.length > 0) {
    const ids = failed.map((store) => store.branchId ?? '?').join(', ');
    return { ...base, status: 'failed', itemCount: downloaded, evidence: storeEvidence(stores), message: `${failed.length} de ${total} loja(s) com erro ao baixar o lote (filial ${ids}).` };
  }
  if (downloaded === total) {
    return { ...base, status: 'ok', itemCount: downloaded, message: total === 1 ? 'A loja baixou o lote.' : `Todas as ${total} lojas baixaram o lote.` };
  }
  if (waiting > 0) {
    return { ...base, status: 'pending', itemCount: downloaded, message: `${downloaded} de ${total} loja(s) baixaram o lote; ${waiting} ainda em andamento.` };
  }
  return { ...base, status: 'unknown', message: 'Sem evidência: o status das lojas não foi reconhecido.' };
}

/** Chegada pelo status do lote inteiro, quando não há status por loja. */
function arrivalFromBatch(batch: PdvSyncBatch): IntegrationTraceStep {
  const base = { id: 'pdv-arrival' as const, source: 'ch-api' as const };
  const name = batch.status.name;
  switch (batch.status.kind) {
    case 'downloaded':
      return { ...base, status: 'ok', message: `O PDVSync marcou o lote como ${name}.` };
    case 'error':
      return { ...base, status: 'failed', message: `O PDVSync marcou o lote como ${name}.` };
    case 'preparing':
    case 'processing':
    case 'available':
    case 'downloading':
      return { ...base, status: 'pending', message: `O lote está em ${name}: as lojas ainda não terminaram de baixar.` };
    case 'sent':
      return unknownStep('pdv-arrival', `o status ${name} não prova que as lojas baixaram o lote.`);
    default:
      return unknownStep('pdv-arrival', 'o PDVSync devolveu um status que o Hub não reconhece.');
  }
}

function closeStepFrom(batch: PdvSyncBatch): IntegrationTraceStep {
  const base = { id: 'close-batch' as const, source: 'ch-api' as const };
  switch (batch.status.kind) {
    case 'preparing':
      return { ...base, status: 'pending', message: 'O lote ainda está em preparação: o WSH pode não ter fechado o lote, ou o fluxo ainda está rodando.' };
    case 'unknown':
      return unknownStep('close-batch', 'o PDVSync devolveu um status que o Hub não reconhece.');
    default:
      return { ...base, status: 'ok', message: `O lote já saiu de EmPreparacao (agora ${batch.status.name}), o que indica que foi fechado.` };
  }
}

/** Os três passos que o PDVSync consegue provar: abrir, fechar e a chegada nas lojas. */
export function stepsFromLookup(lookup: PdvSyncLookup, batchNumber: string): PdvSyncSteps {
  const notes: string[] = [];

  if (lookup.error || !lookup.batch) {
    const error = lookup.error ?? 'sem resposta.';
    notes.push(`Consulta ao PDVSync falhou: ${error}`);
    const reason = `a consulta ao PDVSync não funcionou (${error})`;
    return { open: unknownStep('open-batch', reason), close: unknownStep('close-batch', reason), arrival: unknownStep('pdv-arrival', reason), notes };
  }

  if (!lookup.batch.found) {
    notes.push(`O PDVSync não conhece o lote ${batchNumber} para o inquilino configurado: confira o número, o inquilino e o ambiente.`);
    const reason = 'o PDVSync não conhece este lote.';
    return { open: unknownStep('open-batch', reason), close: unknownStep('close-batch', reason), arrival: unknownStep('pdv-arrival', reason), notes };
  }

  const open: IntegrationTraceStep = {
    id: 'open-batch',
    status: 'ok',
    source: 'ch-api',
    message: `O lote existe no PDVSync (status ${lookup.batch.status.name}).`
  };

  if (lookup.storesError) notes.push(`Status por loja indisponível, usei só o status do lote: ${lookup.storesError}`);
  const hasStores = (lookup.stores?.length ?? 0) > 0;
  const arrival = hasStores ? arrivalFromStores(lookup.stores!) : arrivalFromBatch(lookup.batch);
  return { open, close: closeStepFrom(lookup.batch), arrival, notes };
}

const joinEvidence = (...parts: (string | undefined)[]) => parts.filter(Boolean).join('\n') || undefined;

/**
 * Junta a prova do PDVSync com a do banco do PDV (SQL). Falha definitiva vence, exceto quando o PDVSync diz "em andamento"
 * e o banco ainda não tem o dado: aí é só demora, não falha. Qualquer um provando a chegada vale `ok`.
 */
export function mergeArrivalSteps(
  pdvsync: IntegrationTraceStep | undefined,
  sql: IntegrationTraceStep | undefined
): IntegrationTraceStep {
  const steps = [pdvsync, sql].filter((step): step is IntegrationTraceStep => step !== undefined);
  if (steps.length === 0) return unknownStep('pdv-arrival', 'nenhuma fonte configurada para provar a chegada.');
  if (steps.length === 1) return steps[0];

  const [a, b] = steps as [IntegrationTraceStep, IntegrationTraceStep];
  const evidence = joinEvidence(a.evidence, b.evidence);

  if (a.status === 'pending' && b.status === 'failed') {
    return { ...a, evidence, message: `${a.message} O dado ainda não apareceu no banco do PDV: ${b.message}` };
  }
  const failed = [a, b].find((step) => step.status === 'failed');
  if (failed) {
    const other = failed === a ? b : a;
    return { ...failed, evidence, message: `${failed.message}${other.status === 'ok' ? ` Mas ${other.source === 'sql' ? 'o banco do PDV' : 'o PDVSync'} confirma a chegada.` : ''}` };
  }
  const ok = [a, b].find((step) => step.status === 'ok');
  if (ok) {
    const other = ok === a ? b : a;
    return { ...ok, evidence, message: other.status === 'ok' ? `${ok.message} ${other.message}` : ok.message };
  }
  const pending = [a, b].find((step) => step.status === 'pending');
  if (pending) return { ...pending, evidence };
  return { id: 'pdv-arrival', status: 'unknown', source: 'none', message: [a.message, b.message].filter(Boolean).join(' ') };
}
