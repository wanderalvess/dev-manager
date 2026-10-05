import {
  DockerContainerInfo,
  DockerDaemonStatus,
  DockerContainerStats,
  ComposeServiceStatus,
  DockerContainerInspect,
  OracleMaintenanceResult,
  OracleDataPumpParams
} from '../../shared/types';
import { isValidIdentifier } from '../utils/security';
import type { DockerContext } from './docker/dockerContext';
import * as engine from './docker/dockerEngine';
import * as status from './docker/dockerStatus';
import * as aliases from './docker/dockerAliases';
import * as lifecycle from './docker/dockerLifecycle';
import * as queries from './docker/dockerQueries';
import * as terminal from './docker/dockerTerminal';
import * as sequence from './docker/dockerSequence';
import * as images from './docker/dockerImages';
import * as compose from './docker/dockerCompose';
import * as oracle from './docker/dockerOracle';

/**
 * Fachada fina: mantém o estado (motor detectado, distro WSL) e a API pública; a lógica vive em
 * ./docker/*. Os módulos recebem `this.ctx`, cujas chamadas voltam pela instância (late-binding),
 * preservando a interceptação por atribuição nos métodos (inclusive privados, como
 * resolveCommandAndArgs e isValidContainerId).
 */
export class DockerService {
  private detectedEngine: 'docker' | 'podman' | null = null;
  private targetWslDistro: string | null = null;
  private useWsl = false;
  private autoDetectedWsl = false;
  private readonly ctx: DockerContext;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- necessário para os getters/setters do estado privado
    const self = this;
    this.ctx = {
      get detectedEngine() { return self.detectedEngine; },
      set detectedEngine(value) { self.detectedEngine = value; },
      get targetWslDistro() { return self.targetWslDistro; },
      set targetWslDistro(value) { self.targetWslDistro = value; },
      get useWsl() { return self.useWsl; },
      set useWsl(value) { self.useWsl = value; },
      get autoDetectedWsl() { return self.autoDetectedWsl; },
      set autoDetectedWsl(value) { self.autoDetectedWsl = value; },
      resolveCommandAndArgs: (sub, args) => self.resolveCommandAndArgs(sub, args),
      toWslPath: (p) => self.toWslPath(p),
      getEngineCommand: () => self.getEngineCommand(),
      isValidContainerId: (id) => self.isValidContainerId(id),
      checkDockerStatus: () => self.checkDockerStatus(),
      resolveContainerAlias: (name) => self.resolveContainerAlias(name),
      startContainer: (id) => self.startContainer(id),
      stopContainer: (id) => self.stopContainer(id),
      ensureDockerRunning: (distro) => self.ensureDockerRunning(distro)
    };
  }

  /**
   * Define manualmente a distro WSL a ser utilizada.
   * Se for null ou vazio, volta para detecção automática ou Windows host.
   */
  public setTargetWslDistro(distro: string | null): void {
    this.autoDetectedWsl = false;
    if (distro && isValidIdentifier(distro) && distro.trim().length > 0) {
      this.targetWslDistro = distro.trim();
      this.useWsl = true;
    } else {
      this.targetWslDistro = null;
      this.useWsl = false;
    }
  }

  public getTargetWslDistro(): string | null {
    return this.targetWslDistro;
  }

  public isUsingWsl(): boolean {
    return this.useWsl;
  }

  private async resolveCommandAndArgs(
    dockerSubcommand: string,
    args: string[] = []
  ): Promise<{ binary: string; finalArgs: string[] }> {
    return engine.resolveCommandAndArgs(this.ctx, dockerSubcommand, args);
  }

  private toWslPath(windowsPath: string): string {
    return engine.toWslPath(this.ctx, windowsPath);
  }

  public async getEngineCommand(): Promise<'docker' | 'podman'> {
    return engine.getEngineCommand(this.ctx);
  }

  public setEngineCommand(engineName: 'docker' | 'podman' | null): void {
    this.detectedEngine = engineName;
  }

  public async checkDockerStatus(): Promise<DockerDaemonStatus> {
    return status.checkDockerStatus(this.ctx);
  }

  public async ensureDockerRunning(distroOverride?: string): Promise<{ running: boolean; error?: string }> {
    return status.ensureDockerRunning(this.ctx, distroOverride);
  }

  public async listContainers(): Promise<DockerContainerInfo[]> {
    return queries.listContainers(this.ctx);
  }

  // Mesmo objeto definido em ./docker/dockerAliases (os testes leem DockerService.CONTAINER_ALIASES).
  private static readonly CONTAINER_ALIASES: Record<string, string[]> = aliases.CONTAINER_ALIASES;

  public async resolveContainerAlias(targetName: string): Promise<string | null> {
    return aliases.resolveContainerAlias(this.ctx, targetName);
  }

  public async startContainer(containerId: string): Promise<boolean> {
    return lifecycle.startContainer(this.ctx, containerId);
  }

  public async stopContainer(containerId: string): Promise<boolean> {
    return lifecycle.stopContainer(this.ctx, containerId);
  }

  public async restartContainer(containerId: string): Promise<boolean> {
    return lifecycle.restartContainer(this.ctx, containerId);
  }

  public async getContainerLogs(containerId: string, lines = 200): Promise<string> {
    return queries.getContainerLogs(this.ctx, containerId, lines);
  }

  public async removeContainer(containerId: string): Promise<boolean> {
    return lifecycle.removeContainer(this.ctx, containerId);
  }

  private isValidContainerId(id: string): boolean {
    return isValidIdentifier(id) && id.trim().length >= 2 && id.trim().length <= 128;
  }

  public async inspectContainer(containerId: string): Promise<DockerContainerInspect | null> {
    return queries.inspectContainer(this.ctx, containerId);
  }

  public async pauseContainer(containerId: string): Promise<boolean> {
    return lifecycle.pauseContainer(this.ctx, containerId);
  }

  public async unpauseContainer(containerId: string): Promise<boolean> {
    return lifecycle.unpauseContainer(this.ctx, containerId);
  }

  public async pruneContainers(): Promise<{ success: boolean; output: string }> {
    return lifecycle.pruneContainers(this.ctx);
  }

  public async getContainerStats(): Promise<DockerContainerStats[]> {
    return queries.getContainerStats(this.ctx);
  }

  public async openContainerTerminal(containerId: string, shellName = 'bash'): Promise<boolean> {
    return terminal.openContainerTerminal(this.ctx, containerId, shellName);
  }

  public async startContainerSequence(
    containers: { name: string; delay?: number }[],
    onProgress?: (step: { currentName: string; index: number; total: number; waitingSeconds?: number }) => void
  ): Promise<{ success: boolean; started: string[]; failed?: string; error?: string }> {
    return sequence.startContainerSequence(this.ctx, containers, onProgress);
  }

  public async stopContainerSequence(
    containers: string[],
    onProgress?: (step: { currentName: string; index: number; total: number }) => void
  ): Promise<{ success: boolean; stopped: string[]; failed?: string; error?: string }> {
    return sequence.stopContainerSequence(this.ctx, containers, onProgress);
  }

  public async buildImage(
    contextPath: string,
    imageTag: string,
    dockerfile: string | undefined,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return images.buildImage(this.ctx, contextPath, imageTag, dockerfile, onChunk);
  }

  public async pushImage(
    imageTag: string,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return images.pushImage(this.ctx, imageTag, onChunk);
  }

  public async composeUp(
    composeFilePath: string,
    options: { profile?: string; detach?: boolean; build?: boolean } | undefined,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return compose.composeUp(this.ctx, composeFilePath, options, onChunk);
  }

  public async composeDown(
    composeFilePath: string,
    options: { profile?: string; volumes?: boolean } | undefined,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return compose.composeDown(this.ctx, composeFilePath, options, onChunk);
  }

  public async composeRestart(
    composeFilePath: string,
    options: { profile?: string } | undefined,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return compose.composeRestart(this.ctx, composeFilePath, options, onChunk);
  }

  public async getComposeLogs(
    composeFilePath: string,
    options?: { profile?: string; lines?: number }
  ): Promise<string> {
    return compose.getComposeLogs(this.ctx, composeFilePath, options);
  }

  public async composeStatus(composeFilePath: string, profile?: string): Promise<ComposeServiceStatus[]> {
    return compose.composeStatus(this.ctx, composeFilePath, profile);
  }

  public async execOracleHealth(
    containerName: string,
    schema?: string,
    fix = false,
    user = 'sys',
    password?: string
  ): Promise<OracleMaintenanceResult> {
    return oracle.execOracleHealth(this.ctx, containerName, schema, fix, user, password);
  }

  public async openOracleSqlPlus(containerName: string, user = 'sys', password?: string): Promise<boolean> {
    return oracle.openOracleSqlPlus(this.ctx, containerName, user, password);
  }

  public async openWtaKarafClient(containerName: string): Promise<boolean> {
    return oracle.openWtaKarafClient(this.ctx, containerName);
  }

  public async execOracleDataPump(params: OracleDataPumpParams): Promise<OracleMaintenanceResult> {
    return oracle.execOracleDataPump(this.ctx, params);
  }
}

export const ContainerService = DockerService;
