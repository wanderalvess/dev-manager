import { describeRunStatus, summarizeExecutionError, type WshFlowRun, type WshFlowRunStep } from '../../../shared/wshExecution';
import type { WshScheduleInfo } from '../../../shared/wshMonitorTypes';
import { asEpoch, asNumber, asText, col, type Row } from './wshMonitorQuery';

/**
 * SQL da gestão de execução do WSH: as últimas execuções de cada fluxo e as etapas delas. Texto fixo com binds, só
 * SELECT. Os CLOBs de erro entram cortados (`dbms_lob.substr`).
 */

export const RUNS_PER_FLOW = 5;
const ERROR_READ_CHARS = 1500;

const binds = (prefix: string, values: number[]) => Object.fromEntries(values.map((value, i) => [`${prefix}${i}`, value]));
const placeholders = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `:${prefix}${i}`).join(', ');

export function buildRunsQuery(flowIds: number[]): { sql: string; binds: Record<string, number> } {
  const sql = `select * from (
  select g.id, g.idfluxo, g.datainicial, g.datafinal, g.statusexecucao, g.recursofalha,
         dbms_lob.substr(g.erro, ${ERROR_READ_CHARS}, 1) as erro,
         row_number() over (partition by g.idfluxo order by g.datainicial desc, g.id desc) as rn
  from pcintegracaogestaofluxo g
  where g.idfluxo in (${placeholders('f', flowIds.length)})
) where rn <= ${RUNS_PER_FLOW}`;
  return { sql, binds: binds('f', flowIds) };
}

/** Etapas das execuções; o erro da etapa vem da primeira linha de detalhe com erro. */
export function buildStepsQuery(runIds: number[]): { sql: string; binds: Record<string, number> } {
  const sql = `select r.id, r.idgestaofluxo, r.nomerecurso, r.statusexecucao, r.quantidadebusca, r.quantidadeenvio, r.datainicial,
       (select dbms_lob.substr(d.erro, ${ERROR_READ_CHARS}, 1) from pcintegracaogestaodetalhes d
         where d.idgestaorecurso = r.id and d.erro is not null and rownum = 1) as erro
from pcintegracaogestaorecurso r
where r.idgestaofluxo in (${placeholders('e', runIds.length)})
order by r.datainicial, r.id`;
  return { sql, binds: binds('e', runIds) };
}

function toStep(row: Row): WshFlowRunStep {
  const { label, tone } = describeRunStatus(asNumber(col(row, 'statusexecucao')));
  const fetched = asNumber(col(row, 'quantidadebusca'));
  const sent = asNumber(col(row, 'quantidadeenvio'));
  const error = summarizeExecutionError(asText(col(row, 'erro')));
  return {
    name: asText(col(row, 'nomerecurso')) ?? '',
    statusLabel: label,
    tone,
    ...(fetched !== undefined ? { fetched } : {}),
    ...(sent !== undefined ? { sent } : {}),
    ...(error ? { error } : {})
  };
}

/** Execuções por IDFLUXO, da mais recente para a mais antiga, com as etapas de cada uma. */
export function toFlowRuns(runRows: Row[], stepRows: Row[]): Map<number, WshFlowRun[]> {
  const stepsByRun = new Map<number, WshFlowRunStep[]>();
  for (const row of stepRows) {
    const runId = Number(col(row, 'idgestaofluxo'));
    stepsByRun.set(runId, [...(stepsByRun.get(runId) ?? []), toStep(row)]);
  }
  const byFlow = new Map<number, WshFlowRun[]>();
  for (const row of runRows) {
    const id = Number(col(row, 'id'));
    const flowId = Number(col(row, 'idfluxo'));
    const { label, tone } = describeRunStatus(asNumber(col(row, 'statusexecucao')));
    const steps = stepsByRun.get(id) ?? [];
    const startedAt = asEpoch(col(row, 'datainicial'));
    const finishedAt = asEpoch(col(row, 'datafinal'));
    const failedStep = asText(col(row, 'recursofalha'))?.trim();
    const error = summarizeExecutionError(asText(col(row, 'erro'))) ?? steps.find((step) => step.error)?.error;
    const run: WshFlowRun = {
      id,
      ...(startedAt !== undefined ? { startedAt } : {}),
      ...(finishedAt !== undefined ? { finishedAt } : {}),
      statusLabel: label,
      tone,
      ...(failedStep ? { failedStep } : {}),
      ...(error ? { error } : {}),
      steps
    };
    byFlow.set(flowId, [...(byFlow.get(flowId) ?? []), run]);
  }
  for (const runs of byFlow.values()) runs.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0) || b.id - a.id);
  return byFlow;
}

type RunQuery = (sql: string, maxRows: number, binds: Record<string, number>) => Promise<{ success: boolean; rows?: Row[]; error?: string }>;

/**
 * Junta as últimas execuções a cada fluxo do agendamento. Banco sem as tabelas de gestão (WSH mais antigo) ou falha
 * na leitura deixam o agendamento como estava, sem `runs`: a execução é um extra, não pode derrubar a ficha.
 */
export async function attachRuns(info: WshScheduleInfo, run: RunQuery): Promise<WshScheduleInfo> {
  const flowIds = [...new Set(info.flows.map((flow) => flow.id).filter((id): id is number => id !== undefined))];
  if (flowIds.length === 0) return info;
  const runsQuery = buildRunsQuery(flowIds);
  const runs = await run(runsQuery.sql, flowIds.length * RUNS_PER_FLOW, runsQuery.binds);
  if (!runs.success) return info;
  const runIds = (runs.rows ?? []).map((row) => Number(col(row, 'id'))).filter(Number.isFinite);
  let stepRows: Row[] = [];
  if (runIds.length > 0) {
    const stepsQuery = buildStepsQuery(runIds);
    const steps = await run(stepsQuery.sql, 500, stepsQuery.binds);
    if (steps.success) stepRows = steps.rows ?? [];
  }
  const byFlow = toFlowRuns(runs.rows ?? [], stepRows);
  return { ...info, flows: info.flows.map((flow) => (flow.id !== undefined ? { ...flow, runs: byFlow.get(flow.id) ?? [] } : flow)) };
}
