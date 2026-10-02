import {
  QaAssertionExpectedType,
  QaAssertionResult,
  QaAssertionStatus,
  QaExecutionResult,
  QaRegressionAssertion
} from '../../shared/types';

/**
 * Normaliza um token ou expressão de asserção vindo da planilha ou do usuário.
 * Identifica tokens especiais como <S>, <N>, <0> e expressões JSONPath ($.foo).
 */
export function normalizeAssertionExpression(expr?: string): {
  type: QaAssertionExpectedType;
  value: string;
} {
  if (!expr || typeof expr !== 'string') {
    return { type: 'literal', value: '' };
  }

  const trimmed = expr.trim();

  if (trimmed === '<S>' || trimmed.toUpperCase() === '<PREENCHIDO>') {
    return { type: 'notNull', value: '' };
  }
  if (trimmed === '<N>' || trimmed.toUpperCase() === '<VAZIO>') {
    return { type: 'null', value: '' };
  }
  if (trimmed === '<0>' || trimmed === '<ZERO>') {
    return { type: 'zero', value: '0' };
  }
  if (trimmed.startsWith('$.')) {
    return { type: 'jsonPath', value: trimmed };
  }
  if (trimmed.startsWith('regex:')) {
    return { type: 'regex', value: trimmed.slice(6).trim() };
  }

  return { type: 'literal', value: trimmed };
}

/**
 * Remove anotações e marcadores da planilha de QA (ex: #D para data, !, !!, @ para notas)
 */
