import { ipcMain } from 'electron';
import { notifyUser } from '../../services/NotificationService';
import {
  KarafDeployRequest,
  InstallBundleRequest,
  ReinstallBundleRequest,
  UpdateBundleVersionRequest
} from '../../../shared/types';
import { safeSend } from '../../utils/ipcSend';
import type { IpcContext } from '../ipcContext';

/** Karaf: deploy, console embutido, bundles, features e JVM. Canais: karaf:* */
export function registerKarafHandlers(ctx: IpcContext): void {
  const { mainWindow, karafService, karafLogPersistenceService } = ctx;

  ipcMain.handle('karaf:start-embedded', async () => {
    return karafService.startEmbeddedKarafDebug((chunk) => {
      karafLogPersistenceService.append(chunk);
      safeSend(mainWindow, 'karaf:stdout', chunk);
    });
  });

  ipcMain.handle('karaf:get-persisted-logs', async (_, maxChars?: number) => {
    return { output: karafLogPersistenceService.read(maxChars) };
  });

  ipcMain.handle('karaf:clear-persisted-logs', async () => {
    karafLogPersistenceService.clear();
    return { success: true };
  });

  ipcMain.handle('karaf:send-input', async (_, input: string) => {
    return karafService.sendEmbeddedInput(input);
  });

  ipcMain.handle('karaf:stop-embedded', async () => {
    return await karafService.stopEmbeddedKaraf();
  });

  ipcMain.handle('karaf:is-embedded-running', async () => {
    return karafService.isEmbeddedRunning();
  });

  ipcMain.handle('karaf:is-running', async (_, sshPort?: number) => {
    return await karafService.isKarafRunning(sshPort);
  });

  ipcMain.handle('karaf:deploy', async (_, request: KarafDeployRequest) => {
    const result = await karafService.deploy(request, (chunk) => {
      safeSend(mainWindow, 'karaf:log-chunk', chunk);
    });
    notifyUser(mainWindow, 'karaf:deploy-result', result, {
      title: result.success ? 'Deploy Karaf concluído' : 'Falha no deploy Karaf',
      body: result.success ? request.featureInstall : result.error || 'Erro desconhecido no deploy'
    });
    return result;
  });

  ipcMain.handle('karaf:exec-diagnostic', async (_, command: string) => {
    return await karafService.executeKarafCommand(command, (chunk) => {
      safeSend(mainWindow, 'karaf:log-chunk', chunk);
    });
  });

  ipcMain.handle(
    'karaf:build-and-deploy',
    async (_, request: KarafDeployRequest, projectPath: string, skipTests: boolean = true) => {
      const result = await karafService.buildAndDeployMaven(request, projectPath, skipTests, (chunk) => {
        safeSend(mainWindow, 'karaf:log-chunk', chunk);
      });
      notifyUser(mainWindow, 'karaf:deploy-result', result, {
        title: result.success ? 'Build + Deploy Karaf concluído' : 'Falha no build/deploy Karaf',
        body: result.success ? request.featureInstall : result.error || 'Erro desconhecido no build/deploy'
      });
      return result;
    }
  );

  ipcMain.handle('karaf:list-deploy-history', async () => {
    return karafService.getDeployHistory();
  });

  ipcMain.handle('karaf:run-maven-build', async (_, projectPath: string, skipTests: boolean = true) => {
    const result = await karafService.runMavenBuild(projectPath, skipTests, (chunk) => {
      safeSend(mainWindow, 'karaf:log-chunk', chunk);
    });
    if (result.code !== 0) {
      notifyUser(mainWindow, 'karaf:build-result', result, {
        title: 'Falha na compilação Maven',
        body: `Build de "${projectPath}" terminou com código ${result.code}.`
      });
    }
    return result;
  });

  ipcMain.handle('karaf:list-bundles', async (_, credentials?: { user?: string; pass?: string; port?: number }) => {
    return await karafService.listBundlesParsed(credentials);
  });

  ipcMain.handle(
    'karaf:manage-bundle',
    async (
      _,
      action: 'start' | 'stop' | 'restart' | 'uninstall' | 'refresh' | 'resolve',
      bundleId: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ) => {
      return await karafService.manageBundle(action, bundleId, credentials, (chunk) => {
        safeSend(mainWindow, 'karaf:log-chunk', chunk);
      });
    }
  );

  ipcMain.handle(
    'karaf:manage-bundles-batch',
    async (
      _,
      action: 'start' | 'stop' | 'restart' | 'uninstall' | 'refresh' | 'resolve',
      bundleIds: string[],
      credentials?: { user?: string; pass?: string; port?: number }
    ) => {
      return await karafService.manageBundlesBatch(action, bundleIds, credentials, (chunk) => {
        safeSend(mainWindow, 'karaf:log-chunk', chunk);
      });
    }
  );

  ipcMain.handle(
    'karaf:get-log',
    async (_, lines?: number, credentials?: { user?: string; pass?: string; port?: number }) => {
      return await karafService.getKarafLog(lines, credentials);
    }
  );

  ipcMain.handle(
    'karaf:get-bundle-details',
    async (_, bundleId: string, credentials?: { user?: string; pass?: string; port?: number }) => {
      return await karafService.getBundleDetails(bundleId, credentials);
    }
  );

  ipcMain.handle(
    'karaf:check-bundle-deps',
    async (_, bundleId: string, credentials?: { user?: string; pass?: string; port?: number }) => {
      return await karafService.checkBundleDependencies(bundleId, credentials);
    }
  );

  ipcMain.handle(
    'karaf:check-install-deps',
    async (
      _,
      target: { location?: string; symbolicName?: string; version?: string },
      credentials?: { user?: string; pass?: string; port?: number }
    ) => {
      return await karafService.checkInstallDependencies(target, credentials);
    }
  );

  ipcMain.handle('karaf:install-bundle', async (_, request: InstallBundleRequest) => {
    return await karafService.installBundle(request, (chunk) => {
      safeSend(mainWindow, 'karaf:log-chunk', chunk);
    });
  });

  ipcMain.handle('karaf:uninstall-bundle', async (_, bundleId: string, credentials?: { user?: string; pass?: string; port?: number }) => {
    return await karafService.uninstallBundle(bundleId, credentials, (chunk) => {
      safeSend(mainWindow, 'karaf:log-chunk', chunk);
    });
  });

  ipcMain.handle('karaf:list-features', async (_, credentials?: { user?: string; pass?: string; port?: number }) => {
    return await karafService.listInstalledFeatures(credentials);
  });

  ipcMain.handle(
    'karaf:uninstall-feature',
    async (
      _,
      featureName: string,
      version?: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ) => {
      return await karafService.uninstallFeature(featureName, version, credentials, (chunk) => {
        safeSend(mainWindow, 'karaf:log-chunk', chunk);
      });
    }
  );

  ipcMain.handle(
    'karaf:install-feature',
    async (
      _,
      featureName: string,
      version?: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ) => {
      return await karafService.installFeature(featureName, version, credentials, (chunk) => {
        safeSend(mainWindow, 'karaf:log-chunk', chunk);
      });
    }
  );

  ipcMain.handle('karaf:reinstall-bundle', async (_, request: ReinstallBundleRequest) => {
    return await karafService.reinstallBundle(request, (chunk) => {
      safeSend(mainWindow, 'karaf:log-chunk', chunk);
    });
  });

  ipcMain.handle('karaf:update-bundle-version', async (_, request: UpdateBundleVersionRequest) => {
    return await karafService.updateBundleVersion(request, (chunk) => {
      safeSend(mainWindow, 'karaf:log-chunk', chunk);
    });
  });

  ipcMain.handle('karaf:parse-pom', async (_, projectPath: string) => {
    return karafService.parseProjectPomOrBat(projectPath);
  });

  ipcMain.handle('karaf:get-jvm-memory', async (_, credentials?: { user?: string; pass?: string; port?: number }) => {
    return await karafService.getJvmMemoryMetrics(credentials);
  });

  ipcMain.handle('karaf:trigger-gc', async (_, credentials?: { user?: string; pass?: string; port?: number }) => {
    return await karafService.triggerGarbageCollection(credentials);
  });

  ipcMain.handle('karaf:list-feature-repos', async (_, credentials?: { user?: string; pass?: string; port?: number }) => {
    return await karafService.listFeatureRepositories(credentials);
  });

  ipcMain.handle(
    'karaf:add-feature-repo',
    async (_, url: string, credentials?: { user?: string; pass?: string; port?: number }) => {
      return await karafService.addFeatureRepository(url, credentials, (chunk) => {
        safeSend(mainWindow, 'karaf:log-chunk', chunk);
      });
    }
  );

  ipcMain.handle(
    'karaf:remove-feature-repo',
    async (_, nameOrUrl: string, credentials?: { user?: string; pass?: string; port?: number }) => {
      return await karafService.removeFeatureRepository(nameOrUrl, credentials, (chunk) => {
        safeSend(mainWindow, 'karaf:log-chunk', chunk);
      });
    }
  );

  ipcMain.handle(
    'karaf:refresh-feature-repo',
    async (_, nameOrUrl?: string, credentials?: { user?: string; pass?: string; port?: number }) => {
      return await karafService.refreshFeatureRepository(nameOrUrl, credentials, (chunk) => {
        safeSend(mainWindow, 'karaf:log-chunk', chunk);
      });
    }
  );

  ipcMain.handle(
    'karaf:list-all-features',
    async (_, installedOnly?: boolean, credentials?: { user?: string; pass?: string; port?: number }) => {
      return await karafService.listAllFeatures(installedOnly, credentials);
    }
  );

  ipcMain.handle('karaf:analyze-log', async (_, content: string | string[]) => {
    return karafService.analyzeLogText(content);
  });
}
