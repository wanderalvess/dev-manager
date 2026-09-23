import { describe, expect, it } from 'vitest';
import {
  computeBundleStats,
  computeScopeCounts,
  computeSnapshotDiff,
  filterBundles,
  getMatchedProject,
  isSystemBundle,
  isTotvsBundle,
  isWorkspaceBundle,
  getKarafStatusInfo
} from './karafBundleUtils';
import type { BundleSnapshot, GitProjectInfo, KarafBundleInfo } from '../../../shared/types';

function makeBundle(overrides: Partial<KarafBundleInfo> = {}): KarafBundleInfo {
  return {
    id: '101',
    state: 'Active',
    name: 'hub-carga-dados',
    version: '1.0.0',
    symbolicName: 'br.com.totvs.hub-carga-dados',
    ...overrides
  };
}

function makeProject(overrides: Partial<GitProjectInfo> = {}): GitProjectInfo {
  return {
    name: 'hub-carga-dados',
    path: 'C:\\projetos\\hub-carga-dados',
    currentBranch: 'develop',
    branches: ['develop', 'main'],
    isAzure: false,
    ...overrides
  };
}

describe('getMatchedProject / isWorkspaceBundle', () => {
  it('encontra o projeto quando o nome do bundle contém o nome do projeto', () => {
    const bundle = makeBundle({ symbolicName: 'br.com.totvs.hub-carga-dados', name: 'Hub Carga Dados' });
    const project = makeProject({ name: 'hub-carga-dados' });
    expect(getMatchedProject(bundle, [project])).toBe(project);
    expect(isWorkspaceBundle(bundle, [project])).toBe(true);
  });

  it('encontra o projeto pelo artifactId do pom quando o nome não casa diretamente', () => {
    const bundle = makeBundle({ symbolicName: 'br.com.totvs.hubcargadados-core', name: 'Core' });
    const project = makeProject({ name: 'Meu Repositório Local', pomInfo: { groupId: 'br.com.totvs', artifactId: 'hubcargadados-core', version: '1.0', modules: [] } });
    expect(isWorkspaceBundle(bundle, [project])).toBe(true);
  });

  it('retorna undefined/false quando nenhum projeto corresponde', () => {
    const bundle = makeBundle({ symbolicName: 'org.apache.felix.framework', name: 'Apache Felix' });
    const project = makeProject({ name: 'hub-carga-dados' });
    expect(getMatchedProject(bundle, [project])).toBeUndefined();
    expect(isWorkspaceBundle(bundle, [project])).toBe(false);
  });

  it('retorna false quando a lista de projetos está vazia', () => {
    expect(isWorkspaceBundle(makeBundle(), [])).toBe(false);
  });
});

describe('isTotvsBundle', () => {
  it('reconhece bundles pelo nome/symbolicName contendo totvs/winthor/br.com.totvs', () => {
    expect(isTotvsBundle(makeBundle({ symbolicName: 'br.com.totvs.qualquer' }), [])).toBe(true);
    expect(isTotvsBundle(makeBundle({ symbolicName: 'com.winthor.modulo' }), [])).toBe(true);
    expect(isTotvsBundle(makeBundle({ symbolicName: 'com.acme.TOTVS.legacy' }), [])).toBe(true);
  });

  it('também é true quando o bundle é do workspace, mesmo sem "totvs" no nome', () => {
    const bundle = makeBundle({ symbolicName: 'com.meuprojeto.custom', name: 'Meu Projeto' });
    const project = makeProject({ name: 'meuprojeto' });
    expect(isTotvsBundle(bundle, [project])).toBe(true);
  });

  it('retorna false para bundles de framework não relacionados', () => {
    expect(isTotvsBundle(makeBundle({ symbolicName: 'org.apache.felix.framework', name: 'Apache Felix' }), [])).toBe(false);
  });
});

