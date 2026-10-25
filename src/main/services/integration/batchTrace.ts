import type { ApmFilter, TraceSummary } from '../../../shared/types';
import type {
  IntegrationFlowDefinition,
  IntegrationLayerConfig,
  IntegrationLogExcerpt,
  IntegrationStepId,
  IntegrationTraceResult,
  IntegrationTraceStep
} from '../../../shared/integrationTypes';
import type { NormalizedBatchRequest } from '../../../shared/integrationBatchRequest';
import { buildTraceFilter, pickWinthorTrace, stepFromTrace } from './apmCorrelation';
import { extractLogExcerpt } from './logEvidence';
import type { PdvSyncLookup } from './pdvSyncClient';
import { mergeArrivalSteps, stepsFromLookup, unknownStep, type PdvSyncSteps } from './pdvSyncSteps';
import {
  buildEvidenceBinds,
  pollEvidence,
  validateEvidenceSql,
  type EvidenceQueryResult,
  type PollDeps
} from './sqlEvidence';
import { buildTraceEvidenceMarkdown } from './traceEvidenceMarkdown';
import { applyStepUpdate, createEmptyTimeline, finalizeTrace } from './traceTimeline';

/**
 * Rastreio de um lote de um fluxo de **saída** (decisão 0003). Prova o que as fontes disponíveis permitem: o PDVSync
 * (existência, fechamento e chegada nas lojas), o banco do PDV por SQL com espera, a retaguarda Oracle, a chamada
 * do WinThor pelo APM e os logs filtrados pelo lote. O que não tem fonte fica `unknown` com o motivo; nunca `ok`
 * por suposição.
 */

export interface BatchTraceDeps {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  newId: () => string;
  /** `null` quando a conexão não existe mais nas configurações. */
  runQuery: (connectionId: string, sql: string, binds: Record<string, string>) => Promise<EvidenceQueryResult | null>;
  getTraces: (filter: ApmFilter) => Promise<TraceSummary[]>;
  /** `null` quando o arquivo não existe ou não pode ser lido. */
  readLogLines: (filePath: string) => Promise<string[] | null>;
  /** `null` quando a camada CH não tem o login, o inquilino e o endereço de consulta do PDVSync configurados. */
  lookupPdvSync: (batchNumber: string, branchId?: string) => Promise<PdvSyncLookup | null>;
}

export interface BatchTraceInputs {
  request: NormalizedBatchRequest;
  flow: IntegrationFlowDefinition;
  layers: Partial<Record<IntegrationLayerConfig['layer'], IntegrationLayerConfig>>;
}

/** Passos que o WSH executa por dentro e que não deixam rastro que o Hub leia, qualquer que seja a configuração. */
const NO_SOURCE_REASONS: Partial<Record<IntegrationStepId, string>> = {
  'winthor-login': 'o login do WinThor é feito pelo WSH e não deixa rastro que o Hub leia.',
  jolt: 'a transformação só pode ser comparada com os dois JSONs (antes e depois do JOLT).',
  'pdvsync-login': 'o login do PDVSync é feito pelo WSH e não deixa rastro que o Hub leia.',
  send: 'o envio ao lote só aparece na resposta do PDVSync ao WSH, que o Hub não lê; o status do lote mostra o resultado.'
};

const PDVSYNC_NOT_CONFIGURED =
  'o PDVSync não está configurado na camada CH (login, inquilino e endereço de consulta do lote).';

