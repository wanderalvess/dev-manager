export type ConsoleDisplayMode = 'side' | 'modal';

export const CONSOLE_WIDTH_STORAGE_KEY = 'devManager.karafConsole.width';
export const CONSOLE_MODE_STORAGE_KEY = 'devManager.karafConsole.mode';

export const DOCK_MIN_WIDTH = 340;
export const DOCK_MAX_WIDTH = 780;
export const DOCK_DEFAULT_WIDTH = 440;

export function clampConsoleWidth(width: number): number {
  if (!Number.isFinite(width)) return DOCK_DEFAULT_WIDTH;
  return Math.round(Math.max(DOCK_MIN_WIDTH, Math.min(DOCK_MAX_WIDTH, width)));
}

export function readStoredConsoleWidth(): number {
  try {
    const raw = localStorage.getItem(CONSOLE_WIDTH_STORAGE_KEY);
    if (!raw) return DOCK_DEFAULT_WIDTH;
    return clampConsoleWidth(Number(raw));
  } catch {
    return DOCK_DEFAULT_WIDTH;
  }
}

export function readStoredConsoleMode(): ConsoleDisplayMode {
  try {
    return localStorage.getItem(CONSOLE_MODE_STORAGE_KEY) === 'modal' ? 'modal' : 'side';
  } catch {
    return 'side';
  }
}
