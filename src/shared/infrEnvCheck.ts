/**
 * Verificar um ambiente do INFR-Docker (Assistente INFR → Verificar ambiente): o estado de cada
 * container (oracle/wta/wsh-<nome>), as últimas linhas do log, se o WTA responde e os mesmos testes
 * como comandos para copiar ou abrir no terminal.
 */
import { isValidEnvName } from './infrWinthorVersion';

export type InfrRole = 'oracle' | 'wta' | 'wsh';
export const INFR_ROLES: InfrRole[] = ['oracle', 'wta', 'wsh'];
export const INFR_ROLE_LABEL: Record<InfrRole, string> = { oracle: 'Banco Oracle', wta: 'WTA', wsh: 'WSH' };

export interface InfrContainerCheck {
  role: InfrRole;
  container: string;
  exists: boolean;
  /** running, restarting, exited, created, dead… */
  state?: string;
  /** healthy, unhealthy, starting (só quando a imagem tem healthcheck) */
  health?: string;
  restarts?: number;
  startedAt?: string;
  image?: string;
  /** Portas publicadas, como o docker port mostra (8080/tcp -> 0.0.0.0:8087) */
  ports: string[];
  logTail: string[];
}

export type InfrEnvStatus = 'ok' | 'starting' | 'fail' | 'missing';

export interface InfrEnvCheck {
  success: boolean;
  error?: string;
  name?: string;
  distro?: string;
  checkedAt?: string;
  containers: InfrContainerCheck[];
  wtaHttp?: { url: string; status?: number; error?: string };
  summary?: { status: InfrEnvStatus; title: string; detail: string };
}

export type InfrCheckCommandId = 'ps' | 'logs-oracle' | 'logs-wta' | 'logs-wsh' | 'wta-http';

export interface InfrCheckCommand {
  id: InfrCheckCommandId;
  label: string;
  command: string;
}

/** Comandos de verificação de um ambiente, os mesmos que a tela mostra para copiar e o Executar abre. */
export function infrCheckCommands(name: string, wtaPort?: number): InfrCheckCommand[] {
  if (!isValidEnvName(name)) return [];
  const n = name.trim();
  const list: InfrCheckCommand[] = [
    { id: 'ps', label: 'Containers e estado', command: `docker ps -a --filter name=${n}` },
    { id: 'logs-oracle', label: 'Log do banco', command: `docker logs --tail 200 -f oracle-${n}` },
    { id: 'logs-wta', label: 'Log do WTA', command: `docker logs --tail 200 -f wta-${n}` },
    { id: 'logs-wsh', label: 'Log do WSH', command: `docker logs --tail 200 -f wsh-${n}` }
  ];
  if (wtaPort && Number.isInteger(wtaPort) && wtaPort > 0 && wtaPort <= 65535) {
    list.push({ id: 'wta-http', label: 'WTA responde', command: `curl -s -o /dev/null -w '%{http_code}\\n' http://localhost:${wtaPort}/` });
  }
  return list;
}

/** Porta do Windows ligada à 8080 do WTA, pelas linhas do docker port. */
export function wtaHostPort(ports: string[]): number | undefined {
  for (const line of ports) {
    const m = /^8080\/tcp\s*->\s*[^\s]*:(\d{2,5})\s*$/.exec(line.trim());
    if (m) return parseInt(m[1], 10);
  }
  return undefined;
}

/**
 * Lê a saída do script de verificação: para cada container um bloco `@@c <nome>`, a linha do
 * docker inspect (`estado|health|reinícios|início|imagem` ou MISSING), `@@ports` e `@@logs`.
 */
