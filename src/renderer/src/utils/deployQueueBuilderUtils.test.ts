import { describe, expect, it } from 'vitest';
import type { DeployStep } from '../../../shared/types';
import type { DeployQueueProject } from '../../../shared/deployQueue';
import { filterQueueProjects, mergeQueueSteps } from './deployQueueBuilderUtils';

const project = (name: string, artifactId = name): DeployQueueProject => ({
  name,
  path: `/ws/${name}`,
  groupId: 'g',
  artifactId,
  version: '1',
  packaging: 'jar',
  dependencies: []
});

const step = (id: string): DeployStep => ({ id, name: id, type: 'maven-build', enabled: true });

describe('deployQueueBuilderUtils', () => {
  it('filtra por pasta ou artifactId', () => {
    const list = [project('Vendas'), project('pasta-x', 'core-api')];
    expect(filterQueueProjects(list, '')).toHaveLength(2);
    expect(filterQueueProjects(list, ' vend ').map((p) => p.name)).toEqual(['Vendas']);
    expect(filterQueueProjects(list, 'CORE').map((p) => p.name)).toEqual(['pasta-x']);
    expect(filterQueueProjects(list, 'nada')).toEqual([]);
  });

  it('acrescenta ou substitui as etapas do perfil', () => {
    const current = [step('a')];
    const generated = [step('b'), step('c')];
    expect(mergeQueueSteps(current, generated, 'append').map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(mergeQueueSteps(current, generated, 'replace').map((s) => s.id)).toEqual(['b', 'c']);
  });
});
