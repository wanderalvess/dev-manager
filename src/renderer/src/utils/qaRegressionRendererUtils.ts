import {
  QaExecutionResult,
  QaStepExecutionResult
} from '../../../shared/types';

/**
 * Tenta fazer parse do payload JSON e extrair valores de chaves comuns
 * frequentemente usadas como filtros em queries do WinThor.
 */
export function autoExtractVariablesFromJson(rawJson: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!rawJson || typeof rawJson !== 'string') return result;

  try {
    const parsed = JSON.parse(rawJson.trim());
    if (typeof parsed !== 'object' || parsed === null) return result;

    const findKeyRecursive = (obj: any, targetKey: string): any => {
      if (!obj || typeof obj !== 'object') return undefined;
      const lower = targetKey.toLowerCase();
      for (const [k, v] of Object.entries(obj)) {
        if (k.toLowerCase() === lower && typeof v !== 'object') {
          return v;
        }
      }
      for (const val of Object.values(obj)) {
        if (typeof val === 'object' && val !== null) {
          const found = findKeyRecursive(val, targetKey);
          if (found !== undefined) return found;
        }
      }
      return undefined;
    };

    const commonKeys = [
      'codFilial',
      'filial',
      'numCupom',
      'numNota',
      'numPed',
      'numPedEcf',
      'numCaixa',
      'chaveNfe',
      'chaveSefaz',
      'codCob',
      'codEmitente',
      'numFechamentoMovCx',
      'vlTotal'
    ];

    for (const key of commonKeys) {
      const val = findKeyRecursive(parsed, key);
      if (val !== undefined && val !== null) {
        result[key] = String(val);
      }
    }
  } catch {
    // Retorna vazio caso o JSON ainda esteja incompleto/inválido durante a digitação
  }

  return result;
}

/**
 * Filtra os passos executados por status e termo de busca
 */
export function filterStepResults(
  steps: QaStepExecutionResult[] = [],
  statusFilter: 'all' | 'failed' | 'passed',
  searchTerm = ''
): QaStepExecutionResult[] {
  const term = searchTerm.trim().toLowerCase();

  return steps.filter((step) => {
    // Filtro de status
    if (statusFilter === 'failed' && step.success) return false;
    if (statusFilter === 'passed' && !step.success) return false;

    // Filtro de busca textual
    if (!term) return true;

    const matchTitle = step.stepTitle.toLowerCase().includes(term);
    const matchTable = (step.tableName || '').toLowerCase().includes(term);
    const matchQuery = step.query.toLowerCase().includes(term);
    const matchAssertions = step.assertions.some(
      (a) =>
        a.column.toLowerCase().includes(term) ||
        (a.expectedDisplay || '').toLowerCase().includes(term) ||
        (a.actualDisplay || '').toLowerCase().includes(term) ||
        (a.message || '').toLowerCase().includes(term)
    );

    return matchTitle || matchTable || matchQuery || matchAssertions;
  });
}

/**
 * Formata evidência Markdown compacta para o Jira
 */
export function buildJiraEvidenceClipboardText(
  result: QaExecutionResult,
  issueKey?: string
): string {
  const lines: string[] = [];
  const dt = new Date(result.timestamp).toLocaleString('pt-BR');
  const issueTag = issueKey ? `[${issueKey.trim().toUpperCase()}] ` : '';

  lines.push(`h2. ${issueTag}Evidência Regressiva WinThor: ${result.templateName}`);
  lines.push(`*Executado em:* ${dt} | *Tempo total:* ${result.durationMs}ms`);
  lines.push(
    `*Status:* ${
      result.success ? '{color:green}*APROVADO (100% Conforme)*{color}' : '{color:red}*DIVERGÊNCIA ENCONTRADA*{color}'
    }`
  );
  lines.push(
    `*Totais:* ${result.totalAssertions} asserções (${result.passedAssertions} aprovadas, ${result.failedAssertions} divergentes, ${result.warningAssertions} alertas)`
  );
  lines.push('');

  lines.push('||Tabela / Etapa||Coluna||Esperado||Retornado no Banco||Status||Motivo / Detalhes||');

  for (const step of result.stepResults) {
    const table = step.tableName ? `[${step.tableName}] ` : '';
    if (step.error) {
      lines.push(`|${table}${step.stepTitle}|-| - | - |{color:red}ERRO{color}|${step.error}|`);
      continue;
    }
    for (const ass of step.assertions) {
      const statusText =
        ass.status === 'passed'
          ? '{color:green}PASSOU{color}'
          : ass.status === 'failed'
            ? '{color:red}FALHOU{color}'
            : '{color:orange}ALERTA{color}';
      lines.push(
        `|${table}${step.stepTitle}|${ass.column}|${ass.expectedDisplay}|${ass.actualDisplay}|${statusText}|${ass.message || '-'}|`
      );
    }
  }

  return lines.join('\n');
}

