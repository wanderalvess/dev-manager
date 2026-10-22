import type { DeployStep } from './types';
import type { PomCoordinate } from './pomParser';

/** Projeto do workspace já lido do pom.xml (ver PomGraphService). */
export interface DeployQueueProject {
  name: string;
  path: string;
  groupId: string;
  artifactId: string;
  version: string;
  packaging: string;
  parent?: PomCoordinate;
  dependencies: PomCoordinate[];
}

export interface BuildQueueResult {
  /** Projetos na ordem de build: dependências antes de quem depende delas. */
  ordered: DeployQueueProject[];
  /** Caminhos incluídos só porque algum selecionado depende deles. */
  pulledIn: string[];
  /** Projetos presos em dependência circular (entram no fim, na ordem da seleção). */
  cycleMembers: string[];
}

const isUnresolved = (groupId: string) => !groupId || groupId.includes('${');

/** Para cada projeto, os outros projetos do workspace de que ele depende (dependências e parent). */
export function mapWorkspaceDependencies(projects: DeployQueueProject[]): Map<string, Set<string>> {
  const byCoordinate = new Map<string, DeployQueueProject>();
  const byArtifact = new Map<string, DeployQueueProject[]>();
  for (const p of projects) {
    byCoordinate.set(`${p.groupId}:${p.artifactId}`, p);
    byArtifact.set(p.artifactId, [...(byArtifact.get(p.artifactId) ?? []), p]);
  }

  const resolve = (coord: PomCoordinate): DeployQueueProject | undefined => {
    if (!isUnresolved(coord.groupId)) return byCoordinate.get(`${coord.groupId}:${coord.artifactId}`);
    // groupId por propriedade (${project.groupId}): só casa pelo artifactId quando não há ambiguidade.
    const candidates = byArtifact.get(coord.artifactId) ?? [];
    return candidates.length === 1 ? candidates[0] : undefined;
  };

  const result = new Map<string, Set<string>>();
  for (const p of projects) {
    const deps = new Set<string>();
    for (const coord of [...(p.parent ? [p.parent] : []), ...p.dependencies]) {
      const target = resolve(coord);
      if (target && target.path !== p.path) deps.add(target.path);
    }
    result.set(p.path, deps);
  }
  return result;
}

/**
 * Ordena os projetos selecionados para build (dependências primeiro). Com `includeDependencies`, traz também,
 * de forma transitiva, os projetos do workspace de que os selecionados dependem.
 */
export function resolveBuildQueue(
  projects: DeployQueueProject[],
  selectedPaths: string[],
  includeDependencies: boolean
): BuildQueueResult {
  const byPath = new Map(projects.map((p) => [p.path, p]));
  const deps = mapWorkspaceDependencies(projects);

  const queue = new Set(selectedPaths.filter((p) => byPath.has(p)));
  const pulledIn: string[] = [];
  if (includeDependencies) {
    const pending = [...queue];
    while (pending.length > 0) {
      const current = pending.pop()!;
      for (const dep of deps.get(current) ?? []) {
        if (queue.has(dep)) continue;
        queue.add(dep);
        pulledIn.push(dep);
        pending.push(dep);
      }
    }
  }

  // Kahn restrito à fila; empates seguem a ordem da seleção (pulledIn depois).
  const inputOrder = [...selectedPaths.filter((p) => queue.has(p)), ...pulledIn].filter((p, i, all) => all.indexOf(p) === i);
  const remaining = new Map(inputOrder.map((p) => [p, new Set([...(deps.get(p) ?? [])].filter((d) => queue.has(d)))]));
  const ordered: DeployQueueProject[] = [];

  while (remaining.size > 0) {
    const next = inputOrder.find((p) => remaining.has(p) && remaining.get(p)!.size === 0);
    if (!next) break;
    ordered.push(byPath.get(next)!);
    remaining.delete(next);
    remaining.forEach((set) => set.delete(next));
  }

  const cycleMembers = inputOrder.filter((p) => remaining.has(p));
  cycleMembers.forEach((p) => ordered.push(byPath.get(p)!));
  return { ordered, pulledIn, cycleMembers };
}

export interface QueueStepOptions {
  skipTests: boolean;
  /** Acrescenta, ao fim, a instalação no Karaf dos projetos com packaging "bundle". */
  installBundles: boolean;
}

/** Etapas de deploy para a fila já ordenada: um build Maven por projeto e, opcionalmente, o install no Karaf. */
export function buildQueueSteps(
  ordered: DeployQueueProject[],
  options: QueueStepOptions,
  now: number = Date.now()
): DeployStep[] {
  const makeId = (i: number) => `deploy-step-${now}-${i}-${Math.random().toString(36).substring(2, 7)}`;
  const steps: DeployStep[] = ordered.map((p, i) => ({
    id: makeId(i),
    name: `Build ${p.artifactId}`,
    type: 'maven-build',
    enabled: true,
    projectPath: p.path,
    skipTests: options.skipTests
  }));

  if (options.installBundles) {
    ordered
      .filter((p) => p.packaging === 'bundle' && p.groupId && p.version && !p.groupId.includes('${'))
      .forEach((p, i) => {
        steps.push({
          id: makeId(ordered.length + i),
          name: `Instalar ${p.artifactId}`,
          type: 'karaf-bundle',
          enabled: true,
          bundleAction: 'install',
          bundleLocation: `mvn:${p.groupId}/${p.artifactId}/${p.version}`,
          bundleStart: true
        });
      });
  }
  return steps;
}
