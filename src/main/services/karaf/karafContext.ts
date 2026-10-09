import type { ChildProcess } from 'child_process';
import type {
  AppSettings,
  KarafBundleDetails,
  KarafBundleInfo,
  KarafDeployRequest,
  OsgiResolutionDiagnosticSummary,
  PomInfo
} from '../../../shared/types';

export const BUNDLE_ACTIONS = ['start', 'stop', 'restart', 'uninstall', 'refresh', 'resolve'] as const;
export type BundleAction = (typeof BUNDLE_ACTIONS)[number];
export type DeployTrigger = 'ui' | 'mcp';

export type KarafCredentials = { user?: string; pass?: string; port?: number };
export type ChunkHandler = (chunk: string) => void;

/** Descarta a saída em streaming quando só o resultado final interessa. */
export const noopChunk: ChunkHandler = () => {};
export type KarafActionResult = { success: boolean; output: string };
export type KarafDeployResult = { success: boolean; error?: string };
export type KarafCommandResult = {
  code: number;
  stdout: string;
  stderr: string;
  resolutionDiagnostic?: OsgiResolutionDiagnosticSummary;
};

/**
 * Contexto mínimo que os módulos extraídos de KarafService usam. A fachada passa uma
 * implementação que delega para a própria instância (late-binding), de modo que
 * vi.spyOn/mocks em métodos da instância continuem interceptando as chamadas internas.
 */
export interface KarafContext {
  getSettings(): AppSettings;
  saveSettings(patch: Partial<AppSettings>): AppSettings;
  embeddedKarafProcess: ChildProcess | null;
  parseProjectPomOrBat(projectPath: string): PomInfo | null;
  getKarafClientExecutable(): string | null;
  getKarafServerExecutable(): string | null;
  getResolvedJavaEnv(customDebugPort?: number, isClient?: boolean): NodeJS.ProcessEnv;
  isKarafRunning(sshPort?: number): Promise<boolean>;
  executeKarafCommand(
    command: string,
    onChunk: ChunkHandler,
    credentials?: KarafCredentials,
    timeoutMs?: number,
    context?: { projectPath?: string; pomXmlContent?: string }
  ): Promise<KarafCommandResult>;
  runMavenBuild(
    projectPath: string,
    skipTests: boolean,
    onChunk: ChunkHandler
  ): Promise<{ code: number; stdout: string; stderr: string }>;
  deploy(
    request: KarafDeployRequest,
    onChunk: ChunkHandler,
    trigger?: DeployTrigger,
    projectPath?: string
  ): Promise<KarafDeployResult>;
  listBundlesParsed(credentials?: KarafCredentials): Promise<KarafBundleInfo[]>;
  getBundleDetails(bundleId: string, credentials?: KarafCredentials): Promise<KarafBundleDetails | null>;
}
