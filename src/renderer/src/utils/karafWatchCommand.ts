export type WatchAction = 'start' | 'stop' | 'list';

// Mesmo conjunto de caracteres aceito para argumentos de stream no main: sem metacaracteres de shell.
const SAFE_TARGET = /^[A-Za-z0-9_.:*,/@=+-]+$/;

/** Monta o comando `bundle:watch` do Karaf; vazio em "iniciar" monitora tudo (`*`). Null quando o alvo é inseguro. */
export function buildWatchCommand(action: WatchAction, target = ''): string | null {
  if (action === 'stop') return 'bundle:watch --stop';
  if (action === 'list') return 'bundle:watch --list';
  const clean = target.trim() || '*';
  return SAFE_TARGET.test(clean) && clean.length <= 200 ? `bundle:watch ${clean}` : null;
}
