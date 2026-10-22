import type { DeployStep } from '../../../shared/types';

/**
 * Projeto de contexto de uma etapa: o da própria etapa, senão o da etapa anterior mais próxima
 * (um build Maven alimenta o install seguinte) e, por fim, o primeiro do perfil.
 */
export function resolveContextProjectPath(steps: DeployStep[], index: number): string | undefined {
  const own = steps[index]?.projectPath;
  if (own) return own;
  for (let i = Math.min(index, steps.length) - 1; i >= 0; i--) {
    if (steps[i].projectPath) return steps[i].projectPath;
  }
  return steps.find((s) => s.projectPath)?.projectPath;
}
