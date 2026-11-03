/**
 * Pré-checagem antes de montar uma versão nova: o que costuma derrubar o build ou o primeiro boot e dá para ver em
 * segundos. Portas do host que o ambiente vai publicar (por versão: web 80NN, ssh 81NN, jmx 10NN, jms 616NN, oracle 15NN,
 * wsh 90NN), espaço em disco e memória da distro, e se o Nexus responde de dentro do WSL. Aqui só a parte pura: montar
 * o script que coleta e transformar a saída em pontos para a revisão.
 */
import { SAFE_REPO_URL, maskUrlCredentials } from './infrFeatureArtifacts';
import { winthorVersionPorts } from './infrWinthorVersion';

export type PreflightStatus = 'ok' | 'warn' | 'block';

export interface PreflightItem {
  id: 'portas' | 'disco' | 'memoria' | 'rede';
  status: PreflightStatus;
  title: string;
  detail: string;
}

export interface PreflightSnapshot {
  /** Portas do host em uso, de quem: `docker:<container>`, `wsl` (processo na distro) ou `windows` */
  usedPorts: { port: number; by: string }[];
  /** Espaço livre onde o Docker guarda as imagens (GB) */
  diskFreeGb?: number;
  /** Memória disponível da distro (GB) e o total */
  memAvailableGb?: number;
  memTotalGb?: number;
  /** Código HTTP do repositório do Nexus de dentro do WSL (000 = sem rede); vazio = não testado */
  nexus?: { url: string; code: string }[];
}

/** Portas que a versão publica no host; as informadas na tela (Oracle, WTA, WSH) valem no lugar das padrão. */
export function expectedPorts(version: string, overrides: { oracle?: number; web?: number; wsh?: number } = {}): { label: string; port: number }[] {
  const p = winthorVersionPorts(version);
  return [
    { label: 'Oracle', port: overrides.oracle ?? p.oracle },
    { label: 'WTA', port: overrides.web ?? p.web },
    { label: 'SSH do Karaf', port: p.ssh },
    { label: 'JMX', port: p.jmx },
    { label: 'JMS', port: p.jms },
    { label: 'WSH', port: overrides.wsh ?? p.wsh }
  ];
}

/** Script (bash, na distro) que imprime `@@seção` e os dados crus de cada coisa que a pré-checagem olha. */
export function buildPreflightScript(nexusRepos: string[]): string {
  const repos = nexusRepos.filter((r) => SAFE_REPO_URL.test(r)).slice(0, 4);
  return [
    "echo '@@docker'; docker ps --format '{{.Names}}|{{.Ports}}' 2>/dev/null",
    "echo '@@ss'; ss -ltnH 2>/dev/null || netstat -ltn 2>/dev/null | tail -n +3",
    "echo '@@disk'; df -Pk \"$(docker info -f '{{.DockerRootDir}}' 2>/dev/null || echo /)\" 2>/dev/null | tail -n 1",
    "echo '@@mem'; grep -E '^(MemTotal|MemAvailable):' /proc/meminfo",
    "echo '@@nexus'",
    ...(repos.length
      ? [`for r in ${repos.map((r) => `'${r}'`).join(' ')}; do c=$(curl -s -o /dev/null -I -m 10 -w '%{http_code}' "$r/" 2>/dev/null || echo 000); echo "$c $r"; done`]
      : [])
  ].join('; ');
}

const GB = 1024 * 1024;

export function parsePreflightOutput(output: string): PreflightSnapshot {
  const sections = new Map<string, string[]>();
  let current = '';
  for (const raw of output.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('@@')) {
      current = line.slice(2);
      sections.set(current, []);
    } else if (current && line) {
      sections.get(current)!.push(line);
    }
  }
  const snap: PreflightSnapshot = { usedPorts: [] };
  const add = (port: number, by: string) => {
    if (Number.isInteger(port) && port > 0 && !snap.usedPorts.some((u) => u.port === port)) snap.usedPorts.push({ port, by });
  };
  for (const line of sections.get('docker') ?? []) {
    const [name, ports = ''] = line.split('|');
    for (const m of ports.matchAll(/(?:0\.0\.0\.0|\[::\]|\d+\.\d+\.\d+\.\d+):(\d+)(?:-(\d+))?->/g)) {
      const from = parseInt(m[1], 10);
      const to = m[2] ? parseInt(m[2], 10) : from;
      for (let p = from; p <= Math.min(to, from + 50); p++) add(p, `docker:${name}`);
    }
  }
  for (const line of sections.get('ss') ?? []) {
    // ss: `LISTEN 0 4096 127.0.0.1:5432 0.0.0.0:*`; netstat: `tcp 0 0 127.0.0.1:5432 0.0.0.0:* LISTEN`
    const local = line.split(/\s+/)[3] ?? '';
    add(parseInt(local.slice(local.lastIndexOf(':') + 1), 10), 'wsl');
  }
  const disk = (sections.get('disk') ?? [])[0]?.split(/\s+/);
  if (disk && disk.length >= 4 && /^\d+$/.test(disk[3])) snap.diskFreeGb = Math.round((parseInt(disk[3], 10) / GB) * 10) / 10;
  for (const line of sections.get('mem') ?? []) {
    const m = /^(MemTotal|MemAvailable):\s+(\d+)/.exec(line);
    if (!m) continue;
    const gb = Math.round((parseInt(m[2], 10) / GB) * 10) / 10;
    if (m[1] === 'MemTotal') snap.memTotalGb = gb;
    else snap.memAvailableGb = gb;
  }
  const nexus = (sections.get('nexus') ?? []).map((l) => /^(\d{3}) (\S+)$/.exec(l)).filter((m): m is RegExpExecArray => !!m);
  if (nexus.length) snap.nexus = nexus.map((m) => ({ code: m[1], url: maskUrlCredentials(m[2]) }));
  return snap;
}

