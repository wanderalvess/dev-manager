/**
 * Verificar um ambiente do INFR-Docker (Assistente INFR → Verificar ambiente): o estado de cada
 * container (oracle/wta/wsh-<nome>), as últimas linhas do log, se o WTA responde e os mesmos testes
 * como comandos para copiar ou abrir no terminal.
 */
import type { BuildLogReport } from './infrBuildLog';
import type { InfrHttpProbe, InfrPostItem } from './infrPostCheck';
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
  /** Linhas (com a hora, docker logs --timestamps) do log inteiro que mostram o Karaf travado: bundles que estouraram o tempo, pacotes em transição */
  stuck?: string[];
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
  /** Fim do log do build (new_version_env.sh), quando a criação foi aberto por este Hub nesta distro */
  buildLog?: BuildLogReport;
  summary?: { status: InfrEnvStatus; title: string; detail: string };
  /** Rota de login do WTA (sem credencial): 404 é a autenticação que ainda não subiu */
  wtaLogin?: InfrHttpProbe;
  /** Validação depois da criação: banco, ordem de subida, Karaf, login e WSH */
  post?: InfrPostItem[];
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
  type Block = { inspect: string; ports: string[]; logs: string[]; stuck: string[] };
  const blocks = new Map<string, Block>();
  let current: Block | null = null;
  let section: 'inspect' | 'ports' | 'logs' | 'stuck' = 'inspect';
  for (const raw of output.split(/\r?\n/)) {
    const line = raw.replace(/\x1b\[[0-9;]*m/g, ''); // eslint-disable-line no-control-regex
    const head = /^@@c (\S+)$/.exec(line.trim());
    if (head) {
      current = { inspect: '', ports: [], logs: [], stuck: [] };
      blocks.set(head[1], current);
      section = 'inspect';
      continue;
    }
    if (!current) continue;
    if (line.trim() === '@@ports') section = 'ports';
    else if (line.trim() === '@@logs') section = 'logs';
    else if (line.trim() === '@@stuck') section = 'stuck';
    else if (section === 'inspect' && !current.inspect && line.trim()) current.inspect = line.trim();
    else if (section === 'ports' && line.trim()) current.ports.push(line.trim());
    else if (section === 'logs' && line.trim()) current.logs.push(line.trimEnd());
    else if (section === 'stuck' && line.trim()) current.stuck.push(line.trimEnd());
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
      logTail: b.logs.slice(-30),
      ...(b.stuck.length ? { stuck: b.stuck.slice(-40) } : {})
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

/** Nomes dos bundles que estouraram o tempo de inicialização (Spring DM/blueprint) na subida atual do WTA. */
export function stuckBundles(c: InfrContainerCheck): string[] {
  const names = new Set<string>();
  // O docker logs devolve o log desde a criação do container, com todas as subidas. Só vale a subida atual: linhas com a
  // hora (docker logs --timestamps) de antes do StartedAt são de um start anterior. Sem StartedAt, vale tudo.
  const since = c.startedAt ? Date.parse(c.startedAt) : NaN;
  for (const line of c.stuck ?? []) {
    if (Number.isFinite(since)) {
      const at = Date.parse(/^(\S+)\s/.exec(line)?.[1] ?? '');
      if (!Number.isFinite(at) || at < since) continue;
    }
    const m = /Application context initialization for '([^']+)' has timed out/.exec(line);
    if (m) names.add(m[1]);
  }
  return [...names];
}