export function parseEnvCheckOutput(output: string, name: string): InfrContainerCheck[] {
  const blocks = new Map<string, { inspect: string; ports: string[]; logs: string[] }>();
  let current: { inspect: string; ports: string[]; logs: string[] } | null = null;
  let section: 'inspect' | 'ports' | 'logs' = 'inspect';
  for (const raw of output.split(/\r?\n/)) {
    const line = raw.replace(/\x1b\[[0-9;]*m/g, ''); // eslint-disable-line no-control-regex
    const head = /^@@c (\S+)$/.exec(line.trim());
    if (head) {
      current = { inspect: '', ports: [], logs: [] };
      blocks.set(head[1], current);
      section = 'inspect';
      continue;
    }
    if (!current) continue;
    if (line.trim() === '@@ports') section = 'ports';
    else if (line.trim() === '@@logs') section = 'logs';
    else if (section === 'inspect' && !current.inspect && line.trim()) current.inspect = line.trim();
    else if (section === 'ports' && line.trim()) current.ports.push(line.trim());
    else if (section === 'logs' && line.trim()) current.logs.push(line.trimEnd());
  }
  return INFR_ROLES.map((role) => {
    const container = `${role}-${name}`;
    const b = blocks.get(container);
    if (!b || !b.inspect || b.inspect === 'MISSING') return { role, container, exists: false, ports: [], logTail: [] };
    const [state, health, restarts, startedAt, image] = b.inspect.split('|');
    return {
      role,
      container,
      exists: true,
      state: state || undefined,
      health: health || undefined,
      restarts: Number.isFinite(Number(restarts)) ? Number(restarts) : undefined,
      startedAt: startedAt || undefined,
      image: image || undefined,
      ports: b.ports,
      logTail: b.logs.slice(-30)
    };
  });
}

/** Motivo conhecido de falha nas últimas linhas do log (o WSH recusando a versão do WTA, por exemplo). */
function knownFailure(c: InfrContainerCheck): string | undefined {
  const text = c.logTail.join('\n');
  const version = /Vers[aã]o exigida[^\n]*/i.exec(text);
  if (version) return version[0].trim();
  const ora = /ORA-\d{5}[^\n]*/.exec(text);
  if (ora) return ora[0].trim();
  return undefined;
}

/** Resumo: no ar (os três rodando e o WTA respondendo), subindo, falhou ou não existe. */
export function summarizeEnvCheck(containers: InfrContainerCheck[], wtaHttp?: InfrEnvCheck['wtaHttp']): NonNullable<InfrEnvCheck['summary']> {
  const present = containers.filter((c) => c.exists);
  if (present.length === 0) {
    return { status: 'missing', title: 'Nenhum container deste ambiente', detail: 'O Gerar ainda não criou os containers, ou o nome está diferente.' };
  }
  const broken = present.filter((c) => c.state === 'exited' || c.state === 'dead' || c.health === 'unhealthy' || (c.restarts ?? 0) >= 3);
  if (broken.length) {
    const why = broken.map((c) => `${INFR_ROLE_LABEL[c.role]}: ${knownFailure(c) || (c.state === 'running' ? `${c.health ?? ''} ${c.restarts ? `(${c.restarts} reinícios)` : ''}`.trim() : c.state)}`);
    return { status: 'fail', title: `Falhou: ${broken.map((c) => INFR_ROLE_LABEL[c.role]).join(', ')}`, detail: `${why.join('; ')}. Veja o log de cada um abaixo.` };
  }
  const missing = containers.filter((c) => !c.exists);
  const running = present.filter((c) => c.state === 'running' && c.health !== 'starting');
  const wtaOk = !!wtaHttp?.status && wtaHttp.status < 500;
  if (missing.length === 0 && running.length === containers.length && wtaOk) {
    return { status: 'ok', title: 'Ambiente no ar', detail: `Banco, WTA e WSH rodando; o WTA respondeu HTTP ${wtaHttp!.status} em ${wtaHttp!.url}.` };
  }
  const waiting = [
    ...missing.map((c) => `${INFR_ROLE_LABEL[c.role]} ainda não criado`),
    ...present.filter((c) => !running.includes(c)).map((c) => `${INFR_ROLE_LABEL[c.role]} ${c.health === 'starting' ? 'iniciando' : c.state}`),
    ...(running.some((c) => c.role === 'wta') && !wtaOk ? [`WTA ainda não responde${wtaHttp?.error ? ` (${wtaHttp.error})` : ''}`] : [])
  ];
  return {
    status: 'starting',
    title: `Subindo: ${running.length} de ${containers.length} no ar`,
    detail: `${waiting.join('; ')}. O WTA leva alguns minutos para subir o Karaf; o WSH espera o WTA.`
  };
}

/** Comando longo do script em várias linhas (uma opção por linha, com `\`), para ler sem cortar e colar no bash. */
export function multilineCommand(command: string): string {
  return command.replace(/ (--[a-z][a-z-]*)/g, ' \\\n  $1');
}
