import { ChildProcess } from 'child_process';
import {
  KarafDeployRequest,
  PomInfo,
  KarafBundleInfo,
  KarafBundleDetails,
  BundleDependencyCheckResult,
  InstallBundleRequest,
  ReinstallBundleRequest,
  UpdateBundleVersionRequest,
  KarafDeployHistoryEntry,
  KarafFeatureInfo,
  KarafFeatureRepoInfo,
  KarafJvmMemoryInfo,
  LogAnalysisSummary
} from '../../shared/types';
import { ConfigService } from './ConfigService';
import { analyzeLogText } from '../../shared/logAnalyzerUtils';
import type {
  BundleAction,
  ChunkHandler,
  DeployTrigger,
  KarafActionResult,
  KarafCommandResult,
  KarafContext,
  KarafCredentials,
  KarafDeployResult
} from './karaf/karafContext';
import * as projectFiles from './karaf/karafProjectFiles';
import * as executables from './karaf/karafExecutables';
import { getResolvedJavaEnv } from './karaf/karafJavaEnv';
import { executeKarafCommand } from './karaf/karafExecute';
import * as embedded from './karaf/karafEmbedded';
import * as deployOps from './karaf/karafDeploy';
import * as bundleQuery from './karaf/karafBundleQuery';
import * as bundleActions from './karaf/karafBundleActions';
import * as bundleManage from './karaf/karafBundleManage';
import * as features from './karaf/karafFeatures';
import * as runtimeInfo from './karaf/karafRuntimeInfo';
import * as wiring from './karaf/karafWiring';

export { filterBenignStderr } from '../utils/karafCommandUtils';
export { parseClauseList, parseManifestHeaders, parseCapabilitiesWiredBundles } from '../utils/karafManifestUtils';

/**
 * Fachada fina: mantém o estado (configService, processo embutido) e a API pública; a lógica
 * vive em ./karaf/*. Os módulos recebem `this.ctx`, cujas chamadas voltam pela instância
 * (late-binding), preservando a interceptação por vi.spyOn nos métodos públicos.
 */
export class KarafService {
  private configService: ConfigService;
  private embeddedKarafProcess: ChildProcess | null = null;
  private readonly ctx: KarafContext;

  constructor(configService: ConfigService) {
    this.configService = configService;
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- necessário para os getters/setters do estado privado
    const self = this;
    this.ctx = {
      getSettings: () => self.configService.getSettings(),
      saveSettings: (patch) => self.configService.saveSettings(patch),
      get embeddedKarafProcess() { return self.embeddedKarafProcess; },
      set embeddedKarafProcess(proc) { self.embeddedKarafProcess = proc; },
      parseProjectPomOrBat: (p) => self.parseProjectPomOrBat(p),
      getKarafClientExecutable: () => self.getKarafClientExecutable(),
      getKarafServerExecutable: () => self.getKarafServerExecutable(),
      getResolvedJavaEnv: (port, isClient) => self.getResolvedJavaEnv(port, isClient),
      isKarafRunning: (port) => self.isKarafRunning(port),
      executeKarafCommand: (...args) => self.executeKarafCommand(...args),
      runMavenBuild: (p, skip, onChunk) => self.runMavenBuild(p, skip, onChunk),
      deploy: (...args) => self.deploy(...args),
      listBundlesParsed: (c) => self.listBundlesParsed(c),
      getBundleDetails: (id, c) => self.getBundleDetails(id, c)
    };
  }

  public parseProjectPomOrBat(projectPath: string): PomInfo | null {
    return projectFiles.parseProjectPomOrBat(projectPath);
  }

  public getKarafClientExecutable(): string | null {
    return executables.getKarafClientExecutable(this.ctx);
  }

  public getKarafServerExecutable(): string | null {
    return executables.getKarafServerExecutable(this.ctx);
  }

  public getResolvedJavaEnv(customDebugPort?: number, isClient: boolean = false): NodeJS.ProcessEnv {
    return getResolvedJavaEnv(this.configService.getSettings(), customDebugPort, isClient);
  }

  public async isKarafRunning(sshPort?: number): Promise<boolean> {
    return executables.isKarafRunning(this.ctx, sshPort);
  }

