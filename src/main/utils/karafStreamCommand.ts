export type KarafStreamCommandResult = { ok: true; command: string } | { ok: false; error: string };

const STREAM_COMMANDS = ['log:tail'] as const;
// Só tokens simples: opções (-n 50), ids, nomes de bundle e URLs mvn:/file: sem metacaracteres de shell.
const SAFE_ARG = /^[A-Za-z0-9_.:*,/@=+-]+$/;
const MAX_ARGS = 8;

/**
 * Comandos Karaf que ficam rodando e emitindo saída. Lista fechada de propósito: um stream aceita
 * qualquer coisa que o client do Karaf aceite, então só entra o que foi pensado como stream.
 * `bundle:watch` fica de fora: ele só registra o monitoramento no Karaf e retorna (para com `--stop`),
 * então roda como comando comum.
 */
export function parseKarafStreamCommand(input: string): KarafStreamCommandResult {
  if (typeof input !== 'string') return { ok: false, error: 'Comando inválido.' };
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const [name, ...args] = tokens;
  if (!name || !(STREAM_COMMANDS as readonly string[]).includes(name)) {
    return { ok: false, error: `Comando de stream não permitido. Use: ${STREAM_COMMANDS.join(', ')}.` };
  }
  if (args.length > MAX_ARGS || args.some((a) => a.length > 200 || !SAFE_ARG.test(a))) {
    return { ok: false, error: 'Argumentos inválidos para o comando de stream.' };
  }
  return { ok: true, command: [name, ...args].join(' ') };
}