export const MIN_DISK_GB = 15;
export const MIN_MEM_GB = 6;

/** Transforma a coleta em pontos. `windowsUsed` são as portas que o Hub não conseguiu abrir no Windows. */
export function evaluatePreflight(version: string, snap: PreflightSnapshot, windowsUsed: number[], overrides: { oracle?: number; web?: number; wsh?: number } = {}): PreflightItem[] {
  const items: PreflightItem[] = [];
  const all = [...snap.usedPorts, ...windowsUsed.map((port) => ({ port, by: 'windows' }))];
  const clash = expectedPorts(version, overrides)
    .map((e) => ({ ...e, by: all.find((u) => u.port === e.port)?.by }))
    .filter((e) => e.by);
  items.push(
    clash.length
      ? {
          id: 'portas',
          // Container do Docker pode ser o próprio ambiente que será recriado (nova tentativa depois de uma falha)
          status: clash.every((c) => c.by!.startsWith('docker:')) ? 'warn' : 'block',
          title: 'Portas do host já em uso',
          detail: `${clash.map((c) => `${c.port} (${c.label}) está com ${c.by === 'windows' ? 'um programa do Windows' : c.by === 'wsl' ? 'um processo da distro' : c.by!.replace('docker:', 'o container ')}`).join('; ')}. O container não sobe com a porta ocupada${clash.every((c) => c.by!.startsWith('docker:')) ? ' (se for o ambiente que você vai recriar, pode ignorar)' : ''}.`
        }
      : { id: 'portas', status: 'ok', title: 'Portas do host livres', detail: expectedPorts(version, overrides).map((e) => `${e.label} ${e.port}`).join(', ') + '.' }
  );
  if (snap.diskFreeGb !== undefined) {
    items.push(
      snap.diskFreeGb < MIN_DISK_GB
        ? { id: 'disco', status: 'warn', title: 'Pouco espaço para as imagens', detail: `${snap.diskFreeGb} GB livres onde o Docker guarda as imagens; a imagem da versão e o banco pedem uns ${MIN_DISK_GB} GB.` }
        : { id: 'disco', status: 'ok', title: 'Espaço em disco', detail: `${snap.diskFreeGb} GB livres para o Docker.` }
    );
  }
  if (snap.memAvailableGb !== undefined) {
    items.push(
      snap.memAvailableGb < MIN_MEM_GB
        ? {
            id: 'memoria',
            status: 'warn',
            title: 'Pouca memória na distro',
            detail: `${snap.memAvailableGb} GB disponíveis de ${snap.memTotalGb ?? '?'} GB; Oracle, WTA e WSH juntos pedem uns ${MIN_MEM_GB} GB. Se o limite vem do .wslconfig (memory=), aumente e rode "wsl --shutdown".`
          }
        : { id: 'memoria', status: 'ok', title: 'Memória da distro', detail: `${snap.memAvailableGb} GB disponíveis de ${snap.memTotalGb ?? '?'} GB.` }
    );
  }
  if (snap.nexus?.length) {
    const down = snap.nexus.filter((n) => n.code === '000');
    const auth = snap.nexus.filter((n) => n.code === '401' || n.code === '403');
    if (down.length === snap.nexus.length) {
      items.push({ id: 'rede', status: 'warn', title: 'A distro não alcança o Nexus', detail: `Sem resposta de ${down.map((d) => d.url).join(', ')}. O build baixa as features de lá; confira rede, VPN e proxy da distro.` });
    } else if (auth.length) {
      items.push({ id: 'rede', status: 'warn', title: 'Nexus pede login', detail: `${auth.map((a) => `${a.url} (HTTP ${a.code})`).join(', ')}: o build precisa das credenciais no settings.xml do Maven.` });
    } else {
      items.push({ id: 'rede', status: 'ok', title: 'Nexus alcançável', detail: snap.nexus.map((n) => `${n.url} respondeu (HTTP ${n.code})`).join(', ') + '.' });
    }
  }
  return items;
}

/** Linhas de registro (uma por fato coletado) para o "Registro da leitura". */
export function describePreflight(snap: PreflightSnapshot, windowsUsed: number[]): string[] {
  return [
    `Portas em uso no host: ${snap.usedPorts.map((u) => `${u.port}(${u.by})`).join(' ') || 'nenhuma lida'}${windowsUsed.length ? `; no Windows: ${windowsUsed.join(' ')}` : ''}`,
    `Disco do Docker: ${snap.diskFreeGb ?? '?'} GB livres; memória: ${snap.memAvailableGb ?? '?'} GB disponíveis de ${snap.memTotalGb ?? '?'} GB`,
    `Nexus a partir da distro: ${snap.nexus?.map((n) => `${n.url} → ${n.code}`).join(', ') || 'não testado'}`
  ];
}
