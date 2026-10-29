import { describe, expect, it } from 'vitest';
import { analyzeLogText } from './logAnalyzerUtils';
import { analyzeWinthorLine, resolutionRootCause } from './logAnalyzerWinthor';
import { requirementFilter, requirementNamespace, stripBundleRevision } from './osgiRequirementText';

// Formato do winthor.log em runtime (nomes de bundles do produto, sem dado de cliente)
const CHAIN =
  'org.osgi.framework.BundleException: Unable to resolve winthor-financeiro-domain [835](R 835.0): missing requirement ' +
  '[winthor-financeiro-domain [835](R 835.0)] osgi.wiring.package; (&(osgi.wiring.package=br.com.pcsist.winthor.cliente.domain.ramoatividade)' +
  '(version>=0.0.0)(!(version>=1.0.0))) [caused by: Unable to resolve winthor-cliente-domain [833](R 833.0): missing requirement ' +
  '[winthor-cliente-domain [833](R 833.0)] osgi.wiring.package; (&(osgi.wiring.package=com.totvs.winthor.framework.jdbc)(version>=0.9.0)(!(version>=1.0.0)))]';

describe('texto de um missing requirement do Felix', () => {
  it('runtime: colchetes aninhados e filtro solto; feature:install: filter:="..."', () => {
    expect(stripBundleRevision('winthor-cliente-domain [833](R 833.0)')).toBe('winthor-cliente-domain');
    expect(requirementNamespace(CHAIN)).toBe('osgi.wiring.package');
    expect(requirementFilter(CHAIN)).toBe('(&(osgi.wiring.package=br.com.pcsist.winthor.cliente.domain.ramoatividade)(version>=0.0.0)(!(version>=1.0.0)))');
    expect(requirementFilter('missing requirement [root] osgi.identity; osgi.identity=x; filter:="(osgi.identity=x)"')).toBe('(osgi.identity=x)');
  });
});

describe('padrões do log do Karaf do WinThor', () => {
  it('cadeia de resolução: aponta o último elo (o pacote que ninguém exporta), não o primeiro bundle', () => {
    expect(resolutionRootCause(CHAIN)).toEqual({
      bundle: 'winthor-cliente-domain',
      missing: 'com.totvs.winthor.framework.jdbc',
      range: '[0.9.0, 1.0.0)',
      firstBundle: 'winthor-financeiro-domain'
    });
    const match = analyzeWinthorLine(CHAIN, 3)!;
    expect(match).toMatchObject({ type: 'BUNDLE', code: 'BUNDLE_ROOT', title: 'Falha de Resolução OSGi: falta com.totvs.winthor.framework.jdbc [0.9.0, 1.0.0)' });
    expect(match.explanation).toContain('winthor-financeiro-domain só falhou porque depende dele');
    expect(match.suggestedCommands[0]).toBe('package:exports | grep com.totvs.winthor.framework.jdbc');
  });

  it('HealthService em loop e ORA-00904 com a coluna e a tabela', () => {
    const health = "2026-06-03T14:38:55,022 | SYSTEM | ERROR | pool-35-thread-1 | HealthServiceImpl | 358 - ferramenta-servidor - 1.35.0.3 | Falha ao reiniciar o bundle 'winthor-cliente'";
    expect(analyzeWinthorLine(health, 0)).toMatchObject({ code: 'HEALTH_RESTART', title: 'HealthService não consegue reiniciar winthor-cliente' });

    const ora = 'bad SQL grammar [select nome, clientid from pcempr where matricula = ?]; nested exception is java.sql.SQLSyntaxErrorException: ORA-00904: "CLIENTID": invalid identifier';
    expect(analyzeWinthorLine(ora, 0)).toMatchObject({ type: 'ORA', code: 'ORA-00904', title: 'Coluna inexistente: CLIENTID (PCEMPR) (ORA-00904)' });
  });

  it('entra no analisador geral antes dos padrões genéricos e mantém as contagens', () => {
    const summary = analyzeLogText([CHAIN, 'ORA-00904: "TOK": invalid identifier', 'tudo certo']);
    expect(summary).toMatchObject({ totalErrors: 2, bundleErrorsCount: 1, oraErrorsCount: 1 });
    expect(summary.matches[1].title).toBe('Coluna inexistente: TOK (ORA-00904)');
  });
});
