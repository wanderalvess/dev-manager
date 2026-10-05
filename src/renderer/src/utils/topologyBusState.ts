import type { StackTopology } from './dockerContainerUtils';

export type TopologyBusStackState = 'complete' | 'missing' | 'partial';

/** Prioridade: stack completa > dependência ausente (Oracle offline) > parcial. */
export function topologyBusStackState(
  topology: Pick<StackTopology, 'isStackComplete' | 'hasMissingDependency'>
): TopologyBusStackState {
  if (topology.isStackComplete) return 'complete';
  if (topology.hasMissingDependency) return 'missing';
  return 'partial';
}
