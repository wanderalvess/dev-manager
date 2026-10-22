import { describe, it, expect } from 'vitest';
import { buildProfileFromDependencyChain, validateDependencyChain } from './dependencyChainUtils';
import type { DependencyChainNode } from '../../../shared/types';

describe('dependencyChainUtils', () => {
  const sampleNodes: DependencyChainNode[] = [
    {
      id: 'node-1',
      projectName: 'winthor-venda',
      projectPath: 'C:\\projetos\\winthor-venda',
      skipTests: true
    },
    {
      id: 'node-2',
      projectName: 'winthor-pedido-venda',
      projectPath: 'C:\\projetos\\winthor-pedido-venda',
      skipTests: true
    },
    {
      id: 'node-3',
      projectName: 'winthor-integracao-varejo',
      projectPath: 'C:\\projetos\\winthor-integracao-varejo',
      skipTests: true,
      deployToKaraf: true
    }
  ];

  it('deve validar corretamente que nós repetidos ou menos de 2 nós são rejeitados', () => {
    expect(validateDependencyChain([]).valid).toBe(false);
    expect(validateDependencyChain([sampleNodes[0]]).valid).toBe(false);

    const duplicated = [sampleNodes[0], sampleNodes[1], sampleNodes[0]];
    expect(validateDependencyChain(duplicated).valid).toBe(false);

    expect(validateDependencyChain(sampleNodes).valid).toBe(true);
  });

  it('deve construir uma esteira completa de etapas com compilação e sincronização de pom.xml', () => {
    const profile = buildProfileFromDependencyChain('Esteira Varejo Completa', sampleNodes, true);

    expect(profile.name).toBe('Esteira Varejo Completa');
    // Para 3 nós com deploy final:
    // 1. build node-1
    // 2. sync node-1 -> node-2
    // 3. build node-2
    // 4. sync node-2 -> node-3
    // 5. build node-3
    // 6. deploy karaf
    expect(profile.steps).toHaveLength(6);

    expect(profile.steps[0].type).toBe('maven-build');
    expect(profile.steps[0].projectPath).toBe('C:\\projetos\\winthor-venda');

    expect(profile.steps[1].type).toBe('pom-sync-version');
    expect(profile.steps[1].sourceProjectPath).toBe('C:\\projetos\\winthor-venda');
    expect(profile.steps[1].targetProjectPath).toBe('C:\\projetos\\winthor-pedido-venda');
    expect(profile.steps[1].createPomBackup).toBe(true);

    expect(profile.steps[2].type).toBe('maven-build');
    expect(profile.steps[2].projectPath).toBe('C:\\projetos\\winthor-pedido-venda');

    expect(profile.steps[3].type).toBe('pom-sync-version');
    expect(profile.steps[3].sourceProjectPath).toBe('C:\\projetos\\winthor-pedido-venda');
    expect(profile.steps[3].targetProjectPath).toBe('C:\\projetos\\winthor-integracao-varejo');

    expect(profile.steps[4].type).toBe('maven-build');
    expect(profile.steps[4].projectPath).toBe('C:\\projetos\\winthor-integracao-varejo');

    expect(profile.steps[5].type).toBe('karaf-command');
  });
});
