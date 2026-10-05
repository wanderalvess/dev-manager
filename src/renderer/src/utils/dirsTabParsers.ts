export const DEFAULT_ROUTINE_EXTENSIONS = ['.EXE'];
export const DEFAULT_WINTHOR_START_PORT = 9195;

/** Normaliza o texto digitado ("exe, .bat") em extensões maiúsculas com ponto inicial. */
export function parseRoutineExtensions(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith('.') ? s.toUpperCase() : `.${s.toUpperCase()}`));
}

export function formatRoutineExtensions(list: string[] | undefined): string {
  return (list || DEFAULT_ROUTINE_EXTENSIONS).join(', ');
}

/** Porta inválida ou zero volta ao padrão do WinThor Start (mesmo comportamento do `|| 9195` original). */
export function parseWinthorStartPort(raw: string): number {
  return parseInt(raw) || DEFAULT_WINTHOR_START_PORT;
}
