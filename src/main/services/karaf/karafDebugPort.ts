import { execFileSync } from 'child_process';

export interface DebugPortChoice {
  port: number;
  /** Porta preferida indisponível: 'in-use' (alguém escutando) ou 'reserved' (reserva do Windows/Hyper-V/WSL). */
  reason?: 'in-use' | 'reserved';
  /** Quando 'in-use': PID e nome do processo que está na porta preferida, se descobertos. */
  owner?: { pid: number; name?: string };
}

/** Intervalos TCP reservados pelo Windows (Hyper-V/WSL2/Docker): bind nessas portas falha com "Permission denied". */
export function parseExcludedPortRanges(output: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const line of output.split(/\r?\n/)) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s*\*?\s*$/);
    if (m) ranges.push([Number(m[1]), Number(m[2])]);
  }
  return ranges;
}

/** Portas TCP em LISTENING (porta -> PID) segundo `netstat -ano -p tcp`. */
export function parseListeningPorts(output: string): Map<number, number> {
  const ports = new Map<number, number>();
  for (const line of output.split(/\r?\n/)) {
    const m = line.match(/^\s*TCP\s+\S+:(\d+)\s+\S+\s+(?:LISTENING|ESCUTANDO)\s+(\d+)/i);
    if (m && !ports.has(Number(m[1]))) ports.set(Number(m[1]), Number(m[2]));
  }
  return ports;
}

function run(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: 'utf8', timeout: 4000, windowsHide: true });
}

function processName(pid: number): string | undefined {
  try {
    const out = run('tasklist.exe', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH']);
    return out.match(/^"([^"]+)"/m)?.[1];
  } catch {
    return undefined;
  }
}

/**
 * Devolve a porta preferida se estiver livre; senão a próxima livre (até +50), dizendo o motivo.
 * Só atua no Windows e nunca lança: em qualquer falha de leitura mantém a porta preferida.
 */
export function pickFreeDebugPort(preferred: number): DebugPortChoice {
  if (process.platform !== 'win32') return { port: preferred };
  try {
    const excluded = parseExcludedPortRanges(run('netsh.exe', ['int', 'ipv4', 'show', 'excludedportrange', 'protocol=tcp']));
    let listening = new Map<number, number>();
    try {
      listening = parseListeningPorts(run('netstat.exe', ['-ano', '-p', 'tcp']));
    } catch {
      // sem netstat: segue só com as exclusões
    }
    const isReserved = (p: number) => excluded.some(([a, b]) => p >= a && p <= b);
    const blocked = (p: number) => listening.has(p) || isReserved(p);
    if (!blocked(preferred)) return { port: preferred };

    const pid = listening.get(preferred);
    const reason: DebugPortChoice['reason'] = pid !== undefined ? 'in-use' : 'reserved';
    const owner = pid !== undefined ? { pid, name: processName(pid) } : undefined;
    for (let p = preferred + 1; p < preferred + 50 && p <= 65535; p++) {
      if (!blocked(p)) return { port: p, reason, owner };
    }
  } catch {
    // mantém a preferida
  }
  return { port: preferred };
}
