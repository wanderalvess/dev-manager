import { describe, it, expect } from 'vitest';
import { buildOsgiDiagnosticExplanation } from './osgiDiagnosticUtils';

describe('osgiDiagnosticUtils', () => {
  it('gera explicação clara de causa e solução quando há perfil de deploy mapeado', () => {
    const explanation = buildOsgiDiagnosticExplanation({
      failingBundle: 'winthor-pedido-venda-service',
      missingItem: 'br.com.pcsist.winthor.venda.application',
      requirementType: 'package',
      versionRangeDesc: '>= 0.39.0 e < 1.0.0 (faixa [0.39.0, 1.0.0))',
      matchedProfileName: 'Venda'
    });

    expect(explanation.requirementLabel).toBe('pacote Java');
    expect(explanation.causeText).toContain('winthor-pedido-venda-service');
    expect(explanation.causeText).toContain('pacote Java');
    expect(explanation.causeText).toContain('br.com.pcsist.winthor.venda.application');
    expect(explanation.causeText).toContain('faixa >= 0.39.0 e < 1.0.0');
    expect(explanation.causeText).toContain('não foi publicado ou iniciado');
    expect(explanation.solutionText).toContain('perfil de deploy cadastrado "Venda"');
  });

  it('gera solução apontando para compilação de projeto local quando não há perfil mas há projeto', () => {
    const explanation = buildOsgiDiagnosticExplanation({
      failingBundle: 'winthor-integracao-matcon-service',
      missingItem: 'winthor-core-service',
      requirementType: 'bundle',
      matchedProjectName: 'winthor-core'
    });

    expect(explanation.requirementLabel).toBe('bundle OSGi');
    expect(explanation.causeText).toContain('bundle OSGi "winthor-core-service"');
    expect(explanation.solutionText).toContain('projeto local "winthor-core"');
  });

  it('gera solução sugerindo instalação de release do Nexus quando dependência de release é detectada', () => {
    const explanation = buildOsgiDiagnosticExplanation({
      failingBundle: 'winthor-integracao-matcon-service',
      missingItem: 'com.br.com.pcsist.winthor.varejo.matcon',
      requirementType: 'package',
      matchedPomDependency: { version: '1.39.23.45' }
    });

    expect(explanation.solutionText).toContain('release oficial (1.39.23.45)');
    expect(explanation.solutionText).toContain('Nexus');
  });

  it('gera solução genérica de verificação com bundle:list quando não há perfil nem projeto correspondente', () => {
    const explanation = buildOsgiDiagnosticExplanation({
      failingBundle: 'custom-bundle-service',
      missingItem: 'com.custom.api',
      requirementType: 'package'
    });

    expect(explanation.solutionText).toContain('bundle:list');
  });
});
