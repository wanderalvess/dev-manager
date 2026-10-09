import { describe, expect, it } from 'vitest';
import { analyzeLogLine, analyzeLogText } from './logAnalyzerUtils';

describe('logAnalyzerUtils', () => {
  describe('analyzeLogLine', () => {
    it('detecta erro ORA-00942 de tabela inexistente e sugere comandos', () => {
      const line = 'java.sql.SQLSyntaxErrorException: ORA-00942: table or view does not exist';
      const match = analyzeLogLine(line, 10);

      expect(match).not.toBeNull();
      expect(match?.type).toBe('ORA');
      expect(match?.code).toBe('ORA-00942');
      expect(match?.title).toContain('Tabela ou View Inexistente');
      expect(match?.suggestedCommands.some((c) => c.includes('ALL_TABLES'))).toBe(true);
    });

    it('detecta erro ORA-00001 de chave única', () => {
      const line = 'Error executing SQL: ORA-00001: unique constraint (PCADMIN.PK_CLIENTE) violated';
      const match = analyzeLogLine(line, 5);

      expect(match).not.toBeNull();
      expect(match?.type).toBe('ORA');
      expect(match?.code).toBe('ORA-00001');
      expect(match?.title).toContain('Violação de Restrição Única');
    });

    it('detecta NullPointerException com extração de contexto', () => {
      const line = 'java.lang.NullPointerException: at br.com.totvs.winthor.faturamento.CalculoImpostoService.calcular(CalculoImpostoService.java:142)';
      const match = analyzeLogLine(line, 22);

      expect(match).not.toBeNull();
      expect(match?.type).toBe('NPE');
      expect(match?.code).toBe('NPE');
      expect(match?.title).toContain('NullPointerException');
      expect(match?.title).toContain('CalculoImpostoService.calcular()');
      expect(match?.suggestedCommands).toContain('log:display -n 200');
    });

    it('detecta BundleException / Falha de Resolução OSGi', () => {
      const line = 'org.osgi.framework.BundleException: Unable to resolve in bundle br.com.totvs.winthor.rotina: missing requirement [package=br.com.totvs.core]';
      const match = analyzeLogLine(line, 45);

      expect(match).not.toBeNull();
      expect(match?.type).toBe('BUNDLE');
      expect(match?.title).toContain('Falha de Resolução OSGi');
      expect(match?.suggestedCommands).toContain('bundle:diag');
    });

    it('detecta OutOfMemoryError no Karaf', () => {
      const line = 'java.lang.OutOfMemoryError: Java heap space';
      const match = analyzeLogLine(line, 99);

      expect(match).not.toBeNull();
      expect(match?.type).toBe('OOM');
      expect(match?.code).toBe('OOM');
      expect(match?.title).toContain('OutOfMemoryError: Java heap space');
      expect(match?.suggestedCommands.some((c) => c.includes('system:gc'))).toBe(true);
    });

    it('retorna null para linhas normais de log ou info', () => {
      expect(analyzeLogLine('2026-09-29 10:00:00 [INFO] Service started successfully', 1)).toBeNull();
      expect(analyzeLogLine('', 2)).toBeNull();
    });
  });

  describe('analyzeLogText', () => {
    it('processa múltiplas linhas e agrega estatísticas por tipo de erro', () => {
      const sampleLogs = `
2026-09-29 10:00:01 [INFO] Initializing Karaf container
2026-09-29 10:00:02 [ERROR] ORA-00942: table or view does not exist in query SELECT * FROM PCPROD
2026-09-29 10:00:03 [WARN] Slow query detected
2026-09-29 10:00:04 [ERROR] java.lang.NullPointerException at com.app.Service.run(Service.java:50)
2026-09-29 10:00:05 [ERROR] org.osgi.framework.BundleException: Unsatisfied requirement
2026-09-29 10:00:06 [FATAL] java.lang.OutOfMemoryError: Metaspace
`;
      const summary = analyzeLogText(sampleLogs);

      expect(summary.totalErrors).toBe(4);
      expect(summary.oraErrorsCount).toBe(1);
      expect(summary.npeCount).toBe(1);
      expect(summary.bundleErrorsCount).toBe(1);
      expect(summary.oomCount).toBe(1);
      expect(summary.matches.length).toBe(4);
    });
  });
});
