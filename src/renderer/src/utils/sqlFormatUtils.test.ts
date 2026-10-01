import { describe, expect, it } from 'vitest';
import { formatSql, getSqlMetrics } from './sqlFormatUtils';

describe('sqlFormatUtils', () => {
  it('formata query SQL inline aplicando quebras de linha nas cláusulas principais', () => {
    const rawSql = 'SELECT CODCLI, CLIENTE FROM PCCLIENT WHERE CODCLI = 10 AND BLOQUEIO = "N" ORDER BY CLIENTE';
    const formatted = formatSql(rawSql);

    expect(formatted).toContain('SELECT');
    expect(formatted).toContain('\nFROM PCCLIENT');
    expect(formatted).toContain('\nWHERE CODCLI = 10');
    expect(formatted).toContain('\n  AND BLOQUEIO = "N"');
    expect(formatted).toContain('\nORDER BY CLIENTE');
  });

  it('preserva strings literais intactas sem formatar o que estiver dentro delas', () => {
    const rawSql = "SELECT 'WHERE AND OR ORDER BY' AS TEXTO FROM DUAL WHERE ID = 1";
    const formatted = formatSql(rawSql);

    expect(formatted).toContain("'WHERE AND OR ORDER BY'");
    expect(formatted).toContain('\nFROM DUAL');
    expect(formatted).toContain('\nWHERE ID = 1');
  });

  it('preserva comentários intactos', () => {
    const rawSql = "-- comentário com SELECT e FROM\nSELECT 1 FROM DUAL";
    const formatted = formatSql(rawSql);

    expect(formatted).toContain('-- comentário com SELECT e FROM');
    expect(formatted).toContain('SELECT 1');
    expect(formatted).toContain('FROM DUAL');
  });

  it('calcula métricas de linhas, caracteres e cursor corretamente', () => {
    const sql = 'SELECT 1\nFROM DUAL\nWHERE 1 = 1';
    const metricsStart = getSqlMetrics(sql, 0);
    expect(metricsStart.lineCount).toBe(3);
    expect(metricsStart.charCount).toBe(sql.length);
    expect(metricsStart.currentLine).toBe(1);
    expect(metricsStart.currentColumn).toBe(1);

    // Na segunda linha: "SELECT 1\nF" -> length 9 + 1 = 10
    const metricsMid = getSqlMetrics(sql, 10);
    expect(metricsMid.currentLine).toBe(2);
    expect(metricsMid.currentColumn).toBe(2);
  });
});
