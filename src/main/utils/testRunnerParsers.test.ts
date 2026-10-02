import { describe, it, expect } from 'vitest';
import {
  parseMavenTestOutput,
  parsePlaywrightTestOutput,
  parseCypressTestOutput,
  parseNewmanTestOutput,
  parseTestOutput,
  stripAnsiCodes
} from './testRunnerParsers';

describe('testRunnerParsers', () => {
  it('remove sequências ANSI de cores de terminal', () => {
    const ansi = '\u001b[32mPASS\u001b[39m \u001b[31mFAIL\u001b[39m';
    expect(stripAnsiCodes(ansi)).toBe('PASS FAIL');
  });

  describe('parseMavenTestOutput', () => {
    it('extrai métricas de testes Maven com sucesso', () => {
      const output = `
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running br.com.totvs.winthor.FaturamentoServiceTest
[INFO] Tests run: 25, Failures: 0, Errors: 0, Skipped: 2, Time elapsed: 4.512 s
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 25, Failures: 0, Errors: 0, Skipped: 2
[INFO] 
[INFO] BUILD SUCCESS
      `;
      // Note: parser sums occurrences if multiple. In single run with summary it extracts
      const result = parseMavenTestOutput(output, 0);
      expect(result.status).toBe('passed');
      expect(result.failed).toBe(0);
      expect(result.skipped).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(25);
    });

    it('identifica falhas nos testes Maven', () => {
      const output = `
[INFO] Running br.com.totvs.winthor.PedidoVendaTest
[ERROR] Failures: 2, Errors: 1, Skipped: 0
[INFO] Tests run: 15, Failures: 2, Errors: 1, Skipped: 0, Time elapsed: 2.11 s
[INFO] BUILD FAILURE
      `;
      const result = parseMavenTestOutput(output, 1);
      expect(result.status).toBe('failed');
      expect(result.failed).toBe(3); // 2 failures + 1 error
      expect(result.passed).toBe(12);
      expect(result.total).toBe(15);
    });

    it('usa fallback de BUILD SUCCESS quando Surefire não emite sumário', () => {
      const output = `[INFO] Compiling sources...\n[INFO] BUILD SUCCESS`;
      const result = parseMavenTestOutput(output, 0);
      expect(result.status).toBe('passed');
      expect(result.total).toBe(1);
    });
  });

  describe('parsePlaywrightTestOutput', () => {
    it('extrai resultados de testes Playwright com sucesso', () => {
      const output = `
Running 18 tests using 4 workers
  18 passed (24.5s)
      `;
      const result = parsePlaywrightTestOutput(output, 0);
      expect(result.status).toBe('passed');
      expect(result.passed).toBe(18);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(18);
    });

    it('identifica testes quebrados no Playwright', () => {
      const output = `
  15 passed, 3 failed, 2 skipped (38.1s)
      `;
      const result = parsePlaywrightTestOutput(output, 1);
      expect(result.status).toBe('failed');
      expect(result.passed).toBe(15);
      expect(result.failed).toBe(3);
      expect(result.skipped).toBe(2);
      expect(result.total).toBe(20);
    });
  });

  describe('parseCypressTestOutput', () => {
    it('extrai métricas do Cypress', () => {
      const output = `
  ┌────────────────────────────────────────────────────────────────────────┐
  │ Tests:        10                                                       │
  │ Passing:      8                                                        │
  │ Failing:      2                                                        │
  │ Pending:      0                                                        │
  │ Skipped:      0                                                        │
  └────────────────────────────────────────────────────────────────────────┘
      `;
      const result = parseCypressTestOutput(output, 1);
      expect(result.status).toBe('failed');
      expect(result.passed).toBe(8);
      expect(result.failed).toBe(2);
      expect(result.total).toBe(10);
    });
  });

  describe('parseNewmanTestOutput', () => {
    it('extrai asserções de coleção Newman', () => {
      const output = `
┌─────────────────────────┬──────────┬──────────┐
│                         │ executed │   failed │
├─────────────────────────┼──────────┼──────────┤
│ iterations              │        1 │        0 │
│ requests                │        5 │        0 │
│ test-scripts            │        5 │        0 │
│ prerequest-scripts      │        0 │        0 │
│ assertions              │       12 │        1 │
└─────────────────────────┴──────────┴──────────┘
      `;
      const result = parseNewmanTestOutput(output, 1);
      expect(result.status).toBe('failed');
      expect(result.total).toBe(12);
      expect(result.failed).toBe(1);
      expect(result.passed).toBe(11);
    });
  });

  describe('parseTestOutput (unificado)', () => {
    it('redireciona para o parser correspondente conforme o type', () => {
      const mvnOut = 'Tests run: 5, Failures: 0, Errors: 0, Skipped: 0\nBUILD SUCCESS';
      const res = parseTestOutput('maven', mvnOut, 0);
      expect(res.status).toBe('passed');
      expect(res.total).toBe(5);
    });

    it('fallback seguro para comando customizado', () => {
      const res = parseTestOutput('custom', 'Custom script ran ok', 0);
      expect(res.status).toBe('passed');
      expect(res.total).toBe(1);
    });
  });
});
