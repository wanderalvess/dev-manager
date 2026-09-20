/**
 * Lógica pura extraída de ContainersPage.tsx: parsing de strings de porta do Docker,
 * derivação da topologia da stack WinThor (Oracle/WTA/WSH) e montagem de slots de
 * Ambiente. Extraída para ser testável sem precisar renderizar o componente.
 */
import type {
  ContainerEnvironmentSlot,
  DockerContainerInfo,
  DockerContainerPortBinding
} from '../../../shared/types';

export interface PortLink {
  hostPort: number;
  containerPort: number;
  protocol: string;
}

/**
 * Extrai os pares hostPort/containerPort/protocol da string de portas do `docker ps`
 * (ex: "0.0.0.0:5432->5432/tcp, :::5432->5432/tcp").
 */
export function parsePortLinks(portsStr: string): PortLink[] {
  if (!portsStr) return [];
  const regex = /(?:[\d.]+::?|\[::\]:)?(\d+)->(\d+)\/([a-z]+)/gi;
  const matches: PortLink[] = [];
  let match;
  while ((match = regex.exec(portsStr)) !== null) {
    matches.push({
      hostPort: parseInt(match[1], 10),
      containerPort: parseInt(match[2], 10),
      protocol: match[3]
    });
  }
  return matches;
}

/** Extrai a porta do host mapeada para o listener Oracle (padrão XE: 1522 ou 1521). */
export function extractOraclePort(portsStr?: string): string {
  if (!portsStr) return '1522';
  const match = portsStr.match(/(?:[\d.]+::?|\[::\]:)?(\d+)->1521/);
  if (match && match[1]) return match[1];
  const directMatch = portsStr.match(/(\d+):1521/);
  if (directMatch && directMatch[1]) return directMatch[1];
  return '1522';
}

/** Extrai a porta do host mapeada para o WTA (padrão: 8080). */
export function extractWtaPort(ports?: string): number {
  if (!ports) return 8080;
  const match = ports.match(/0\.0\.0\.0:(\d+)->8080/);
  if (match) return parseInt(match[1], 10);
  const altMatch = ports.match(/:(\d+)->/);
  if (altMatch) return parseInt(altMatch[1], 10);
  return 8080;
}

/** Bloco oficial tnsnames.ora para conexão local ao Oracle. */
export function getOracleTnsConfig(port = '1522', alias = 'LOCAL_DOCKER', sid = 'XE'): string {
  return `${alias} =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = localhost)(PORT = ${port}))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = ${sid})
    )
  )`;
}

/** Filtra containers pelo termo de busca (nome, imagem, id ou portas), case-insensitive. */
export function filterContainers(containers: DockerContainerInfo[], filter: string): DockerContainerInfo[] {
  if (!filter) return containers;
  const lower = filter.toLowerCase();
  return containers.filter(
    (c) =>
      c.names.toLowerCase().includes(lower) ||
      c.image.toLowerCase().includes(lower) ||
      c.id.toLowerCase().includes(lower) ||
      c.ports.toLowerCase().includes(lower)
  );
}

export interface FlatPortBinding {
  containerPort: string;
  protocol: string;
  hostIp?: string;
  hostPort: string;
}

/**
 * Achata o dicionário de portas do `docker inspect` (chave "containerPort/protocolo" ->
 * lista de bindings de host) em uma lista plana, pronta para exibição.
 */
export function flattenPortBindings(
  ports: Record<string, DockerContainerPortBinding[] | null> | undefined
): FlatPortBinding[] {
  return Object.entries(ports || {}).flatMap(([key, bindings]) => {
    const [containerPort, protocol] = key.split('/');
    return (bindings || []).map((b) => ({
      containerPort,
      protocol: protocol || 'tcp',
      hostIp: b.hostIp,
      hostPort: b.hostPort
    }));
  });
}

export interface StackTopologyNode {
  container: DockerContainerInfo | null;
  name: string;
  running: boolean;
  port: string;
  exists: boolean;
}

export interface StackTopology {
  oracle: StackTopologyNode;
  wta: StackTopologyNode;
  wsh: StackTopologyNode;
  isStackComplete: boolean;
  hasMissingDependency: boolean;
}

/** Deriva o estado da stack WinThor (Oracle -> WTA -> WSH) a partir da lista de containers. */
export function computeStackTopology(containers: DockerContainerInfo[]): StackTopology {
  const oracle = containers.find((c) => c.names.toLowerCase().includes('oracle'));
  const wta = containers.find((c) => c.names.toLowerCase().includes('wta') || c.names.toLowerCase().includes('linux'));
  const wsh = containers.find((c) => c.names.toLowerCase().includes('wsh'));

  const oracleRunning = oracle?.state === 'running';
  const wtaRunning = wta?.state === 'running';
  const wshRunning = wsh?.state === 'running';

  const isStackComplete = Boolean(oracle && wta && oracleRunning && wtaRunning && (!wsh || wshRunning));
  const hasMissingDependency = Boolean((wtaRunning || wshRunning) && !oracleRunning);

  return {
    oracle: {
      container: oracle || null,
      name: oracle ? oracle.names.replace(/^\//, '') : 'oracle-winthor',
      running: oracleRunning,
      port: extractOraclePort(oracle?.ports),
      exists: Boolean(oracle)
    },
    wta: {
      container: wta || null,
      name: wta ? wta.names.replace(/^\//, '') : 'linux-winthor',
      running: wtaRunning,
      port: String(extractWtaPort(wta?.ports)),
      exists: Boolean(wta)
    },
    wsh: {
      container: wsh || null,
      name: wsh ? wsh.names.replace(/^\//, '') : 'wsh-winthor',
      running: wshRunning,
      port: '8080',
      exists: Boolean(wsh)
    },
    isStackComplete,
    hasMissingDependency
  };
}

/** Monta os slots de um Ambiente a partir do preset escolhido ou dos containers atuais. */
export function buildEnvironmentSlots(
  presetType: 'current' | 'doc' | 'infr',
  containers: DockerContainerInfo[]
): ContainerEnvironmentSlot[] {
  if (presetType === 'doc') {
    return [
      { id: '1', name: 'oracle-local', delay: 30 },
      { id: '2', name: 'wta-local', delay: 10 },
      { id: '3', name: 'wsh-local' }
    ];
  }
  if (presetType === 'infr') {
    return [
      { id: '1', name: 'oracle-winthor', delay: 45 },
      { id: '2', name: 'linux-winthor', delay: 15 },
      { id: '3', name: 'wsh-winthor' }
    ];
  }

  const oracleContainer = containers.find((c) => c.names.toLowerCase().includes('oracle'));
  const wtaContainer = containers.find((c) => c.names.toLowerCase().includes('wta') || c.names.toLowerCase().includes('linux-winthor'));
  const wshContainer = containers.find((c) => c.names.toLowerCase().includes('wsh'));

  return [
    { id: '1', name: oracleContainer ? oracleContainer.names.replace(/^\//, '') : 'oracle-local', delay: 30 },
    { id: '2', name: wtaContainer ? wtaContainer.names.replace(/^\//, '') : 'wta-local', delay: 10 },
    ...(wshContainer ? [{ id: '3', name: wshContainer.names.replace(/^\//, '') }] : [])
  ];
}
