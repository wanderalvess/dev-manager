import { execFileAsync } from './security';

/**
 * Saída do wsl.exe como texto. As mensagens de erro do próprio wsl.exe ("Não há distribuição com o nome fornecido",
 * "Falha ao ...") saem em UTF-16 na saída padrão; lidas como UTF-8, cada letra vem com um byte nulo no meio e a tela
 * mostra "N□ã□o□ □h□á□". O que o comando rodado dentro da distro imprime é UTF-8 e segue como está.
 */
export function decodeWslOutput(raw: unknown): string {
  if (raw == null) return '';
  if (Buffer.isBuffer(raw)) {
    const text = raw.includes(0) ? raw.toString('utf16le') : raw.toString('utf8');
    return text.replace(/^\uFEFF/, '');
  }
  // Já lida como UTF-8 por quem chamou: tira os nulos do UTF-16 (as letras acentuadas já se perderam)
  // eslint-disable-next-line no-control-regex -- os bytes nulos do UTF-16 lido como UTF-8
  return String(raw).replace(/\u0000/g, '');
}

/**
 * wsl.exe com a saída decodificada. Em erro, `stdout` e `stderr` do erro também voltam legíveis, e a mensagem fica só
 * na primeira linha (o Node a monta com a saída crua), para `commandFailureDetail` mostrar o motivo de verdade.
 */
export async function execWsl(args: string[], opts: { timeout: number; maxBuffer?: number }): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync('wsl.exe', args, { ...opts, windowsHide: true, encoding: 'buffer' });
    return { stdout: decodeWslOutput(stdout), stderr: decodeWslOutput(stderr) };
  } catch (err: any) {
    if (err && typeof err === 'object') {
      err.stdout = decodeWslOutput(err.stdout);
      err.stderr = decodeWslOutput(err.stderr);
      if (typeof err.message === 'string') err.message = err.message.split(/\r?\n/)[0];
    }
    throw err;
  }
}