describe('isSystemBundle', () => {
  it('reconhece prefixos conhecidos de framework OSGi', () => {
    expect(isSystemBundle(makeBundle({ symbolicName: 'org.apache.felix.framework' }))).toBe(true);
    expect(isSystemBundle(makeBundle({ symbolicName: 'org.ops4j.pax.logging' }))).toBe(true);
    expect(isSystemBundle(makeBundle({ symbolicName: 'org.osgi.core' }))).toBe(true);
  });

  it('reconhece termos conhecidos em qualquer posição do nome', () => {
    expect(isSystemBundle(makeBundle({ symbolicName: 'com.acme.jetty-server' }))).toBe(true);
    expect(isSystemBundle(makeBundle({ symbolicName: 'com.acme.slf4j-bridge' }))).toBe(true);
  });

  it('retorna false para bundles de negócio (TOTVS/workspace)', () => {
    expect(isSystemBundle(makeBundle({ symbolicName: 'br.com.totvs.hub-carga-dados' }))).toBe(false);
  });
});

describe('computeBundleStats', () => {
  it('conta corretamente por estado', () => {
    const bundles = [
      makeBundle({ id: '1', state: 'Active' }),
      makeBundle({ id: '2', state: 'Active' }),
      makeBundle({ id: '3', state: 'Resolved' }),
      makeBundle({ id: '4', state: 'Installed' }),
      makeBundle({ id: '5', state: 'Starting' })
    ];
    expect(computeBundleStats(bundles)).toEqual({ total: 5, active: 2, resolved: 1, installed: 1 });
  });

  it('retorna zeros para lista vazia', () => {
    expect(computeBundleStats([])).toEqual({ total: 0, active: 0, resolved: 0, installed: 0 });
  });
});

describe('computeScopeCounts', () => {
  it('conta bundles por escopo (totvs, workspace, issues, system)', () => {
    const project = makeProject({ name: 'meuprojeto' });
    const bundles = [
      makeBundle({ id: '1', symbolicName: 'br.com.totvs.a', state: 'Active' }),
      makeBundle({ id: '2', symbolicName: 'com.meuprojeto.b', name: 'meuprojeto', state: 'Resolved' }),
      makeBundle({ id: '3', symbolicName: 'org.apache.felix.framework', state: 'Active' }),
      makeBundle({ id: '4', symbolicName: 'com.outraempresa.x', state: 'Active' })
    ];
    const counts = computeScopeCounts(bundles, [project]);
    expect(counts.all).toBe(4);
    expect(counts.totvs).toBe(2); // br.com.totvs.a + com.meuprojeto.b (workspace conta como totvs)
    expect(counts.workspace).toBe(1);
    expect(counts.system).toBe(1);
    expect(counts.issues).toBe(1); // apenas o bundle "Resolved" não está Active
  });
});

describe('filterBundles', () => {
  const bundles = [
    makeBundle({ id: '1', name: 'hub-carga-dados', symbolicName: 'br.com.totvs.hub', state: 'Active' }),
    makeBundle({ id: '2', name: 'Apache Felix', symbolicName: 'org.apache.felix.framework', state: 'Active' }),
    makeBundle({ id: '3', name: 'módulo instável', symbolicName: 'br.com.totvs.instavel', state: 'Resolved' })
  ];

  it('sem filtros, retorna todos os bundles', () => {
    expect(filterBundles(bundles, { search: '', statusFilter: 'ALL', scopeFilter: 'ALL' }, [])).toHaveLength(3);
  });

  it('filtra por status', () => {
    const result = filterBundles(bundles, { search: '', statusFilter: 'Resolved', scopeFilter: 'ALL' }, []);
    expect(result.map((b) => b.id)).toEqual(['3']);
  });

  it('filtra por escopo TOTVS', () => {
    const result = filterBundles(bundles, { search: '', statusFilter: 'ALL', scopeFilter: 'TOTVS' }, []);
    expect(result.map((b) => b.id).sort()).toEqual(['1', '3']);
  });

  it('filtra por escopo ISSUES (qualquer estado diferente de Active)', () => {
    const result = filterBundles(bundles, { search: '', statusFilter: 'ALL', scopeFilter: 'ISSUES' }, []);
    expect(result.map((b) => b.id)).toEqual(['3']);
  });

  it('filtra por escopo SYSTEM', () => {
    const result = filterBundles(bundles, { search: '', statusFilter: 'ALL', scopeFilter: 'SYSTEM' }, []);
    expect(result.map((b) => b.id)).toEqual(['2']);
  });

  it('busca textual, case-insensitive, casando id/name/symbolicName/version/state', () => {
    const result = filterBundles(bundles, { search: 'FELIX', statusFilter: 'ALL', scopeFilter: 'ALL' }, []);
    expect(result.map((b) => b.id)).toEqual(['2']);
  });

  it('combina status + escopo + busca ao mesmo tempo', () => {
    const result = filterBundles(bundles, { search: 'instavel', statusFilter: 'Resolved', scopeFilter: 'TOTVS' }, []);
    expect(result.map((b) => b.id)).toEqual(['3']);
  });
});

