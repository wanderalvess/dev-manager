import type { RemoteActionRequest } from '../../../shared/remoteControl';
import type { RemoteActionResult, RemoteBackend } from '../RemoteControlService';
import type { ConfigService } from '../ConfigService';
import type { WindowsService } from '../WindowsService';
import type { KarafService } from '../KarafService';
import type { DockerService } from '../DockerService';
import type { DeployService } from '../DeployService';
import type { BackupSchedulerService } from '../BackupSchedulerService';
import type { KarafLogPersistenceService } from '../KarafLogPersistenceService';
import { isSafeLocalPath } from '../../utils/security';

export interface RemoteBackendDeps {
  configService: ConfigService;
  windowsService: WindowsService;
  karafService: KarafService;
  dockerService: DockerService;
  deployService: DeployService;
  backupSchedulerService: BackupSchedulerService;
  karafLogPersistenceService: KarafLogPersistenceService;
  /** Envia ao renderer (ex.: o log do pipeline aparece na tela do PC também). */
  sendToWindow: (channel: string, ...args: unknown[]) => void;
}

const ok = (message: string): RemoteActionResult => ({ ok: true, message });
const fail = (message: string): RemoteActionResult => ({ ok: false, message });

/**
 * Liga o servidor do celular aos mesmos services do app (nada de lógica de negócio aqui):
 * lê estado e despacha a lista fechada de ações de `shared/remoteControl.ts`.
 */
export function createRemoteBackend(deps: RemoteBackendDeps): RemoteBackend {
  const { configService, windowsService, karafService, dockerService, deployService, backupSchedulerService } = deps;

  const karafChunk = (chunk: string) => {
    deps.karafLogPersistenceService.append(chunk);
    deps.sendToWindow('karaf:stdout', chunk);
  };

  async function runDocker(action: RemoteActionRequest['action'], target: string): Promise<RemoteActionResult> {
    // O alvo tem que ser um container que o Docker realmente lista: nunca repassa texto cru do celular.
    const known = (await dockerService.listContainers()).find((c) => c.id === target);
    if (!known) return fail('Container não encontrado.');
    const name = known.names;
    if (action === 'docker.iniciar') return (await dockerService.startContainer(known.id)) ? ok(`${name} iniciado.`) : fail(`Falha ao iniciar ${name}.`);
    if (action === 'docker.parar') return (await dockerService.stopContainer(known.id)) ? ok(`${name} parado.`) : fail(`Falha ao parar ${name}.`);
    return (await dockerService.restartContainer(known.id)) ? ok(`${name} reiniciado.`) : fail(`Falha ao reiniciar ${name}.`);
  }

  async function runDeploy(profileId: string): Promise<RemoteActionResult> {
    const profile = (configService.getSettings().deployProfiles || []).find((p) => p.id === profileId);
    if (!profile) return fail('Perfil de deploy não encontrado.');
    const result = await deployService.executeProfile(profile, (chunk) => deps.sendToWindow('deploy:log-chunk', chunk));
    return result.success ? ok(`${profile.name} concluído.`) : fail(result.error || `${profile.name} falhou.`);
  }

  async function runBackup(connectionId: string): Promise<RemoteActionResult> {
    const settings = configService.getSettings();
    const connection = (settings.databaseConnections || []).find((c) => c.id === connectionId);
    const config = (settings.backupConfigs || []).find((b) => b.connectionId === connectionId);
    if (!connection || !config?.destinationFolder) return fail('Conexão sem pasta de backup configurada.');
    if (!isSafeLocalPath(config.destinationFolder)) return fail('Pasta de destino inválida.');
    const result = await backupSchedulerService.runManualBackup(connection, config.destinationFolder, {
      oracleDirectory: config.oracleDirectory,
      compress: config.compress,
      useCustomCommand: config.useCustomCommand,
      customCommand: config.customCommand
    });
    return result.success ? ok(`Backup de ${connection.name} concluído.`) : fail(result.message);
  }

  return {
    async getEnvironment() {
      const [services, ports] = await Promise.all([windowsService.getAllServicesStatus(), windowsService.checkPorts()]);
      return {
        karafRunning: karafService.isEmbeddedRunning(),
        services: services.map((s) => ({ label: s.displayName, state: s.state })),
        ports: ports.map((p) => ({ port: p.port, label: p.label, inUse: p.inUse }))
      };
    },

    async getContainers() {
      try {
        const items = await dockerService.listContainers();
        return { items: items.map((c) => ({ id: c.id, name: c.names, state: c.state, status: c.status })) };
      } catch (err) {
        return { items: [], error: `Docker indisponível: ${(err as Error).message}` };
      }
    },

    getLists() {
      const settings = configService.getSettings();
      const withBackup = new Set((settings.backupConfigs || []).filter((b) => b.destinationFolder).map((b) => b.connectionId));
      return {
        deploys: (settings.deployProfiles || []).map((p) => ({ id: p.id, name: p.name })),
        backups: (settings.databaseConnections || [])
          .filter((c) => withBackup.has(c.id))
          .map((c) => ({ id: c.id, name: c.name, type: c.type }))
      };
    },

    readLog: (maxChars) => deps.karafLogPersistenceService.read(maxChars),

    async run({ action, target }) {
      switch (action) {
        case 'ambiente.preparar': {
          const result = await windowsService.resetEnvironment(
            'embedded',
            (log) => deps.sendToWindow('env:log-event', log),
            karafChunk
          );
          return result.success ? ok('Ambiente pronto.') : fail('O ambiente não ficou pronto. Veja o log no PC.');
        }
        case 'karaf.iniciar':
          if (karafService.isEmbeddedRunning()) return ok('O Karaf já está rodando.');
          return karafService.startEmbeddedKarafDebug(karafChunk) ? ok('Karaf iniciando em debug.') : fail('Não foi possível iniciar o Karaf.');
        case 'karaf.parar':
          return (await karafService.stopEmbeddedKaraf()) ? ok('Karaf parado.') : fail('O Karaf não estava rodando.');
        case 'karaf.debug':
          return windowsService.launchServerDebug() ? ok('Servidor debug aberto no PC.') : fail('Não foi possível abrir o servidor debug.');
        case 'ide.abrir':
          return (await windowsService.launchIntelliJ()) ? ok('IDE aberta no PC.') : fail('Não foi possível abrir a IDE.');
        case 'docker.iniciar':
        case 'docker.parar':
        case 'docker.reiniciar':
          return runDocker(action, target as string);
        case 'deploy.executar':
          return runDeploy(target as string);
        case 'banco.backup':
          return runBackup(target as string);
      }
    }
  };
}
