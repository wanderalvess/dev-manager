import { ipcMain } from 'electron';
import { safeSend } from '../../utils/ipcSend';
import type { IpcContext } from '../ipcContext';

/** Containers (Docker/Podman) e Compose. Canais: docker:* */
export function registerContainerHandlers(ctx: IpcContext): void {
  const { mainWindow, dockerService } = ctx;

  ipcMain.handle('docker:set-target-wsl-distro', async (_, distro: string | null) => {
    dockerService.setTargetWslDistro(distro);
    return await dockerService.checkDockerStatus();
  });

  ipcMain.handle(
    'docker:start-sequence',
    async (_, containers: { name: string; delay?: number }[]) => {
      if (!Array.isArray(containers)) {
        throw new Error('containers deve ser um array.');
      }
      return await dockerService.startContainerSequence(containers, (step) => {
        safeSend(mainWindow, 'docker:sequence-progress', step);
      });
    }
  );

  ipcMain.handle(
    'docker:stop-sequence',
    async (_, containers: string[]) => {
      if (!Array.isArray(containers)) {
        throw new Error('containers deve ser um array.');
      }
      return await dockerService.stopContainerSequence(containers, (step) => {
        safeSend(mainWindow, 'docker:stop-sequence-progress', step);
      });
    }
  );

  ipcMain.handle(
    'docker:oracle-health',
    async (_, containerName: string, schema?: string, fix?: boolean, user?: string, password?: string) => {
      return await dockerService.execOracleHealth(containerName, schema, fix, user, password);
    }
  );

  ipcMain.handle(
    'docker:oracle-sqlplus',
    async (_, containerName: string, user?: string, password?: string) => {
      return await dockerService.openOracleSqlPlus(containerName, user, password);
    }
  );

  ipcMain.handle(
    'docker:oracle-datapump',
    async (_, params: any) => {
      return await dockerService.execOracleDataPump(params);
    }
  );

  ipcMain.handle(
    'docker:wta-karaf-client',
    async (_, containerName: string) => {
      return await dockerService.openWtaKarafClient(containerName);
    }
  );

  ipcMain.handle('docker:get-status', async () => {
    return await dockerService.checkDockerStatus();
  });

  ipcMain.handle('docker:list-containers', async () => {
    return await dockerService.listContainers();
  });

  ipcMain.handle('docker:start', async (_, containerId: string) => {
    return await dockerService.startContainer(containerId);
  });

  ipcMain.handle('docker:stop', async (_, containerId: string) => {
    return await dockerService.stopContainer(containerId);
  });

  ipcMain.handle('docker:restart', async (_, containerId: string) => {
    return await dockerService.restartContainer(containerId);
  });

  ipcMain.handle('docker:logs', async (_, containerId: string, lines?: number) => {
    return await dockerService.getContainerLogs(containerId, lines);
  });

  ipcMain.handle('docker:remove', async (_, containerId: string) => {
    return await dockerService.removeContainer(containerId);
  });

  ipcMain.handle('docker:get-stats', async () => {
    return await dockerService.getContainerStats();
  });

  ipcMain.handle('docker:open-terminal', async (_, containerId: string, shellName?: string) => {
    return await dockerService.openContainerTerminal(containerId, shellName);
  });

  ipcMain.handle('docker:inspect', async (_, containerId: string) => {
    return await dockerService.inspectContainer(containerId);
  });

  ipcMain.handle('docker:pause', async (_, containerId: string) => {
    return await dockerService.pauseContainer(containerId);
  });

  ipcMain.handle('docker:unpause', async (_, containerId: string) => {
    return await dockerService.unpauseContainer(containerId);
  });

  ipcMain.handle('docker:prune', async () => {
    return await dockerService.pruneContainers();
  });

  ipcMain.handle(
    'docker:compose-up',
    async (_, composeFilePath: string, options?: { profile?: string; detach?: boolean; build?: boolean }) => {
      return await dockerService.composeUp(composeFilePath, options, (chunk) => {
        safeSend(mainWindow, 'docker:compose-log-chunk', chunk);
      });
    }
  );

  ipcMain.handle('docker:compose-down', async (_, composeFilePath: string, options?: { profile?: string; volumes?: boolean }) => {
    return await dockerService.composeDown(composeFilePath, options, (chunk) => {
      safeSend(mainWindow, 'docker:compose-log-chunk', chunk);
    });
  });

  ipcMain.handle('docker:compose-restart', async (_, composeFilePath: string, options?: { profile?: string }) => {
    return await dockerService.composeRestart(composeFilePath, options, (chunk) => {
      safeSend(mainWindow, 'docker:compose-log-chunk', chunk);
    });
  });

  ipcMain.handle('docker:compose-logs', async (_, composeFilePath: string, options?: { profile?: string; lines?: number }) => {
    return await dockerService.getComposeLogs(composeFilePath, options);
  });

  ipcMain.handle('docker:compose-status', async (_, composeFilePath: string, profile?: string) => {
    return await dockerService.composeStatus(composeFilePath, profile);
  });
}
