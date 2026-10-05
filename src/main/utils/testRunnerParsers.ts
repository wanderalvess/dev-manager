import { TestRunnerType } from '../../shared/types';

export interface ParsedTestCounts {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  status: 'passed' | 'failed' | 'aborted';
  summaryMessage: string;
}

/**
 * Remove sequências de escape ANSI (cores, cursores) da saída de logs do terminal.
 */
export function stripAnsiCodes(text: string): string {
  if (!text) return '';
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u001b\x1b]\[[0-9;]*[a-zA-Z]/g, '').replace(/\[[0-9;]+m/g, '');
}

/**
 * Extrai métricas de testes Maven / Surefire / Failsafe.
 * Suporta builds monorepo / multi-módulos somando ocorrências de 'Tests run: X, Failures: Y...'.
 */
export function parseMavenTestOutput(cleanText: string, exitCode: number): ParsedTestCounts {
  const regex = /Tests run:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+),\s*Skipped:\s*(\d+)/gi;
  let match: RegExpExecArray | null;

  let totalTests = 0;
  let failures = 0;
  let errors = 0;
  let skipped = 0;
  let matchFound = false;

  while ((match = regex.exec(cleanText)) !== null) {
    matchFound = true;
    totalTests += parseInt(match[1], 10);
    failures += parseInt(match[2], 10);
    errors += parseInt(match[3], 10);
    skipped += parseInt(match[4], 10);
  }

  const failedCount = failures + errors;
  const passedCount = Math.max(0, totalTests - failedCount - skipped);

  if (matchFound && totalTests > 0) {
    const isSuccess = exitCode === 0 && failedCount === 0;
    return {
      total: totalTests,
      passed: passedCount,
      failed: failedCount,
      skipped,
      status: isSuccess ? 'passed' : 'failed',
      summaryMessage: isSuccess
        ? `${passedCount} testes Maven passaram com sucesso (${skipped} ignorados).`
        : `Falha em ${failedCount} testes Maven (${passedCount} passaram, ${skipped} ignorados).`
    };
  }

  // Fallback caso Surefire não tenha emitido o sumário padrão
  const buildSuccess = cleanText.includes('BUILD SUCCESS') && exitCode === 0;
  return {
    total: buildSuccess ? 1 : 1,
    passed: buildSuccess ? 1 : 0,
    failed: buildSuccess ? 0 : 1,
    skipped: 0,
    status: buildSuccess ? 'passed' : 'failed',
    summaryMessage: buildSuccess
      ? 'Build e testes Maven executados com sucesso.'
      : `Falha na execução do Maven (Código de saída ${exitCode}).`
  };
}

/**
 * Extrai métricas de execução do Playwright (ex: "15 passed, 2 failed, 1 skipped (42s)").
 */
export function parsePlaywrightTestOutput(cleanText: string, exitCode: number): ParsedTestCounts {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let found = false;

  // Procura por "X passed"
  const passedMatch = cleanText.match(/(\d+)\s+passed/i);
  if (passedMatch) {
    passed = parseInt(passedMatch[1], 10);
    found = true;
  }

  // Procura por "X failed"
  const failedMatch = cleanText.match(/(\d+)\s+failed/i);
  if (failedMatch) {
    failed = parseInt(failedMatch[1], 10);
    found = true;
  }

  // Procura por "X skipped"
  const skippedMatch = cleanText.match(/(\d+)\s+skipped/i);
  if (skippedMatch) {
    skipped = parseInt(skippedMatch[1], 10);
    found = true;
  }

  const total = passed + failed + skipped;

  if (found && total > 0) {
    const isSuccess = exitCode === 0 && failed === 0;
    return {
      total,
      passed,
      failed,
      skipped,
      status: isSuccess ? 'passed' : 'failed',
      summaryMessage: isSuccess
        ? `${passed} cenários Playwright passaram com sucesso (${skipped} ignorados).`
        : `${failed} cenários Playwright falharam (${passed} passaram, ${skipped} ignorados).`
    };
  }

  const isSuccess = exitCode === 0;
  return {
    total: 1,
    passed: isSuccess ? 1 : 0,
    failed: isSuccess ? 0 : 1,
    skipped: 0,
    status: isSuccess ? 'passed' : 'failed',
    summaryMessage: isSuccess
      ? 'Playwright finalizado com sucesso.'
      : `Falha na execução do Playwright (Código de saída ${exitCode}).`
  };
}

/**
 * Extrai métricas de execução do Cypress (ex: "Passing: 12", "Failing: 2", "Pending: 1").
 */
