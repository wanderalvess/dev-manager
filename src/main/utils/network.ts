import net from 'net';
import { execFileAsync } from './security';

/**
 * Verifica se uma porta TCP está em escuta (LISTENING) conectando nela via Socket.
 * Compartilhado entre WindowsService e NetworkPortScanner (main e modo web/Docker),
 * que antes reimplementavam a mesma checagem de socket separadamente.
 */
export function checkPortOpen(port: number, host: string = '127.0.0.1', timeoutMs: number = 400): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Resolve o PID do processo em LISTENING numa porta local (Windows, via netstat -ano).
 * Usado para diferenciar "senha incorreta" de "porta local já ocupada por outro processo"
 * (ex: túnel SSH que perdeu o bind de -L para um serviço nativo já rodando na mesma porta).
 * Fora do Windows retorna undefined — não há necessidade comprovada de suportar outras plataformas aqui.
 */
export async function getListeningPid(port: number): Promise<string | undefined> {
  if (process.platform !== 'win32') return undefined;
  try {
    const { stdout } = await execFileAsync('netstat.exe', ['-ano']);
    const line = stdout
      .split('\n')
      .find(
        (l) =>
          (l.includes(`:${port} `) || l.includes(`:${port}\t`) || l.includes(`:${port}\r`)) && l.includes('LISTENING')
      );
    if (!line) return undefined;
    const tokens = line.trim().split(/\s+/);
    return tokens[tokens.length - 1];
  } catch {
    return undefined;
  }
}
