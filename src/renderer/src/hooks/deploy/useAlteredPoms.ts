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
