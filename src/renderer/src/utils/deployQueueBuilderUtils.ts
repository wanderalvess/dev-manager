import type { DeployStep } from '../../../shared/types';
import type { DeployQueueProject } from '../../../shared/deployQueue';

export type QueueApplyMode = 'append' | 'replace';

/** Busca por nome da pasta ou artifactId, sem diferenciar maiúsculas. */
export function filterQueueProjects(projects: DeployQueueProject[], search: string): DeployQueueProject[] {
  const term = search.trim().toLowerCase();
  if (!term) return projects;
  return projects.filter((p) => p.name.toLowerCase().includes(term) || p.artifactId.toLowerCase().includes(term));
}

/** Junta as etapas geradas às do perfil: acrescenta ao fim ou substitui tudo. */
export function mergeQueueSteps(current: DeployStep[], generated: DeployStep[], mode: QueueApplyMode): DeployStep[] {
  return mode === 'replace' ? generated : [...current, ...generated];
}
