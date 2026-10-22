import { useSyncExternalStore } from 'react';
import { requestConfirm } from '../../components/ui/confirmService';
import {
  DEFAULT_QUICK_COMMANDS,
  isDestructiveKarafCommand,
  sanitizeQuickCommands,
  type KarafQuickCommand
} from '../../utils/karafQuickCommands';

const STORAGE_KEY = 'devManager.karafQuickCommands';

// Store de módulo: Deploy › Diagnósticos e o dock do console leem a mesma lista e se atualizam juntos.
let cache: KarafQuickCommand[] | null = null;
const listeners = new Set<() => void>();

function load(): KarafQuickCommand[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return (raw ? sanitizeQuickCommands(JSON.parse(raw)) : null) ?? DEFAULT_QUICK_COMMANDS;
  } catch {
    return DEFAULT_QUICK_COMMANDS;
  }
}

const getSnapshot = () => (cache ??= load());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(next: KarafQuickCommand[]) {
  cache = next;
  listeners.forEach((fn) => fn());
}

export function saveQuickCommands(list: unknown) {
  const next = sanitizeQuickCommands(list) ?? DEFAULT_QUICK_COMMANDS;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* sem storage (janela privada/preview): a lista vale só até fechar o app */
  }
  publish(next);
}

export function resetQuickCommands() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ver saveQuickCommands */
  }
  publish(DEFAULT_QUICK_COMMANDS);
}

export function useKarafQuickCommands() {
  const commands = useSyncExternalStore(subscribe, getSnapshot);
  return { commands, save: saveQuickCommands, reset: resetQuickCommands };
}

/** Pede confirmação só para comando que apaga estado do Karaf; os demais passam direto. */
export async function confirmKarafCommand(command: string): Promise<boolean> {
  if (!isDestructiveKarafCommand(command)) return true;
  return requestConfirm({
    title: 'Executar comando destrutivo?',
    message: 'Este comando remove ou apaga estado do Karaf e não tem desfazer.',
    details: command,
    confirmLabel: 'Executar',
    tone: 'danger'
  });
}
