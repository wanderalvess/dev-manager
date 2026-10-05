import type { DeployProfile } from '../../../shared/types';

export const MAX_TERMINAL_LOG_LINES = 5000;

/** Mantém apenas as linhas mais recentes para não crescer sem limite durante streams longos. */
export function appendCappedLogLines(prev: string[], incoming: string[]): string[] {
  const next = [...prev, ...incoming];
  return next.length > MAX_TERMINAL_LOG_LINES ? next.slice(next.length - MAX_TERMINAL_LOG_LINES) : next;
}

/** Separa o chunk em linhas completas e devolve o resto (linha parcial) para o próximo chunk. */
export function splitStreamChunk(remainder: string, chunk: string): { lines: string[]; remainder: string } {
  const lines = (remainder + chunk).split(/\r?\n/);
  const nextRemainder = lines.pop() ?? '';
  return { lines, remainder: nextRemainder };
}

/** Um perfil só precisa do Karaf rodando se tem etapa OSGi e nenhuma etapa que o inicie. */
export function profileNeedsKaraf(profile: DeployProfile | null | undefined): boolean {
  if (!profile?.steps) return false;
  const hasKarafStep = profile.steps.some(
    (s) => s.enabled !== false && (s.type === 'karaf-command' || s.type === 'karaf-bundle')
  );
  const hasStartStep = profile.steps.some(
    (s) =>
      s.enabled !== false &&
      ((s.type === 'service-action' && s.serviceAction === 'start') ||
        (s.type === 'command' && /(?:karaf|winthor)(?:\.bat|\.sh)?/i.test(s.command || '')))
  );
  return hasKarafStep && !hasStartStep;
}

export function duplicateDeployProfile(profile: DeployProfile, now: number = Date.now()): DeployProfile {
  return {
    ...profile,
    id: `deploy-profile-${now}`,
    name: `${profile.name} (Cópia)`,
    steps: profile.steps.map((s) => ({
      ...s,
      id: `deploy-step-${now}-${Math.random().toString(36).substring(2, 7)}`
    }))
  };
}

export function buildProfileExportFileName(profileName: string): string {
  return `perfil-deploy-${profileName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
}

/** Retorna null quando o JSON não tem a forma mínima de um perfil de deploy. */
export function buildImportedProfile(parsed: any, now: number = Date.now()): DeployProfile | null {
  if (!parsed || !parsed.name || !Array.isArray(parsed.steps)) return null;
  return {
    ...parsed,
    id: `deploy-profile-${now}`,
    name: `${parsed.name} (Importado)`
  };
}

/** Linhas de console a exibir após um diagnóstico Karaf (vazio quando a saída já foi streamada). */
export function buildDiagnosticResultLines(
  cmd: string,
  res: { code?: number | null; stdout?: string; stderr?: string } | null | undefined
): string[] {
  if (!res) return [];
  if (res.code !== 0) {
    return [
      `\r\n[ERRO] Diagnóstico finalizou com código de saída ${res.code}.${res.stderr ? `\r\n${res.stderr}` : ''}\r\n`
    ];
  }
  if (!res.stdout?.trim() && !res.stderr?.trim()) {
    if (cmd.includes('log:clear')) {
      return [`[ OK ] Buffer de logs em memória do Karaf (log:clear) limpo com sucesso.\r\n`];
    }
    if (cmd.includes('log:display')) {
      return [`[INFO] O buffer de logs em memória do Karaf está vazio no momento.\r\n`];
    }
    return [`[ OK ] Comando executado com sucesso (nenhuma saída retornada pelo Karaf).\r\n`];
  }
  return [];
}

/** Próximo índice/valor do histórico ao navegar com as setas; null = sem mudança. */
export function navigateCommandHistory(
  history: string[],
  index: number,
  direction: 'up' | 'down'
): { index: number; value: string } | null {
  if (direction === 'up') {
    if (history.length === 0) return null;
    const nextIdx = index === -1 ? history.length - 1 : Math.max(0, index - 1);
    return { index: nextIdx, value: history[nextIdx] || '' };
  }
  if (index === -1) return null;
  const nextIdx = index + 1;
  if (nextIdx >= history.length) return { index: -1, value: '' };
  return { index: nextIdx, value: history[nextIdx] || '' };
}
