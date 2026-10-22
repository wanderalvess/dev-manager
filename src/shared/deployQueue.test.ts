import { describe, expect, it } from 'vitest';
import { buildQueueSteps, resolveBuildQueue, type DeployQueueProject } from './deployQueue';

const makeProject = (
  artifactId: string,
  deps: string[] = [],
  extra: Partial<DeployQueueProject> = {}
): DeployQueueProject => ({
  name: artifactId,
  path: `/ws/${artifactId}`,
  groupId: 'com.acme',
  artifactId,
  version: '1.0.0',
  packaging: 'jar',
  dependencies: deps.map((d) => ({ groupId: 'com.acme', artifactId: d })),
  ...extra
});

const paths = (r: { ordered: DeployQueueProject[] }) => r.ordered.map((p) => p.artifactId);

describe('resolveBuildQueue', () => {
  const core = makeProject('core');
  const domain = makeProject('domain', ['core']);
  const api = makeProject('api', ['domain', 'core']);
  const all = [api, core, domain];

  it('coloca dependências antes de quem depende delas, independente da ordem da seleção', () => {
    const r = resolveBuildQueue(all, [api.path, domain.path, core.path], false);
    expect(paths(r)).toEqual(['core', 'domain', 'api']);
    expect(r.pulledIn).toEqual([]);
    expect(r.cycleMembers).toEqual([]);
  });

  it('só traz dependências não selecionadas quando pedido, e informa quais vieram', () => {
    expect(paths(resolveBuildQueue(all, [api.path], false))).toEqual(['api']);
    const r = resolveBuildQueue(all, [api.path], true);
    expect(paths(r)).toEqual(['core', 'domain', 'api']);
    expect(r.pulledIn.sort()).toEqual([core.path, domain.path].sort());
  });

  it('usa o parent como dependência de build', () => {
    const parent = makeProject('parent', [], { packaging: 'pom' });
    const child = makeProject('child', [], { parent: { groupId: 'com.acme', artifactId: 'parent' } });
    expect(paths(resolveBuildQueue([child, parent], [child.path, parent.path], false))).toEqual(['parent', 'child']);
  });

  it('casa groupId por propriedade pelo artifactId só quando é único', () => {
    const lib = makeProject('lib');
    const app = makeProject('app', [], { dependencies: [{ groupId: '${project.groupId}', artifactId: 'lib' }] });
    expect(paths(resolveBuildQueue([app, lib], [app.path, lib.path], false))).toEqual(['lib', 'app']);

    const libDup = makeProject('lib', [], { path: '/ws/outro/lib', groupId: 'org.outro' });
    // ambíguo: não força dependência, vale a ordem da seleção
    expect(paths(resolveBuildQueue([app, lib, libDup], [app.path, lib.path, libDup.path], false))[0]).toBe('app');
  });

  it('mantém a ordem da seleção entre projetos independentes', () => {
    const a = makeProject('a');
    const b = makeProject('b');
    expect(paths(resolveBuildQueue([a, b], [b.path, a.path], false))).toEqual(['b', 'a']);
  });

  it('reporta dependência circular sem perder projetos', () => {
    const x = makeProject('x', ['y']);
    const y = makeProject('y', ['x']);
    const r = resolveBuildQueue([x, y], [x.path, y.path], false);
    expect(r.cycleMembers.sort()).toEqual([x.path, y.path]);
    expect(r.ordered).toHaveLength(2);
  });

  it('ignora caminhos desconhecidos', () => {
    expect(resolveBuildQueue(all, ['/nao/existe'], true).ordered).toEqual([]);
  });
});

describe('buildQueueSteps', () => {
  const lib = makeProject('lib', [], { packaging: 'bundle' });
  const pom = makeProject('parent', [], { packaging: 'pom' });

  it('gera um build Maven por projeto, na ordem, com ids únicos', () => {
    const steps = buildQueueSteps([pom, lib], { skipTests: true, installBundles: false }, 1);
    expect(steps.map((s) => [s.type, s.projectPath, s.skipTests])).toEqual([
      ['maven-build', pom.path, true],
      ['maven-build', lib.path, true]
    ]);
    expect(new Set(steps.map((s) => s.id)).size).toBe(2);
  });

  it('instala só os projetos com packaging bundle quando pedido', () => {
    const steps = buildQueueSteps([pom, lib], { skipTests: false, installBundles: true }, 1);
    expect(steps).toHaveLength(3);
    expect(steps[2]).toMatchObject({
      type: 'karaf-bundle',
      bundleAction: 'install',
      bundleLocation: 'mvn:com.acme/lib/1.0.0'
    });
  });

  it('não gera install quando a versão ou o groupId não estão resolvidos', () => {
    const unresolved = makeProject('u', [], { packaging: 'bundle', groupId: '${g}' });
    expect(buildQueueSteps([unresolved], { skipTests: true, installBundles: true }, 1)).toHaveLength(1);
  });
});
