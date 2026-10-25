import {
  INTEGRATION_STEP_LABELS,
  type IntegrationStepStatus,
  type IntegrationTraceResult,
  type IntegrationTraceStep
} from '../../../shared/integrationTypes';
import { stepPosition } from './traceTimeline';

/**
 * Relatório do rastreio em Markdown para colar no Jira (decisão 0003), no mesmo espírito da
 * evidência do Validador Regressivo. Função pura: recebe o resultado pronto e devolve texto.
 */

const STATUS_LABELS: Readonly<Record<IntegrationStepStatus, string>> = {
  ok: '✅ ok',
  failed: '❌ falhou',
  pending: '⏳ pendente',
  skipped: '⏭️ pulado',
  unknown: '❔ sem evidência'
};

const SOURCE_LABELS: Readonly<Record<IntegrationTraceStep['source'], string>> = {
  'ch-api': 'API do CH',
  apm: 'APM',
  log: 'log',
  sql: 'SQL',
  http: 'HTTP',
  none: '-'
};

function formatDateTime(epochMs: number | undefined): string {
  if (!epochMs) return '-';
  return new Date(epochMs).toLocaleString('pt-BR');
}

function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return '-';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1).replace('.', ',')} s` : `${ms} ms`;
}

/** Células de tabela Markdown não podem ter `|` nem quebra de linha. */
function cell(value: string | number | undefined): string {
  if (value === undefined || value === '') return '-';
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function buildStepsTable(steps: IntegrationTraceStep[]): string {
  const header = '| # | Passo | Status | Fonte | HTTP | Itens | Duração | Observação |';
  const divider = '|---|-------|--------|-------|------|-------|---------|------------|';
  const rows = steps.map((step) =>
    [
      stepPosition(step.id),
      INTEGRATION_STEP_LABELS[step.id],
      STATUS_LABELS[step.status],
      SOURCE_LABELS[step.source],
      cell(step.httpStatus),
      cell(step.itemCount),
      formatDuration(step.durationMs),
      cell(step.message)
    ].join(' | ')
  );
  return [header, divider, ...rows.map((row) => `| ${row} |`)].join('\n');
}

function buildBrokenSection(trace: Pick<IntegrationTraceResult, 'brokenAt' | 'steps'>): string[] {
  if (!trace.brokenAt) return ['**Resultado:** todos os passos observados concluíram sem falha.'];
  const step = trace.steps.find((s) => s.id === trace.brokenAt);
  const lines = [`**Quebrou no passo ${stepPosition(trace.brokenAt)}: ${INTEGRATION_STEP_LABELS[trace.brokenAt]}**`];
  if (step?.message) lines.push('', step.message);
  if (step?.evidence) lines.push('', '```', step.evidence.trim(), '```');
  return lines;
}

export function buildTraceEvidenceMarkdown(trace: Omit<IntegrationTraceResult, 'evidenceMarkdown'>): string {
  const title = trace.flowName ? `Rastreio de Integração: ${trace.flowName}` : 'Rastreio de Integração';
  const totalMs = trace.finishedAt ? trace.finishedAt - trace.startedAt : undefined;
  const lines = [
    `## ${title}`,
    '',
    `- **Lote:** ${trace.batchNumber || 'não identificado'}`,
    `- **Início:** ${formatDateTime(trace.startedAt)}`,
    `- **Fim:** ${formatDateTime(trace.finishedAt)}`,
    `- **Duração total:** ${formatDuration(totalMs)}`,
    '',
    ...buildBrokenSection(trace),
    '',
    buildStepsTable(trace.steps),
    '',
    '_Gerado pelo Hub Manager (Rastreio de Integração)._'
  ];
  return lines.join('\n');
}
