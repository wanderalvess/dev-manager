import type { ContainerEnvironment, DockerContainerInfo } from '../../../shared/types';

export interface StartSequenceSlot {
  name: string;
  delay?: number;
}

/** Converte os containers de um grupo (string ou objeto) em slots de startup com delay opcional. */
export function buildStartSlots(env: ContainerEnvironment): StartSequenceSlot[] {
  const slots: StartSequenceSlot[] = [];
  for (const c of env.containers) {
    if (typeof c === 'string') {
      const delay = env.delays?.[c];
      slots.push({ name: c, ...(delay ? { delay } : {}) });
    } else if (c && typeof c === 'object') {
      slots.push({ name: c.name, ...(c.delay ? { delay: c.delay } : {}) });
    }
  }
  return slots;
}

/** Grupo padrão usado pelo atalho "Iniciar WinThor": primeiro cujo nome contém winthor ou dev. */
export function findDefaultWinThorEnvironment(environments: ContainerEnvironment[]): ContainerEnvironment | undefined {
  return environments.find((e) => e.name.toLowerCase().includes('winthor') || e.name.toLowerCase().includes('dev'));
}

/** Sequência Oracle -> WTA -> WSH montada a partir dos containers existentes (com fallback de nomes). */
export function buildDefaultWinThorSequence(containers: DockerContainerInfo[]): StartSequenceSlot[] {
  const oracle = containers.find((c) => c.names.toLowerCase().includes('oracle'));
  const wta = containers.find(
    (c) => c.names.toLowerCase().includes('wta') || c.names.toLowerCase().includes('linux-winthor')
  );
  const wsh = containers.find((c) => c.names.toLowerCase().includes('wsh'));
  return [
    { name: oracle ? oracle.names.replace(/^\//, '') : 'oracle-winthor', delay: 45 },
    { name: wta ? wta.names.replace(/^\//, '') : 'linux-winthor', delay: 15 },
    ...(wsh ? [{ name: wsh.names.replace(/^\//, '') }] : [])
  ];
}

/** Nomes limpos (sem "/" inicial) dos containers cujo id está selecionado. */
export function getSelectedContainerNames(containers: DockerContainerInfo[], selectedIds: Set<string>): string[] {
  return containers.filter((c) => selectedIds.has(c.id)).map((c) => c.names.replace(/^\//, '').trim());
}

/** Nome do arquivo .log baixado a partir dos logs de um container. */
export function buildLogFileName(containerNames: string, date: Date = new Date()): string {
  return `${containerNames.replace(/^\//, '')}-${date.toISOString().slice(0, 10)}.log`;
}

/** Atualiza a lista de arquivos compose recentes (mais novo primeiro, sem duplicatas, máx. 5). */
export function addRecentFile(recent: string[], file: string, max = 5): string[] {
  return [file, ...recent.filter((f) => f !== file)].slice(0, max);
}
