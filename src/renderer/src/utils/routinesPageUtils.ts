import { KarafWtaStatusResult, MappedProgram, RoutineItem } from '../../../shared/types';

export const DEFAULT_WTA_URL = 'http://localhost:8889';

export type CcwInitialTab = 'download' | 'file' | 'catalog' | 'rollback' | 'batch';

export interface LaunchFeedback {
  id: string;
  routine: RoutineItem;
  success: boolean;
  message: string;
  karafOffline?: boolean;
  authFailed?: boolean;
  winthorStartOffline?: boolean;
}

export function buildModuleOptions(routines: RoutineItem[]): string[] {
  return ['TODOS', ...Array.from(new Set(routines.map((r) => r.module)))];
}

export function filterRoutines(
  routines: RoutineItem[],
  searchTerm: string,
  selectedModule: string
): RoutineItem[] {
  const term = searchTerm.toLowerCase();
  return routines.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(term) || r.module.toLowerCase().includes(term);
    const matchesModule = selectedModule === 'TODOS' || r.module === selectedModule;
    return matchesSearch && matchesModule;
  });
}

export function splitFavorites(routines: RoutineItem[]): {
  favoriteRoutines: RoutineItem[];
  otherRoutines: RoutineItem[];
} {
  return {
    favoriteRoutines: routines.filter((r) => r.isFavorite),
    otherRoutines: routines.filter((r) => !r.isFavorite)
  };
}

export function toggleRoutineFavorite(routines: RoutineItem[], id: string): RoutineItem[] {
  return routines.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r));
}

export function renameMappedProgram(programs: MappedProgram[], id: string, name: string): MappedProgram[] {
  return programs.map((p) => (p.id === id ? { ...p, name } : p));
}

export function buildMappedProgramFromPath(picked: string, now: number = Date.now()): MappedProgram {
  const baseName = picked.split(/[\\/]/).pop() || picked;
  const name = baseName.replace(/\.[^.]+$/, '');
  return { id: `mp-${now}`, name, fullPath: picked };
}

export function getRoutineExtension(name: string): string {
  return name.split('.').pop()?.toUpperCase() || '';
}

export function getLaunchFeedbackTitle(feedback: Pick<LaunchFeedback, 'id' | 'karafOffline' | 'authFailed'>): string {
  if (feedback.karafOffline) {
    return `Erro de Autenticação: Apache Karaf não está em execução (${feedback.id})`;
  }
  if (feedback.authFailed) {
    return `Falha de Autenticação no WTA (${feedback.id})`;
  }
  return `Falha ao abrir rotina (${feedback.id})`;
}

export function buildKarafOfflineStatus(
  prev: KarafWtaStatusResult | null,
  message?: string
): KarafWtaStatusResult {
  return {
    online: false,
    wtaUrl: prev?.wtaUrl || DEFAULT_WTA_URL,
    message: message || 'Apache Karaf / WTA não está em execução.'
  };
}
