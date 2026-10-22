import type { DeployProfile } from '../../../shared/types';
import { resolveContextProjectPath } from '../../../shared/deployContext';

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
  if (!parsed || typeof parsed.name !== 'string' || !parsed.name || !Array.isArray(parsed.steps)) return null;
  if (parsed.steps.some((s: any) => !s || typeof s !== 'object' || typeof s.type !== 'string')) return null;
  return {
    ...parsed,
    id: `deploy-profile-${now}`,
    name: `${parsed.name} (Importado)`,
    // Ids novos: importar o mesmo arquivo duas vezes não pode gerar etapas com id repetido entre perfis.
    steps: parsed.steps.map((s: any) => ({
      ...s,
      id: `deploy-step-${now}-${Math.random().toString(36).substring(2, 7)}`
    }))
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

export interface EnabledStepsCount {
  enabledCount: number;
  totalCount: number;
  allEnabled: boolean;
  isIndeterminate: boolean;
}

/** Calcula quantas etapas estão habilitadas no perfil. */
export function countEnabledSteps(profile: DeployProfile | null | undefined): EnabledStepsCount {
  const steps = profile?.steps || [];
  const totalCount = steps.length;
  const enabledCount = steps.filter((s) => s.enabled !== false).length;
  return {
    enabledCount,
    totalCount,
    allEnabled: totalCount > 0 && enabledCount === totalCount,
    isIndeterminate: enabledCount > 0 && enabledCount < totalCount
  };
}

/** Inverte o estado enabled de uma etapa no perfil. */
export function toggleProfileStep(profile: DeployProfile, stepId: string): DeployProfile {
  return {
    ...profile,
    steps: profile.steps.map((s) => (s.id === stepId ? { ...s, enabled: s.enabled === false } : s))
  };
}

/** Habilita ou desabilita todas as etapas no perfil. */
export function toggleAllProfileSteps(profile: DeployProfile, enableAll: boolean): DeployProfile {
  return {
    ...profile,
    steps: profile.steps.map((s) => ({ ...s, enabled: enableAll }))
  };
}

/**
 * Perfil derivado que executa só as etapas escolhidas. As demais ficam desativadas, e por isso cada etapa escolhida
 * leva o projeto de contexto já resolvido sobre o perfil original: sem isso, uma etapa Karaf sem projeto próprio
 * perderia o projeto da etapa anterior (um build Maven alimenta o install seguinte) ao rodar sozinha.
 */
export function pickProfileSteps(profile: DeployProfile, stepIds: string[], nameSuffix = 'etapas selecionadas'): DeployProfile {
  const chosen = new Set(stepIds);
  const context = profile.steps.filter((s) => s.enabled !== false || chosen.has(s.id));
  return {
    ...profile,
    name: `${profile.name} (${nameSuffix})`,
    steps: profile.steps.map((s) => {
      if (!chosen.has(s.id)) return { ...s, enabled: false };
      const at = context.findIndex((c) => c.id === s.id);
      return { ...s, enabled: true, projectPath: resolveContextProjectPath(context, at) };
    })
  };
}

/** Cria um perfil derivado para executar a partir de um índice em diante (as etapas anteriores são desativadas). */
export function sliceProfileFromStep(profile: DeployProfile, stepIndex: number): DeployProfile {
  const ids = profile.steps.filter((s, idx) => idx >= stepIndex && s.enabled !== false).map((s) => s.id);
  return pickProfileSteps(profile, ids, `etapa ${stepIndex + 1} em diante`);
}


/** Projeto de contexto da etapa que falhou (a que o deploy usou), para localizar o pom do módulo que não instalou. */
export function failedStepContextPath(
  profile: DeployProfile | null | undefined,
  statuses: Record<string, { status: string }>
): string {
  if (!profile) return '';
  const enabled = profile.steps.filter((s) => s.enabled !== false);
  const at = enabled.findIndex((s) => statuses[s.id]?.status === 'failed');
  return resolveContextProjectPath(enabled, at < 0 ? enabled.length : at) ?? '';
}
