export const MAX_CONSOLE_ENTRIES = 5000;

/** Mantém só as entradas mais recentes para o console global não crescer sem limite. */
export function capConsoleEntries<T>(entries: T[], limit: number = MAX_CONSOLE_ENTRIES): T[] {
  return entries.length > limit ? entries.slice(entries.length - limit) : entries;
}

/** Acrescenta entradas novas respeitando o limite. */
export function appendConsoleEntries<T>(prev: T[], incoming: T[], limit: number = MAX_CONSOLE_ENTRIES): T[] {
  return capConsoleEntries([...prev, ...incoming], limit);
}

export const DOCK_MIN_HEIGHT = 140;
export const DOCK_DEFAULT_HEIGHT = 280;

/** Limita a altura do dock entre o mínimo e uma fração da janela, para nunca engolir a página. */
export function clampDockHeight(height: number, viewportHeight: number): number {
  const max = Math.max(DOCK_MIN_HEIGHT, Math.floor(viewportHeight * 0.7));
  if (!Number.isFinite(height)) return DOCK_DEFAULT_HEIGHT;
  return Math.min(Math.max(Math.round(height), DOCK_MIN_HEIGHT), max);
}