  public async executeKarafCommand(
    command: string,
    onChunk: ChunkHandler,
    credentials?: KarafCredentials,
    timeoutMs?: number,
    context?: { projectPath?: string; pomXmlContent?: string }
  ): Promise<KarafCommandResult> {
    return executeKarafCommand(this.ctx, command, onChunk, credentials, timeoutMs, context);
  }

  public async verifyInstallation(
    matchTerm: string,
    onChunk: ChunkHandler,
    credentials?: KarafCredentials
  ): Promise<{ featureInstalled: boolean; featureLines: string[]; bundleLines: string[] }> {
    return runtimeInfo.verifyInstallation(this.ctx, matchTerm, onChunk, credentials);
  }

  public async getKarafLog(lines: number = 200, credentials?: KarafCredentials): Promise<{ success: boolean; output: string }> {
    return runtimeInfo.getKarafLog(this.ctx, lines, credentials);
  }

  // --- Karaf Embutido no Painel ---
  public startEmbeddedKarafDebug(onLog: (chunk: string) => void): boolean {
    return embedded.startEmbeddedKarafDebug(this.ctx, onLog);
  }

  public sendEmbeddedInput(input: string): boolean {
    return embedded.sendEmbeddedInput(this.ctx, input);
  }

  public async stopEmbeddedKaraf(): Promise<boolean> {
    return embedded.stopEmbeddedKaraf(this.ctx);
  }

  public isEmbeddedRunning(): boolean {
    return embedded.isEmbeddedRunning(this.ctx);
  }

  public async deploy(
    request: KarafDeployRequest,
    onChunk: ChunkHandler,
    trigger: DeployTrigger = 'ui',
    projectPath?: string
  ): Promise<KarafDeployResult> {
    return deployOps.deploy(this.ctx, request, onChunk, trigger, projectPath);
  }

  public async runMavenBuild(projectPath: string, skipTests: boolean = true, onChunk: ChunkHandler): Promise<{ code: number; stdout: string; stderr: string }> {
    return deployOps.runMavenBuild(projectPath, skipTests, onChunk);
  }

  public async buildAndDeployMaven(
    request: KarafDeployRequest,
    projectPath: string,
    skipTests: boolean,
    onChunk: ChunkHandler,
    trigger: DeployTrigger = 'ui'
  ): Promise<KarafDeployResult> {
    return deployOps.buildAndDeployMaven(this.ctx, request, projectPath, skipTests, onChunk, trigger);
  }

  /** Lista o histórico persistido de deploys/builds Karaf, mais recente primeiro. */
  public getDeployHistory(): KarafDeployHistoryEntry[] {
    return deployOps.getDeployHistory(this.ctx);
  }

  public async detectWiringConflicts(credentials?: KarafCredentials): Promise<wiring.WiringReport | null> {
    return wiring.detectWiringConflicts(this.ctx, credentials);
  }

  public async listBundlesParsed(credentials?: KarafCredentials): Promise<KarafBundleInfo[]> {
    return bundleQuery.listBundlesParsed(this.ctx, credentials);
  }

  public async listInstalledFeatures(credentials?: KarafCredentials): Promise<KarafFeatureInfo[]> {
    return features.listInstalledFeatures(this.ctx, credentials);
  }

  public async manageBundle(
    action: BundleAction,
    bundleId: string,
    credentials?: KarafCredentials,
    onChunk: ChunkHandler = () => {}
  ): Promise<KarafActionResult> {
    return bundleManage.manageBundle(this.ctx, action, bundleId, credentials, onChunk);
  }

  public async manageBundlesBatch(
    action: BundleAction,
    bundleIds: string[],
    credentials?: KarafCredentials,
    onChunk: ChunkHandler = () => {}
  ): Promise<{ success: boolean; output: string; processedCount: number }> {
    return bundleManage.manageBundlesBatch(this.ctx, action, bundleIds, credentials, onChunk);
  }

  public async getBundleDetails(bundleId: string, credentials?: KarafCredentials): Promise<KarafBundleDetails | null> {
    return bundleQuery.getBundleDetails(this.ctx, bundleId, credentials);
  }

