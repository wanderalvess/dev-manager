import { authLockoutCheckDefinition } from './authLockoutCatalog';
import { describeRequest, describeResponse } from './authLockoutNarrative';
import type { AuthLockoutCheckStatus, AuthLockoutRunResult } from './authLockoutTypes';

export const AUTH_LOCKOUT_STATUS_LABELS: Record<AuthLockoutCheckStatus, string> = {
  pending: 'Pendente',
  running: 'Executando',
  passed: 'OK',
  failed: 'Falhou',
  warning: 'Atenção',
  info: 'Observado',
  manual: 'Manual',
  skipped: 'Não executada'
};

export const STATUS_ICON: Record<AuthLockoutCheckStatus, string> = {
  pending: '⏳',
  running: '⏳',
  passed: '✅',
  failed: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  manual: '✋',
  skipped: '➖'
};

const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

/** Relatório em Markdown para o Jira. Nunca carrega senha nem token: os trechos de corpo já vêm mascarados. */
export function buildAuthLockoutMarkdown(result: Omit<AuthLockoutRunResult, 'markdown'>): string {
  const counts = result.checks.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }), {});
  const lines: string[] = [
    '## Teste de bloqueio de login (WinThor)',
    '',
    `- Execução: \`${result.runId}\` — ${result.startedAt} → ${result.finishedAt}${result.aborted ? ' (interrompida)' : ''}`,
    `- WTA: ${result.baseUrl}`,
    `- API de logs: ${result.logsUrl}`,
    `- Log local: ${result.logFilePath || 'não configurado'}`,
    `- Resultado: ${Object.entries(counts)
      .map(([status, n]) => `${n} ${AUTH_LOCKOUT_STATUS_LABELS[status as AuthLockoutCheckStatus]}`)
      .join(', ')}`,
    ''
  ];
  if (result.error) lines.push(`> ${result.error}`, '');
  lines.push('| Checagem | Tentativa | O que verificar | Resultado | Observado |', '|---|---|---|---|---|');
  for (const check of result.checks) {
    const def = authLockoutCheckDefinition(check.id);
    lines.push(
      `| ${cell(check.title)} | ${cell(def.attempt)} | ${cell(def.expectation)} | ${STATUS_ICON[check.status]} ${AUTH_LOCKOUT_STATUS_LABELS[check.status]} | ${cell(check.summary)} |`
    );
  }
  const detailed = result.checks.filter((c) => c.evidence.length > 0 || c.plan);
  if (detailed.length > 0) {
    lines.push('', '### Como cada regra foi testada');
    for (const check of detailed) {
      lines.push('', `**${check.title}** — ${STATUS_ICON[check.status]} ${AUTH_LOCKOUT_STATUS_LABELS[check.status]}`);
      if (check.plan) lines.push('', `_Como foi testado:_ ${check.plan}`);
      lines.push('', `_Resultado:_ ${check.summary}`);
      if (check.evidence.length > 0) lines.push('', '_Evidências:_', ...check.evidence.map((e) => `- ${e}`));
    }
  }
  const steps = (result.log ?? []).filter((entry) => entry.level !== 'attempt');
  if (steps.length > 0) {
    const start = Date.parse(result.startedAt);
    lines.push('', '### Passo a passo', '');
    for (const entry of steps) {
      const offset = Number.isFinite(start) ? `\`+${((Date.parse(entry.at) - start) / 1000).toFixed(1)}s\` ` : '';
      lines.push(`- ${offset}${entry.message}`);
    }
  }
  if (result.attempts.length > 0) {
    lines.push('', '### Requisições', '', '| # | +s | Checagem | Requisição | Resposta do WTA | ms |', '|---|---|---|---|---|---|');
    for (const a of result.attempts) {
      lines.push(
        `| ${a.seq} | ${(a.offsetMs / 1000).toFixed(1)} | ${a.checkId} | ${cell(`${a.label} (${describeRequest(a)})`)} | ${cell(describeResponse(a))} | ${a.durationMs} |`
      );
    }
  }
  return lines.join('\n');
}
