import type { ApiScenarioRunResult } from './apiScenarioTypes';

const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

/** Relatório de uma execução em Markdown, para o Jira. O corpo da resposta já vem com tokens mascarados. */
export function buildApiScenarioMarkdown(result: Omit<ApiScenarioRunResult, 'markdown'>): string {
  const passed = result.rules.filter((r) => r.passed).length;
  const verdict = result.error ? '❌ Não rodou' : result.success ? '✅ OK' : '❌ Falhou';
  const lines = [
    `## Validação de API: ${result.scenarioName}`,
    '',
    `- Requisição: \`${result.request.method} ${result.request.url}\``,
    `- Executado em: ${result.startedAt}`,
    `- Resultado: ${verdict}${result.error ? '' : ` (${passed} de ${result.rules.length} regras)`}`
  ];
  if (result.response) {
    const r = result.response;
    lines.push(`- Resposta: ${r.status ? `HTTP ${r.status}` : `sem resposta (${r.error ?? 'erro'})`} em ${r.durationMs} ms${r.isJson ? ' (JSON)' : ''}`);
  }
  if (result.error) lines.push('', `> ${result.error}`);
  if (result.rules.length > 0) {
    lines.push('', '| Regra | Esperado | Obtido | Resultado |', '|---|---|---|---|');
    for (const rule of result.rules) {
      lines.push(`| ${cell(rule.label)} | ${cell(rule.expected)} | ${cell(rule.actual)} | ${rule.passed ? '✅' : '❌'} |`);
    }
  }
  if (result.response?.body) {
    lines.push('', '<details><summary>Corpo da resposta</summary>', '', '```' + (result.response.isJson ? 'json' : ''), result.response.body, '```', '', '</details>');
  }
  return lines.join('\n');
}
