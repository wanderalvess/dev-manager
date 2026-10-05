import type { DockerDaemonStatus } from '../../../shared/types';

export type DockerEngine = 'docker' | 'podman';

/**
 * Contexto mínimo que os módulos extraídos de DockerService usam. A fachada passa uma
 * implementação que delega para a própria instância (late-binding), de modo que
 * atribuições de métodos na instância (inclusive privados, como resolveCommandAndArgs)
 * continuem interceptando as chamadas internas. O estado em memória vive na fachada.
 */
export interface DockerContext {
  detectedEngine: DockerEngine | null;
  targetWslDistro: string | null;
  useWsl: boolean;
  autoDetectedWsl: boolean;
  resolveCommandAndArgs(
    dockerSubcommand: string,
    args?: string[]
  ): Promise<{ binary: string; finalArgs: string[] }>;
  toWslPath(windowsPath: string): string;
  getEngineCommand(): Promise<DockerEngine>;
  isValidContainerId(id: string): boolean;
  checkDockerStatus(): Promise<DockerDaemonStatus>;
  resolveContainerAlias(targetName: string): Promise<string | null>;
  startContainer(containerId: string): Promise<boolean>;
  stopContainer(containerId: string): Promise<boolean>;
  ensureDockerRunning(distroOverride?: string): Promise<{ running: boolean; error?: string }>;
}
