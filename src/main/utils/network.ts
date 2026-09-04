import net from 'net';

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