export function parseCypressTestOutput(cleanText: string, exitCode: number): ParsedTestCounts {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let found = false;

  const passingMatch = cleanText.match(/Passing:\s*(\d+)/i);
  if (passingMatch) {
    passed = parseInt(passingMatch[1], 10);
    found = true;
  }

  const failingMatch = cleanText.match(/Failing:\s*(\d+)/i);
  if (failingMatch) {
    failed = parseInt(failingMatch[1], 10);
    found = true;
  }

  const pendingMatch = cleanText.match(/(?:Pending|Skipped):\s*(\d+)/i);
  if (pendingMatch) {
    skipped = parseInt(pendingMatch[1], 10);
    found = true;
  }

  const total = passed + failed + skipped;

  if (found && total > 0) {
    const isSuccess = exitCode === 0 && failed === 0;
    return {
      total,
      passed,
      failed,
      skipped,
      status: isSuccess ? 'passed' : 'failed',
      summaryMessage: isSuccess
        ? `${passed} testes Cypress concluídos com sucesso (${skipped} pendentes).`
        : `${failed} testes Cypress falharam (${passed} passaram).`
    };
  }

  const isSuccess = exitCode === 0;
  return {
    total: 1,
    passed: isSuccess ? 1 : 0,
    failed: isSuccess ? 0 : 1,
    skipped: 0,
    status: isSuccess ? 'passed' : 'failed',
    summaryMessage: isSuccess
      ? 'Cypress finalizado com sucesso.'
      : `Falha na execução do Cypress (Código de saída ${exitCode}).`
  };
}

/**
 * Extrai métricas de execução do Newman (Postman CLI).
 * Ex: "assertions  |  25  |  2" ou sumários de requisições.
 */
export function parseNewmanTestOutput(cleanText: string, exitCode: number): ParsedTestCounts {
  let total = 0;
  let failed = 0;
  let found = false;

  // Procura por tabela do newman: "assertions | total | failed"
  const assertionRowMatch = cleanText.match(/assertions\s*[│|]\s*(\d+)\s*[│|]\s*(\d+)/i);
  if (assertionRowMatch) {
    total = parseInt(assertionRowMatch[1], 10);
    failed = parseInt(assertionRowMatch[2], 10);
    found = true;
  } else {
    // Procura por "requests | total | failed"
    const reqMatch = cleanText.match(/requests\s*[│|]\s*(\d+)\s*[│|]\s*(\d+)/i);
    if (reqMatch) {
      total = parseInt(reqMatch[1], 10);
      failed = parseInt(reqMatch[2], 10);
      found = true;
    }
  }

  if (found && total > 0) {
    const passed = Math.max(0, total - failed);
    const isSuccess = exitCode === 0 && failed === 0;
    return {
      total,
      passed,
      failed,
      skipped: 0,
      status: isSuccess ? 'passed' : 'failed',
      summaryMessage: isSuccess
        ? `${passed} asserções/requisições da coleção Newman passaram com sucesso.`
        : `${failed} falhas em asserções da coleção Newman (${passed} passaram).`
    };
  }

  const isSuccess = exitCode === 0;
  return {
    total: 1,
    passed: isSuccess ? 1 : 0,
    failed: isSuccess ? 0 : 1,
    skipped: 0,
    status: isSuccess ? 'passed' : 'failed',
    summaryMessage: isSuccess
      ? 'Coleção Newman executada com sucesso.'
      : `Falha na coleção Newman (Código de saída ${exitCode}).`
  };
}

/**
 * Parser unificado para qualquer saída de runner de testes.
 */
export function parseTestOutput(
  type: TestRunnerType,
  rawOutput: string,
  exitCode: number
): ParsedTestCounts {
  const clean = stripAnsiCodes(rawOutput);

  switch (type) {
    case 'maven':
      return parseMavenTestOutput(clean, exitCode);
    case 'playwright':
      return parsePlaywrightTestOutput(clean, exitCode);
    case 'cypress':
      return parseCypressTestOutput(clean, exitCode);
    case 'newman':
      return parseNewmanTestOutput(clean, exitCode);
    case 'custom':
    default: {
      // Tenta detectar padrões de Maven ou Playwright mesmo em comandos customizados
      if (/Tests run:\s*\d+/i.test(clean)) {
        return parseMavenTestOutput(clean, exitCode);
      }
      if (/\d+\s+passed/i.test(clean)) {
        return parsePlaywrightTestOutput(clean, exitCode);
      }
      const isSuccess = exitCode === 0;
      return {
        total: 1,
        passed: isSuccess ? 1 : 0,
        failed: isSuccess ? 0 : 1,
        skipped: 0,
        status: isSuccess ? 'passed' : 'failed',
        summaryMessage: isSuccess
          ? 'Comando de teste customizado executado com sucesso (Código 0).'
          : `Comando de teste falhou com código de saída ${exitCode}.`
      };
    }
  }
}