describe('computeSnapshotDiff', () => {
  const currentBundles = [
    makeBundle({ id: '1', version: '1.0.0', state: 'Active' }), // unchanged
    makeBundle({ id: '2', version: '2.0.0', state: 'Active' }), // versão mudou
    makeBundle({ id: '3', version: '1.0.0', state: 'Resolved' }), // estado mudou
    makeBundle({ id: '4', version: '1.0.0', state: 'Active' }) // adicionado (não estava no snapshot)
  ];

  const snapshot: BundleSnapshot = {
    id: 'snap-1',
    label: 'Antes do deploy',
    createdAt: '2026-01-01T00:00:00.000Z',
    bundleCount: 4,
    bundles: [
      { id: '1', name: 'a', version: '1.0.0', state: 'Active' },
      { id: '2', name: 'b', version: '1.0.0', state: 'Active' },
      { id: '3', name: 'c', version: '1.0.0', state: 'Active' },
      { id: '5', name: 'e', version: '1.0.0', state: 'Active' } // removido (não existe mais)
    ]
  };

  it('retorna null quando não há snapshot selecionado', () => {
    expect(computeSnapshotDiff(currentBundles, null)).toBeNull();
  });

  it('classifica corretamente unchanged/versionChanged/stateChanged/added/removed', () => {
    const diff = computeSnapshotDiff(currentBundles, snapshot);
    expect(diff).not.toBeNull();
    expect(diff!.unchanged.map((b) => b.id)).toEqual(['1']);
    expect(diff!.versionChanged.map((d) => d.snapshot.id)).toEqual(['2']);
    expect(diff!.stateChanged.map((d) => d.snapshot.id)).toEqual(['3']);
    expect(diff!.added.map((b) => b.id)).toEqual(['4']);
    expect(diff!.removed.map((b) => b.id)).toEqual(['5']);
  });

  it('versão muda tem prioridade sobre estado quando ambos diferem', () => {
    const diff = computeSnapshotDiff(
      [makeBundle({ id: '9', version: '2.0.0', state: 'Resolved' })],
      {
        ...snapshot,
        bundles: [{ id: '9', name: 'x', version: '1.0.0', state: 'Active' }]
      }
    );
    expect(diff!.versionChanged).toHaveLength(1);
    expect(diff!.stateChanged).toHaveLength(0);
  });
});

describe('getKarafStatusInfo', () => {
  it('retorna metadados para status ONLINE', () => {
    const info = getKarafStatusInfo('ONLINE');
    expect(info.label).toBe('Karaf Online');
    expect(info.badgeClass).toContain('emerald');
    expect(info.dotClass).toContain('animate-pulse');
  });

  it('retorna metadados para status STARTING', () => {
    const info = getKarafStatusInfo('STARTING');
    expect(info.label).toBe('Karaf Inicializando...');
    expect(info.badgeClass).toContain('amber');
  });

  it('retorna metadados para status OFFLINE', () => {
    const info = getKarafStatusInfo('OFFLINE');
    expect(info.label).toBe('Karaf Offline');
    expect(info.badgeClass).toContain('rose');
  });
});