/**
 * Extrai nomes de binds (:variavel) de um comando SQL
 */
export function extractBindsFromSql(sql: string): string[] {
  if (!sql) return [];
  const matches = sql.match(/(?<!:):([a-zA-Z_][a-zA-Z0-9_]*)/g);
  if (!matches) return [];
  const set = new Set<string>();
  for (const m of matches) {
    set.add(m.slice(1));
  }
  return Array.from(set);
}

/**
 * Converte valor para exibição amigável
 */
function formatValueForDisplay(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

/**
 * Gera relatório formatado em Markdown para documentação de evidência no Jira / Confluence
 */
export function generateMarkdownEvidence(
  result: QaExecutionResult,
  options?: { issueKey?: string; includeSql?: boolean }
): string {
  const lines: string[] = [];
  const dt = new Date(result.timestamp).toLocaleString('pt-BR');
  const issuePrefix = options?.issueKey ? `[${options.issueKey}] ` : '';

  lines.push(`## ${issuePrefix}Evidência de Homologação Regressiva — ${result.templateName}`);
  lines.push(`**Data de Execução:** ${dt} | **Tempo total:** ${result.durationMs}ms`);
  lines.push('');

  const statusBadge = result.success ? '🟢 APROVADO' : '🔴 DIVERGÊNCIA DETECTADA';
  lines.push(`### Status Geral: ${statusBadge}`);
  lines.push(`- **Total de Asserções:** ${result.totalAssertions}`);
  lines.push(`- **Passaram:** ${result.passedAssertions} ✅`);
  lines.push(`- **Falharam:** ${result.failedAssertions} ❌`);
  if (result.warningAssertions > 0) {
    lines.push(`- **Alertas / Avisos:** ${result.warningAssertions} ⚠️`);
  }
  lines.push('');

  if (Object.keys(result.extractedVariables).length > 0) {
    lines.push('#### Parâmetros e Variáveis Identificadas:');
    lines.push('| Parâmetro | Valor |');
    lines.push('| :--- | :--- |');
    for (const [k, v] of Object.entries(result.extractedVariables)) {
      lines.push(`| \`${k}\` | \`${formatValueForDisplay(v)}\` |`);
    }
    lines.push('');
  }

  lines.push('### Detalhamento por Tabela & Consulta');
  lines.push('');

  for (const step of result.stepResults) {
    const tableTitle = step.tableName ? `[${step.tableName}] ` : '';
    const stepIcon = step.success ? '✅' : '❌';
    lines.push(`#### ${stepIcon} ${tableTitle}${step.stepTitle} (${step.executionTimeMs}ms)`);

    if (step.error) {
      lines.push(`> ⚠️ **Erro na Execução da Query:** \`${step.error}\``);
      lines.push('');
      continue;
    }

    if (options?.includeSql && step.interpolatedQuery) {
      lines.push('```sql');
      lines.push(step.interpolatedQuery);
      lines.push('```');
      lines.push('');
    }

    if (step.assertions.length > 0) {
      lines.push('| Coluna / Validação | Esperado | Retornado no Banco | Status | Observação |');
      lines.push('| :--- | :--- | :--- | :---: | :--- |');

      for (const ass of step.assertions) {
        const icon =
          ass.status === 'passed' ? '✅ OK' : ass.status === 'failed' ? '❌ FALHA' : '⚠️ AVISO';
        const msg = ass.message ? ass.message.replace(/\|/g, '\\|') : '-';
        lines.push(
          `| \`${ass.column}\` | \`${ass.expectedDisplay}\` | \`${ass.actualDisplay}\` | ${icon} | ${msg} |`
        );
      }
      lines.push('');
    } else {
      lines.push(`*${step.rowCount} registro(s) retornado(s). Nenhuma asserção configurada.*`);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('*Gerado automaticamente pelo Dev Manager — Módulo de Qualidade & Regressivo*');

  return lines.join('\n');
}
