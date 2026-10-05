import type {
  DockerContainerInspect,
  DockerContainerMount,
  DockerContainerPortBinding
} from '../../shared/types';

const SENSITIVE_ENV_KEY = /PASSWORD|SECRET|TOKEN|API[_-]?KEY|PWD|CREDENTIAL/i;

/** Mascara o valor de variáveis de ambiente sensíveis, preservando as demais entradas. */
export function redactEnv(rawEnv: unknown): string[] {
  return Array.isArray(rawEnv)
    ? rawEnv.map((entry: string) => {
        const idx = entry.indexOf('=');
        const key = idx === -1 ? entry : entry.slice(0, idx);
        return SENSITIVE_ENV_KEY.test(key)
          ? `${key}=***REDACTED***`
          : entry;
      })
    : [];
}

export function parseInspectPorts(data: any): Record<string, DockerContainerPortBinding[] | null> {
  const rawPorts = data.NetworkSettings?.Ports || {};
  const ports: Record<string, DockerContainerPortBinding[] | null> = {};
  for (const [key, val] of Object.entries(rawPorts)) {
    if (Array.isArray(val)) {
      ports[key] = val.map((p: any) => ({
        hostIp: p.HostIp || '0.0.0.0',
        hostPort: p.HostPort || ''
      }));
    } else {
      ports[key] = null;
    }
  }
  return ports;
}

export function parseInspectMounts(data: any): DockerContainerMount[] {
  return Array.isArray(data.Mounts)
    ? data.Mounts.map((m: any) => ({
        type: m.Type || 'volume',
        name: m.Name,
        source: m.Source || '',
        destination: m.Destination || '',
        driver: m.Driver,
        mode: m.Mode || '',
        rw: m.RW ?? true,
        propagation: m.Propagation
      }))
    : [];
}

function parseInspectState(data: any): DockerContainerInspect['state'] {
  return {
    status: data.State?.Status || 'unknown',
    running: !!data.State?.Running,
    paused: !!data.State?.Paused,
    restarting: !!data.State?.Restarting,
    oomKilled: data.State?.OOMKilled,
    dead: data.State?.Dead,
    pid: data.State?.Pid,
    exitCode: data.State?.ExitCode ?? 0,
    error: data.State?.Error,
    startedAt: data.State?.StartedAt || '',
    finishedAt: data.State?.FinishedAt || '',
    health: data.State?.Health ? {
      status: data.State.Health.Status,
      failingStreak: data.State.Health.FailingStreak
    } : undefined
  };
}

/** Converte o primeiro item do JSON de `docker inspect` no modelo da UI (env com segredos mascarados). */
export function buildContainerInspect(data: any, containerId: string): DockerContainerInspect {
  const ports = parseInspectPorts(data);
  const mounts = parseInspectMounts(data);

  return {
    id: data.Id || containerId,
    name: (data.Name || '').replace(/^\//, ''),
    image: data.Config?.Image || data.Image || '',
    imageId: data.Image,
    created: data.Created || '',
    path: data.Path,
    args: data.Args || [],
    state: parseInspectState(data),
    networkSettings: {
      ipAddress: data.NetworkSettings?.IPAddress || '',
      gateway: data.NetworkSettings?.Gateway || '',
      macAddress: data.NetworkSettings?.MacAddress || '',
      ports,
      networks: data.NetworkSettings?.Networks
    },
    mounts,
    env: redactEnv(data.Config?.Env),
    command: Array.isArray(data.Config?.Cmd) ? data.Config.Cmd.join(' ') : (data.Config?.Cmd || ''),
    entrypoint: Array.isArray(data.Config?.Entrypoint) ? data.Config.Entrypoint : undefined,
    cmd: Array.isArray(data.Config?.Cmd) ? data.Config.Cmd : undefined,
    platform: data.Platform || undefined,
    workingDir: data.Config?.WorkingDir || '',
    restartPolicy: data.HostConfig?.RestartPolicy ? {
      name: data.HostConfig.RestartPolicy.Name || 'no',
      maximumRetryCount: data.HostConfig.RestartPolicy.MaximumRetryCount
    } : undefined
  };
}
