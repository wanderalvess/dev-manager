import type {
  PomInfo,
  KarafBundleInfo,
  KarafBundleDetails,
  BundleDependencyCheckResult,
  InstallBundleRequest,
  ReinstallBundleRequest,
  UpdateBundleVersionRequest,
  KarafFeatureInfo,
  KarafFeatureRepoInfo,
  KarafJvmMemoryInfo,
  LogAnalysisSummary
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: Karaf: bundles, features, repositórios, JVM e análise de log. */
export function createKarafBundlesApi({ apiFetch, wsManager }: BridgeDeps) {
  return {
    listKarafBundles: async (credentials?: { user?: string; pass?: string; port?: number }): Promise<KarafBundleInfo[]> => {
      return apiFetch('/api/karaf/bundles', {
        method: 'POST',
        body: JSON.stringify(credentials || {})
      });
    },

    manageKarafBundle: async (
      action: 'start' | 'stop' | 'restart' | 'uninstall' | 'refresh' | 'resolve',
      bundleId: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/bundles/manage', {
        method: 'POST',
        body: JSON.stringify({ action, bundleId, credentials })
      });
    },

    manageKarafBundlesBatch: async (
      action: 'start' | 'stop' | 'restart' | 'uninstall' | 'refresh' | 'resolve',
      bundleIds: string[],
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string; processedCount: number }> => {
      return apiFetch('/api/karaf/bundles/manage-batch', {
        method: 'POST',
        body: JSON.stringify({ action, bundleIds, credentials })
      });
    },

    getKarafLog: async (
      lines?: number,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/log', {
        method: 'POST',
        body: JSON.stringify({ lines, credentials })
      });
    },

    getKarafBundleDetails: async (
      bundleId: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<KarafBundleDetails | null> => {
      return apiFetch('/api/karaf/bundles/details', {
        method: 'POST',
        body: JSON.stringify({ bundleId, credentials })
      });
    },

    checkKarafBundleDeps: async (
      bundleId: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<BundleDependencyCheckResult> => {
      return apiFetch('/api/karaf/bundles/check-deps', {
        method: 'POST',
        body: JSON.stringify({ bundleId, credentials })
      });
    },

    checkKarafInstallDeps: async (
      target: { location?: string; symbolicName?: string; version?: string },
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<BundleDependencyCheckResult> => {
      return apiFetch('/api/karaf/bundles/check-install-deps', {
        method: 'POST',
        body: JSON.stringify({ target, credentials })
      });
    },

    installKarafBundle: async (
      request: InstallBundleRequest
    ): Promise<{ success: boolean; bundleId?: string; state?: string; diag?: string; output: string }> => {
      return apiFetch('/api/karaf/bundles/install', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    uninstallKarafBundle: async (
      bundleId: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/bundles/uninstall', {
        method: 'POST',
        body: JSON.stringify({ bundleId, credentials })
      });
    },

    reinstallKarafBundle: async (
      request: ReinstallBundleRequest
    ): Promise<{ success: boolean; state?: string; diag?: string; output: string }> => {
      return apiFetch('/api/karaf/bundles/reinstall', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    updateKarafBundleVersion: async (
      request: UpdateBundleVersionRequest
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/bundles/update-version', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    listKarafFeatures: async (
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<KarafFeatureInfo[]> => {
      return apiFetch('/api/karaf/features', {
        method: 'POST',
        body: JSON.stringify(credentials || {})
      });
    },

    uninstallKarafFeature: async (
      featureName: string,
      version?: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/features/uninstall', {
        method: 'POST',
        body: JSON.stringify({ featureName, version, credentials })
      });
    },

    installKarafFeature: async (
      featureName: string,
      version?: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/features/install', {
        method: 'POST',
        body: JSON.stringify({ featureName, version, credentials })
      });
    },

    parsePom: async (projectPath: string): Promise<PomInfo | null> => {
      return apiFetch<PomInfo | null>(`/api/karaf/parse-pom?path=${encodeURIComponent(projectPath)}`);
    },

    getKarafJvmMemory: async (
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<KarafJvmMemoryInfo> => {
      return apiFetch<KarafJvmMemoryInfo>('/api/karaf/jvm-memory', {
        method: 'POST',
        body: JSON.stringify(credentials || {})
      });
    },

    triggerKarafGc: async (
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/gc', {
        method: 'POST',
        body: JSON.stringify(credentials || {})
      });
    },

    listKarafFeatureRepos: async (
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<KarafFeatureRepoInfo[]> => {
      return apiFetch('/api/karaf/feature-repos', {
        method: 'POST',
        body: JSON.stringify(credentials || {})
      });
    },

    addKarafFeatureRepo: async (
      url: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/feature-repos/add', {
        method: 'POST',
        body: JSON.stringify({ url, credentials })
      });
    },

    removeKarafFeatureRepo: async (
      nameOrUrl: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/feature-repos/remove', {
        method: 'POST',
        body: JSON.stringify({ nameOrUrl, credentials })
      });
    },

    refreshKarafFeatureRepo: async (
      nameOrUrl?: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/feature-repos/refresh', {
        method: 'POST',
        body: JSON.stringify({ nameOrUrl, credentials })
      });
    },

    listAllKarafFeatures: async (
      installedOnly?: boolean,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<KarafFeatureInfo[]> => {
      return apiFetch('/api/karaf/features-all', {
        method: 'POST',
        body: JSON.stringify({ installedOnly, credentials })
      });
    },

    analyzeKarafLog: async (
      content: string | string[]
    ): Promise<LogAnalysisSummary> => {
      return apiFetch('/api/karaf/analyze-log', {
        method: 'POST',
        body: JSON.stringify({ content })
      });
    },

    onKarafLogChunk: (callback: (chunk: string) => void) => {
      return wsManager.subscribe('karaf:log-chunk', callback);
    }
  } satisfies Partial<ElectronAPI>;
}