const shortError = (text: string | undefined) => (text ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
const baseName = (filePath: string) => filePath.split(/[\\/]/).pop() || filePath;

interface RunContext {
  inputs: BatchTraceInputs;
  deps: BatchTraceDeps;
  startMs: number;
  notes: string[];
}

/** Roda a consulta com os binds do lote e devolve uma falha legível quando a conexão não existe. */
function queryRunner(ctx: RunContext, connectionId: string, sql: string): PollDeps['run'] {
  return async (attemptAt) => {
    const binds = buildEvidenceBinds(sql, { batchNumber: ctx.inputs.request.batchNumber, startMs: ctx.startMs, endMs: attemptAt });
    const result = await ctx.deps.runQuery(connectionId, sql, binds);
    return result ?? { success: false, rows: [], error: 'Conexão não encontrada nas configurações do DB Studio.' };
  };
}

async function resolveWinthorStep(ctx: RunContext): Promise<IntegrationTraceStep> {
  const { flow, request, layers } = ctx.inputs;
  const window = { startMs: ctx.startMs, endMs: ctx.deps.now() };
  let step: IntegrationTraceStep | undefined;

  if (flow.winthorApiPath?.trim()) {
    try {
      const traces = await ctx.deps.getTraces(buildTraceFilter(flow.winthorApiPath, window));
      const match = pickWinthorTrace(traces, flow.winthorApiPath, window);
      if (match) step = stepFromTrace(match);
      else ctx.notes.push('Nenhuma chamada da API do WinThor foi encontrada no APM na janela do rastreio.');
    } catch (error) {
      ctx.notes.push(`APM indisponível: ${shortError((error as Error).message)}`);
    }
  } else {
    ctx.notes.push('API do fluxo no WinThor não configurada: a chamada não pôde ser procurada no APM.');
  }

  const connectionId = layers.winthor?.dbConnectionId;
  const sql = flow.evidence.oracleQuery;
  if (sql?.trim() && connectionId) {
    const invalid = validateEvidenceSql(sql);
    if (invalid) {
      ctx.notes.push(`Evidência da retaguarda ignorada: ${invalid}`);
    } else {
      const outcome = await pollEvidence(sql, 0, { ...ctx.deps, run: queryRunner(ctx, connectionId, sql) });
      if (outcome.status === 'error') {
        ctx.notes.push(`Consulta da retaguarda falhou: ${shortError(outcome.error)}`);
      } else if (step) {
        step = outcome.status === 'found' ? { ...step, itemCount: outcome.count } : step;
      } else if (outcome.status === 'found') {
        step = {
          id: 'winthor-fetch',
          status: 'unknown',
          source: 'sql',
          itemCount: outcome.count,
          message: `Sem evidência da chamada: o dado existe na retaguarda (${outcome.count} registro(s)), mas a chamada da API não foi observada.`
        };
      } else {
        ctx.notes.push(`Nenhum registro do lote ${request.batchNumber} na retaguarda: confira a consulta e a janela.`);
      }
    }
  }
  return step ?? unknownStep('winthor-fetch', 'sem chamada no APM nem dado na retaguarda para este lote.');
}

/** Procura o lote no PDVSync; `undefined` quando a camada CH não tem como consultá-lo. */
async function resolvePdvSync(ctx: RunContext): Promise<PdvSyncSteps | undefined> {
  const { request } = ctx.inputs;
  const lookup = await ctx.deps.lookupPdvSync(request.batchNumber, request.branchId);
  if (lookup === null) {
    ctx.notes.push(`PDVSync não consultado: ${PDVSYNC_NOT_CONFIGURED}`);
    return undefined;
  }
  const steps = stepsFromLookup(lookup, request.batchNumber);
  ctx.notes.push(...steps.notes);
  return steps;
}

/**
 * A chegada pelo banco do PDV: consulta de evidência com espera. Quando o PDVSync já deu a resposta final (ok ou falha),
 * o banco só confirma, em uma tentativa, para o usuário não esperar o tempo todo à toa.
 */
async function resolveSqlArrival(ctx: RunContext, expected: number | undefined, quick: boolean): Promise<IntegrationTraceStep | undefined> {
  const { flow, layers } = ctx.inputs;
  const sql = flow.evidence.pdvQuery;
  if (!sql?.trim()) return undefined;
  const invalid = validateEvidenceSql(sql);
  if (invalid) return unknownStep('pdv-arrival', invalid.charAt(0).toLowerCase() + invalid.slice(1));
  const connectionId = layers.pdv?.dbConnectionId;
  if (!connectionId) return unknownStep('pdv-arrival', 'a conexão do PDV não está configurada na camada PDV.');

  const waitSeconds = quick || !(flow.evidence.pdvWaitSeconds > 0) ? 0 : flow.evidence.pdvWaitSeconds;
  const outcome = await pollEvidence(sql, waitSeconds, { ...ctx.deps, run: queryRunner(ctx, connectionId, sql) });
  const base = { id: 'pdv-arrival' as const, source: 'sql' as const, durationMs: outcome.elapsedMs };

  if (outcome.status === 'error') {
    ctx.notes.push(`Consulta do PDV falhou: ${shortError(outcome.error)}`);
    return unknownStep('pdv-arrival', `a consulta de evidência não pôde ser executada (${shortError(outcome.error)}).`);
  }
  if (outcome.status === 'found') {
    const waited = outcome.attempts > 1 ? ` após ${Math.round(outcome.elapsedMs / 1000)} s` : '';
    const versus = expected !== undefined ? ` (retaguarda: ${expected})` : '';
    return { ...base, status: 'ok', itemCount: outcome.count, message: `Encontrado no banco do PDV${waited}: ${outcome.count} registro(s)${versus}.` };
  }
  if (quick) {
    // Uma tentativa de confirmação não derruba o que o PDVSync já provou; um SQL mal configurado viraria alarme falso
    ctx.notes.push('O PDVSync já deu a resposta final, mas a consulta de evidência do banco do PDV não achou o lote: confira a consulta.');
    return unknownStep('pdv-arrival', 'a consulta rápida no banco do PDV não achou registros.');
  }
  return {
    ...base,
    status: 'failed',
    itemCount: 0,
    message: `Nenhum registro do lote no banco do PDV após ${waitSeconds} s (${outcome.attempts} tentativa(s)).`,
    evidence: 'A consulta de evidência do PDV devolveu 0 registros.'
  };
}

async function collectLogs(ctx: RunContext): Promise<IntegrationLogExcerpt[]> {
  const { request, flow, layers } = ctx.inputs;
  const sources = [
    { source: 'wsh' as const, label: 'WSH', path: layers.wsh?.logFilePath, marker: flow.logMarkers?.wsh },
    { source: 'ch' as const, label: 'CH', path: layers.ch?.logFilePath, marker: flow.logMarkers?.ch }
  ];
  const excerpts: IntegrationLogExcerpt[] = [];
  for (const { source, label, path, marker } of sources) {
    if (!path?.trim()) continue;
    const lines = await ctx.deps.readLogLines(path);
    if (lines === null) {
      ctx.notes.push(`Log do ${label} não encontrado ou ilegível (${baseName(path)}).`);
      continue;
    }
    const excerpt = extractLogExcerpt(source, lines, request.batchNumber, marker);
    excerpts.push(excerpt);
    if (excerpt.errorLines > 0) ctx.notes.push(`O log do ${label} tem ${excerpt.errorLines} linha(s) de erro citando o lote.`);
  }
  return excerpts;
}

export async function runBatchTrace(inputs: BatchTraceInputs, deps: BatchTraceDeps): Promise<IntegrationTraceResult> {
  const startedAt = deps.now();
  const { request, flow } = inputs;
  const ctx: RunContext = { inputs, deps, startMs: startedAt - request.lookbackMinutes * 60_000, notes: [] };

  const [winthorStep, logExcerpts, pdvsync] = await Promise.all([resolveWinthorStep(ctx), collectLogs(ctx), resolvePdvSync(ctx)]);
  const pdvsyncFinal = pdvsync && (pdvsync.arrival.status === 'ok' || pdvsync.arrival.status === 'failed');
  const sqlStep = await resolveSqlArrival(ctx, winthorStep.itemCount, Boolean(pdvsyncFinal));

  let steps = createEmptyTimeline();
  for (const [id, reason] of Object.entries(NO_SOURCE_REASONS)) {
    steps = applyStepUpdate(steps, unknownStep(id as IntegrationStepId, reason ?? ''));
  }
  steps = applyStepUpdate(steps, winthorStep);
  steps = applyStepUpdate(steps, pdvsync?.open ?? unknownStep('open-batch', PDVSYNC_NOT_CONFIGURED));
  steps = applyStepUpdate(steps, pdvsync?.close ?? unknownStep('close-batch', PDVSYNC_NOT_CONFIGURED));
  steps = applyStepUpdate(steps, mergeArrivalSteps(pdvsync?.arrival, sqlStep));

  const finished = finalizeTrace(
    { id: deps.newId(), flowId: flow.id, flowName: flow.name, batchNumber: request.batchNumber, startedAt, steps, logExcerpts, notes: ctx.notes },
    deps.now()
  );
  return { ...finished, evidenceMarkdown: buildTraceEvidenceMarkdown(finished) };
}