/** Resumo: no ar (os três rodando e o WTA respondendo), subindo, falhou ou não existe. */
export function summarizeEnvCheck(containers: InfrContainerCheck[], wtaHttp?: InfrEnvCheck['wtaHttp'], buildLog?: BuildLogReport): NonNullable<InfrEnvCheck['summary']> {
  const present = containers.filter((c) => c.exists);
  if (present.length === 0 && buildLog?.failure) {
    const c = buildLog.cause;
    if (c) {
      const total = c.failures ?? (c.symptoms > 1 ? c.symptoms : undefined);
      const parts = [
        `${c.headline.charAt(0).toUpperCase()}${c.headline.slice(1)}${c.causedBy[0] ? `, porque ${c.causedBy[0]}` : ''}.`,
        total && total > 1 ? `${total} falhas no log, mas só a primeira é a causa: as outras são consequência dela.` : '',
        c.hint ?? '',
        c.others?.length ? `Outro problema no log: ${c.others.join('; ')}.` : '',
        buildLog.stage ? `Etapa: ${buildLog.stage}.` : ''
      ].filter(Boolean);
      return { status: 'fail', title: 'O build falhou antes de criar os containers', detail: parts.join(' ') };
    }
    return {
      status: 'fail',
      title: 'O build falhou antes de criar os containers',
      detail: `${buildLog.failure}${buildLog.stage ? ` (etapa: ${buildLog.stage})` : ''}. O fim do log está abaixo.`
    };
  }
  if (present.length === 0) {
    return { status: 'missing', title: 'Nenhum container deste ambiente', detail: 'Ainda não foram criados os containers, ou o nome está diferente.' };
  }
  const broken = present.filter((c) => c.state === 'exited' || c.state === 'dead' || c.health === 'unhealthy' || (c.restarts ?? 0) >= 3);
  if (broken.length) {
    const why = broken.map((c) => `${INFR_ROLE_LABEL[c.role]}: ${knownFailure(c) || (c.state === 'running' ? `${c.health ?? ''} ${c.restarts ? `(${c.restarts} reinícios)` : ''}`.trim() : c.state)}`);
    return { status: 'fail', title: `Falhou: ${broken.map((c) => INFR_ROLE_LABEL[c.role]).join(', ')}`, detail: `${why.join('; ')}. Veja o log de cada um abaixo.` };
  }
  // Sem WSH e sem criação em andamento (nenhum log da criação deste ambiente): o WSH é opcional, não é "ainda não criado"
  // (ou a criação deste ambiente foi sem --wsh-jar, ou já chegou ao "Pronto")
  const wshOptional = !containers.find((c) => c.role === 'wsh')?.exists && (!buildLog?.exists || !!buildLog.noWsh || !!buildLog.done);
  const need = wshOptional ? containers.filter((c) => c.role !== 'wsh') : containers;
  const missing = need.filter((c) => !c.exists);
  // O script da criação parou no meio (ex.: "[ERRO] Flag desconhecida: --version") depois de criar só parte do ambiente:
  // sem isto a tela diria "Subindo" para sempre. Só vale o marcador do próprio script; o log da criação anterior é apagado
  // antes de cada criação, então a falha é da execução atual.
  if (missing.length > 0 && buildLog?.failure && /^\[ERRO\]/i.test(buildLog.failure)) {
    return {
      status: 'fail',
      title: 'A criação parou antes de terminar',
      detail:
        `Criado: ${present.map((c) => INFR_ROLE_LABEL[c.role]).join(', ')}. Falta: ${missing.map((c) => INFR_ROLE_LABEL[c.role]).join(', ')}. ` +
        `O script parou com "${buildLog.failure}"${buildLog.stage ? ` (etapa: ${buildLog.stage})` : ''}. O fim do log está abaixo.`
    };
  }
  const running = present.filter((c) => c.state === 'running' && c.health !== 'starting');
  // Karaf travado: o log tem bundles que estouraram o tempo esperando serviços que não aparecem. Não é "subindo": o WTA
  // pode até responder na raiz, mas o login não sobe
  const wtaC = containers.find((c) => c.role === 'wta');
  const stuck = wtaC?.exists && wtaC.state === 'running' ? stuckBundles(wtaC) : [];
  if (stuck.length > 0) {
    return {
      status: 'fail',
      title: 'O WTA não termina de subir',
      detail:
        `${stuck.length > 1 ? `${stuck.length} bundles estouraram` : '1 bundle estourou'} o tempo de inicialização esperando outros serviços: ${stuck.slice(0, 4).join(', ')}${stuck.length > 4 ? ` e mais ${stuck.length - 4}` : ''}. ` +
        'O Karaf fica travado e o login do WinThor não sobe, mesmo com o WTA respondendo na raiz. Veja o log do WTA abaixo; reiniciar o WTA (docker restart) às vezes destrava, e se repetir falta uma feature ou serviço de que esses bundles dependem.'
    };
  }
  const wtaOk = !!wtaHttp?.status && wtaHttp.status < 500;
  if (missing.length === 0 && running.length === need.length && wtaOk) {
    return {
      status: 'ok',
      title: 'Ambiente no ar',
      detail: `${wshOptional ? 'Banco e WTA rodando; este ambiente não tem WSH' : 'Banco, WTA e WSH rodando'}; o WTA respondeu HTTP ${wtaHttp!.status} em ${wtaHttp!.url}.`
    };
  }
  const waiting = [
    ...missing.map((c) => `${INFR_ROLE_LABEL[c.role]} ainda não criado`),
    ...present.filter((c) => !running.includes(c)).map((c) => `${INFR_ROLE_LABEL[c.role]} ${c.health === 'starting' ? 'iniciando' : c.state}`),
    ...(running.some((c) => c.role === 'wta') && !wtaOk ? [`WTA ainda não responde${wtaHttp?.error ? ` (${wtaHttp.error})` : ''}`] : [])
  ];
  return {
    status: 'starting',
    title: `Subindo: ${running.length} de ${need.length} no ar`,
    detail: `${waiting.join('; ')}. O WTA leva alguns minutos para subir o Karaf; o WSH espera o WTA.`
  };
}

/** Comando longo do script em várias linhas (uma opção por linha, com `\`), para ler sem cortar e colar no bash. */
export function multilineCommand(command: string): string {
  return command.replace(/ (--[a-z][a-z-]*)/g, ' \\\n  $1');
}
