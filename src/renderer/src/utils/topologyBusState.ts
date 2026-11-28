import type { StackTopology } from './dockerContainerUtils';

export type TopologyBusStackState = 'complete' | 'missing' | 'partial' | 'stopped' | 'absent';

/** Prioridade: completa > dependência ausente (Oracle parado) > nada criado > tudo parado > parcial. */
export function topologyBusStackState(
  topology: Pick<StackTopology, 'isStackComplete' | 'hasMissingDependency' | 'oracle' | 'wta' | 'wsh'>
): TopologyBusStackState {
  if (topology.isStackComplete) return 'complete';
  if (topology.hasMissingDependency) return 'missing';
  const nodes = [topology.oracle, topology.wta, topology.wsh];
  if (!nodes.some((n) => n.exists)) return 'absent';
  if (!nodes.some((n) => n.running)) return 'stopped';
  return 'partial';
}
