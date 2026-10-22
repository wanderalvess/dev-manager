import { useSyncExternalStore } from 'react';
import { sanitizeAlteredPoms, MAX_ALTERED_POMS, type AlteredPom } from '../../utils/alteredPoms';

const STORAGE_KEY = 'devManager.alteredPoms';

// Store de módulo: o alerta do Deploy, o painel de divergência e o commit rápido do Git enxergam a mesma lista.
let cache: AlteredPom[] | null = null;
const listeners = new Set<() => void>();

function load(): AlteredPom[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeAlteredPoms(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

const getSnapshot = () => (cache ??= load());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(next: AlteredPom[]) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* sem storage: o alerta vale só até fechar o app */
  }
  listeners.forEach((fn) => fn());
}

/** Registra o pom alterado; alterar de novo o mesmo artefato no mesmo pom mantém o valor original (`from`). */
export function recordAlteredPom(entry: Omit<AlteredPom, 'id' | 'at'>) {
  const current = getSnapshot();
  const same = current.find((e) => e.pomPath === entry.pomPath && e.artifactId === entry.artifactId);
  const merged: AlteredPom = {
    ...entry,
    from: same?.from ?? entry.from,
    previousValue: same?.previousValue ?? entry.previousValue,
    id: same?.id ?? `altered-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: Date.now()
  };
  publish([merged, ...current.filter((e) => e !== same)].slice(0, MAX_ALTERED_POMS));
}

export function dismissAlteredPom(id: string) {
  publish(getSnapshot().filter((e) => e.id !== id));
}

export function useAlteredPoms(): AlteredPom[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Volta o pom ao valor original e tira o alerta. Sem `previousValue` não há como reverter pelo app. */
export async function revertAlteredPom(entry: AlteredPom): Promise<{ success: boolean; error?: string; removedBackup?: boolean }> {
  if (!entry.previousValue) return { success: false, error: 'Valor original desconhecido: restaure o pom.xml.bak manualmente.' };
  const res = (await window.electronAPI.updatePomDependencyVersion(
    entry.projectPath,
    { artifactId: entry.artifactId, groupId: entry.groupId, newVersion: entry.previousValue },
    false
  )) as { success: boolean; error?: string; removedBackup?: boolean };
  if (res.success) dismissAlteredPom(entry.id);
  return res;
}

/** Entrada registrada para esse pom/artefato (o painel a lê logo depois de gravar, para reverter sozinho depois). */
export function findAlteredPom(pomPath: string, artifactId: string): AlteredPom | undefined {
  return getSnapshot().find((e) => e.pomPath === pomPath && e.artifactId === artifactId);
}