  public async checkBundleDependencies(bundleId: string, credentials?: KarafCredentials): Promise<BundleDependencyCheckResult> {
    return bundleQuery.checkBundleDependencies(this.ctx, bundleId, credentials);
  }

  public async checkInstallDependencies(
    target: { location?: string; symbolicName?: string; version?: string },
    credentials?: KarafCredentials
  ): Promise<BundleDependencyCheckResult> {
    return bundleQuery.checkInstallDependencies(this.ctx, target, credentials);
  }

  public async installBundle(request: InstallBundleRequest, onChunk: ChunkHandler = () => {}): Promise<{ success: boolean; bundleId?: string; state?: string; diag?: string; output: string }> {
    return bundleActions.installBundle(this.ctx, request, onChunk);
  }

  public async uninstallBundle(
    bundleId: string,
    credentials?: KarafCredentials,
    onChunk: ChunkHandler = () => {}
  ): Promise<KarafActionResult> {
    return bundleActions.uninstallBundle(this.ctx, bundleId, credentials, onChunk);
  }

  public async uninstallFeature(
    featureName: string,
    version?: string,
    credentials?: KarafCredentials,
    onChunk: ChunkHandler = () => {}
  ): Promise<KarafActionResult> {
    return features.uninstallFeature(this.ctx, featureName, version, credentials, onChunk);
  }

  public async installFeature(
    featureName: string,
    version?: string,
    credentials?: KarafCredentials,
    onChunk: ChunkHandler = () => {}
  ): Promise<KarafActionResult> {
    return features.installFeature(this.ctx, featureName, version, credentials, onChunk);
  }

  public async reinstallBundle(request: ReinstallBundleRequest, onChunk: ChunkHandler = () => {}): Promise<{ success: boolean; state?: string; diag?: string; output: string }> {
    return bundleActions.reinstallBundle(this.ctx, request, onChunk);
  }

  public async updateBundleVersion(request: UpdateBundleVersionRequest, onChunk: ChunkHandler = () => {}): Promise<KarafActionResult> {
    return bundleActions.updateBundleVersion(this.ctx, request, onChunk);
  }

  public async getJvmMemoryMetrics(credentials?: KarafCredentials): Promise<KarafJvmMemoryInfo> {
    return runtimeInfo.getJvmMemoryMetrics(this.ctx, credentials);
  }

  public async triggerGarbageCollection(credentials?: KarafCredentials): Promise<KarafActionResult> {
    return runtimeInfo.triggerGarbageCollection(this.ctx, credentials);
  }

  public async listFeatureRepositories(credentials?: KarafCredentials): Promise<KarafFeatureRepoInfo[]> {
    return features.listFeatureRepositories(this.ctx, credentials);
  }

  public async addFeatureRepository(
    url: string,
    credentials?: KarafCredentials,
    onChunk: ChunkHandler = () => {}
  ): Promise<KarafActionResult> {
    return features.addFeatureRepository(this.ctx, url, credentials, onChunk);
  }

  public async removeFeatureRepository(
    nameOrUrl: string,
    credentials?: KarafCredentials,
    onChunk: ChunkHandler = () => {}
  ): Promise<KarafActionResult> {
    return features.removeFeatureRepository(this.ctx, nameOrUrl, credentials, onChunk);
  }

  public async refreshFeatureRepository(
    nameOrUrl?: string,
    credentials?: KarafCredentials,
    onChunk: ChunkHandler = () => {}
  ): Promise<KarafActionResult> {
    return features.refreshFeatureRepository(this.ctx, nameOrUrl, credentials, onChunk);
  }

  public async listAllFeatures(installedOnly: boolean = false, credentials?: KarafCredentials): Promise<KarafFeatureInfo[]> {
    return features.listAllFeatures(this.ctx, installedOnly, credentials);
  }

  /**
   * Analisa texto de log com detecção contínua de exceções do ecossistema WinThor (ORA, NPE, OSGi).
   */
  public analyzeLogText(content: string | string[]): LogAnalysisSummary {
    return analyzeLogText(content);
  }
}