export function cleanJsonPathExpression(path: string): { cleanPath: string; isDate: boolean } {
  let p = path.trim();
  const isDate = p.includes('#D');
  p = p.replace(/#D/g, '');
  p = p.replace(/[!@]+$/g, '');
  return { cleanPath: p.trim(), isDate };
}

/**
 * Extrai um valor de um objeto JSON baseado em uma sintaxe amigável de JSONPath.
 * Suporta notações aninhadas ($.a.b), arrays indexados ($.itens[0].id) e coringas ($.itens[*].id).
 */
export function extractJsonPath(obj: any, rawPath: string, targetRowIndex = 0): any {
  if (obj === null || obj === undefined || !rawPath) return undefined;

  const { cleanPath, isDate } = cleanJsonPathExpression(rawPath);
  let pathStr = cleanPath;
  if (pathStr.startsWith('$.')) {
    pathStr = pathStr.slice(2);
  } else if (pathStr.startsWith('$')) {
    pathStr = pathStr.slice(1);
  }

  // Normaliza segmentos: "produtos.[*].qt" -> "produtos[*].qt" -> ["produtos", "[*]", "qt"]
  const parts = pathStr
    .replace(/\[(\*|\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);

  let current: any = obj;

  for (let i = 0; i < parts.length; i++) {
    if (current === null || current === undefined) return undefined;

    const part = parts[i];

    if (part === '*') {
      // Coringa de array: seleciona elemento baseado no índice da linha
      if (Array.isArray(current)) {
        const idx = targetRowIndex >= 0 && targetRowIndex < current.length ? targetRowIndex : 0;
        current = current[idx];
      } else {
        return undefined;
      }
    } else if (/^\d+$/.test(part)) {
      const idx = parseInt(part, 10);
      if (Array.isArray(current)) {
        current = current[idx];
      } else {
        return undefined;
      }
    } else {
      if (typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
  }

  if (isDate && current !== undefined && current !== null) {
    return formatDateValue(current);
  }

  return current;
}

/**
 * Formata um valor de data para YYYY-MM-DD
 */
export function formatDateValue(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  // Se for ISO ou formato DD/MM/YYYY ou YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    const [dd, mm, yyyy] = s.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  return s;
}

/**
 * Converte valor para exibição amigável em telas e relatórios
 */
export function formatValueForDisplay(val: any): string {
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
 * Compara dois valores de forma tolerante a representação de número, booleano e datas
 */
export function areValuesEquivalent(actual: any, expected: any): boolean {
  if (actual === expected) return true;

  if ((actual === null || actual === undefined) && (expected === null || expected === undefined)) {
    return true;
  }
  if (actual === null || actual === undefined || expected === null || expected === undefined) {
    return false;
  }

  // Comparação numérica tolerante (ex: 768.7 === 768.70, ou "100" === 100)
  const numActual = typeof actual === 'number' ? actual : Number(String(actual).replace(',', '.'));
  const numExpected = typeof expected === 'number' ? expected : Number(String(expected).replace(',', '.'));

  if (!isNaN(numActual) && !isNaN(numExpected) && typeof actual !== 'boolean' && typeof expected !== 'boolean') {
    return Math.abs(numActual - numExpected) < 0.0001;
  }

  // Comparação de booleano vs WinThor flag 'S'/'N'
  const strActual = String(actual).trim().toUpperCase();
  const strExpected = String(expected).trim().toUpperCase();

  if (strActual === strExpected) return true;

  if ((strActual === 'S' && strExpected === 'TRUE') || (strActual === 'TRUE' && strExpected === 'S')) return true;
  if ((strActual === 'N' && strExpected === 'FALSE') || (strActual === 'FALSE' && strExpected === 'N')) return true;

  // Comparação de data
  const dateActual = formatDateValue(actual);
  const dateExpected = formatDateValue(expected);
  if (dateActual && dateExpected && dateActual === dateExpected) return true;

  return false;
}

/**
 * Avalia uma asserção individual de coluna contra o valor obtido do banco
 */
export function evaluateSingleAssertion(
  actualValue: any,
  assertion: QaRegressionAssertion,
  jsonContext?: any,
  rowIndex = 0
): QaAssertionResult {
  const norm = normalizeAssertionExpression(assertion.expectedValue);
  const expectedType = assertion.expectedType || norm.type;
  let targetExpectedValue: any = norm.value;

  if (expectedType === 'jsonPath') {
    if (jsonContext) {
      targetExpectedValue = extractJsonPath(jsonContext, norm.value, rowIndex);
    } else {
      return {
        assertionId: assertion.id,
        column: assertion.column,
        expectedType,
        expectedValue: norm.value,
        expectedDisplay: `JSONPath: ${norm.value} (JSON não fornecido)`,
        actualValue,
        actualDisplay: formatValueForDisplay(actualValue),
        status: 'warning',
        message: 'JSON de payload não informado para resolver o JSONPath.',
        rowIndex
      };
    }
  }

  const actualDisplay = formatValueForDisplay(actualValue);
  let status: QaAssertionStatus = 'passed';
  let message: string | undefined;

  switch (expectedType) {
    case 'notNull': {
      const isPresent =
        actualValue !== null &&
        actualValue !== undefined &&
        String(actualValue).trim() !== '' &&
        String(actualValue).trim().toUpperCase() !== 'NULL';
      if (!isPresent) {
        status = 'failed';
        message = 'Esperado valor preenchido (<S>), mas a coluna está NULL ou vazia.';
      }
      return {
        assertionId: assertion.id,
        column: assertion.column,
        expectedType,
        expectedValue: '<S>',
        expectedDisplay: '<S> (Preenchido)',
        actualValue,
        actualDisplay,
        status,
        message,
        rowIndex
      };
    }

    case 'null': {
      const isAbsent =
        actualValue === null ||
        actualValue === undefined ||
        String(actualValue).trim() === '' ||
        String(actualValue).trim().toUpperCase() === 'N' ||
        String(actualValue).trim().toUpperCase() === 'NULL';
      if (!isAbsent) {
        status = 'failed';
        message = `Esperado nulo/vazio (<N>), mas a coluna retornou: ${actualDisplay}.`;
      }
      return {
        assertionId: assertion.id,
        column: assertion.column,
        expectedType,
        expectedValue: '<N>',
        expectedDisplay: '<N> (Vazio/Null)',
        actualValue,
        actualDisplay,
        status,
        message,
        rowIndex
      };
    }

    case 'zero': {
      const num = Number(actualValue);
      if (isNaN(num) || num !== 0) {
        status = 'failed';
        message = `Esperado valor zero (<0>), mas a coluna retornou: ${actualDisplay}.`;
      }
      return {
        assertionId: assertion.id,
        column: assertion.column,
        expectedType,
        expectedValue: 0,
        expectedDisplay: '<0> (Zero)',
        actualValue,
        actualDisplay,
        status,
        message,
        rowIndex
      };
    }

    case 'regex': {
      try {
        const regex = new RegExp(targetExpectedValue);
        const matches = regex.test(String(actualValue ?? ''));
        if (!matches) {
          status = 'failed';
          message = `Valor não correspondeu à regex /${targetExpectedValue}/.`;
        }
      } catch (err: any) {
        status = 'warning';
        message = `Expressão regular inválida: ${err.message}`;
      }
      return {
        assertionId: assertion.id,
        column: assertion.column,
        expectedType,
        expectedValue: targetExpectedValue,
        expectedDisplay: `Regex: /${targetExpectedValue}/`,
        actualValue,
        actualDisplay,
        status,
        message,
        rowIndex
      };
    }

    case 'jsonPath':
    case 'literal':
    default: {
      const passed = areValuesEquivalent(actualValue, targetExpectedValue);
      if (!passed) {
        status = 'failed';
        message = `Divergência: esperado "${formatValueForDisplay(targetExpectedValue)}", mas o banco retornou "${actualDisplay}".`;
      }
      return {
        assertionId: assertion.id,
        column: assertion.column,
        expectedType,
        expectedValue: targetExpectedValue,
        expectedDisplay: formatValueForDisplay(targetExpectedValue),
        actualValue,
        actualDisplay,
        status,
        message,
        rowIndex
      };
    }
  }
}

/**
 * Extrai nomes de binds (:variavel) de um comando SQL
 */
export function extractBindsFromSql(sql: string): string[] {
  if (!sql) return [];
  // Procura por :nomeVariavel excluindo :: (cast postgresql)
  const matches = sql.match(/(?<!:):([a-zA-Z_][a-zA-Z0-9_]*)/g);
  if (!matches) return [];
  const set = new Set<string>();
  for (const m of matches) {
    set.add(m.slice(1));
  }
  return Array.from(set);
}

/**
 * Localiza case-insensitively uma chave num objeto de linha retornado pelo banco
 */
export function getColumnValueFromRow(row: Record<string, any>, colName: string): any {
  if (!row || typeof row !== 'object') return undefined;
  if (colName in row) return row[colName];

  const targetUpper = colName.toUpperCase();
  for (const [key, val] of Object.entries(row)) {
    if (key.toUpperCase() === targetUpper) {
      return val;
    }
  }
  return undefined;
}

/**
 * Gera relatório formatado em Markdown para documentação de evidência no Jira / Confluence / Teams
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
